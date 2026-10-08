import { type FormEvent, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

type Mode = 'signin' | 'signup' | 'reset'

export function AuthScreen() {
  const { signIn, signUp, resetPassword } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [infoMsg, setInfoMsg] = useState<string | null>(null)

  function reset() {
    setErrorMsg(null)
    setInfoMsg(null)
    setPassword('')
    setConfirm('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    setInfoMsg(null)

    if (mode === 'signup' && password !== confirm) {
      setErrorMsg('Passwords do not match.')
      return
    }

    setLoading(true)
    let err: string | null = null

    if (mode === 'signin') {
      err = await signIn(email, password)
    } else if (mode === 'signup') {
      err = await signUp(email, password)
      if (!err) setInfoMsg('Account created! Check your email to confirm your address.')
    } else {
      err = await resetPassword(email)
      if (!err) setInfoMsg('Password reset link sent — check your inbox.')
    }

    setLoading(false)
    if (err) setErrorMsg(err)
  }

  return (
    <section className="auth-wrap">
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">🌿</span>
          NutriLens
        </div>

        {mode === 'signin' && <h1>Welcome back</h1>}
        {mode === 'signup' && <h1>Create account</h1>}
        {mode === 'reset' && <h1>Reset password</h1>}

        <p className="sub">
          {mode === 'signin' && 'Sign in to see your food log and nutrition progress.'}
          {mode === 'signup' && 'Start tracking your meals and nutrition goals.'}
          {mode === 'reset' && "Enter your email and we'll send a reset link."}
        </p>

        {errorMsg && <div className="auth-error" role="alert">{errorMsg}</div>}
        {infoMsg && <div className="auth-info" role="status">{infoMsg}</div>}

        <div className="field">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {mode !== 'reset' && (
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder={mode === 'signup' ? 'At least 8 characters' : 'Enter your password'}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        )}

        {mode === 'signup' && (
          <div className="field">
            <label htmlFor="confirm">Confirm password</label>
            <input
              id="confirm"
              type="password"
              placeholder="Repeat your password"
              autoComplete="new-password"
              minLength={8}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        )}

        <button className="primary" style={{ width: '100%', marginTop: 7 }} type="submit" disabled={loading}>
          {loading
            ? 'Please wait…'
            : mode === 'signin'
              ? 'Sign in'
              : mode === 'signup'
                ? 'Create account'
                : 'Send reset link'}
        </button>

        <p className="auth-toggle">
          {mode === 'signin' && (
            <>
              New to NutriLens?{' '}
              <button className="link-button" type="button" onClick={() => { reset(); setMode('signup') }}>
                Create an account
              </button>
              {' · '}
              <button className="link-button" type="button" onClick={() => { reset(); setMode('reset') }}>
                Forgot password?
              </button>
            </>
          )}
          {mode === 'signup' && (
            <>
              Already have an account?{' '}
              <button className="link-button" type="button" onClick={() => { reset(); setMode('signin') }}>
                Sign in
              </button>
            </>
          )}
          {mode === 'reset' && (
            <button className="link-button" type="button" onClick={() => { reset(); setMode('signin') }}>
              ← Back to sign in
            </button>
          )}
        </p>
      </form>
    </section>
  )
}
