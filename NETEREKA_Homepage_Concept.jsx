"use client";

// React import — useState available for future interactive features
import React from "react";

// Couleurs NETEREKA
const colors = {
  navy: {
    800: "#183C78",
    700: "#1E4A8F",
    100: "#E8EEF7",
    50: "#F4F7FB",
  },
  mint: {
    500: "#00FF9C",
    600: "#00CC7D",
  },
  gray: {
    900: "#171719",
    600: "#52525B",
    400: "#A1A1AA",
    200: "#E4E4E7",
    100: "#F4F4F5",
    50: "#FAFAFA",
  },
};

// Icônes simples
const Icons = {
  Menu: () => (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  Cart: () => (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  ),
  Heart: () => (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  Search: () => (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  User: () => (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Home: () => (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Star: ({ filled }) => (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill={filled ? "#F59E0B" : "none"} stroke="#F59E0B" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  ChevronRight: () => (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  Truck: () => (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  CreditCard: () => (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
  Phone: () => (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
};

// Données exemple
const categories = [
  { icon: "📱", name: "Smartphones", slug: "smartphones" },
  { icon: "💻", name: "Ordinateurs", slug: "ordinateurs" },
  { icon: "🎮", name: "Consoles", slug: "consoles" },
  { icon: "📺", name: "TV & Audio", slug: "tv-audio" },
  { icon: "⌚", name: "Montres", slug: "montres" },
  { icon: "🎧", name: "Accessoires", slug: "accessoires" },
];

const bestSellers = [
  { id: 1, name: "iPhone 15 Pro Max", category: "Smartphones", price: 850000, rating: 4.8, reviews: 24, image: "📱", hasVariants: true },
  { id: 2, name: "Samsung Galaxy S24", category: "Smartphones", price: 650000, rating: 4.7, reviews: 18, image: "📱", hasVariants: true },
  { id: 3, name: "MacBook Pro M3", category: "Ordinateurs", price: 1200000, rating: 4.9, reviews: 12, image: "💻", hasVariants: true },
  { id: 4, name: "PlayStation 5", category: "Consoles", price: 450000, rating: 4.9, reviews: 45, image: "🎮", hasVariants: false },
  { id: 5, name: "AirPods Pro 2", category: "Accessoires", price: 180000, rating: 4.8, reviews: 32, image: "🎧", hasVariants: false },
];

const promotions = [
  { id: 6, name: "Samsung Galaxy S24 Ultra", category: "Smartphones", price: 750000, oldPrice: 900000, rating: 4.7, reviews: 18, image: "📱", badge: "-17%", hasVariants: true },
  { id: 7, name: "iPad Air M2", category: "Tablettes", price: 550000, oldPrice: 650000, rating: 4.8, reviews: 22, image: "📱", badge: "-15%", hasVariants: true },
  { id: 8, name: "Sony WH-1000XM5", category: "Audio", price: 280000, oldPrice: 350000, rating: 4.9, reviews: 28, image: "🎧", badge: "-20%", hasVariants: false },
  { id: 9, name: "Nintendo Switch OLED", category: "Consoles", price: 320000, oldPrice: 380000, rating: 4.7, reviews: 35, image: "🎮", badge: "-16%", hasVariants: false },
];

const smartphones = [
  { id: 10, name: "iPhone 15", category: "Smartphones", price: 650000, rating: 4.7, reviews: 42, image: "📱", hasVariants: true },
  { id: 11, name: "Samsung Galaxy A54", category: "Smartphones", price: 280000, rating: 4.5, reviews: 56, image: "📱", hasVariants: true },
  { id: 12, name: "Google Pixel 8", category: "Smartphones", price: 520000, rating: 4.6, reviews: 19, image: "📱", hasVariants: true },
  { id: 13, name: "OnePlus 12", category: "Smartphones", price: 580000, rating: 4.7, reviews: 24, image: "📱", hasVariants: true },
  { id: 14, name: "Xiaomi 14", category: "Smartphones", price: 450000, rating: 4.5, reviews: 31, image: "📱", hasVariants: true },
];

const computers = [
  { id: 15, name: "MacBook Air M3", category: "Ordinateurs", price: 950000, rating: 4.9, reviews: 28, image: "💻", hasVariants: true },
  { id: 16, name: "Dell XPS 15", category: "Ordinateurs", price: 1100000, rating: 4.7, reviews: 15, image: "💻", hasVariants: true },
  { id: 17, name: "HP Spectre x360", category: "Ordinateurs", price: 980000, rating: 4.6, reviews: 12, image: "💻", hasVariants: true },
  { id: 18, name: "Lenovo ThinkPad X1", category: "Ordinateurs", price: 1050000, rating: 4.8, reviews: 20, image: "💻", hasVariants: true },
  { id: 19, name: "ASUS ROG Zephyrus", category: "Ordinateurs", price: 1400000, rating: 4.8, reviews: 18, image: "💻", hasVariants: true },
];

const consoles = [
  { id: 20, name: "PlayStation 5", category: "Consoles", price: 450000, rating: 4.9, reviews: 45, image: "🎮", hasVariants: false },
  { id: 21, name: "Xbox Series X", category: "Consoles", price: 420000, rating: 4.8, reviews: 38, image: "🎮", hasVariants: false },
  { id: 22, name: "Nintendo Switch OLED", category: "Consoles", price: 350000, rating: 4.7, reviews: 52, image: "🎮", hasVariants: false },
  { id: 23, name: "Steam Deck", category: "Consoles", price: 480000, rating: 4.6, reviews: 22, image: "🎮", hasVariants: true },
  { id: 24, name: "PS5 DualSense", category: "Accessoires", price: 55000, rating: 4.8, reviews: 67, image: "🎮", hasVariants: true },
];

const newArrivals = [
  { id: 25, name: "iPhone 15 Pro Max Titane", category: "Smartphones", price: 950000, rating: 4.9, reviews: 8, image: "📱", badge: "Nouveau", hasVariants: true },
  { id: 26, name: "MacBook Pro M3 Max", category: "Ordinateurs", price: 2200000, rating: 5.0, reviews: 3, image: "💻", badge: "Nouveau", hasVariants: true },
  { id: 27, name: "Samsung Galaxy Watch 6", category: "Montres", price: 280000, rating: 4.7, reviews: 12, image: "⌚", badge: "Nouveau", hasVariants: true },
  { id: 28, name: "Meta Quest 3", category: "VR", price: 420000, rating: 4.6, reviews: 15, image: "🥽", badge: "Nouveau", hasVariants: true },
];

const brands = [
  { name: "Apple", logo: "🍎" },
  { name: "Samsung", logo: "📱" },
  { name: "Sony", logo: "🎮" },
  { name: "HP", logo: "💻" },
  { name: "Dell", logo: "🖥️" },
  { name: "Xiaomi", logo: "📱" },
  { name: "LG", logo: "📺" },
];

// Formater le prix en FCFA
const formatPrice = (price) => {
  return new Intl.NumberFormat("fr-FR").format(price) + " FCFA";
};

// Composant Logo NETEREKA
const Logo = () => (
  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
    <div style={{ 
      width: "32px", 
      height: "32px", 
      background: `linear-gradient(135deg, ${colors.mint[500]} 0%, ${colors.mint[600]} 100%)`,
      borderRadius: "8px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: colors.navy[800],
      fontWeight: "bold",
      fontSize: "18px"
    }}>
      N
    </div>
    <span style={{ 
      color: colors.navy[800], 
      fontWeight: "700", 
      fontSize: "18px",
      letterSpacing: "-0.5px"
    }}>
      NETEREKA
    </span>
  </div>
);

// Style commun pour les boutons icon (touch target 44px min)
const iconButtonStyle = {
  padding: "10px",
  color: colors.gray[600],
  background: "none",
  border: "none",
  cursor: "pointer",
  minWidth: "44px",
  minHeight: "44px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

// Composant Header Optimisé (logo à gauche, Cart avant User)
const Header = ({ cartCount = 3 }) => (
  <header style={{
    position: "sticky",
    top: 0,
    zIndex: 50,
    background: "rgba(255,255,255,0.95)",
    backdropFilter: "blur(10px)",
    borderBottom: `1px solid ${colors.gray[200]}`,
    padding: "6px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  }}>
    {/* Gauche: Menu + Logo */}
    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
      <button
        aria-label="Menu de navigation"
        style={{ ...iconButtonStyle, marginLeft: "-10px" }}
      >
        <Icons.Menu />
      </button>

      <a href="/" aria-label="NETEREKA - Accueil">
        <Logo />
      </a>
    </div>

    {/* Droite: Search, Cart, User */}
    <nav aria-label="Actions rapides" style={{ display: "flex", gap: "2px" }}>
      <button
        aria-label="Rechercher"
        style={iconButtonStyle}
      >
        <Icons.Search />
      </button>
      <button
        aria-label={`Panier (${cartCount} article${cartCount > 1 ? "s" : ""})`}
        style={{ ...iconButtonStyle, position: "relative" }}
      >
        <Icons.Cart />
        {cartCount > 0 && (
          <span aria-hidden="true" style={{
            position: "absolute",
            top: "4px",
            right: "4px",
            background: colors.mint[500],
            color: colors.navy[800],
            fontSize: "10px",
            fontWeight: "bold",
            width: "18px",
            height: "18px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            {cartCount > 9 ? "9+" : cartCount}
          </span>
        )}
      </button>
      <button
        aria-label="Mon compte"
        style={iconButtonStyle}
      >
        <Icons.User />
      </button>
    </nav>
  </header>
);

// Composant Hero Banner
const HeroBanner = () => (
  <div style={{
    margin: "16px",
    borderRadius: "20px",
    background: `linear-gradient(135deg, ${colors.navy[800]} 0%, ${colors.navy[700]} 100%)`,
    padding: "24px",
    color: "white",
    position: "relative",
    overflow: "hidden",
  }}>
    <div style={{
      position: "absolute",
      top: "-20px",
      right: "-20px",
      width: "120px",
      height: "120px",
      background: colors.mint[500],
      borderRadius: "50%",
      opacity: 0.1,
    }} />
    
    <span style={{
      display: "inline-block",
      background: colors.mint[500],
      color: colors.navy[800],
      padding: "4px 12px",
      borderRadius: "20px",
      fontSize: "12px",
      fontWeight: "600",
      marginBottom: "12px",
    }}>
      Nouveau
    </span>
    
    <h2 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "8px" }}>
      iPhone 15 Pro Max
    </h2>
    <p style={{ fontSize: "14px", opacity: 0.9, marginBottom: "16px" }}>
      Découvrez la puissance du titane
    </p>
    
    <a href="/p/iphone-15-pro-max" style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      background: "white",
      color: colors.navy[800],
      padding: "12px 24px",
      borderRadius: "12px",
      fontWeight: "600",
      fontSize: "14px",
      textDecoration: "none",
    }}>
      Découvrir
      <Icons.ChevronRight />
    </a>
  </div>
);

// Composant Search Bar
const SearchBar = () => (
  <form role="search" style={{
    margin: "0 16px 16px",
    position: "relative",
  }}>
    <label htmlFor="search-input" style={{
      position: "absolute",
      width: "1px",
      height: "1px",
      padding: 0,
      margin: "-1px",
      overflow: "hidden",
      clip: "rect(0,0,0,0)",
      whiteSpace: "nowrap",
      borderWidth: 0,
    }}>
      Rechercher un produit
    </label>
    <div aria-hidden="true" style={{
      position: "absolute",
      left: "16px",
      top: "50%",
      transform: "translateY(-50%)",
      color: colors.gray[400],
      pointerEvents: "none",
    }}>
      <Icons.Search />
    </div>
    <input
      id="search-input"
      type="search"
      name="q"
      autoComplete="off"
      placeholder="Rechercher un produit\u2026"
      style={{
        width: "100%",
        height: "48px",
        paddingLeft: "48px",
        paddingRight: "16px",
        borderRadius: "12px",
        border: `1px solid ${colors.gray[200]}`,
        background: colors.gray[50],
        fontSize: "16px",
        outline: "none",
      }}
    />
  </form>
);

// Composant Catégories
const Categories = () => (
  <div style={{ marginBottom: "24px" }}>
    <h3 style={{
      fontSize: "18px",
      fontWeight: "600",
      color: colors.gray[900],
      marginBottom: "12px",
      paddingLeft: "16px",
    }}>
      Catégories
    </h3>
    <div className="scroll-container" style={{
      display: "flex",
      gap: "12px",
      overflowX: "auto",
      paddingLeft: "16px",
      paddingRight: "16px",
      paddingBottom: "8px",
    }}>
      {categories.map((cat) => (
        <a key={cat.slug} href={`/c/${cat.slug}`} style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
          minWidth: "72px",
          textDecoration: "none",
        }}>
          <div style={{
            width: "64px",
            height: "64px",
            background: colors.navy[50],
            borderRadius: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "28px",
          }} aria-hidden="true">
            {cat.icon}
          </div>
          <span style={{
            fontSize: "12px",
            color: colors.gray[600],
            textAlign: "center",
          }}>
            {cat.name}
          </span>
        </a>
      ))}
    </div>
  </div>
);

// Générer un slug à partir du nom du produit
const toSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Composant Product Card Compact (pour scroll horizontal)
const ProductCardCompact = ({ product }) => (
  <article
    aria-label={product.name}
    style={{
      minWidth: "160px",
      maxWidth: "160px",
      background: "white",
      borderRadius: "16px",
      overflow: "hidden",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      flexShrink: 0,
    }}
  >
    <a
      href={`/p/${toSlug(product.name)}`}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      {/* Image */}
      <div style={{
        position: "relative",
        aspectRatio: "1",
        background: colors.gray[100],
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "48px",
      }}>
        <span role="img" aria-label={product.name}>{product.image}</span>

        {/* Badge promo ou nouveau */}
        {product.badge && (
          <span style={{
            position: "absolute",
            top: "8px",
            left: "8px",
            background: product.badge === "Nouveau" ? colors.navy[800] : colors.mint[500],
            color: product.badge === "Nouveau" ? "white" : colors.navy[800],
            padding: "4px 8px",
            borderRadius: "6px",
            fontSize: "10px",
            fontWeight: "bold",
          }}>
            {product.badge}
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: "10px" }}>
        <span style={{
          fontSize: "10px",
          fontWeight: "500",
          color: colors.mint[600],
          textTransform: "uppercase",
          letterSpacing: "0.3px",
        }}>
          {product.category}
        </span>

        <h4 style={{
          fontSize: "13px",
          fontWeight: "600",
          color: colors.gray[900],
          marginTop: "2px",
          lineHeight: "1.3",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          height: "34px",
        }}>
          {product.name}
        </h4>

        {/* Rating */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          marginTop: "4px",
        }}>
          <Icons.Star filled={true} />
          <span style={{ fontSize: "11px", color: colors.gray[600] }}>
            {product.rating}
          </span>
        </div>

        {/* Price avec logique "À partir de" */}
        <div style={{ marginTop: "6px" }}>
          {product.hasVariants && (
            <span style={{
              display: "block",
              fontSize: "10px",
              color: colors.gray[500],
              marginBottom: "2px",
            }}>
              À partir de
            </span>
          )}

          <div style={{ display: "flex", alignItems: "baseline", gap: "6px", flexWrap: "wrap" }}>
            <span style={{
              fontSize: "14px",
              fontWeight: "700",
              color: colors.navy[800],
            }}>
              {formatPrice(product.price)}
            </span>

            {product.oldPrice && (
              <span style={{
                fontSize: "11px",
                color: colors.gray[400],
                textDecoration: "line-through",
              }}>
                <span style={{
                  position: "absolute",
                  width: "1px",
                  height: "1px",
                  padding: 0,
                  margin: "-1px",
                  overflow: "hidden",
                  clip: "rect(0,0,0,0)",
                  whiteSpace: "nowrap",
                  borderWidth: 0,
                }}>
                  Ancien prix :{" "}
                </span>
                {formatPrice(product.oldPrice)}
              </span>
            )}
          </div>
        </div>
      </div>
    </a>
  </article>
);

// Composant Section avec Scroll Horizontal
const HorizontalProductSection = ({ title, icon, products, showViewAll = true }) => (
  <div style={{ marginBottom: "24px" }}>
    {/* Header */}
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "12px",
      paddingLeft: "16px",
      paddingRight: "16px",
    }}>
      <h3 style={{
        fontSize: "18px",
        fontWeight: "600",
        color: colors.gray[900],
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}>
        {icon} {title}
      </h3>
      {showViewAll && (
        <a href={`/c/${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} style={{
          fontSize: "14px",
          color: colors.navy[700],
          fontWeight: "500",
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}>
          Voir tout
          <Icons.ChevronRight />
        </a>
      )}
    </div>
    
    {/* Scroll Container */}
    <div className="scroll-container" style={{
      display: "flex",
      gap: "12px",
      overflowX: "auto",
      paddingLeft: "16px",
      paddingRight: "16px",
      paddingBottom: "8px",
    }}>
      {products.map(product => (
        <ProductCardCompact key={product.id} product={product} />
      ))}
    </div>
  </div>
);

// Composant Marques
const BrandsSection = () => (
  <div style={{ marginBottom: "24px" }}>
    <h3 style={{
      fontSize: "18px",
      fontWeight: "600",
      color: colors.gray[900],
      marginBottom: "12px",
      paddingLeft: "16px",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    }}>
      🏷️ Marques populaires
    </h3>
    <div className="scroll-container" style={{
      display: "flex",
      gap: "12px",
      overflowX: "auto",
      paddingLeft: "16px",
      paddingRight: "16px",
      paddingBottom: "8px",
    }}>
      {brands.map((brand) => (
        <a key={brand.name} href={`/marque/${brand.name.toLowerCase()}`} style={{
          minWidth: "80px",
          padding: "16px 12px",
          background: "white",
          borderRadius: "12px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          flexShrink: 0,
          textDecoration: "none",
        }}>
          <span aria-hidden="true" style={{ fontSize: "28px" }}>{brand.logo}</span>
          <span style={{
            fontSize: "12px",
            fontWeight: "500",
            color: colors.gray[700],
          }}>
            {brand.name}
          </span>
        </a>
      ))}
    </div>
  </div>
);

// Composant Trust Badges Compact
const TrustBadges = () => (
  <div style={{
    margin: "0 16px 24px",
    padding: "16px",
    background: colors.navy[50],
    borderRadius: "16px",
    display: "flex",
    justifyContent: "space-around",
  }}>
    {[
      { icon: <Icons.Truck />, label: "Livraison CI" },
      { icon: <Icons.CreditCard />, label: "Paiement COD" },
      { icon: <Icons.Phone />, label: "Support 7j/7" },
    ].map((item, i) => (
      <div key={i} style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}>
        <span style={{ color: colors.navy[800] }}>{item.icon}</span>
        <span style={{
          fontSize: "12px",
          fontWeight: "600",
          color: colors.gray[700],
        }}>
          {item.label}
        </span>
      </div>
    ))}
  </div>
);

// Composant Footer
const Footer = () => (
  <footer style={{
    marginTop: "32px",
    padding: "32px 16px",
    background: colors.navy[800],
    color: "white",
  }}>
    <div style={{ textAlign: "center", marginBottom: "24px" }}>
      <div style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "16px",
      }}>
        <div style={{ 
          width: "32px", 
          height: "32px", 
          background: colors.mint[500],
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: colors.navy[800],
          fontWeight: "bold",
          fontSize: "18px"
        }}>
          N
        </div>
        <span style={{ fontWeight: "700", fontSize: "18px" }}>NETEREKA</span>
      </div>
      <p style={{ fontSize: "14px", opacity: 0.8, maxWidth: "280px", margin: "0 auto" }}>
        Votre boutique d'électronique de confiance en Côte d'Ivoire
      </p>
    </div>
    
    {/* Liens */}
    <div style={{
      display: "flex",
      justifyContent: "center",
      gap: "24px",
      marginBottom: "24px",
      flexWrap: "wrap",
    }}>
      {["À propos", "CGV", "Livraison", "Contact"].map(link => (
        <a key={link} href="#" style={{
          color: "white",
          opacity: 0.8,
          fontSize: "14px",
          textDecoration: "none",
        }}>
          {link}
        </a>
      ))}
    </div>
    
    {/* Social */}
    <div style={{
      display: "flex",
      justifyContent: "center",
      gap: "16px",
      marginBottom: "24px",
    }}>
      {[
        { icon: "📘", label: "Facebook", href: "https://facebook.com/netereka" },
        { icon: "📸", label: "Instagram", href: "https://instagram.com/netereka" },
        { icon: "🐦", label: "Twitter", href: "https://twitter.com/netereka" },
      ].map((social) => (
        <a
          key={social.label}
          href={social.href}
          aria-label={`NETEREKA sur ${social.label}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            width: "44px",
            height: "44px",
            background: "rgba(255,255,255,0.1)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            textDecoration: "none",
          }}
        >
          <span aria-hidden="true">{social.icon}</span>
        </a>
      ))}
    </div>
    
    {/* Copyright */}
    <p style={{
      textAlign: "center",
      fontSize: "12px",
      opacity: 0.6,
    }}>
      © 2026 NETEREKA Electronic. Tous droits réservés.
    </p>
  </footer>
);

// Composant Principal - Homepage Mobile (Scroll Horizontal)
export default function NETEREKAHomepage() {
  return (
    <div style={{
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
      background: colors.gray[50],
      minHeight: "100vh",
      maxWidth: "430px",
      margin: "0 auto",
      position: "relative",
    }}>
      {/* Skip to main content */}
      <a href="#main-content" style={{
        position: "absolute",
        width: "1px",
        height: "1px",
        padding: 0,
        margin: "-1px",
        overflow: "hidden",
        clip: "rect(0,0,0,0)",
        whiteSpace: "nowrap",
        borderWidth: 0,
      }}>
        Aller au contenu principal
      </a>

      <Header cartCount={3} />

      <main id="main-content">
        <HeroBanner />
        <SearchBar />
        <Categories />
        
        {/* Meilleures ventes - Scroll H */}
        <HorizontalProductSection 
          title="Meilleures ventes" 
          icon="🔥" 
          products={bestSellers} 
        />
        
        {/* Promotions - Scroll H */}
        <HorizontalProductSection 
          title="Promotions" 
          icon="💚" 
          products={promotions} 
        />
        
        {/* Smartphones - Scroll H */}
        <HorizontalProductSection 
          title="Smartphones" 
          icon="📱" 
          products={smartphones} 
        />
        
        {/* Ordinateurs - Scroll H */}
        <HorizontalProductSection 
          title="Ordinateurs" 
          icon="💻" 
          products={computers} 
        />
        
        {/* Consoles & Gaming - Scroll H */}
        <HorizontalProductSection 
          title="Consoles & Gaming" 
          icon="🎮" 
          products={consoles} 
        />
        
        {/* Nouveautés - Scroll H */}
        <HorizontalProductSection 
          title="Nouveautés" 
          icon="⭐" 
          products={newArrivals} 
        />
        
        {/* Marques populaires */}
        <BrandsSection />
        
        {/* Trust Badges */}
        <TrustBadges />
      </main>
      
      <Footer />
      
      {/* Scoped scrollbar hide + focus styles + reduced motion */}
      <style>{`
        .scroll-container::-webkit-scrollbar {
          display: none;
        }
        .scroll-container {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        button:focus-visible,
        a:focus-visible,
        input:focus-visible {
          outline: 2px solid ${colors.navy[800]};
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
        html {
          -webkit-tap-highlight-color: transparent;
        }
      `}</style>
    </div>
  );
}
