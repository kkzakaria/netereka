"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";

/**
 * Ferme le bandeau des fêtes et s'en souvient dans un cookie lu par le
 * serveur : au chargement suivant, le bandeau n'est pas rendu du tout, donc
 * aucun flash ni saut de mise en page.
 */
export function FermerBandeau({
  nomCookie,
  maxAgeSecondes,
}: {
  nomCookie: string;
  maxAgeSecondes: number;
}) {
  const [ferme, setFerme] = useState(false);

  if (ferme) {
    return <style>{`[data-slot="bandeau-fetes"]{display:none}`}</style>;
  }

  return (
    <button
      type="button"
      aria-label="Fermer le message des fêtes"
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-md opacity-80 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      onClick={() => {
        document.cookie = `${nomCookie}=1; Path=/; Max-Age=${maxAgeSecondes}; SameSite=Lax`;
        setFerme(true);
      }}
    >
      <HugeiconsIcon icon={Cancel01Icon} className="size-5" aria-hidden="true" />
    </button>
  );
}
