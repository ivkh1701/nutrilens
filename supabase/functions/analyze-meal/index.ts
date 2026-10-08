import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

interface GeminiFood {
  name: string
  serving_qty: number
  serving_unit: string
  calories: number
  carbs: number
  protein: number
  fat: number
  confidence: number
}

interface AnalysisResult {
  foods: GeminiFood[]
  total_calories: number
  total_carbs: number
  total_protein: number
  total_fat: number
  confidence: number
  notes: string
}

function sanitizeFood(f: Record<string, unknown>): GeminiFood {
  return {
    name: String(f.name ?? 'Unknown food'),
    serving_qty: Math.max(0.1, Number(f.serving_qty) || 1),
    serving_unit: String(f.serving_unit ?? 'serving'),
    calories: Math.round(Math.max(0, Number(f.calories) || 0)),
    carbs: Math.round(Math.max(0, Number(f.carbs) || 0)),
    protein: Math.round(Math.max(0, Number(f.protein) || 0)),
    fat: Math.round(Math.max(0, Number(f.fat) || 0)),
    confidence: Math.min(1, Math.max(0, Number(f.confidence) || 0.5)),
  }
}

function parseGeminiText(text: string): AnalysisResult | null {
  // Strip markdown code fences if present
  const stripped = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

  // Try to extract the first JSON object
  const match = stripped.match(/\{[\s\S]*\}/)
  if (!match) return null

  try {
    const raw = JSON.parse(match[0]) as Record<string, unknown>
    const foods: GeminiFood[] = Array.isArray(raw.foods)
      ? (raw.foods as Record<string, unknown>[]).map(sanitizeFood)
      : []

    const totals = foods.reduce(
      (acc, f) => ({
        calories: acc.calories + f.calories,
        carbs: acc.carbs + f.carbs,
        protein: acc.protein + f.protein,
        fat: acc.fat + f.fat,
      }),
      { calories: 0, carbs: 0, protein: 0, fat: 0 },
    )

    return {
      foods,
      total_calories: Math.round(Number(raw.total_calories) || totals.calories),
      total_carbs: Math.round(Number(raw.total_carbs) || totals.carbs),
      total_protein: Math.round(Number(raw.total_protein) || totals.protein),
      total_fat: Math.round(Number(raw.total_fat) || totals.fat),
      confidence: Math.min(1, Math.max(0, Number(raw.confidence) || 0.7)),
      notes: String(raw.notes ?? ''),
    }
  } catch {
    return null
  }
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // ── 1. Validate caller JWT ──────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const geminiKey = Deno.env.get('GEMINI_API_KEY')

  if (!geminiKey) return json({ error: 'Gemini API not configured on this server.' }, 503)

  // Caller client — validates the JWT
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: authError } = await callerClient.auth.getUser()
  if (authError || !user) return json({ error: 'Unauthorized' }, 401)

  // ── 2. Parse request ────────────────────────────────────────────────────
  let body: { photo_path: string; meal_entry_id?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { photo_path, meal_entry_id } = body
  if (!photo_path) return json({ error: 'photo_path is required' }, 400)

  // Verify the photo belongs to the caller (path starts with userId/)
  if (!photo_path.startsWith(`${user.id}/`)) {
    return json({ error: 'Access denied to this photo' }, 403)
  }

  // ── 3. Generate signed URL for the private photo ────────────────────────
  const serviceClient = createClient(supabaseUrl, serviceKey)
  const { data: signedData, error: signedErr } = await serviceClient.storage
    .from('meal-photos')
    .createSignedUrl(photo_path, 120)

  if (signedErr || !signedData?.signedUrl) {
    return json({ error: 'Failed to access photo from storage.' }, 500)
  }

  // ── 4. Fetch image and encode as base64 ─────────────────────────────────
  let base64Image: string
  let mimeType: string
  try {
    const imgResponse = await fetch(signedData.signedUrl)
    if (!imgResponse.ok) throw new Error(`HTTP ${imgResponse.status}`)
    mimeType = imgResponse.headers.get('content-type') ?? 'image/jpeg'
    const buffer = await imgResponse.arrayBuffer()
    base64Image = btoa(String.fromCharCode(...new Uint8Array(buffer)))
  } catch (e) {
    return json({ error: 'Failed to retrieve photo.' }, 500)
  }

  // ── 5. Call Gemini Vision API ────────────────────────────────────────────
  const PROMPT = `You are a precise nutrition analyst. Identify every food item visible in this meal photo.

For each distinct food item provide:
- name: descriptive food name
- serving_qty: numeric serving amount
- serving_unit: unit (g, ml, cup, piece, slice, tbsp, etc.)
- calories: estimated kcal for this serving
- carbs: carbohydrates in grams
- protein: protein in grams
- fat: fat in grams
- confidence: your confidence 0.0–1.0

Reply ONLY with valid JSON matching this exact schema — no prose before or after:
{
  "foods": [
    {
      "name": "string",
      "serving_qty": number,
      "serving_unit": "string",
      "calories": number,
      "carbs": number,
      "protein": number,
      "fat": number,
      "confidence": number
    }
  ],
  "total_calories": number,
  "total_carbs": number,
  "total_protein": number,
  "total_fat": number,
  "confidence": number,
  "notes": "string"
}

If you cannot identify food (unclear image, not a meal, etc.) set foods to [] and explain in notes.`

  let geminiResp: Response
  try {
    geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: mimeType, data: base64Image } }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
          safetySettings: [
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ],
        }),
      },
    )
  } catch {
    return json({ error: 'Network error reaching Gemini API.' }, 502)
  }

  if (!geminiResp.ok) {
    if (geminiResp.status === 429) return json({ error: 'Rate limit reached. Please try again in a moment.' }, 429)
    const errBody = await geminiResp.text().catch(() => '')
    return json({ error: `Gemini API returned ${geminiResp.status}: ${errBody.slice(0, 300)}` }, 502)
  }

  const geminiData = await geminiResp.json() as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

  if (!rawText) return json({ error: 'Empty response from Gemini.' }, 502)

  // ── 6. Parse and validate ─────────────────────────────────────────────
  const analysis = parseGeminiText(rawText)
  if (!analysis) return json({ error: 'Could not parse Gemini response as valid JSON.' }, 502)

  // ── 7. Persist analysis if a meal entry ID was provided ───────────────
  if (meal_entry_id) {
    await serviceClient.from('gemini_analyses').insert({
      meal_entry_id,
      model_name: 'gemini-3.5-flash-lite',
      analysis,
      analyzed_at: new Date().toISOString(),
    })
  }

  return json(analysis, 200)
})
