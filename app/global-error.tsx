"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          fontFamily:
            "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100dvh",
          textAlign: "center",
          backgroundColor: "#fafafa",
          color: "#111",
        }}
      >
        <div>
          <p style={{ fontSize: "3rem", fontWeight: 700, color: "#183C78", margin: 0 }}>
            500
          </p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "1rem" }}>
            Erreur interne du serveur
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.5rem" }}>
            Une erreur inattendue s&apos;est produite. Veuillez réessayer.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "2rem",
              padding: "0.625rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#fff",
              backgroundColor: "#183C78",
              border: "none",
              borderRadius: "0.75rem",
              cursor: "pointer",
              transition: "opacity 0.2s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.opacity = "0.9")}
            onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
