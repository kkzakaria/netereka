# Hero Carousel Redesign - Design Document

**Date:** 2026-02-16
**Status:** Approved

## Goal

Replace the current static single-product hero banner with an immersive full-screen carousel powered by a banner management system. The hero should feel premium (glassmorphism aesthetic) and give admins full control over promotional content with scheduling.

## Approach

**Embla Carousel + Banner Management System** — Embla handles swipe/autoplay/transitions (3kb gzipped), banners are stored in D1 via Drizzle ORM, managed through the existing admin interface.

## Visual Design

### Layout
- Container: `rounded-2xl overflow-hidden` within `max-w-7xl`
- Height: `h-[280px] sm:h-[400px] lg:h-[480px]`
- Each slide: custom gradient background (colors from DB)
- 2-column grid: glass card with text (left) + product image (right)
- Decorative orbs: mint circle top-right (10% opacity, blur-3xl), white circle bottom-left (5% opacity, blur-2xl)

### Glassmorphism Card
- `bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 sm:p-8 shadow-2xl`
- Contains: badge pill, title, subtitle, optional price, CTA button

### Badge
- Configurable text ("Nouveau", "Promo -20%", etc.)
- Color variants: mint (default), red, orange, blue
- Style: small pill, uppercase, tracking-wide

### CTA Button
- `rounded-full bg-white text-hero-bg px-6 py-3 font-semibold`
- ChevronRight icon
- Customizable text per banner (default: "Découvrir")

### Responsive
- Mobile: vertical stack (image above, text below), reduced height
- Tablet/Desktop: 2-column grid

### Dots Indicators
- Bottom center, within the hero section
- Default: `w-2 h-2 rounded-full bg-white/40`
- Active: `w-6 h-2 rounded-full bg-white` (elongated pill)
- Clickable for direct navigation

## Database Schema

### Table: `banners`

| Column | Type | Description |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| title | TEXT NOT NULL | Main heading |
| subtitle | TEXT | Marketing sub-headline |
| badge_text | TEXT | Badge label (nullable) |
| badge_color | TEXT DEFAULT "mint" | "mint" / "red" / "orange" / "blue" |
| image_url | TEXT | R2 image key |
| link_url | TEXT NOT NULL | Destination URL |
| cta_text | TEXT DEFAULT "Découvrir" | CTA button text |
| price | INTEGER | Price in XOF (nullable) |
| bg_gradient_from | TEXT DEFAULT "#183C78" | Gradient start color |
| bg_gradient_to | TEXT DEFAULT "#1E4A8F" | Gradient end color |
| display_order | INTEGER DEFAULT 0 | Sort order |
| is_active | BOOLEAN DEFAULT true | Active toggle |
| starts_at | TEXT | ISO datetime, null = immediate |
| ends_at | TEXT | ISO datetime, null = permanent |
| created_at | TEXT | Auto-set |
| updated_at | TEXT | Auto-set |

### Query Logic

Active banners = `is_active = true AND (starts_at IS NULL OR starts_at <= now) AND (ends_at IS NULL OR ends_at > now)`, ordered by `display_order ASC`.

### Fallback

If no active banners exist, display the first 3 featured products in the carousel using the glassmorphism design (auto-generated slides).

## Carousel (Embla)

- **Library:** `embla-carousel-react` + `embla-carousel-autoplay`
- **Config:** `{ loop: true, duration: 30 }`
- **Autoplay:** 5s delay, stops on interaction
- **Slide 1:** `priority` + `fetchPriority="high"` for LCP
- **Slides 2+:** `loading="lazy"`

### Accessibility
- `role="region" aria-roledescription="carousel"`
- Slides: `role="tabpanel" aria-roledescription="slide"`
- Dots: `role="tablist"` with `role="tab"` + `aria-selected`
- Pause/play button for autoplay
- `prefers-reduced-motion`: disables autoplay

## Admin Interface

### Banner List (`/admin/banners`)
- Table with: thumbnail preview, title, status badge (active/scheduled/expired), dates, order
- Actions: edit, toggle active, delete

### Banner Form (`/admin/banners/new`, `/admin/banners/[id]/edit`)
- Fields: title, subtitle, badge (text + color), image upload (R2), link URL, CTA text, price, gradient colors, scheduling dates, active toggle
- Live preview of the slide rendering

## Scope

### V1 (Current)
- Hero carousel component with Embla
- `banners` table + Drizzle schema
- Admin CRUD (list + form)
- Scheduling (starts_at / ends_at filtering)
- Fallback to featured products
- Responsive + accessible

### V2 (Future)
- Drag & drop reordering in admin
- Predefined slide templates
- Analytics (impressions / clicks)
- Full CMS visual editor
