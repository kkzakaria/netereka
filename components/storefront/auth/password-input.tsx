"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

type PasswordInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type"
>;

export function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={`pr-10 h-9 ${props.className ?? ""}`} />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
      >
        <HugeiconsIcon
          icon={visible ? ViewOffSlashIcon : ViewIcon}
          size={16}
        />
        <span className="sr-only">
          {visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        </span>
      </Button>
    </div>
  );
}
