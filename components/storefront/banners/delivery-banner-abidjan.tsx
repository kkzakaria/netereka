import { cn } from "@/lib/utils";

/**
 * DeliveryBannerAbidjan — wide animated "strip" banner (≈1600×202 ratio).
 *
 * Theme: "Livraison rapide · Partout à Abidjan". A delivery courier rides a
 * scooter across an Abidjan night skyline with a glowing dashed road.
 *
 * Pure CSS/SVG — no client JS, no video file: it renders as a Server Component,
 * and freezes to a tasteful resting frame when the visitor prefers reduced
 * motion. All animation names/classes are prefixed `dba-` so the inline <style>
 * can't collide with sibling banners.
 *
 * Responsive: the band is a CSS *container* (`container-type: inline-size`) with
 * a fixed `aspect-ratio`, and every inner size is expressed in `cqw`. So the
 * exact same horizontal composition simply scales down on mobile — nothing
 * reflows or wraps.
 *
 * The motion was designed on a Remotion bench (see `remotion/`) and ported here.
 */
export function DeliveryBannerAbidjan({
  className,
  href,
}: {
  className?: string;
  /** Optional: wrap the banner in a link (e.g. to /livraison). */
  href?: string;
}) {
  const band = (
    <div
      className={cn("dba-band", className)}
      data-banner="abidjan"
      role="img"
      aria-label="NETEREKA — Livraison rapide, partout à Abidjan"
    >
      <style>{DBA_CSS}</style>

      <div className="dba-glow" />

      <div className="dba-stars" aria-hidden="true">
        <span className="dba-star dba-s2" style={{ left: "18%", top: "24%" }} />
        <span className="dba-star" style={{ left: "33%", top: "16%" }} />
        <span className="dba-star" style={{ left: "46%", top: "30%" }} />
        <span className="dba-star dba-s2" style={{ left: "58%", top: "18%" }} />
        <span className="dba-star" style={{ left: "70%", top: "34%" }} />
        <span className="dba-star" style={{ left: "80%", top: "22%" }} />
        <span className="dba-star dba-s2" style={{ left: "90%", top: "40%" }} />
        <span className="dba-star" style={{ left: "26%", top: "42%" }} />
      </div>

      {/* Abidjan skyline — two copies for a seamless parallax loop */}
      <div className="dba-skyline" aria-hidden="true">
        <svg viewBox="0 0 800 80" preserveAspectRatio="none">
          <path fill="#0a2c4a" d={SKYLINE_PATH} />
        </svg>
        <svg viewBox="0 0 800 80" preserveAspectRatio="none">
          <path fill="#0a2c4a" d={SKYLINE_PATH} />
        </svg>
      </div>

      <div className="dba-road-soft" aria-hidden="true" />
      <div className="dba-road" aria-hidden="true" />

      <div className="dba-content">
        <div className="dba-text">
          <span className="dba-brand">NETEREKA</span>
          <h2 className="dba-title">
            Livraison{" "}
            <span className="dba-em">
              rapide
              <i className="dba-underline" />
            </span>{" "}
            à&nbsp;Abidjan
          </h2>
          <p className="dba-sub">
            Partout à Abidjan · <b>Flotte interne</b>
          </p>
        </div>

        <div className="dba-scene" aria-hidden="true">
          <span className="dba-pin">
            <svg viewBox="0 0 24 24" fill="none">
              <circle className="dba-dot" cx="12" cy="10" r="3" fill="#00ff9c" />
              <path
                d="M12 22s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12Z"
                stroke="#00ff9c"
                strokeWidth="1.6"
              />
              <circle cx="12" cy="10" r="2.4" fill="#06223a" stroke="#00ff9c" strokeWidth="1.4" />
            </svg>
            Abidjan
          </span>

          <div className="dba-moto">
            <svg viewBox="11 22 65 49" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* speed trails */}
              <g stroke="#00ff9c" strokeLinecap="round">
                <line className="dba-trail" x1="12" y1="46" x2="23" y2="46" strokeWidth="1.1" opacity=".85" />
                <line
                  className="dba-trail"
                  x1="14"
                  y1="50"
                  x2="22"
                  y2="50"
                  strokeWidth=".9"
                  opacity=".55"
                  style={{ animationDelay: ".12s" }}
                />
                <line
                  className="dba-trail"
                  x1="13"
                  y1="54"
                  x2="24"
                  y2="54"
                  strokeWidth=".9"
                  opacity=".4"
                  style={{ animationDelay: ".06s" }}
                />
              </g>

              {/* wheels — solid (tire + grey hub + bolts), no spokes */}
              {([31, 66] as const).map((cx) => (
                <g key={cx}>
                  <circle cx={cx} cy="64" r="6" fill="#06182a" />
                  <circle cx={cx} cy="64" r="6" fill="none" stroke="#00ff9c" strokeWidth=".8" />
                  <g className="dba-wheel">
                    <circle cx={cx} cy="64" r="3" fill="#60798f" />
                    <circle cx={cx} cy="61.6" r=".7" fill="#27384a" />
                    <circle cx={cx + 2.1} cy="65.2" r=".7" fill="#27384a" />
                    <circle cx={cx - 2.1} cy="65.2" r=".7" fill="#27384a" />
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
              <text
                x="34"
                y="50.5"
                fontFamily="var(--font-sans)"
                fontSize="7.5"
                fontWeight="900"
                fill="#06223a"
                textAnchor="middle"
              >
                N
              </text>

              {/* ===== rider (seated upright) ===== */}
              {/* pants: thigh + bent shin */}
              <path d="M49 50 L57 52" stroke="#16385c" strokeWidth="3.6" strokeLinecap="round" />
              <path d="M57 52 L52 63" stroke="#16385c" strokeWidth="3.3" strokeLinecap="round" />
              {/* sneaker on the floorboard + mint sole */}
              <path d="M45 62 h7 q3 0 4 2 q0.4 1.3 -1.4 1.3 h-9.6 a1.4 1.4 0 0 1 -1.4 -1.4 v-0.5 a1.4 1.4 0 0 1 1.4 -1.4 z" fill="#ffffff" />
              <path d="M44.5 65.7 h8.4" stroke="#00ff9c" strokeWidth=".7" strokeLinecap="round" />
              {/* shirt torso + neck */}
              <path d="M44.5 50 C43 44 43.5 39.5 47 37.5 C49.5 36.2 52 38 52 40.5 C52 43.5 50 45.5 50 50 Z" fill="#cfe7fb" />
              <path d="M48 38.5 L50 41.5" stroke="#eec19a" strokeWidth="1.8" strokeLinecap="round" />
              {/* upper arm (shirt) + forearm (skin) + hand */}
              <path d="M47.5 41 L52 43" stroke="#cfe7fb" strokeWidth="2.6" strokeLinecap="round" />
              <path d="M52 43 L61 46" stroke="#e8b890" strokeWidth="2.1" strokeLinecap="round" />
              <circle cx="61.5" cy="46.3" r="1.7" fill="#eec19a" />
              {/* face / neck (skin) */}
              <path d="M47 37 C47 33.2 49.6 31.8 52.4 32.7 C54.3 33.5 54.3 35.7 53.3 37.5 C52.4 39 49.6 39.4 47.7 38.5 Z" fill="#eec19a" />
              {/* helmet + crest + brim */}
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
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        className="block rounded-[1.1cqw] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF9C] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label="Livraison rapide partout à Abidjan — en savoir plus"
      >
        {band}
      </a>
    );
  }

  return band;
}

const SKYLINE_PATH =
  "M0,80 V52 h34 v-10 h22 v18 h26 V36 h16 v44 H0 Z M150,80 V30 h10 V18 h10 v12 h12 v50 H150 Z M210,80 V44 h40 v-8 h10 v44 H210 Z M300,80 V24 h8 V12 h12 v12 h8 v56 H300 Z M360,80 V48 h54 v32 H360 Z M440,80 V34 h14 v-12 h14 v12 h12 v46 H440 Z M520,80 V50 h30 v-14 h10 v44 H520 Z M600,80 V28 h10 V14 h10 v14 h10 v52 H600 Z M660,80 V46 h44 v34 H660 Z M730,80 V38 h12 v-10 h12 v52 H730 Z";

/* Every size in `cqw` so the whole strip scales uniformly with its own width. */
const DBA_CSS = `
.dba-band{
  position:relative; width:100%; aspect-ratio:1600 / 202;
  container-type:inline-size;
  border-radius:1.1cqw; overflow:hidden; isolation:isolate;
  font-family:var(--font-sans);
  background:
    radial-gradient(120% 180% at 88% -40%, rgba(0,255,156,.22), transparent 42%),
    linear-gradient(103deg,#06223a 0%,#0b3056 52%,#072743 100%);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.06);
}
.dba-band::after{ content:""; position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(180deg, rgba(255,255,255,.05), transparent 30%); }
.dba-glow{ position:absolute; top:-3.75cqw; right:-2.5cqw; width:17.5cqw; height:17.5cqw; z-index:0;
  background:radial-gradient(circle, rgba(0,255,156,.30), transparent 62%); filter:blur(.5cqw); }
.dba-stars{ position:absolute; inset:0; z-index:0; }
.dba-star{ position:absolute; width:.16cqw; height:.16cqw; border-radius:50%; background:#bfe9ff; opacity:.55; }
.dba-star.dba-s2{ width:.24cqw; height:.24cqw; opacity:.7; }
.dba-skyline{ position:absolute; left:0; bottom:2.1cqw; width:200%; height:3.9cqw; z-index:0; display:flex; opacity:.5; }
.dba-skyline svg{ width:50%; height:100%; display:block; flex:0 0 50%; }
.dba-road{ position:absolute; left:0; right:0; bottom:1.4cqw; height:.19cqw; z-index:1;
  background:rgba(0,255,156,.18); overflow:hidden; }
.dba-road::before{ content:""; position:absolute; inset:0; left:-50%; width:200%;
  background:repeating-linear-gradient(90deg, #00ff9c 0 1.6cqw, transparent 1.6cqw 3.75cqw);
  opacity:.85; box-shadow:0 0 .6cqw rgba(0,255,156,.5); }
.dba-road-soft{ position:absolute; left:0; right:0; bottom:.85cqw; height:1px; z-index:1;
  background:linear-gradient(90deg,transparent, rgba(143,180,214,.35), transparent); }
.dba-content{ position:relative; z-index:2; height:100%; display:flex; align-items:center;
  justify-content:space-between; gap:1cqw; padding:0 2.6cqw; }
.dba-text{ max-width:62%; }
.dba-brand{ display:inline-flex; align-items:center; gap:.45cqw;
  font-size:.78cqw; font-weight:800; letter-spacing:.34em; color:#9ad7ff; text-transform:uppercase; }
.dba-brand::before{ content:""; width:1cqw; height:.13cqw; border-radius:2px; background:#00ff9c; box-shadow:0 0 .5cqw #00ff9c; }
.dba-title{ margin:.4cqw 0 0; color:#eaf6ff; font-weight:800; line-height:.98;
  font-size:2.65cqw; letter-spacing:-.02em; white-space:nowrap; }
.dba-em{ position:relative; color:#00ff9c; font-style:italic; padding:0 .04em;
  text-shadow:0 0 1cqw rgba(0,255,156,.45); }
.dba-em .dba-underline{ position:absolute; left:0; right:0; bottom:-.08em; height:.11em;
  background:linear-gradient(90deg,#00ff9c,#7bffcb); border-radius:99px; transform:scaleX(1); transform-origin:left; }
.dba-sub{ margin:.55cqw 0 0; color:#9fc1de; font-size:.96cqw; font-weight:500; white-space:nowrap; }
.dba-sub b{ color:#cfe7fb; font-weight:700; }
.dba-scene{ position:relative; flex:0 0 auto; width:22cqw; height:100%; }
.dba-pin{ position:absolute; top:.9cqw; right:.4cqw; z-index:3; display:inline-flex; align-items:center; gap:.32cqw;
  font-size:.78cqw; font-weight:700; color:#eaf6ff; white-space:nowrap;
  background:rgba(8,32,54,.55); border:1px solid rgba(0,255,156,.35);
  padding:.28cqw .6cqw .28cqw .42cqw; border-radius:99px; backdrop-filter:blur(4px); }
.dba-pin svg{ width:.85cqw; height:.85cqw; }
.dba-dot{ transform-origin:center; }
.dba-moto{ position:absolute; right:1.5%; bottom:.6cqw; width:15cqw; z-index:2; }
.dba-moto svg{ width:100%; height:auto; display:block; overflow:visible;
  filter:drop-shadow(0 .4cqw .8cqw rgba(0,0,0,.35)); }
.dba-wheel{ transform-box:fill-box; transform-origin:center; }
.dba-trail{ transform-box:fill-box; transform-origin:right center; }
@media (prefers-reduced-motion: no-preference){
  .dba-skyline{ animation:dba-pan 26s linear infinite; }
  .dba-road::before{ animation:dba-dash 1.05s linear infinite; }
  .dba-moto{ animation:dba-bob 1.7s ease-in-out infinite; }
  .dba-wheel{ animation:dba-spin .55s linear infinite; }
  .dba-trail{ animation:dba-trail .7s ease-in-out infinite; }
  .dba-glow{ animation:dba-pulse 5s ease-in-out infinite; }
  .dba-dot{ animation:dba-ping 1.8s ease-out infinite; }
  .dba-em .dba-underline{ transform:scaleX(0); animation:dba-draw .9s .35s cubic-bezier(.2,.8,.2,1) forwards; }
  .dba-star{ animation:dba-tw 3s ease-in-out infinite; }
  .dba-star.dba-s2{ animation-duration:4.2s; }
}
@keyframes dba-pan{ to{ transform:translateX(-50%); } }
@keyframes dba-dash{ to{ transform:translateX(3.75cqw); } }
@keyframes dba-bob{ 0%,100%{ transform:translateY(0) rotate(-.4deg); } 50%{ transform:translateY(-1.5%) rotate(.4deg); } }
@keyframes dba-spin{ to{ transform:rotate(360deg); } }
@keyframes dba-trail{ 0%,100%{ opacity:.25; transform:scaleX(.7); } 50%{ opacity:.9; transform:scaleX(1.15); } }
@keyframes dba-pulse{ 0%,100%{ opacity:.85; } 50%{ opacity:1; } }
@keyframes dba-ping{ 0%{ opacity:.9; r:3; } 70%,100%{ opacity:0; r:11; } }
@keyframes dba-draw{ to{ transform:scaleX(1); } }
@keyframes dba-tw{ 0%,100%{ opacity:.25; } 50%{ opacity:.8; } }
`;
