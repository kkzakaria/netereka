"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { type ViewUpdate } from "@codemirror/view";
import { Button } from "@/components/ui/button";
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
  const [previewOpen, setPreviewOpen] = useState(false);

  const writeToIframe = useCallback((iframe: HTMLIFrameElement, content: string) => {
    const doc = iframe.contentDocument;
    if (!doc) return;
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
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="w-full space-y-2">
      <div className="html-editor-container">
        <div className="html-editor-code" ref={editorRef} />
      </div>
      <div className="flex justify-end">
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
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
