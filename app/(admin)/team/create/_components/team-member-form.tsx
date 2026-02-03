"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon, ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createTeamMember } from "@/actions/admin/team";
import { TEAM_ROLE_OPTIONS, JOB_TITLE_OPTIONS } from "@/lib/constants/team";

const formSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Minimum 8 caractères"),
  firstName: z.string().min(1, "Prénom requis"),
  lastName: z.string().min(1, "Nom requis"),
  phone: z.string().optional(),
  role: z.enum(["admin", "super_admin"]),
  jobTitle: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function TeamMemberForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: "admin",
    },
  });

  const selectedRole = watch("role");
  const selectedJobTitle = watch("jobTitle");

  function onSubmit(data: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createTeamMember(data);
      if (result.success) {
        router.push("/team");
      } else {
        setError(result.error || "Une erreur est survenue");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>Nouveau membre</CardTitle>
          <CardDescription>
            Créez un compte pour un nouveau membre de l&apos;équipe
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Name fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom</Label>
              <Input
                id="firstName"
                {...register("firstName")}
                placeholder="Jean"
              />
              {errors.firstName && (
                <p className="text-sm text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom</Label>
              <Input
                id="lastName"
                {...register("lastName")}
                placeholder="Dupont"
              />
              {errors.lastName && (
                <p className="text-sm text-destructive">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="jean.dupont@netereka.com"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                {...register("password")}
                placeholder="Minimum 8 caractères"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <HugeiconsIcon
                  icon={showPassword ? ViewOffIcon : ViewIcon}
                  size={18}
                />
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone (optionnel)</Label>
            <Input
              id="phone"
              type="tel"
              {...register("phone")}
              placeholder="+225 XX XX XX XX XX"
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label>Rôle</Label>
            <Select
              value={selectedRole}
              onValueChange={(value: "admin" | "super_admin") =>
                setValue("role", value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                {TEAM_ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-sm text-destructive">{errors.role.message}</p>
            )}
          </div>

          {/* Job Title */}
          <div className="space-y-2">
            <Label>Poste (optionnel)</Label>
            <Select
              value={selectedJobTitle || ""}
              onValueChange={(value) => setValue("jobTitle", value || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un poste" />
              </SelectTrigger>
              <SelectContent>
                {JOB_TITLE_OPTIONS.map((title) => (
                  <SelectItem key={title} value={title}>
                    {title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <HugeiconsIcon
                    icon={Loading03Icon}
                    size={16}
                    className="animate-spin"
                  />
                  Création...
                </>
              ) : (
                "Créer le membre"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
