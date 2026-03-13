"use client";

import { useCallback, useState } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { HorizontalRulePlugin } from "@lexical/react/LexicalHorizontalRulePlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { LinkNode, AutoLinkNode } from "@lexical/link";
import { CodeNode, CodeHighlightNode } from "@lexical/code";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import type { EditorState, LexicalEditor } from "lexical";
import { ToolbarPlugin } from "./rich-text-editor-toolbar";

const EDITOR_NODES = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  LinkNode,
  AutoLinkNode,
  CodeNode,
  CodeHighlightNode,
  HorizontalRuleNode,
];

interface RichTextEditorProps {
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
}

export function RichTextEditor({
  name,
  defaultValue,
  placeholder = "Rédigez la description du produit…",
}: RichTextEditorProps) {
  const [jsonValue, setJsonValue] = useState(defaultValue ?? "");

  // Only use defaultValue as Lexical editor state if it looks like Lexical JSON.
  // Must use a callback — passing a raw JSON string is not supported by LexicalComposer.
  const initialEditorStateJson =
    defaultValue?.trim().startsWith("{") ? defaultValue : undefined;

  const initialConfig = {
    namespace: "ProductDescription",
    nodes: EDITOR_NODES,
    onError: (error: Error) => {
      console.error("[RichTextEditor]", error);
    },
    editorState: initialEditorStateJson
      ? (editor: LexicalEditor) => {
          try {
            const state = editor.parseEditorState(initialEditorStateJson);
            editor.setEditorState(state);
          } catch {
            // Invalid JSON — start with empty editor
          }
        }
      : undefined,
  };

  const handleChange = useCallback((editorState: EditorState) => {
    setJsonValue(JSON.stringify(editorState.toJSON()));
  }, []);

  return (
    <div className="rounded-md border focus-within:ring-2 focus-within:ring-ring">
      <LexicalComposer initialConfig={initialConfig}>
        <ToolbarPlugin />
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="min-h-[200px] p-3 text-sm outline-none" />
            }
            placeholder={
              <div className="pointer-events-none absolute left-3 top-3 text-sm text-muted-foreground">
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <HistoryPlugin />
        <ListPlugin />
        <CheckListPlugin />
        <LinkPlugin />
        <HorizontalRulePlugin />
        <OnChangePlugin onChange={handleChange} />
      </LexicalComposer>
      <input type="hidden" name={name} value={jsonValue} />
    </div>
  );
}
