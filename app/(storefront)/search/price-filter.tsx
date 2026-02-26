"use client";

import { useEffect, useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils/format";

interface PriceFilterProps {
  priceRange: { min: number; max: number };
  activeMin: string;
  activeMax: string;
  onUpdate: (min: string | null, max: string | null) => void;
}

function parsePrice(value: string, fallback: number): number {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

export function PriceFilter({ priceRange, activeMin, activeMax, onUpdate }: PriceFilterProps) {
  const initMin = parsePrice(activeMin, priceRange.min);
  const initMax = parsePrice(activeMax, priceRange.max);

  const [localMin, setLocalMin] = useState(initMin);
  const [localMax, setLocalMax] = useState(initMax);
  // Separate string state allows free typing in inputs without clamping mid-entry.
  const [minInput, setMinInput] = useState(String(initMin));
  const [maxInput, setMaxInput] = useState(String(initMax));
  // Track last URL values to detect any external change to price params — full resets
  // ("Réinitialiser les filtres", "Tout effacer") or individual chip removals.
  const [prevActive, setPrevActive] = useState({ min: activeMin, max: activeMax });
  // ReturnType<typeof setTimeout> avoids the number vs NodeJS.Timeout environment split.
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync when URL changes externally without user interaction.
  // Called during render (not useEffect) to avoid a one-frame flash of stale values.
  // React's getDerivedStateFromProps replacement pattern: calling setState during render
  // is safe only because the condition prevents re-triggering on the resulting re-render.
  if (prevActive.min !== activeMin || prevActive.max !== activeMax) {
    const newMin = parsePrice(activeMin, priceRange.min);
    const newMax = parsePrice(activeMax, priceRange.max);
    setPrevActive({ min: activeMin, max: activeMax });
    setLocalMin(newMin);
    setLocalMax(newMax);
    setMinInput(String(newMin));
    setMaxInput(String(newMax));
  }

  // Debounces the URL update by 500 ms to avoid pushing a history entry on every
  // slider tick. Passes null for params at the range boundary so the URL stays clean
  // (e.g., no ?min_price=0 when the range starts at 0).
  function scheduleUpdate(min: number, max: number) {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onUpdate(
        min !== priceRange.min ? String(min) : null,
        max !== priceRange.max ? String(max) : null,
      );
    }, 500);
  }

  useEffect(() => () => clearTimeout(timerRef.current), []);

  function handleSliderChange([min, max]: [number, number]) {
    setLocalMin(min);
    setLocalMax(max);
    setMinInput(String(min));
    setMaxInput(String(max));
    scheduleUpdate(min, max);
  }

  function handleMinBlur() {
    const clamped = Math.max(priceRange.min, Math.min(parsePrice(minInput, priceRange.min), localMax));
    setLocalMin(clamped);
    setMinInput(String(clamped));
    scheduleUpdate(clamped, localMax);
  }

  function handleMaxBlur() {
    const clamped = Math.min(priceRange.max, Math.max(parsePrice(maxInput, priceRange.max), localMin));
    setLocalMax(clamped);
    setMaxInput(String(clamped));
    scheduleUpdate(localMin, clamped);
  }

  return (
    <fieldset>
      <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Prix
      </legend>
      <Slider
        min={priceRange.min}
        max={priceRange.max}
        step={500}
        value={[localMin, localMax]}
        onValueChange={handleSliderChange}
        className="mb-4"
      />
      <div className="flex items-center gap-2">
        <Input
          type="number"
          aria-label="Prix minimum"
          value={minInput}
          onChange={(e) => setMinInput(e.target.value)}
          onBlur={handleMinBlur}
          min={priceRange.min}
          max={priceRange.max}
          className="h-8 text-xs"
        />
        <span className="shrink-0 text-muted-foreground" aria-hidden="true">—</span>
        <Input
          type="number"
          aria-label="Prix maximum"
          value={maxInput}
          onChange={(e) => setMaxInput(e.target.value)}
          onBlur={handleMaxBlur}
          min={priceRange.min}
          max={priceRange.max}
          className="h-8 text-xs"
        />
      </div>
      <p className="mt-1.5 text-[10px] text-muted-foreground">
        {formatPrice(priceRange.min)} — {formatPrice(priceRange.max)}
      </p>
    </fieldset>
  );
}
