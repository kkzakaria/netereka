/**
 * Repère les écarts d'un document de contenu libre à la charte du site.
 *
 * Ce module AVERTIT, il ne refuse jamais : il retourne une liste d'écarts et
 * n'a aucun pouvoir de blocage. Deux raisons, posées dans le spec (§ 2.2) :
 * le vocabulaire `nk-` ne peut pas anticiper tout cas légitime, et un blocage
 * à l'écriture recréerait la rigidité que ce lot supprime.
 *
 * Aucune dépendance à React ni au DOM : l'éditeur admin et les outils MCP du
 * lot B l'appellent tous les deux, côté serveur comme côté client.
 *
 * L'analyse est volontairement textuelle et ligne à ligne. Ce n'est pas un
 * parseur : un faux positif coûte un avertissement ignoré, pas un blocage.
 */

export type ConformanceCode =
  | "literal-color"
  | "px-font-size"
  | "fixed-size"
  | "fixed-position"
  | "high-z-index"
  | "important"
  | "image-without-alt";

export interface ConformanceIssue {
  code: ConformanceCode;
  /** 1-indexé, pour pointer la ligne dans l'éditeur. */
  line: number;
  excerpt: string;
  suggestion: string;
}

const EXCERPT_MAX = 80;

/** Au-delà, un z-index passe au-dessus de l'en-tête et des dialogues. */
const Z_INDEX_CEILING = 50;

interface Rule {
  code: ConformanceCode;
  re: RegExp;
  suggestion: string;
  /** Filtre optionnel sur la correspondance, pour les seuils. */
  accept?: (m: RegExpExecArray) => boolean;
}

const RULES: Rule[] = [
  {
    code: "literal-color",
    re: /#[0-9a-fA-F]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\(/g,
    suggestion:
      "Emploie un token de la charte — var(--primary), var(--muted), var(--foreground) — plutôt qu'une couleur littérale : elle ne suit pas le thème sombre.",
  },
  {
    code: "px-font-size",
    re: /font-size\s*:\s*[\d.]+px/gi,
    suggestion: "Emploie rem ou em : une taille en px ignore le réglage de taille de police du visiteur.",
  },
  {
    code: "fixed-size",
    re: /(?:^|[;{"'\s])(?:width|height)\s*:\s*[\d.]+px/gi,
    suggestion:
      "Une dimension fixe déborde sur mobile. Emploie une largeur relative, max-width, ou une classe nk- (nk-container, nk-grid).",
  },
  {
    code: "fixed-position",
    re: /position\s*:\s*fixed/gi,
    suggestion: "position:fixed sort le bloc du flux et recouvre l'en-tête. Reste dans le flux de la page.",
  },
  {
    code: "high-z-index",
    re: /z-index\s*:\s*(\d+)/gi,
    suggestion: `Un z-index au-dessus de ${Z_INDEX_CEILING} passe devant l'en-tête et les dialogues du site.`,
    accept: (m) => Number(m[1]) > Z_INDEX_CEILING,
  },
  {
    code: "important",
    re: /!\s*important/gi,
    suggestion: "!important empêche toute correction ultérieure. Gagne en spécificité plutôt qu'en force.",
  },
];

const IMG_RE = /<img\b[^<>]*>/gi;

function excerptOf(text: string): string {
  const t = text.trim();
  return t.length <= EXCERPT_MAX ? t : `${t.slice(0, EXCERPT_MAX - 1)}…`;
}

/** Aplatit les espaces (retours à la ligne compris) en un seul espace, pour
 *  qu'un extrait reste lisible quand la balise qu'il décrit s'étend sur
 *  plusieurs lignes — sinon l'extrait contiendrait le saut de ligne brut. */
function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ");
}

/** Numéro de ligne 1-indexé de la position `index` dans `html`, à partir des
 *  décalages (croissants) de chaque retour à la ligne. */
function lineAt(newlineOffsets: number[], index: number): number {
  let lo = 0;
  let hi = newlineOffsets.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (newlineOffsets[mid] < index) lo = mid + 1;
    else hi = mid;
  }
  return lo + 1;
}

export function checkDesignConformance(html: string): ConformanceIssue[] {
  if (!html) return [];
  const issues: ConformanceIssue[] = [];
  const lines = html.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const at = i + 1;

    for (const rule of RULES) {
      rule.re.lastIndex = 0;
      let m: RegExpExecArray | null;
      let hit = false;
      while ((m = rule.re.exec(line)) !== null) {
        if (rule.accept && !rule.accept(m)) continue;
        hit = true;
        break;
      }
      if (hit) {
        issues.push({ code: rule.code, line: at, excerpt: excerptOf(line), suggestion: rule.suggestion });
      }
    }
  }

  // Les <img> sont cherchées sur le document entier, pas ligne à ligne : une
  // balise coupée par un retour à la ligne (ex. `<img\n  src="/a.jpg">`) ne
  // correspond jamais à une regex bornée à une seule ligne, et son alt
  // manquant passait alors inaperçu. Les autres règles restent ligne à ligne —
  // elles n'ont pas ce problème, seule l'image a besoin de la vue document.
  const newlineOffsets: number[] = [];
  for (let i = 0; i < html.length; i++) {
    if (html.charCodeAt(i) === 10) newlineOffsets.push(i);
  }

  const reportedLines = new Set<number>();
  IMG_RE.lastIndex = 0;
  let img: RegExpExecArray | null;
  while ((img = IMG_RE.exec(html)) !== null) {
    // alt="" compte comme absent : une image décorative n'a rien à faire
    // dans un contenu éditorial, et un alt vide est le plus souvent un oubli.
    if (/\balt\s*=\s*("[^"]+"|'[^']+'|[^\s"'<>]+)/i.test(img[0])) continue;
    const at = lineAt(newlineOffsets, img.index);
    // Comme avant le passage en vue document : au plus un avertissement par
    // ligne de départ, pour ne pas noyer l'éditeur si plusieurs images sans
    // alt se suivent sur la même ligne.
    if (reportedLines.has(at)) continue;
    reportedLines.add(at);
    issues.push({
      code: "image-without-alt",
      line: at,
      excerpt: excerptOf(collapseWhitespace(img[0])),
      suggestion: "Décris l'image dans un attribut alt : sans lui, elle est invisible aux lecteurs d'écran et à Google.",
    });
  }

  issues.sort((a, b) => a.line - b.line);

  return issues;
}
