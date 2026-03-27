"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { type ViewUpdate } from "@codemirror/view";
import { Button } from "@/components/ui/button";
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
  const [isFullscreen, setIsFullscreen] = useState(false);

  const updatePreview = useCallback((content: string) => {
    const iframe = previewRef.current;
    if (!iframe) return;
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

  const onUpdate = useCallback(
    (update: ViewUpdate) => {
      if (!update.docChanged) return;
      const content = update.state.doc.toString();
      if (hiddenRef.current) hiddenRef.current.value = content;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => updatePreview(content), 300);
    },
    [updatePreview],
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
      updatePreview(startDoc);
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
    <div>
      <div className="mb-2 flex items-center justify-end gap-2 md:hidden">
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => setIsFullscreen(!isFullscreen)}
        >
          {isFullscreen ? "Afficher preview" : "Masquer preview"}
        </Button>
      </div>
      <div
        className="html-editor-container"
        data-fullscreen={isFullscreen}
      >
        <div className="html-editor-code" ref={editorRef} />
        <div className="html-editor-preview">
          <iframe
            ref={previewRef}
            sandbox="allow-styles"
            title="Preview HTML"
          />
        </div>
      </div>
      <input type="hidden" name={name} ref={hiddenRef} />
    </div>
  );
}
