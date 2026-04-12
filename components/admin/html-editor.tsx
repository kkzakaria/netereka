"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { type ViewUpdate } from "@codemirror/view";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import "./html-editor.css";

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

  function buildSrcDoc(content: string) {
    // Extract the scope class (e.g. "desc-xyz") from CSS selectors so the
    // preview wraps content in a matching div, just like the storefront does.
    const scopeMatch = content.match(/\.(desc-[a-zA-Z0-9_-]+)\s/);
    const scopeClass = scopeMatch?.[1] ?? "";
    const bodyContent = scopeClass
      ? `<div class="${scopeClass}">${content}</div>`
      : content;

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:system-ui,sans-serif;padding:16px;margin:0;color:#1a1a1a;line-height:1.6}img{max-width:100%;height:auto}</style>
</head>
<body>${bodyContent}</body>
</html>`;
  }

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
      queueMicrotask(() => {
        setInitError(true);
        toast.error("L'éditeur HTML n'a pas pu se charger. Rechargez la page. Ne sauvegardez pas le formulaire.", { duration: Infinity });
      });
    }

    return () => {
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
        <Button type="button" variant="outline" size="xs" onClick={() => { setPreviewSrcDoc(buildSrcDoc(contentRef.current)); setPreviewOpen(true); }}>
          Aperçu
        </Button>
      </div>
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="flex h-[80%] w-[80%] flex-col overflow-hidden rounded-xl border bg-background shadow-lg">
            <div className="flex items-center justify-between px-6 py-4">
              <h3 className="text-sm font-medium">Aperçu HTML</h3>
              <Button type="button" variant="ghost" size="xs" onClick={() => setPreviewOpen(false)}>
                Fermer
              </Button>
            </div>
            <iframe
              srcDoc={previewSrcDoc}
              sandbox="allow-styles"
              title="Aperçu HTML"
              className="flex-1 border-none"
            />
          </div>
        </div>
      )}
      <input type="hidden" name={name} ref={hiddenRef} />
    </div>
  );
}
