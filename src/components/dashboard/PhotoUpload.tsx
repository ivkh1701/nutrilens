import { useRef, useState } from 'react'
import { validateImageFile } from '../../lib/utils'
import { supabase, MEAL_PHOTOS_BUCKET } from '../../lib/supabase'
import type { GeminiAnalysisResult } from '../../lib/types'

interface Props {
  userId: string
  onAnalysisReady: (result: GeminiAnalysisResult, photoPath: string, previewUrl: string) => void
  onError: (msg: string) => void
}

export function PhotoUpload({ userId, onAnalysisReady, onError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const err = validateImageFile(file)
    if (err) { setUploadError(err); return }
    setUploadError(null)
    setPreview({ url: URL.createObjectURL(file), name: file.name })
  }

  async function handleAnalyze() {
    const file = inputRef.current?.files?.[0]
    if (!file || !preview) return
    setUploading(true)
    setUploadError(null)

    try {
      // 1. Upload photo to private storage under the user's folder
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${userId}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from(MEAL_PHOTOS_BUCKET)
        .upload(path, file, { cacheControl: '3600', upsert: false })
      if (uploadErr) { setUploadError(uploadErr.message); return }

      // 2. Call the Edge Function — it validates the JWT, fetches the image
      //    server-side, and sends it to Gemini. API keys never touch the browser.
      const { data: { session } } = await supabase.auth.getSession()
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-meal`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token ?? ''}`,
          },
          body: JSON.stringify({ photo_path: path }),
        },
      )

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({})) as { error?: string }
        const msg = body.error ?? `Server error (${resp.status})`
        setUploadError(msg)
        onError(msg)
        return
      }

      const result: GeminiAnalysisResult = await resp.json()
      onAnalysisReady(result, path, preview.url)
      clearSelection()
    } catch {
      const msg = 'Network error — please check your connection and try again.'
      setUploadError(msg)
      onError(msg)
    } finally {
      setUploading(false)
    }
  }

  function clearSelection() {
    if (preview?.url) URL.revokeObjectURL(preview.url)
    setPreview(null)
    setUploadError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <section className="card upload-card">
      <div className="upload-copy">
        <h2>Add meal photo</h2>
        <p>Take a photo or upload one to identify foods and estimate nutrition with Gemini.</p>
        <div className="upload-actions">
          <button
            className="primary"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            📷 &nbsp; Take photo or upload
          </button>
          <span className="gemini-tag">✦ Gemini food scan</span>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
        aria-label="Select meal photo"
      />

      {uploadError && (
        <p className="upload-error" role="alert">{uploadError}</p>
      )}

      {preview && (
        <div className="scan-preview">
          <img src={preview.url} alt="Selected meal preview" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong
              style={{
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {preview.name}
            </strong>
            <span>{uploading ? 'Uploading & analyzing…' : 'Ready for Gemini analysis'}</span>
          </div>
          <button
            className="text-button"
            onClick={handleAnalyze}
            disabled={uploading}
          >
            {uploading ? '…' : 'Analyze'}
          </button>
          <button
            className="icon-button"
            onClick={clearSelection}
            aria-label="Remove photo"
            disabled={uploading}
          >
            ✕
          </button>
        </div>
      )}
    </section>
  )
}
