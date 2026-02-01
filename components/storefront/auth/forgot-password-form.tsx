"use client";

import { useActionState } from "react";
import { forgotPassword, type AuthState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Turnstile } from "@/components/shared/turnstile";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(forgotPassword, {});

  if (state.success) {
    return (
      <div className="text-center text-sm text-muted-foreground">
        Si un compte existe avec cet email, vous recevrez un lien de
        réinitialisation.
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-4">
      {state.error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {state.error}
        </div>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="vous@exemple.com"
          autoComplete="email"
          required
        />
        {state.fieldErrors?.email && (
          <p className="text-xs text-destructive">{state.fieldErrors.email[0]}</p>
        )}
      </div>

      <Turnstile />

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Envoi..." : "Envoyer le lien"}
      </Button>
    </form>
  );
}
