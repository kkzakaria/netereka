"use client";

import { useActionState } from "react";
import { register, type AuthState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Turnstile } from "@/components/shared/turnstile";

export function RegisterForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(register, {});

  return (
    <form action={action} className="grid gap-4">
      {state.error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="firstName">Prénom</Label>
          <Input
            id="firstName"
            name="firstName"
            autoComplete="given-name"
            required
          />
          {state.fieldErrors?.firstName && (
            <p className="text-xs text-destructive">{state.fieldErrors.firstName[0]}</p>
          )}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="lastName">Nom</Label>
          <Input
            id="lastName"
            name="lastName"
            autoComplete="family-name"
            required
          />
          {state.fieldErrors?.lastName && (
            <p className="text-xs text-destructive">{state.fieldErrors.lastName[0]}</p>
          )}
        </div>
      </div>

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

      <div className="grid gap-1.5">
        <Label htmlFor="phone">Téléphone (optionnel)</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          placeholder="+225 07 00 00 00"
          autoComplete="tel"
        />
        {state.fieldErrors?.phone && (
          <p className="text-xs text-destructive">{state.fieldErrors.phone[0]}</p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
        {state.fieldErrors?.password && (
          <p className="text-xs text-destructive">{state.fieldErrors.password[0]}</p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
        {state.fieldErrors?.confirmPassword && (
          <p className="text-xs text-destructive">{state.fieldErrors.confirmPassword[0]}</p>
        )}
      </div>

      <Turnstile />

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Création..." : "Créer mon compte"}
      </Button>
    </form>
  );
}
