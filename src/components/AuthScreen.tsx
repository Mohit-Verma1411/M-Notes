import { useState, type FormEvent } from "react"
import { Feather, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signIn, signUp } from "@/lib/api"

interface AuthScreenProps {
  onAuthed: () => void
  onLocal: () => void
  unavailable?: boolean
}

export function AuthScreen({ onAuthed, onLocal, unavailable }: AuthScreenProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === "signup") {
        await signUp(email, password)
      } else {
        await signIn(email, password)
      }
      onAuthed()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh w-full items-center justify-center px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)]">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary">
            <Feather className="size-4 text-primary-foreground" />
          </span>
          <h1 className="font-serif text-xl font-medium tracking-tight">
            M Notes
          </h1>
        </div>

        <h2 className="font-serif text-2xl font-medium tracking-tight">
          {mode === "signin" ? "Welcome back." : "Create your account."}
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {mode === "signin"
            ? "Sign in to reach your notes from any device."
            : "Keep your notes together, everywhere you write."}
        </p>

        {unavailable && (
          <div className="mt-7 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
            Sign-in isn&apos;t connected to a server on this build yet. Keep your
            notes on this device for now, or deploy the sync server to enable
            accounts.
          </div>
        )}

        <form onSubmit={submit} className="mt-7 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="auth-email">Email</Label>
            <Input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              disabled={unavailable}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="auth-password">Password</Label>
            <Input
              id="auth-password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              disabled={unavailable}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={mode === "signup" ? "At least 6 characters" : undefined}
              className="h-10"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            disabled={busy || unavailable}
            className="h-10 w-full rounded-lg"
          >
            {unavailable ? (
              "Sync not available"
            ) : busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : mode === "signin" ? (
              "Sign in"
            ) : (
              "Create account"
            )}
          </Button>
        </form>

        <p className="mt-5 text-sm text-muted-foreground">
          {mode === "signin" ? (
            <>
              New here?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signup")
                  setError(null)
                }}
                className="font-medium text-foreground underline underline-offset-4"
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signin")
                  setError(null)
                }}
                className="font-medium text-foreground underline underline-offset-4"
              >
                Sign in
              </button>
            </>
          )}
        </p>

        <button
          type="button"
          onClick={onLocal}
          className="mt-8 text-xs text-muted-foreground/70 underline underline-offset-4"
        >
          Use notes on this device only
        </button>
      </div>
    </div>
  )
}