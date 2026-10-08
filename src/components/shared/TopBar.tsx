import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'

export function TopBar() {
  const { user, signOut } = useAuth()
  const toast = useToast()

  async function handleSignOut() {
    await signOut()
    toast.show('Signed out successfully.')
  }

  const initial = user?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">🌿</span>
        NutriLens
      </div>
      <button
        className="profile-btn"
        onClick={handleSignOut}
        aria-label={`Sign out (${user?.email ?? ''})`}
        title={`Signed in as ${user?.email ?? ''} — click to sign out`}
      >
        {initial}
      </button>
    </header>
  )
}
