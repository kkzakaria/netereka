import { escapeHtml } from "./html";
import { getImageUrl } from "./images";

// Lexical text format bitmask (from lexical source)
const IS_BOLD = 1;
const IS_ITALIC = 2;
const IS_STRIKETHROUGH = 4;
const IS_UNDERLINE = 8;
const IS_CODE = 16;

interface LexicalNode {
  type: string;
  children?: LexicalNode[];
  text?: string;
  format?: number;
  tag?: string;
  listType?: string;
  url?: string;
  src?: string;
  alt?: string;
}

export interface LexicalState {
  root: { type: string; children?: unknown[] };
}

function serializeNode(node: LexicalNode, depth = 0): string {
  if (!node) return "";
  if (depth > 50) {
    console.error("[lexical-to-html] max recursion depth exceeded — truncating output");
    return "";
  }
  const next = (children: LexicalNode[]) => children.map((c) => serializeNode(c, depth + 1)).join("");

  switch (node.type) {
    case "root":
      return next(node.children ?? []);

    case "paragraph": {
      const inner = next(node.children ?? []);
      return inner ? `<p>${inner}</p>` : "<br>";
    }

    case "heading": {
      const tag = node.tag ?? "h2";
      if (!["h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)) return "";
      return `<${tag}>${next(node.children ?? [])}</${tag}>`;
    }

    case "list": {
      const tag = node.listType === "number" ? "ol" : "ul";
      return `<${tag}>${next(node.children ?? [])}</${tag}>`;
    }

    case "listitem":
      return `<li>${next(node.children ?? [])}</li>`;

    case "quote":
      return `<blockquote>${next(node.children ?? [])}</blockquote>`;

    case "code":
      return `<pre><code>${next(node.children ?? [])}</code></pre>`;

    // CodeHighlightNode — leaf node inside a code block, like TextNode but no format wrapping
    case "code-highlight": {
      const t = node.text ?? "";
      return t ? escapeHtml(t) : "";
    }

    case "horizontalrule":
      return "<hr>";

    case "link": {
      const url = node.url ?? "";
      const inner = next(node.children ?? []);
      if (!url || !/^(https?:|mailto:|\/)/i.test(url)) return inner;
      return `<a href="${escapeHtml(url)}" rel="noopener noreferrer">${inner}</a>`;
    }

    case "text": {
      const t = node.text ?? "";
      if (!t) return "";
      const escaped = escapeHtml(t);
      const fmt = node.format ?? 0;
      if (fmt === 0) return escaped;
      let result = escaped;
      if (fmt & IS_CODE) result = `<code>${result}</code>`;
      if (fmt & IS_BOLD) result = `<strong>${result}</strong>`;
      if (fmt & IS_ITALIC) result = `<em>${result}</em>`;
      if (fmt & IS_UNDERLINE) result = `<u>${result}</u>`;
      if (fmt & IS_STRIKETHROUGH) result = `<s>${result}</s>`;
      return result;
    }

    case "image": {
      const src = node.src ?? "";
      if (!src) return "";
      // Block dangerous URI schemes (data:, javascript:, vbscript:) — same rule as link nodes
      if (/^(javascript:|vbscript:|data:)/i.test(src)) return "";
      const resolvedSrc = getImageUrl(src);
      const alt = escapeHtml(node.alt ?? "");
      return `<img src="${escapeHtml(resolvedSrc)}" alt="${alt}" class="max-w-full h-auto rounded">`;
    }

    case "linebreak":
      return "<br>";

    default:
      if (node.children?.length) {
        console.warn("[lexical-to-html] unknown container node type:", node.type, "— rendering children without wrapper");
        return next(node.children);
      }
      console.warn("[lexical-to-html] unknown leaf node type:", node.type, "— node dropped from output");
      return "";
  }
}

export function lexicalJsonToHtml(state: LexicalState): string {
  if (!state?.root || typeof state.root !== "object" || Array.isArray(state.root)) {
    console.error("[lexical-to-html] invalid LexicalState: root must be an object", state);
    return "";
  }
  return serializeNode(state.root as LexicalNode);
}
