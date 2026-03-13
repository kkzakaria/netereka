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
import { $createParagraphNode, $createTextNode, $getRoot, type EditorState, type LexicalEditor } from "lexical";
import { toast } from "sonner";
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

  const isLexicalJson = defaultValue?.trim().startsWith("{") ?? false;

  const initialConfig = {
    namespace: "ProductDescription",
    nodes: EDITOR_NODES,
    onError: (error: Error) => {
      console.error("[RichTextEditor] Lexical runtime error:", error);
      toast.error("Une erreur est survenue dans l'éditeur. Veuillez recharger la page.");
    },
    editorState: (editor: LexicalEditor) => {
      if (isLexicalJson && defaultValue) {
        try {
          editor.setEditorState(editor.parseEditorState(defaultValue));
          return;
        } catch (err) {
          console.error("[RichTextEditor] parseEditorState failed — initializing with plain text fallback", err);
          // fall through to plain-text pre-population below
        }
      }
      // Pre-populate editor with existing plain-text / legacy HTML content so the
      // admin sees what was previously saved and cannot accidentally overwrite it.
      const raw = defaultValue?.trim();
      if (!raw) return;
      const root = $getRoot();
      root.clear();
      // Strip any HTML tags for legacy HTML descriptions (display as plain text in editor)
      const plainText = raw.startsWith("<") ? raw.replace(/<[^>]*>/g, "") : raw;
      plainText.split(/\n{2,}/).forEach((block) => {
        const para = $createParagraphNode();
        para.append($createTextNode(block.replace(/\n/g, " ")));
        root.append(para);
      });
    },
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
