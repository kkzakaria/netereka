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
  DialogTrigger,
} from "@/components/ui/dialog";
import "./html-editor.css";

interface HtmlEditorProps {
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
}

export function HtmlEditor({ name, defaultValue, placeholder }: HtmlEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const contentRef = useRef(defaultValue ?? "");
  const [initError, setInitError] = useState(false);

  const writeToIframe = useCallback((iframe: HTMLIFrameElement, content: string) => {
    const doc = iframe.contentDocument;
    if (!doc) {
      console.warn("[html-editor] iframe.contentDocument is null — preview cannot render");
      return;
    }
    try {
      doc.open();
      doc.write(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:system-ui,sans-serif;padding:16px;margin:0;color:#1a1a1a;line-height:1.6}img{max-width:100%;height:auto}</style>
</head>
<body>${content}</body>
</html>`);
      doc.close();
    } catch (err) {
      console.error("[html-editor] Preview update failed", err);
      try {
        doc.open();
        doc.write("<p style='color:red;padding:16px'>Impossible d'afficher l'aperçu. Vérifiez votre code HTML.</p>");
        doc.close();
      } catch { /* already logged */ }
    }
  }, []);

  const previewCallbackRef = useCallback((iframe: HTMLIFrameElement | null) => {
    previewRef.current = iframe;
    if (iframe) writeToIframe(iframe, contentRef.current);
  }, [writeToIframe]);

  const onUpdate = useCallback(
    (update: ViewUpdate) => {
      if (!update.docChanged) return;
      const content = update.state.doc.toString();
      contentRef.current = content;
      if (hiddenRef.current) hiddenRef.current.value = content;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (previewRef.current) writeToIframe(previewRef.current, content);
      }, 300);
    },
    [writeToIframe],
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
      if (debounceRef.current) clearTimeout(debounceRef.current);
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
        <Dialog>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="xs">
              Aperçu
            </Button>
          </DialogTrigger>
          <DialogContent className="flex h-[80vh] max-w-4xl flex-col p-0">
            <DialogHeader className="px-6 pt-6">
              <DialogTitle>Aperçu HTML</DialogTitle>
            </DialogHeader>
            <iframe
              ref={previewCallbackRef}
              sandbox="allow-styles"
              title="Aperçu HTML"
              className="min-h-0 flex-1 border-none"
            />
          </DialogContent>
        </Dialog>
      </div>
      <input type="hidden" name={name} ref={hiddenRef} />
    </div>
  );
}
