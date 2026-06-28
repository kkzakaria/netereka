# NETEREKA — Banners motion bench (Remotion)

A **self-contained** Remotion project used to author, preview, and (optionally) render
the storefront delivery banners as video/GIF. It is **not** part of the Next.js /
Cloudflare Workers build — it has its own `package.json` and dependencies so it never
ships to production.

> The banners that actually run on the store are dependency-free **CSS/SVG React
> components** in `components/storefront/banners/`. This bench exists to design the
> motion and to export a shareable MP4/GIF when marketing needs one (ads, social,
> WhatsApp, etc.).

## Usage

```bash
cd remotion
npm install

npm run dev      # Remotion Studio — live preview at http://localhost:3000
npm run render   # → out/delivery-abidjan.mp4 (transparent background)
npm run gif      # → out/delivery-abidjan.gif
npm run still    # → out/delivery-abidjan.png (single frame, default frame 90)
```

## Compositions

| ID                      | Size      | Loop      | Live counterpart                                            |
| ----------------------- | --------- | --------- | ---------------------------------------------------------- |
| `DeliveryBannerAbidjan` | 1600×202  | 6s (180f) | `components/storefront/banners/delivery-banner-abidjan.tsx` |

Theme: **« Livraison rapide · Partout à Abidjan »** — a delivery courier rides a
scooter (NETEREKA top-box) across an Abidjan night skyline over a glowing dashed road.

## Design notes

- Palette: night navy `#06223a → #0b3056`, mint `#00FF9C` / `#7bffcb`, cloud `#eaf6ff`.
- All periodic motion uses an **integer number of cycles** over the 180-frame loop so
  frame 180 lines up with frame 0 (seamless GIF/MP4).
- The live component keeps the same shapes/timings but drives them with CSS keyframes
  and respects `prefers-reduced-motion` (freezes to a resting frame).

## Adding the next banner

Each themed banner (paiement à la livraison, livraison gratuite, flotte NETEREKA…)
gets its own composition file + `<Composition>` entry in `src/Root.tsx`, and a matching
live component under `components/storefront/banners/`. Reuse the skyline/road/glow
layers; swap the subject (vehicle/icon) and the headline.
