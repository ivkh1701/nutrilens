import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabaseConfigured =
  Boolean(supabaseUrl) &&
  supabaseUrl !== 'https://your-project-ref.supabase.co' &&
  Boolean(supabaseAnonKey) &&
  supabaseAnonKey !== 'your-anon-key-here'

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : // Placeholder client that never connects — all calls will fail gracefully.
    createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: { persistSession: false },
    })

export const MEAL_PHOTOS_BUCKET = 'meal-photos'

/** Generate a storage path scoped to the user */
export function mealPhotoPath(userId: string, filename: string): string {
  const ext = filename.split('.').pop() ?? 'jpg'
  const ts = Date.now()
  return `${userId}/${ts}.${ext}`
}

/** Returns a temporary public URL for a private photo path */
export async function getSignedPhotoUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(MEAL_PHOTOS_BUCKET)
    .createSignedUrl(path, 3600)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}
