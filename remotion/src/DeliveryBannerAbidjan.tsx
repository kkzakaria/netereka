import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * Remotion motion bench for the "Livraison rapide · Partout à Abidjan" strip.
 *
 * This mirrors the production CSS/SVG component
 * (components/storefront/banners/delivery-banner-abidjan.tsx) but drives every
 * transform from the current frame so the loop renders to a seamless MP4/GIF.
 *
 * Loop length is 180 frames (6s @ 30fps). All periodic motion uses an integer
 * number of cycles over the loop so frame 180 lines up with frame 0.
 */

const SKYLINE_PATH =
  "M0,80 V52 h34 v-10 h22 v18 h26 V36 h16 v44 H0 Z M150,80 V30 h10 V18 h10 v12 h12 v50 H150 Z M210,80 V44 h40 v-8 h10 v44 H210 Z M300,80 V24 h8 V12 h12 v12 h8 v56 H300 Z M360,80 V48 h54 v32 H360 Z M440,80 V34 h14 v-12 h14 v12 h12 v46 H440 Z M520,80 V50 h30 v-14 h10 v44 H520 Z M600,80 V28 h10 V14 h10 v14 h10 v52 H600 Z M660,80 V46 h44 v34 H660 Z M730,80 V38 h12 v-10 h12 v52 H730 Z";

export const DeliveryBannerAbidjan: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const t = frame / durationInFrames; // 0..1 over the loop

  // --- periodic motion (integer cycles → seamless) ---
  const skylineX = -t * 50; // %, two copies → -50% == 0 visually
  const roadX = ((frame % 30) / 30) * 60; // 60px dash period, 1s
  const wheelRot = t * 11 * 360; // 11 turns
  const bobY = -3 * (0.5 - 0.5 * Math.cos(2 * Math.PI * 3 * t)); // 3 bobs, 0..-3
  const bobRot = 0.4 * Math.sin(2 * Math.PI * 3 * t);
  const glow = 0.85 + 0.15 * (0.5 - 0.5 * Math.cos(2 * Math.PI * 1 * t));

  // pin ping: 3 cycles over the loop
  const ping = (frame % 60) / 60;
  const pinR = 3 + ping * 8;
  const pinOpacity = 1 - ping;

  // underline draws once via spring, then holds
  const underline = spring({ frame: frame - 10, fps, config: { damping: 16 } });

  // speed-trail pulse (3 cycles)
  const trail = (i: number) => {
    const phase = (2 * Math.PI * 3 * t) - i * 0.5;
    const k = 0.5 - 0.5 * Math.cos(phase);
    return { opacity: 0.25 + 0.65 * k, scaleX: 0.7 + 0.45 * k };
  };

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(120% 180% at 88% -40%, rgba(0,255,156,.22), transparent 42%), linear-gradient(103deg,#06223a 0%,#0b3056 52%,#072743 100%)",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
        overflow: "hidden",
      }}
    >
      {/* glow */}
      <div
        style={{
          position: "absolute",
          top: -60,
          right: -40,
          width: 280,
          height: 280,
          background:
            "radial-gradient(circle, rgba(0,255,156,.30), transparent 62%)",
          filter: "blur(8px)",
          opacity: glow,
        }}
      />

      {/* skyline parallax */}
      <div
        style={{
          position: "absolute",
          left: `${skylineX}%`,
          bottom: 34,
          width: "200%",
          height: 62,
          display: "flex",
          opacity: 0.5,
        }}
      >
        {[0, 1].map((i) => (
          <svg key={i} viewBox="0 0 800 80" preserveAspectRatio="none" style={{ width: "50%", height: "100%" }}>
            <path fill="#0a2c4a" d={SKYLINE_PATH} />
          </svg>
        ))}
      </div>

      {/* road */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 22, height: 3, background: "rgba(0,255,156,.18)", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            left: "-50%",
            width: "200%",
            transform: `translateX(${roadX}px)`,
            background:
              "repeating-linear-gradient(90deg, #00ff9c 0 26px, transparent 26px 60px)",
            opacity: 0.85,
            boxShadow: "0 0 10px rgba(0,255,156,.5)",
          }}
        />
      </div>

      {/* TEXT */}
      <div style={{ position: "absolute", left: 56, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 800, letterSpacing: ".34em", color: "#9ad7ff" }}>
          <span style={{ width: 18, height: 2, borderRadius: 2, background: "#00ff9c", boxShadow: "0 0 8px #00ff9c" }} />
          NETEREKA
        </span>
        <h2 style={{ margin: "8px 0 0", color: "#eaf6ff", fontWeight: 800, lineHeight: 0.98, fontSize: 52, letterSpacing: "-.02em" }}>
          Livraison{" "}
          <span style={{ position: "relative", color: "#00ff9c", fontStyle: "italic", textShadow: "0 0 18px rgba(0,255,156,.45)" }}>
            rapide
            <i
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: "-.08em",
                height: ".11em",
                background: "linear-gradient(90deg,#00ff9c,#7bffcb)",
                borderRadius: 99,
                transform: `scaleX(${underline})`,
                transformOrigin: "left",
              }}
            />
          </span>{" "}
          à&nbsp;Abidjan
        </h2>
        <p style={{ margin: "12px 0 0", color: "#9fc1de", fontSize: 19, fontWeight: 500 }}>
          Partout à Abidjan · <b style={{ color: "#cfe7fb", fontWeight: 700 }}>Flotte interne</b>
        </p>
      </div>

      {/* PIN */}
      <div
        style={{
          position: "absolute",
          top: 18,
          right: 40,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 14,
          fontWeight: 700,
          color: "#eaf6ff",
          background: "rgba(8,32,54,.55)",
          border: "1px solid rgba(0,255,156,.35)",
          padding: "5px 12px 5px 8px",
          borderRadius: 99,
        }}
      >
        <svg viewBox="0 0 24 24" width={15} height={15} fill="none">
          <circle cx="12" cy="10" r={pinR} fill="#00ff9c" opacity={pinOpacity} />
          <path d="M12 22s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12Z" stroke="#00ff9c" strokeWidth="1.6" />
          <circle cx="12" cy="10" r="2.4" fill="#06223a" stroke="#00ff9c" strokeWidth="1.4" />
        </svg>
        Abidjan
      </div>

      {/* MOTO */}
      <div
        style={{
          position: "absolute",
          right: 60,
          bottom: 8,
          width: 226,
          transform: `translateY(${bobY}px) rotate(${bobRot}deg)`,
        }}
      >
        <svg viewBox="11 22 65 49" fill="none" style={{ width: "100%", height: "auto", overflow: "visible", filter: "drop-shadow(0 4px 8px rgba(0,0,0,.35))" }}>
          {/* speed trails */}
          <g stroke="#00ff9c" strokeLinecap="round">
            {([[12, 46, 23], [14, 50, 22], [13, 54, 24]] as const).map(([x1, y, x2], i) => {
              const tr = trail(i);
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y}
                  x2={x2}
                  y2={y}
                  strokeWidth={i === 0 ? 1.1 : 0.9}
                  opacity={tr.opacity}
                  style={{ transformBox: "fill-box", transformOrigin: "right center", transform: `scaleX(${tr.scaleX})` }}
                />
              );
            })}
          </g>

          {/* wheels — solid (tire + grey hub + bolts) */}
          {([31, 66] as const).map((cx) => (
            <g key={cx}>
              <circle cx={cx} cy="64" r="6" fill="#06182a" />
              <circle cx={cx} cy="64" r="6" fill="none" stroke="#00ff9c" strokeWidth="0.8" />
              <g style={{ transformBox: "fill-box", transformOrigin: "center", transform: `rotate(${wheelRot}deg)` }}>
                <circle cx={cx} cy="64" r="3" fill="#60798f" />
                <circle cx={cx} cy="61.6" r="0.7" fill="#27384a" />
                <circle cx={cx + 2.1} cy="65.2" r="0.7" fill="#27384a" />
                <circle cx={cx - 2.1} cy="65.2" r="0.7" fill="#27384a" />
              </g>
            </g>
          ))}

          {/* slate chassis — fenders + floorboard + front fork */}
          <path d="M22 65 A10 10 0 0 1 41 65 L41 66 L22 66 Z" fill="#6f9bc4" />
          <path d="M56 65 A10 10 0 0 1 76 65 L76 66 L56 66 Z" fill="#6f9bc4" />
          <path d="M40 61 H58 q2 0 2 2 V66 H40 Z" fill="#6f9bc4" />
          <path d="M59 47 C57 53 58 58 61 63 L65 63 C63 57 63 51 65 47 Z" fill="#6f9bc4" />

          {/* light body panels */}
          <path d="M22 64 C20 56 26 51 35 51 C46 51 49 58 47 64 C47 65.5 46 66 44 66 L25 66 C23 66 22 65.5 22 64 Z" fill="#e7f3ff" />
          <path d="M57 64 C56 50 60 42 66 41 C73 40 76 46 75 53 L74 62 C74 65 71 66 67 66 L60 66 C58 66 57 65 57 64 Z" fill="#e7f3ff" />
          <path d="M60 46 C59 42 62 39 66 39 C70 39 72 42 71 45 C70 48 67 49 64 48.5 C61 48 60 47.5 60 46 Z" fill="#e7f3ff" />

          {/* 2-tone skirts */}
          <path d="M25 64 C24 58 28 54 35 54 C43 54 46 59 45 64 Z" fill="#cfe7fb" />
          <path d="M60 63 C59 54 62 47 67 46 L74 48 L73 62 C73 64 71 64 68 64 L62 64 C60 64 60 64 60 63 Z" fill="#cfe7fb" />

          {/* handlebar grip + indicators */}
          <rect x="58" y="46" width="5" height="3" rx="1.4" fill="#16385c" />
          <circle cx="74" cy="52" r="1.3" fill="#00ff9c" />
          <circle cx="25" cy="55" r="1.2" fill="#00ff9c" />
          <circle cx="70" cy="42" r="1" fill="#00ff9c" />

          {/* seat + rack */}
          <path d="M22 55 h24 v1.4 h-24 z" fill="#16385c" />
          <path d="M32 52 q-1 -4 5 -4 h16 q5 0 4 4 l-0.5 2 h-23 z" fill="#16385c" />

          {/* delivery box on rear rack */}
          <path d="M40 52 h6 v2 h-6 z" fill="#9fc1de" />
          <rect x="25" y="41" width="18" height="13" rx="2" fill="#00ff9c" />
          <rect x="25" y="41" width="18" height="13" rx="2" fill="url(#dba-boxsh)" />
          <text x="34" y="50.5" fontFamily="inherit" fontSize="7.5" fontWeight="900" fill="#06223a" textAnchor="middle">N</text>

          {/* rider (seated upright) */}
          <path d="M49 50 L57 52" stroke="#16385c" strokeWidth="3.6" strokeLinecap="round" />
          <path d="M57 52 L52 63" stroke="#16385c" strokeWidth="3.3" strokeLinecap="round" />
          <path d="M45 62 h7 q3 0 4 2 q0.4 1.3 -1.4 1.3 h-9.6 a1.4 1.4 0 0 1 -1.4 -1.4 v-0.5 a1.4 1.4 0 0 1 1.4 -1.4 z" fill="#ffffff" />
          <path d="M44.5 65.7 h8.4" stroke="#00ff9c" strokeWidth="0.7" strokeLinecap="round" />
          <path d="M44.5 50 C43 44 43.5 39.5 47 37.5 C49.5 36.2 52 38 52 40.5 C52 43.5 50 45.5 50 50 Z" fill="#cfe7fb" />
          <path d="M48 38.5 L50 41.5" stroke="#eec19a" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M47.5 41 L52 43" stroke="#cfe7fb" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M52 43 L61 46" stroke="#e8b890" strokeWidth="2.1" strokeLinecap="round" />
          <circle cx="61.5" cy="46.3" r="1.7" fill="#eec19a" />
          <path d="M47 37 C47 33.2 49.6 31.8 52.4 32.7 C54.3 33.5 54.3 35.7 53.3 37.5 C52.4 39 49.6 39.4 47.7 38.5 Z" fill="#eec19a" />
          <circle cx="46.5" cy="32" r="4.9" fill="#cfe7fb" />
          <path d="M46.5 27.6 a4.9 4.9 0 0 1 4.4 2.7 l-8.8 0 a4.9 4.9 0 0 1 4.4 -2.7 z" fill="#00ff9c" opacity=".95" />
          <path d="M50.8 30.4 l3.7 1.1 -3.7 1.4 z" fill="#0e2a47" />

          <defs>
            <linearGradient id="dba-boxsh" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity=".35" />
              <stop offset="1" stopColor="#06223a" stopOpacity=".15" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </AbsoluteFill>
  );
};
