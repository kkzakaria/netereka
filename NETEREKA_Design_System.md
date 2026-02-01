# Design System - NETEREKA Electronic

## Guide de Style & Composants UI

**Version :** 1.0  
**Date :** Janvier 2026  
**Plateforme :** Web (Mobile-First) + PWA

---

## Table des Matières

1. [Philosophie Design](#1-philosophie-design)
2. [Palette de Couleurs](#2-palette-de-couleurs)
3. [Typographie](#3-typographie)
4. [Espacements & Grille](#4-espacements--grille)
5. [Composants UI](#5-composants-ui)
6. [Iconographie](#6-iconographie)
7. [Images & Médias](#7-images--médias)
8. [Motion & Animations](#8-motion--animations)
9. [Patterns UX Mobile-First](#9-patterns-ux-mobile-first)
10. [Pages Clés - Wireframes](#10-pages-clés---wireframes)
11. [Accessibilité](#11-accessibilité)
12. [Implémentation Tailwind](#12-implémentation-tailwind)

---

## 1. Philosophie Design

### Vision

NETEREKA adopte un design **premium et épuré** inspiré des Apple Store et Google Store, tout en étant **accessible au grand public ivoirien**. L'expérience doit être intuitive pour un utilisateur de 15 ans comme pour un adulte peu familier avec le e-commerce.

### Principes Fondamentaux

| Principe | Description |
|----------|-------------|
| **Clarté** | Hiérarchie visuelle forte, information digestible, pas de surcharge |
| **Confiance** | Design professionnel qui inspire la crédibilité (crucial pour le paiement à la livraison) |
| **Rapidité** | Performance perçue élevée, transitions fluides, feedback immédiat |
| **Mobile-First** | Conçu pour le pouce, optimisé pour la 4G, images légères |
| **Accessibilité** | Contrastes élevés, touch targets généreux (min 44px), texte lisible |

### Ton & Personnalité

```
Professionnel ←――――●―――――→ Décontracté
                  ↑
         NETEREKA : Moderne mais accessible

Minimaliste ←―――――●――――――→ Riche
                  ↑
         NETEREKA : Épuré avec accents visuels

Sobre ←―――――――――●――――――→ Dynamique
                ↑
         NETEREKA : Énergique mais maîtrisé
```

---

## 2. Palette de Couleurs

### Couleurs Principales (extraites du logo)

| Nom | Hex | RGB | Usage |
|-----|-----|-----|-------|
| **Navy Blue** | `#183C78` | rgb(24, 60, 120) | Couleur principale, headers, textes importants |
| **Mint Green** | `#00FF9C` | rgb(0, 255, 156) | Accent, CTA, succès, éléments interactifs |

### Palette Étendue

#### Bleus (Primary)

```
navy-950: #0D1F3C   ← Plus foncé (footer, overlays)
navy-900: #132D5C   ← Foncé
navy-800: #183C78   ← BASE LOGO ★
navy-700: #1E4A8F   ← Hover states
navy-600: #2558A6   ← Liens
navy-500: #3B6DB8   ← Secondary text
navy-100: #E8EEF7   ← Backgrounds légers
navy-50:  #F4F7FB   ← Background très léger
```

#### Verts Mint (Accent)

```
mint-500: #00FF9C   ← BASE LOGO ★ (Accent principal)
mint-400: #33FFAF   ← Hover
mint-300: #66FFC2   ← Disabled/léger
mint-600: #00CC7D   ← Texte sur fond clair (meilleur contraste)
mint-700: #00995E   ← Texte accessible
```

#### Neutres

```
gray-950: #0A0A0B   ← Texte principal
gray-900: #171719   ← Titres
gray-800: #27272A   ← Texte body
gray-600: #52525B   ← Texte secondaire
gray-400: #A1A1AA   ← Placeholder, disabled
gray-200: #E4E4E7   ← Borders
gray-100: #F4F4F5   ← Background sections
gray-50:  #FAFAFA   ← Background page
white:    #FFFFFF   ← Cards, surfaces
```

#### Sémantiques

```
success:  #10B981   ← Confirmations, en stock
warning:  #F59E0B   ← Alertes, stock faible
error:    #EF4444   ← Erreurs, rupture stock
info:     #3B82F6   ← Informations
```

### Gradients

```css
/* Gradient principal - pour CTA premium */
.gradient-primary {
  background: linear-gradient(135deg, #183C78 0%, #1E4A8F 100%);
}

/* Gradient accent - pour badges, highlights */
.gradient-accent {
  background: linear-gradient(135deg, #00CC7D 0%, #00FF9C 100%);
}

/* Gradient hero - pour sections hero */
.gradient-hero {
  background: linear-gradient(180deg, #F4F7FB 0%, #FFFFFF 100%);
}
```

### Modes Clair/Sombre

| Élément | Mode Clair | Mode Sombre |
|---------|------------|-------------|
| Background | `#FAFAFA` | `#0A0A0B` |
| Surface (cards) | `#FFFFFF` | `#171719` |
| Texte principal | `#171719` | `#FAFAFA` |
| Texte secondaire | `#52525B` | `#A1A1AA` |
| Borders | `#E4E4E7` | `#27272A` |
| Primary | `#183C78` | `#3B6DB8` |
| Accent | `#00CC7D` | `#00FF9C` |

> **Note :** Mode sombre optionnel pour la Phase 2. Priorité au mode clair pour le MVP.

---

## 3. Typographie

### Police Principale : Inter

**Pourquoi Inter ?**
- Excellente lisibilité sur mobile
- Optimisée pour les écrans
- Support complet des caractères français
- Gratuite (Google Fonts)
- Similaire à SF Pro (Apple) dans l'esprit

### Alternatives

| Priorité | Police | Fallback |
|----------|--------|----------|
| 1 | Inter | - |
| 2 | -apple-system | iOS |
| 3 | BlinkMacSystemFont | macOS Chrome |
| 4 | Segoe UI | Windows |
| 5 | sans-serif | Universel |

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### Échelle Typographique

| Nom | Taille Mobile | Taille Desktop | Line Height | Poids | Usage |
|-----|---------------|----------------|-------------|-------|-------|
| `display-lg` | 36px | 48px | 1.1 | 700 | Hero headlines |
| `display-md` | 30px | 36px | 1.2 | 700 | Page titles |
| `heading-lg` | 24px | 30px | 1.3 | 600 | Section titles |
| `heading-md` | 20px | 24px | 1.3 | 600 | Card titles |
| `heading-sm` | 18px | 20px | 1.4 | 600 | Subsections |
| `body-lg` | 18px | 18px | 1.6 | 400 | Lead text |
| `body-md` | 16px | 16px | 1.6 | 400 | Body text ★ |
| `body-sm` | 14px | 14px | 1.5 | 400 | Secondary text |
| `caption` | 12px | 12px | 1.4 | 400 | Labels, captions |
| `overline` | 12px | 12px | 1.4 | 500 | Catégories, badges |

### Exemples d'Application

```
DISPLAY-LG (Hero)
"iPhone 15 Pro Max"
36px mobile / 48px desktop, Bold

HEADING-LG (Section)
"Smartphones"
24px mobile / 30px desktop, Semibold

BODY-MD (Description)
"Découvrez notre sélection de smartphones..."
16px, Regular, line-height 1.6

PRICE (Spécial)
"450 000 FCFA"
24px, Bold, Navy Blue
```

---

## 4. Espacements & Grille

### Système d'Espacement (Base 4px)

```
space-0:   0px
space-1:   4px    ← Micro espacements
space-2:   8px    ← Entre éléments liés
space-3:   12px   ← Padding boutons
space-4:   16px   ← Padding cards ★
space-5:   20px   ← Gap grilles
space-6:   24px   ← Sections internes
space-8:   32px   ← Entre sections
space-10:  40px   ← Margins sections
space-12:  48px   ← Grands espacements
space-16:  64px   ← Hero padding
space-20:  80px   ← Footer padding
space-24:  96px   ← Très grands espacements
```

### Grille Responsive

#### Breakpoints

| Nom | Largeur | Colonnes | Gouttière | Marges |
|-----|---------|----------|-----------|--------|
| `xs` | < 640px | 4 | 16px | 16px |
| `sm` | ≥ 640px | 8 | 20px | 24px |
| `md` | ≥ 768px | 8 | 24px | 32px |
| `lg` | ≥ 1024px | 12 | 24px | 40px |
| `xl` | ≥ 1280px | 12 | 32px | Auto (max 1280px) |

#### Grille Produits

| Écran | Colonnes | Card Width |
|-------|----------|------------|
| Mobile (xs) | 2 | ~160px |
| Tablet (sm/md) | 3 | ~200px |
| Desktop (lg) | 4 | ~280px |
| Large (xl) | 4-5 | ~300px |

### Container Max Widths

```css
.container-sm { max-width: 640px; }   /* Pages étroites */
.container-md { max-width: 768px; }   /* Checkout, auth */
.container-lg { max-width: 1024px; }  /* Standard */
.container-xl { max-width: 1280px; }  /* Catalogue ★ */
```

---

## 5. Composants UI

### 5.1 Boutons

#### Hiérarchie

| Type | Usage | Style |
|------|-------|-------|
| **Primary** | CTA principal (Ajouter au panier, Commander) | Fond Navy, texte blanc |
| **Secondary** | Actions secondaires | Bordure Navy, texte Navy |
| **Accent** | Promotions, highlights | Fond Mint, texte Navy |
| **Ghost** | Navigation, actions tertiaires | Texte seul |
| **Danger** | Suppressions | Fond rouge |

#### Spécifications Primary Button

```
┌─────────────────────────────────┐
│                                 │
│       Ajouter au panier         │  ← Texte centré
│                                 │
└─────────────────────────────────┘

Mobile:
- Width: 100% (full width)
- Height: 52px (touch-friendly)
- Font: 16px, Semibold
- Padding: 16px 24px
- Border-radius: 12px
- Background: #183C78
- Text: #FFFFFF

Desktop:
- Width: auto (min 160px)
- Height: 48px

États:
- Hover: #1E4A8F (plus clair)
- Active: #132D5C (plus foncé)
- Disabled: #A1A1AA background, cursor not-allowed
- Loading: Spinner + texte "Chargement..."
```

#### Code Tailwind

```tsx
// Primary Button
<button className="
  w-full sm:w-auto
  h-13 sm:h-12
  px-6 py-3
  bg-navy-800 hover:bg-navy-700 active:bg-navy-900
  text-white font-semibold text-base
  rounded-xl
  transition-colors duration-200
  disabled:bg-gray-400 disabled:cursor-not-allowed
  flex items-center justify-center gap-2
">
  Ajouter au panier
</button>

// Secondary Button
<button className="
  w-full sm:w-auto
  h-13 sm:h-12
  px-6 py-3
  bg-transparent
  border-2 border-navy-800
  text-navy-800 font-semibold text-base
  rounded-xl
  hover:bg-navy-50
  transition-colors duration-200
">
  Voir les détails
</button>

// Accent Button
<button className="
  px-6 py-3
  bg-mint-500 hover:bg-mint-400
  text-navy-900 font-semibold
  rounded-xl
  transition-colors duration-200
">
  Profiter de l'offre
</button>
```

### 5.2 Cards Produit

#### Structure Mobile

```
┌────────────────────────┐
│ ┌────────────────────┐ │
│ │                    │ │
│ │      [Image]       │ │  ← Ratio 1:1, lazy loading
│ │                    │ │
│ │  ♥ (wishlist)      │ │  ← Icon overlay top-right
│ └────────────────────┘ │
│                        │
│ Catégorie              │  ← Overline, Mint, 12px
│ Nom du Produit         │  ← Heading-sm, 2 lignes max
│ ★★★★☆ (24)            │  ← Rating, optionnel
│                        │
│ 450 000 FCFA           │  ← Prix, Bold, Navy
│ 500 000 FCFA           │  ← Prix barré, gris, optionnel
│                        │
│ [  Ajouter  ]          │  ← Button compact ou icône
└────────────────────────┘

Dimensions Mobile:
- Width: ~160px (2 colonnes)
- Image: 160x160px
- Padding: 12px
- Border-radius: 16px
- Shadow: subtle (0 2px 8px rgba(0,0,0,0.08))
- Background: white
```

#### Code Composant

```tsx
// components/storefront/product-card.tsx
interface ProductCardProps {
  product: {
    name: string;
    slug: string;
    price: number;
    comparePrice?: number;
    category: string;
    image: string;
    rating?: number;
    reviewCount?: number;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article
      aria-label={product.name}
      className="
        group
        bg-white rounded-2xl
        shadow-sm hover:shadow-md
        transition-shadow duration-300
        overflow-hidden
      "
    >
      {/* Image Container */}
      <div className="relative aspect-square bg-gray-50">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        
        {/* Wishlist Button */}
        <button
          aria-label={`Ajouter ${product.name} aux favoris`}
          className="
            absolute top-3 right-3
            w-10 h-10
            bg-white/80 backdrop-blur-sm
            rounded-full
            flex items-center justify-center
            hover:bg-white
            transition-colors
          "
        >
          <HeartIcon aria-hidden="true" className="w-5 h-5 text-gray-600" />
        </button>
        
        {/* Badge Promo (optionnel) */}
        {product.comparePrice && (
          <span className="
            absolute top-3 left-3
            px-2 py-1
            bg-mint-500 text-navy-900
            text-xs font-semibold
            rounded-full
          ">
            -{Math.round((1 - product.price / product.comparePrice) * 100)}%
          </span>
        )}
      </div>
      
      {/* Content */}
      <div className="p-3 sm:p-4">
        {/* Category */}
        <span className="text-xs font-medium text-mint-600 uppercase tracking-wide">
          {product.category}
        </span>
        
        {/* Name */}
        <h3 className="mt-1 text-base font-semibold text-gray-900 line-clamp-2">
          <Link href={`/p/${product.slug}`} className="hover:text-navy-700">
            {product.name}
          </Link>
        </h3>
        
        {/* Rating */}
        {product.rating && (
          <div className="mt-1 flex items-center gap-1">
            <StarRating value={product.rating} />
            <span className="text-xs text-gray-500">({product.reviewCount})</span>
          </div>
        )}
        
        {/* Price */}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-bold text-navy-800">
            {formatPrice(product.price)}
          </span>
          {product.comparePrice && (
            <span className="text-sm text-gray-400 line-through">
              {formatPrice(product.comparePrice)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
```

### 5.3 Navigation Mobile

#### Header Optimisé (AppBar Unique)

Design épuré inspiré Apple Store - **pas de bottom navigation bar** pour maximiser l'espace contenu et garder une esthétique premium.

```
┌─────────────────────────────────────────────┐
│  ☰  [NETEREKA]              🔍  🛒(3)  👤  │
│ Menu  Logo                 Search Cart User │
└─────────────────────────────────────────────┘

Specs:
- Height: 56px
- Position: sticky top
- Background: white (avec backdrop-blur au scroll)
- Border-bottom: 1px solid gray-200
- Shadow on scroll: 0 2px 8px rgba(0,0,0,0.08)
- Z-index: 50

Éléments:
- Menu hamburger (gauche): ouvre drawer catégories
- Logo (gauche, après menu): cliquable → retour accueil
- Icônes (droite): Search, Cart avec badge, User
```

#### Spécifications des Icônes Header

| Position | Icône | Taille | Action |
|----------|-------|--------|--------|
| Gauche | ☰ Menu | 24px | Ouvre drawer navigation |
| Gauche | Logo | auto | Cliquable → retour accueil |
| Droite | 🔍 Search | 24px | Ouvre recherche fullscreen |
| Droite | 🛒 Cart | 24px + badge | Ouvre drawer panier |
| Droite | 👤 User | 24px | Connexion ou Menu compte |

#### Code Header

```tsx
// components/storefront/header.tsx
export function Header({ cartCount = 0 }) {
  return (
    <header className="
      sticky top-0 z-50
      h-14
      bg-white/95 backdrop-blur-md
      border-b border-gray-200
      px-4
      flex items-center justify-between
      transition-shadow duration-200
    ">
      {/* Gauche: Menu + Logo */}
      <div className="flex items-center gap-2">
        <button
          className="p-2.5 -ml-2.5 text-gray-600 hover:text-gray-900 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Menu de navigation"
        >
          <MenuIcon className="w-6 h-6" />
        </button>
        
        <Link href="/">
          <Logo className="h-8" />
        </Link>
      </div>
      
      {/* Droite: Search, Cart, User */}
      <nav aria-label="Actions rapides" className="flex items-center gap-1">
        <button 
          className="p-2.5 text-gray-600 hover:text-gray-900 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Rechercher"
        >
          <SearchIcon className="w-6 h-6" />
        </button>
        
        <button 
          className="p-2.5 text-gray-600 hover:text-gray-900 relative min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label={`Panier (${cartCount} article${cartCount > 1 ? "s" : ""})`}
        >
          <ShoppingCartIcon className="w-6 h-6" />
          {cartCount > 0 && (
            <span className="
              absolute -top-0.5 -right-0.5
              w-5 h-5
              bg-mint-500 text-navy-900
              text-xs font-bold
              rounded-full
              flex items-center justify-center
            ">
              {cartCount > 9 ? "9+" : cartCount}
            </span>
          )}
        </button>
        
        <button 
          className="p-2.5 text-gray-600 hover:text-gray-900 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Mon compte"
        >
          <UserIcon className="w-6 h-6" />
        </button>
      </nav>
    </header>
  );
}
```

#### Menu Drawer (Navigation latérale)

```
┌─────────────────────────────────┐
│  ✕                              │  ← Fermer
│                                 │
│  [LOGO NETEREKA]                │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  📱 Smartphones              →  │
│  💻 Ordinateurs              →  │
│  🎮 Consoles & Gaming        →  │
│  📺 TV & Audio               →  │
│  ⌚ Montres connectées       →  │
│  🎧 Accessoires              →  │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  🏷️ Promotions                 │
│  📦 Suivre ma commande          │
│  ❓ Aide & Contact              │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  À propos                       │
│  CGV                            │
│  Politique de confidentialité   │
│                                 │
└─────────────────────────────────┘

Specs:
- Width: 85% de l'écran (max 320px)
- Position: fixed left
- Background: white
- Animation: slide-in from left (200ms)
- Overlay: black 50% opacity
- Fermeture: bouton X, tap overlay, swipe left
```

#### Pourquoi pas de Bottom Bar ?

| Raison | Explication |
|--------|-------------|
| **Design premium** | Apple Store, Google Store n'en utilisent pas |
| **Plus d'espace** | +64px pour afficher les produits |
| **Focus conversion** | Moins de distractions, parcours d'achat clair |
| **Header sticky** | Les actions restent accessibles en haut |
| **Menu complet** | Le drawer offre plus d'options que 4 icônes |

### 5.4 Champs de Formulaire

```
Label du champ

┌─────────────────────────────────────────────┐
│  📧  email@exemple.com                      │
└─────────────────────────────────────────────┘
Message d'aide ou erreur

Specs:
- Height: 52px (mobile), 48px (desktop)
- Padding: 16px
- Border: 1px solid gray-300
- Border-radius: 12px
- Focus: border 2px Navy-800, shadow ring
- Error: border red-500, message red
- Icon: 20px, gray-400, left padding
```

### 5.5 Badges & Tags

```tsx
// Badge catégorie
<span className="px-3 py-1 bg-navy-100 text-navy-800 text-xs font-medium rounded-full">
  Smartphones
</span>

// Badge promo
<span className="px-2 py-1 bg-mint-500 text-navy-900 text-xs font-bold rounded-full">
  -20%
</span>

// Badge stock
<span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
  En stock
</span>

<span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
  Plus que 3
</span>

<span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
  Rupture
</span>
```

---

## 6. Iconographie

### Librairie : Lucide React

**Pourquoi Lucide ?**
- Cohérent avec shadcn/ui
- Style épuré (stroke icons)
- Optimisé (tree-shaking)
- 1000+ icônes

### Tailles Standard

| Contexte | Taille | Classe |
|----------|--------|--------|
| Inline (boutons) | 20px | `w-5 h-5` |
| Navigation | 24px | `w-6 h-6` |
| Features | 32px | `w-8 h-8` |
| Empty states | 48px | `w-12 h-12` |
| Hero | 64px | `w-16 h-16` |

### Icônes Clés

```tsx
import {
  // Navigation
  Home, Search, ShoppingCart, User, Menu, X, ChevronLeft, ChevronRight,
  
  // Actions
  Heart, Share2, Plus, Minus, Trash2, Edit, Eye, Download,
  
  // E-commerce
  Package, Truck, CreditCard, Receipt, Tag, Percent,
  
  // Feedback
  Check, AlertCircle, Info, Star, ThumbsUp,
  
  // Communication
  Phone, Mail, MessageCircle, // WhatsApp custom
  
  // Misc
  Filter, SlidersHorizontal, ArrowUpDown, Loader2
} from "lucide-react";
```

### Icône WhatsApp Custom

```tsx
export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
```

---

## 7. Images & Médias

### Formats et Optimisation

| Type | Format | Qualité | Max Size |
|------|--------|---------|----------|
| Photos produits | WebP/AVIF | 80% | 200KB |
| Thumbnails | WebP | 75% | 30KB |
| Banners | WebP | 85% | 150KB |
| Logo | SVG | - | 10KB |
| Icons | SVG | - | 2KB |

### Dimensions Images Produits

| Usage | Dimensions | Ratio |
|-------|------------|-------|
| Thumbnail (liste) | 400x400 | 1:1 |
| Card hover | 600x600 | 1:1 |
| Page produit main | 800x800 | 1:1 |
| Page produit zoom | 1200x1200 | 1:1 |
| Gallery thumbs | 100x100 | 1:1 |

### Placeholder & Loading

```tsx
// Skeleton pendant chargement
<div className="aspect-square bg-gray-100 animate-pulse rounded-xl" />

// Placeholder si pas d'image
<div className="aspect-square bg-gray-100 flex items-center justify-center rounded-xl">
  <PackageIcon className="w-12 h-12 text-gray-300" />
</div>

// Blur placeholder (Next.js)
<Image
  src={product.image}
  alt={product.name}
  fill
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg..."
/>
```

---

## 8. Motion & Animations

### Principes

- **Subtil** : Les animations ne doivent pas distraire
- **Rapide** : 150-300ms max pour les micro-interactions
- **Purposeful** : Chaque animation a un but (feedback, transition, attirer l'attention)

### Durées Standard

| Type | Durée | Easing |
|------|-------|--------|
| Hover | 150ms | ease-out |
| Click feedback | 100ms | ease-out |
| Modal open | 200ms | ease-out |
| Modal close | 150ms | ease-in |
| Page transition | 300ms | ease-in-out |
| Skeleton pulse | 1.5s | ease-in-out, infinite |

### Animations Clés

```css
/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide up (pour modals, toasts) */
@keyframes slideUp {
  from { 
    opacity: 0;
    transform: translateY(10px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}

/* Scale (pour boutons, cards) */
@keyframes scaleIn {
  from { 
    opacity: 0;
    transform: scale(0.95);
  }
  to { 
    opacity: 1;
    transform: scale(1);
  }
}

/* Pulse (pour notifications) */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

### Classes Tailwind

```tsx
// Hover scale sur cards (respecte prefers-reduced-motion)
className="hover:scale-[1.02] transition-transform duration-200 motion-reduce:transition-none motion-reduce:hover:scale-100"

// Fade in au scroll (avec Intersection Observer)
className="opacity-0 animate-fadeIn"

// Button press
className="active:scale-95 transition-transform duration-100"

// Loading spinner
className="animate-spin"
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 9. Patterns UX Mobile-First

### 9.1 Navigation Thumb-Friendly

```
Zone de confort du pouce (main droite):
┌─────────────────────┐
│     ⚠️ Difficile    │  ← Actions secondaires
│                     │
│    ✓ OK             │  ← Navigation, filtres
│                     │
│   ★ Idéal           │  ← CTA principaux, menu
└─────────────────────┘

Règles:
- Actions principales en bas de l'écran
- CTA "Ajouter au panier" = sticky bottom
- Navigation principale = bottom bar
- Filtres = bottom sheet, pas sidebar
```

### 9.2 Patterns de Liste

#### Scroll Horizontal pour Sections Produits

**Pattern principal pour la Homepage** - Toutes les sections de produits utilisent le scroll horizontal pour :
- Maximiser l'espace vertical
- Permettre plus de sections visibles
- Encourager l'exploration naturelle (swipe)
- Pattern familier (Netflix, App Store)

```
┌─────────────────────────────────────────┐
│ 🔥 Meilleures ventes         Voir tout  │
│ ┌────────┐┌────────┐┌────────┐         │
│ │[Produit]││[Produit]││[Produit]│ →      │
│ │        ││        ││        │ swipe   │
│ │ 450K   ││ 320K   ││ 280K   │         │
│ └────────┘└────────┘└────────┘         │
└─────────────────────────────────────────┘

Specs:
- Card width: 160px (fixe)
- Gap: 12px
- Padding horizontal: 16px
- Overflow-x: auto
- Scrollbar: hidden
- Snap: optional (scroll-snap-type: x mandatory)
```

#### Code Scroll Container

```tsx
// Scroll horizontal sans scrollbar
<div className="
  flex gap-3
  overflow-x-auto
  px-4 pb-2
  scrollbar-hide
  scroll-smooth
  snap-x snap-mandatory  /* Optionnel: snap to cards */
">
  {products.map(product => (
    <ProductCardCompact 
      key={product.id} 
      product={product}
      className="snap-start"  /* Si snap activé */
    />
  ))}
</div>

// CSS utilitaire
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```

#### Product Card Compact (pour scroll H)

```
┌────────────────┐
│ ┌────────────┐ │
│ │            │ │
│ │   [IMG]    │ │  160x160px
│ │    -20%    │ │  ← Badge optionnel
│ └────────────┘ │
│ CATÉGORIE      │  10px, mint, uppercase
│ Nom du produit │  13px, 2 lignes max
│ qui peut être  │
│ ★ 4.8          │  11px, rating simple
│ À partir de    │  11px, gris (si variantes)
│ 450 000 FCFA   │  14px, bold, navy
│ 500 000 FCFA   │  11px, barré, gris
└────────────────┘

Dimensions:
- Width: 160px (fixe, flex-shrink: 0)
- Image: aspect-ratio 1:1
- Padding content: 10px
- Border-radius: 16px
```

#### Logique d'affichage des prix

| Cas | Affichage |
|-----|-----------|
| Produit simple (sans variantes) | `450 000 FCFA` |
| Produit avec variantes | `À partir de 450 000 FCFA` |
| Produit en promo (simple) | `450 000 FCFA` + `500 000 FCFA` barré |
| Produit en promo (variantes) | `À partir de 450 000 FCFA` + `500 000 FCFA` barré |

```tsx
// Composant Prix avec logique variantes
function ProductPrice({ product }: { product: Product }) {
  const hasVariants = product.has_variants;
  
  return (
    <div className="mt-1.5">
      {hasVariants && (
        <span className="text-[11px] text-gray-500 block">
          À partir de
        </span>
      )}
      <span className="text-sm font-bold text-navy-800">
        {formatPrice(product.base_price)}
      </span>
      {product.compare_price && (
        <span className="text-[11px] text-gray-400 line-through ml-1.5">
          {formatPrice(product.compare_price)}
        </span>
      )}
    </div>
  );
}
```

#### Sections Homepage avec Scroll H

| Section | Icône | Données |
|---------|-------|---------|
| Meilleures ventes | 🔥 | Top produits par ventes |
| Promotions | 💚 | Produits avec réduction |
| Smartphones | 📱 | Catégorie |
| Ordinateurs | 💻 | Catégorie |
| Consoles & Gaming | 🎮 | Catégorie |
| Nouveautés | ⭐ | Récemment ajoutés |
| Marques populaires | 🏷️ | Logos marques |

#### Grid vs Scroll Horizontal

| Usage | Pattern | Quand l'utiliser |
|-------|---------|------------------|
| **Homepage** | Scroll H | Toujours - pour voir plus de sections |
| **Page catégorie** | Grid 2 cols | Liste complète avec filtres |
| **Recherche** | Grid 2 cols | Résultats complets |
| **Produits similaires** | Scroll H | Section complémentaire |
| **Récemment consultés** | Scroll H | Historique utilisateur |

#### Pagination vs "Charger plus"

```
Pour NETEREKA: Pagination avec "Charger plus"

Pourquoi:
- Meilleur pour le SEO
- Permet de revenir en arrière
- Moins de charge serveur
- UX plus prévisible

Implementation:
┌─────────────────────────┐
│  [Produit] [Produit]    │
│  [Produit] [Produit]    │
│  [Produit] [Produit]    │
│                         │
│  [ Voir plus (20) ]     │  ← Bouton, pas auto-load
│                         │
│  Page 1 / 10            │  ← Indicateur optionnel
└─────────────────────────┘
```

#### Pull-to-Refresh

```tsx
// Pour les listes de produits
<PullToRefresh onRefresh={handleRefresh}>
  <ProductGrid products={products} />
</PullToRefresh>
```

### 9.3 Recherche Mobile

```
Étape 1: Tap sur icône recherche
┌─────────────────────────────────┐
│  ←  🔍 Rechercher...        ✕   │
├─────────────────────────────────┤
│                                 │
│  Recherches récentes            │
│  • iPhone 15                    │
│  • Samsung Galaxy               │
│                                 │
│  Catégories populaires          │
│  📱 Smartphones  💻 Ordinateurs │
│                                 │
└─────────────────────────────────┘

Étape 2: Pendant la saisie (autocomplete)
┌─────────────────────────────────┐
│  ←  🔍 iphone                ✕  │
├─────────────────────────────────┤
│  📱 iPhone 15 Pro Max           │
│  📱 iPhone 15 Pro               │
│  📱 iPhone 15                   │
│  📱 iPhone 14                   │
│  🏷️ "iphone" dans Smartphones  │
└─────────────────────────────────┘

Specs:
- Fullscreen takeover sur mobile
- Autofocus immédiat
- Debounce 300ms pour suggestions
- Résultats instantanés (pas de page)
```

### 9.4 Filtres Mobile

```
Bottom Sheet (pas sidebar!)

┌─────────────────────────────────┐
│         ━━━━━━━━                │  ← Drag handle
│                                 │
│  Filtres                    ✕   │
│                                 │
│  Catégorie                  ▼   │
│  ┌─────────────────────────┐   │
│  │ ☑ Smartphones           │   │
│  │ ☐ Ordinateurs           │   │
│  │ ☐ Consoles              │   │
│  └─────────────────────────┘   │
│                                 │
│  Prix                       ▼   │
│  [50 000] ───●───── [500 000]  │
│                                 │
│  Marque                     ▼   │
│  ┌───────┐ ┌───────┐ ┌──────┐  │
│  │ Apple │ │Samsung│ │ Sony │  │
│  └───────┘ └───────┘ └──────┘  │
│                                 │
│  ┌─────────────────────────────┐│
│  │   Voir 24 résultats         ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘

Specs:
- Hauteur: 70% de l'écran max
- Swipe down pour fermer
- Bouton sticky "Voir X résultats"
- Reset visible
```

### 9.5 Panier & Checkout

```
Mini-cart (drawer droite)
┌─────────────────────────────────┐
│  Panier (3)                 ✕   │
├─────────────────────────────────┤
│  ┌─────┐                        │
│  │ IMG │ iPhone 15 Pro          │
│  └─────┘ 450 000 FCFA           │
│          [ - ] 1 [ + ]  🗑️     │
│─────────────────────────────────│
│  ┌─────┐                        │
│  │ IMG │ Coque iPhone           │
│  └─────┘ 15 000 FCFA            │
│          [ - ] 2 [ + ]  🗑️     │
├─────────────────────────────────┤
│  Sous-total:     480 000 FCFA   │
│                                 │
│  [    Voir le panier    ]       │
│  [    Commander  →      ]       │  ← CTA principal
└─────────────────────────────────┘
```

### 9.6 Feedback & États

```tsx
// Toast notification (bottom)
<Toast
  position="bottom-center"
  className="mb-20" // Au-dessus de la bottom nav
/>

// États de chargement
<Button disabled={isLoading}>
  {isLoading ? (
    <>
      <Loader2 className="w-5 h-5 animate-spin" />
      Chargement...
    </>
  ) : (
    "Ajouter au panier"
  )}
</Button>

// Empty state
<div className="flex flex-col items-center justify-center py-16 text-center">
  <ShoppingCartIcon className="w-16 h-16 text-gray-300 mb-4" />
  <h3 className="text-xl font-semibold text-gray-900">Votre panier est vide</h3>
  <p className="mt-2 text-gray-500">Découvrez nos produits et commencez vos achats</p>
  <Button className="mt-6">Explorer le catalogue</Button>
</div>
```

---

## 10. Pages Clés - Wireframes

### 10.1 Homepage Mobile

```
┌─────────────────────────────────┐
│  ☰ [NETEREKA]       🔍 🛒(3) 👤│  ← Header sticky
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │                             │ │
│ │    HERO BANNER              │ │  ← Promo principale
│ │    "iPhone 15 Pro"          │ │     Swiper si multiple
│ │    [Découvrir →]            │ │
│ │                             │ │
│ └─────────────────────────────┘ │
│                                 │
│ 🔍 Rechercher un produit...     │
│                                 │
│ ─────────────────────────────── │
│                                 │
│ Catégories                      │
│ ┌──────┐┌──────┐┌──────┐┌─────┐│
│ │  📱  ││  💻  ││  🎮  ││ 📺 →││  ← Scroll H
│ │Phone ││ PC   ││Games ││ TV  ││
│ └──────┘└──────┘└──────┘└─────┘│
│                                 │
│ ─────────────────────────────── │
│                                 │
│ 🔥 Meilleures ventes   Voir tout│
│ ┌────────┐┌────────┐┌────────┐ │
│ │[Produit]││[Produit]││[Produit]→│  ← Scroll H
│ │ 450K   ││ 320K   ││ 280K   │ │
│ └────────┘└────────┘└────────┘ │
│                                 │
│ ─────────────────────────────── │
│                                 │
│ 💚 Promotions          Voir tout│
│ ┌────────┐┌────────┐┌────────┐ │
│ │ -20%   ││ -15%   ││ -30%  →│ │  ← Scroll H
│ │[Produit]││[Produit]││[Produit]│ │
│ └────────┘└────────┘└────────┘ │
│                                 │
│ ─────────────────────────────── │
│                                 │
│ 📱 Smartphones         Voir tout│
│ ┌────────┐┌────────┐┌────────┐ │
│ │[Produit]││[Produit]││[Produit]→│  ← Scroll H
│ └────────┘└────────┘└────────┘ │
│                                 │
│ ─────────────────────────────── │
│                                 │
│ 💻 Ordinateurs         Voir tout│
│ ┌────────┐┌────────┐┌────────┐ │
│ │[Produit]││[Produit]││[Produit]→│  ← Scroll H
│ └────────┘└────────┘└────────┘ │
│                                 │
│ ─────────────────────────────── │
│                                 │
│ 🎮 Consoles & Gaming   Voir tout│
│ ┌────────┐┌────────┐┌────────┐ │
│ │[Produit]││[Produit]││[Produit]→│  ← Scroll H
│ └────────┘└────────┘└────────┘ │
│                                 │
│ ─────────────────────────────── │
│                                 │
│ ⭐ Nouveautés          Voir tout│
│ ┌────────┐┌────────┐┌────────┐ │
│ │[Produit]││[Produit]││[Produit]→│  ← Scroll H
│ └────────┘└────────┘└────────┘ │
│                                 │
│ ─────────────────────────────── │
│                                 │
│ 🏷️ Marques populaires          │
│ ┌──────┐┌──────┐┌──────┐┌─────┐│
│ │Apple ││Samsung││ Sony ││ HP →││  ← Scroll H
│ └──────┘└──────┘└──────┘└─────┘│
│                                 │
│ ─────────────────────────────── │
│                                 │
│ 🚚 Livraison | 💵 Paiement     │  ← Trust badges
│ 📞 Support WhatsApp 7j/7       │
│                                 │
│ ═══════════════════════════════ │
│          FOOTER                 │
│   À propos | CGV | Contact      │
│        📱 📘 📸               │
│   © 2026 NETEREKA Electronic    │
│                                 │
└─────────────────────────────────┘

Avantages du scroll horizontal:
- Plus de sections visibles
- Exploration naturelle (swipe)
- Chaque catégorie mise en avant
- Pattern familier (Netflix, App Store)
```

### 10.2 Page Catégorie / Liste Produits

```
┌─────────────────────────────────┐
│  ←  Smartphones     🔍 🛒(3) 👤│
├─────────────────────────────────┤
│                                 │
│ Smartphones (48 produits)       │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Trier: Populaires ▼  Filtrer│ │  ← Sticky
│ └─────────────────────────────┘ │
│                                 │
│ Filtres actifs:                 │
│ [Apple ✕] [500K+ ✕]  Effacer   │
│                                 │
│ ┌────────┐ ┌────────┐          │
│ │[Produit]│ │[Produit]│         │
│ └────────┘ └────────┘          │
│ ┌────────┐ ┌────────┐          │
│ │[Produit]│ │[Produit]│         │
│ └────────┘ └────────┘          │
│ ┌────────┐ ┌────────┐          │
│ │[Produit]│ │[Produit]│         │
│ └────────┘ └────────┘          │
│                                 │
│ [  Charger plus (20)  ]         │
│                                 │
│ Page 1 sur 4                    │
│                                 │
│ ═══════════════════════════════ │
│          FOOTER                 │
└─────────────────────────────────┘
```

### 10.3 Page Produit

```
┌─────────────────────────────────┐
│  ←                    🛒(3) ❤️ │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │                             │ │
│ │                             │ │
│ │      [IMAGE PRODUIT]        │ │  ← Swiper, pinch-zoom
│ │                             │ │
│ │                             │ │
│ │  ●  ○  ○  ○                 │ │  ← Pagination dots
│ └─────────────────────────────┘ │
│ ┌───┐┌───┐┌───┐┌───┐           │  ← Thumbnails
│ │ 1 ││ 2 ││ 3 ││ 4 │           │
│ └───┘└───┘└───┘└───┘           │
│                                 │
│ SMARTPHONES                     │  ← Catégorie (link)
│                                 │
│ iPhone 15 Pro Max 256Go         │  ← H1
│ Titane Noir                     │
│                                 │
│ ★★★★☆ 4.8 (24 avis)            │  ← Link vers avis
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 850 000 FCFA                │ │  ← Prix principal
│ │ 950 000 FCFA  -11%          │ │  ← Prix barré + badge
│ └─────────────────────────────┘ │
│                                 │
│ Couleur: Titane Noir            │
│ ┌──────┐┌──────┐┌──────┐       │
│ │ Noir ││Naturel││ Bleu │       │  ← Sélecteur variante
│ │  ✓   ││      ││      │       │
│ └──────┘└──────┘└──────┘       │
│                                 │
│ Capacité: 256 Go                │
│ ┌──────┐┌──────┐┌──────┐       │
│ │256Go ││512Go ││ 1To  │       │
│ │  ✓   ││      ││      │       │
│ └──────┘└──────┘└──────┘       │
│                                 │
│ ✅ En stock                     │
│ 🚚 Livraison 1-3 jours          │
│                                 │
│ ─────────────────────────────── │
│                                 │
│ Description                  ▼  │
│ L'iPhone 15 Pro Max est le      │
│ smartphone le plus avancé...    │
│ [Lire plus]                     │
│                                 │
│ ─────────────────────────────── │
│                                 │
│ Caractéristiques             ▼  │
│ • Écran: 6.7" Super Retina XDR  │
│ • Puce: A17 Pro                 │
│ • Appareil photo: 48 MP         │
│ • Batterie: 4422 mAh            │
│                                 │
│ ─────────────────────────────── │
│                                 │
│ Avis clients (24)            ▼  │
│ ★★★★★ "Excellent produit!"      │
│ Par Kouassi A. - il y a 2j      │
│                                 │
│ [Voir tous les avis]            │
│                                 │
│ ─────────────────────────────── │
│                                 │
│ Produits similaires             │
│ ┌────────┐ ┌────────┐          │
│ │[Produit]│ │[Produit]│ →       │  ← Scroll horizontal
│ └────────┘ └────────┘          │
│                                 │
│                                 │
│ (espace pour sticky bar)        │
│                                 │
├─────────────────────────────────┤
│ 850 000 FCFA                    │  ← Sticky bottom bar
│ [  Ajouter au panier  🛒  ]     │
└─────────────────────────────────┘
```

### 10.4 Checkout Mobile

```
┌─────────────────────────────────┐
│  ←  Commande                    │
├─────────────────────────────────┤
│                                 │
│ ● Livraison  ○ Récapitulatif    │  ← Steps
│                                 │
│ ═════════════════════════════ │
│                                 │
│ Adresse de livraison            │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 📍 Maison                ✓  │ │  ← Adresse sauvegardée
│ │ Kouassi Aya                 │ │
│ │ Cocody, Angré 8è tranche    │ │
│ │ +225 07 XX XX XX            │ │
│ │ [Modifier]                  │ │
│ └─────────────────────────────┘ │
│                                 │
│ [+ Nouvelle adresse]            │
│                                 │
│ ─────────────────────────────── │
│                                 │
│ Zone de livraison               │
│ ┌─────────────────────────────┐ │
│ │ Abidjan - Cocody        ▼  │ │
│ └─────────────────────────────┘ │
│ Frais: 2 000 FCFA               │
│ Délai: 1-2 jours                │
│                                 │
│ ─────────────────────────────── │
│                                 │
│ Instructions (optionnel)        │
│ ┌─────────────────────────────┐ │
│ │ Ex: Appeler avant livraison │ │
│ └─────────────────────────────┘ │
│                                 │
│ ─────────────────────────────── │
│                                 │
│ Récapitulatif                   │
│                                 │
│ iPhone 15 Pro (x1)   850 000    │
│ Coque iPhone (x2)     30 000    │
│                      ─────────  │
│ Sous-total           880 000    │
│ Livraison              2 000    │
│                      ─────────  │
│ Total                882 000 FCFA│
│                                 │
│ ─────────────────────────────── │
│                                 │
│ Code promo                      │
│ ┌─────────────────────┐[Appliquer]
│ │ PROMO2026           │         │
│ └─────────────────────┘         │
│                                 │
│ ─────────────────────────────── │
│                                 │
│ Mode de paiement                │
│ ┌─────────────────────────────┐ │
│ │ 💵  Paiement à la livraison │ │
│ │     Payez en cash au livreur│ │
│ └─────────────────────────────┘ │
│                                 │
│                                 │
├─────────────────────────────────┤
│ Total: 882 000 FCFA             │
│ [  Confirmer la commande  ]     │
└─────────────────────────────────┘
```

---

## 11. Accessibilité

### Standards

- **WCAG 2.1 niveau AA** minimum
- Contraste texte : 4.5:1 minimum (7:1 pour petit texte)
- Touch targets : 44x44px minimum

### Contraste des Couleurs

| Combinaison | Ratio | Statut |
|-------------|-------|--------|
| Navy (#183C78) sur Blanc | 8.5:1 | ✅ AAA |
| Mint (#00CC7D) sur Blanc | 2.3:1 | ❌ Texte uniquement large |
| Mint (#00FF9C) sur Navy | 8.2:1 | ✅ AAA |
| Gray-600 sur Blanc | 5.7:1 | ✅ AA |
| Gray-400 sur Blanc | 3.0:1 | ⚠️ Icônes/décoratif seulement |

### Règles Accessibilité

```tsx
// ✅ Bon: Labels explicites
<label htmlFor="email">Adresse email</label>
<input id="email" type="email" aria-describedby="email-error" />
<span id="email-error" role="alert">Email invalide</span>

// ✅ Bon: Boutons avec texte ou aria-label
<button aria-label="Ajouter au panier">
  <ShoppingCartIcon />
</button>

// ✅ Bon: Images avec alt
<Image src={product.image} alt={`${product.name} - ${product.brand}`} />

// ✅ Bon: Focus visible
className="focus:outline-none focus:ring-2 focus:ring-navy-500 focus:ring-offset-2"

// ✅ Bon: Skip link
<a href="#main-content" className="sr-only focus:not-sr-only">
  Aller au contenu principal
</a>
```

### Navigation Clavier

| Élément | Tab | Enter/Space | Escape | Flèches |
|---------|-----|-------------|--------|---------|
| Boutons | Focus | Activer | - | - |
| Links | Focus | Naviguer | - | - |
| Menus | Focus | Ouvrir | Fermer | Navigation |
| Modals | Focus trap | - | Fermer | - |
| Accordéons | Focus | Toggle | - | ↑↓ |

---

## 12. Implémentation Tailwind

### Configuration `tailwind.config.ts`

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary - Navy Blue
        navy: {
          50: "#F4F7FB",
          100: "#E8EEF7",
          200: "#C5D5EA",
          300: "#9AB5D9",
          400: "#6B91C4",
          500: "#3B6DB8",
          600: "#2558A6",
          700: "#1E4A8F",
          800: "#183C78", // Logo color
          900: "#132D5C",
          950: "#0D1F3C",
        },
        // Accent - Mint Green
        mint: {
          300: "#66FFC2",
          400: "#33FFAF",
          500: "#00FF9C", // Logo color
          600: "#00CC7D",
          700: "#00995E",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      fontSize: {
        // Custom scale
        "display-lg": ["3rem", { lineHeight: "1.1", fontWeight: "700" }],
        "display-md": ["2.25rem", { lineHeight: "1.2", fontWeight: "700" }],
        "heading-lg": ["1.875rem", { lineHeight: "1.3", fontWeight: "600" }],
        "heading-md": ["1.5rem", { lineHeight: "1.3", fontWeight: "600" }],
        "heading-sm": ["1.25rem", { lineHeight: "1.4", fontWeight: "600" }],
        "body-lg": ["1.125rem", { lineHeight: "1.6", fontWeight: "400" }],
        "body-md": ["1rem", { lineHeight: "1.6", fontWeight: "400" }],
        "body-sm": ["0.875rem", { lineHeight: "1.5", fontWeight: "400" }],
        caption: ["0.75rem", { lineHeight: "1.4", fontWeight: "400" }],
        overline: ["0.75rem", { lineHeight: "1.4", fontWeight: "500" }],
      },
      spacing: {
        // Extended spacing
        13: "3.25rem", // 52px - button height mobile
        15: "3.75rem", // 60px
        18: "4.5rem",  // 72px
        22: "5.5rem",  // 88px
      },
      borderRadius: {
        "2xl": "1rem",    // 16px - cards
        "3xl": "1.5rem",  // 24px - modals
      },
      boxShadow: {
        "card": "0 2px 8px rgba(0, 0, 0, 0.08)",
        "card-hover": "0 4px 16px rgba(0, 0, 0, 0.12)",
        "sticky": "0 2px 8px rgba(0, 0, 0, 0.1)",
      },
      animation: {
        "fade-in": "fadeIn 200ms ease-out",
        "slide-up": "slideUp 200ms ease-out",
        "scale-in": "scaleIn 200ms ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
    require("tailwindcss-animate"),
  ],
};

export default config;
```

### Variables CSS Globales

```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Colors */
    --color-primary: 24 60 120;      /* navy-800 */
    --color-accent: 0 255 156;        /* mint-500 */
    --color-background: 250 250 250;  /* gray-50 */
    --color-surface: 255 255 255;     /* white */
    --color-text: 23 23 25;           /* gray-900 */
    --color-text-muted: 82 82 91;     /* gray-600 */
    
    /* Spacing */
    --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
    
    /* Transitions */
    --transition-fast: 150ms ease-out;
    --transition-normal: 200ms ease-out;
  }

  .dark {
    --color-background: 10 10 11;
    --color-surface: 23 23 25;
    --color-text: 250 250 250;
    --color-text-muted: 161 161 170;
  }
  
  html {
    scroll-behavior: smooth;
    -webkit-tap-highlight-color: transparent;
  }
  
  body {
    @apply bg-gray-50 text-gray-900 antialiased;
    padding-bottom: var(--safe-area-inset-bottom);
  }
  
  /* Focus styles */
  *:focus-visible {
    @apply outline-none ring-2 ring-navy-500 ring-offset-2;
  }
}

@layer components {
  /* Button base */
  .btn {
    @apply inline-flex items-center justify-center gap-2
           font-semibold text-base
           rounded-xl
           transition-colors duration-200
           disabled:opacity-50 disabled:cursor-not-allowed;
  }
  
  .btn-primary {
    @apply btn h-13 sm:h-12 px-6
           bg-navy-800 text-white
           hover:bg-navy-700 active:bg-navy-900;
  }
  
  .btn-secondary {
    @apply btn h-13 sm:h-12 px-6
           bg-transparent border-2 border-navy-800 text-navy-800
           hover:bg-navy-50;
  }
  
  .btn-accent {
    @apply btn h-13 sm:h-12 px-6
           bg-mint-500 text-navy-900
           hover:bg-mint-400;
  }
  
  /* Input base */
  .input {
    @apply w-full h-13 sm:h-12 px-4
           bg-white border border-gray-300
           rounded-xl
           text-gray-900 placeholder-gray-400
           focus:border-navy-800 focus:ring-1 focus:ring-navy-800
           transition-colors duration-200;
  }
  
  /* Card base */
  .card {
    @apply bg-white rounded-2xl shadow-card
           hover:shadow-card-hover
           transition-shadow duration-300;
  }
}

@layer utilities {
  /* Safe area padding for mobile */
  .pb-safe {
    padding-bottom: max(1rem, var(--safe-area-inset-bottom));
  }
  
  /* Text truncation — Note: Tailwind 3+ has built-in line-clamp plugin.
     Use className="line-clamp-2" directly. This fallback is for older versions only. */
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  /* Hide scrollbar but keep functionality */
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
}
```

---

## Ressources

### Fichiers à Créer

| Fichier | Description |
|---------|-------------|
| `src/components/ui/button.tsx` | Composants boutons |
| `src/components/ui/input.tsx` | Champs de formulaire |
| `src/components/ui/card.tsx` | Cards génériques |
| `src/components/ui/badge.tsx` | Badges et tags |
| `src/components/ui/modal.tsx` | Modals et dialogs |
| `src/components/storefront/product-card.tsx` | Card produit |
| `src/components/storefront/header.tsx` | Header mobile/desktop |
| `src/components/storefront/bottom-nav.tsx` | Navigation mobile |
| `src/components/storefront/search.tsx` | Recherche fullscreen |
| `src/components/storefront/filters.tsx` | Bottom sheet filtres |

### Fonts à Charger

```tsx
// src/app/layout.tsx
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

### Icônes à Installer

```bash
npm install lucide-react
```

---

*Design System NETEREKA Electronic - Version 1.0 - Janvier 2026*
