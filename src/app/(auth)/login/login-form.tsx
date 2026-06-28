'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { signIn, type SignInState } from './actions'

const initialState: SignInState = { error: null }

/**
 * The functional sign-in form. Submits to the `signIn` Server Action via
 * `useActionState`; on invalid credentials the action returns a generic error
 * that is rendered inline. The email is a controlled input so it survives a
 * failed attempt; the password is intentionally not retained.
 *
 * There is no sign-up link or form here, by design.
 */
export function LoginForm() {
  const [state, formAction] = useActionState(signIn, initialState)
  const [email, setEmail] = useState('')

  return (
    <form
      action={formAction}
      noValidate
      className="flex flex-col gap-5 rounded-card border border-border bg-card/60 p-6 shadow-2xl shadow-black/20"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@yourcompany.com"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "login-error" : undefined}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "login-error" : undefined}
        />
      </div>

      {state.error ? (
        <p
          id="login-error"
          role="alert"
          aria-live="polite"
          className="text-small text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} className="mt-1 h-11 w-full">
      {pending ? 'Signing in…' : 'Sign in'}
    </Button>
  )
}
