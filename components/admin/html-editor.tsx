"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { type ViewUpdate } from "@codemirror/view";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import "./html-editor.css";

// Security note: the regex character class [a-zA-Z0-9_-] is intentionally
// restrictive to prevent attribute injection via the scope class value.
const SCOPE_CLASS_RE = /\.(desc-[a-zA-Z0-9_-]+)\s/;

/**
 * Build an HTML document for the preview iframe's srcDoc.
 * Extracts <style> blocks and places them in <head>, then wraps the remaining
 * body content in a scoped div (e.g. <div class="desc-xyz">) to match how
 * the storefront renders product descriptions (see product-details.tsx).
 */
function buildSrcDoc(content: string) {
  const scopeMatch = content.match(SCOPE_CLASS_RE);
  const scopeClass = scopeMatch?.[1] ?? "";

  // Separate <style> blocks from body content so styles go in <head>
  // and body content gets wrapped in the scope div.
  const styles: string[] = [];
  const bodyHtml = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, (match) => {
    styles.push(match);
    return "";
  });

  const wrappedBody = scopeClass
    ? `<div class="${scopeClass}">${bodyHtml}</div>`
    : bodyHtml;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:system-ui,sans-serif;padding:16px;margin:0;color:#1a1a1a;line-height:1.6}img{max-width:100%;height:auto}</style>
${styles.join("\n")}
</head>
<body>${wrappedBody}</body>
</html>`;
}

const TOAST_ID = "html-editor-init-error";

interface HtmlEditorProps {
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
}

export function HtmlEditor({ name, defaultValue, placeholder }: HtmlEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef(defaultValue ?? "");
  const [initError, setInitError] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSrcDoc, setPreviewSrcDoc] = useState("");

  const onUpdate = useCallback(
    (update: ViewUpdate) => {
      if (!update.docChanged) return;
      const content = update.state.doc.toString();
      contentRef.current = content;
      if (hiddenRef.current) hiddenRef.current.value = content;
    },
    [],
  );

  useEffect(() => {
    if (!editorRef.current || viewRef.current) return;

    const startDoc = defaultValue ?? "";
    try {
      const state = EditorState.create({
        doc: startDoc,
        extensions: [
          basicSetup,
          html(),
          css(),
          EditorView.updateListener.of(onUpdate),
          EditorView.theme({
            "&": { height: "100%" },
            ".cm-scroller": { overflow: "auto" },
          }),
          placeholder ? EditorView.contentAttributes.of({ "aria-placeholder": placeholder }) : [],
        ],
      });

      viewRef.current = new EditorView({
        state,
        parent: editorRef.current,
      });

      if (hiddenRef.current) hiddenRef.current.value = startDoc;
    } catch (err) {
      console.error("[html-editor] CodeMirror initialization failed", err);
      // queueMicrotask avoids React "Cannot update a component while rendering" warning
      // since this runs inside a useEffect that React may batch with renders.
      queueMicrotask(() => {
        setInitError(true);
        toast.error(
          "L'éditeur HTML n'a pas pu se charger. Rechargez la page. Ne sauvegardez pas le formulaire.",
          { id: TOAST_ID, duration: Infinity },
        );
      });
    }

    return () => {
      toast.dismiss(TOAST_ID);
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="w-full space-y-2">
      {initError && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          L&apos;éditeur HTML n&apos;a pas pu se charger. Rechargez la page. Ne sauvegardez pas le formulaire.
        </div>
      )}
      <div className="html-editor-container">
        <div className="html-editor-code" ref={editorRef} />
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => { setPreviewSrcDoc(buildSrcDoc(contentRef.current)); setPreviewOpen(true); }}
        >
          Aperçu
        </Button>
      </div>
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="flex h-[80vh] max-w-4xl flex-col p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Aperçu HTML</DialogTitle>
          </DialogHeader>
          <iframe
            srcDoc={previewSrcDoc}
            sandbox="allow-styles"
            title="Aperçu HTML"
            className="min-h-0 flex-1 border-none"
          />
        </DialogContent>
      </Dialog>
      <input type="hidden" name={name} ref={hiddenRef} disabled={initError} />
    </div>
  );
}
