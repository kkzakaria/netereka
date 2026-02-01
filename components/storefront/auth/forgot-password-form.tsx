"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Turnstile } from "@/components/shared/turnstile";

export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="text-center text-sm text-muted-foreground">
        Si un compte existe avec cet email, vous recevrez un lien de
        réinitialisation.
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // TODO: implement password reset email sending
        setSubmitted(true);
      }}
      className="grid gap-4"
    >
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
      </div>

      <Turnstile />

      <Button type="submit" size="lg" className="w-full">
        Envoyer le lien
      </Button>
    </form>
  );
}
