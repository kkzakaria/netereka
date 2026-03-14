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
import { ImageNode } from "./rich-text-editor-image-node";
import { ImagePlugin } from "./rich-text-editor-image-plugin";

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
  ImageNode,
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
          console.error("[RichTextEditor] parseEditorState failed — editor left empty to prevent data loss", err);
          toast.error(
            "Impossible de charger la description existante. Rechargez la page avant de sauvegarder pour éviter toute perte de données.",
            { duration: Infinity },
          );
          // Leave editor empty — do NOT pre-populate with raw JSON string as that
          // would look like garbage and could be accidentally saved over the real content.
          return;
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
    try {
      setJsonValue(JSON.stringify(editorState.toJSON()));
    } catch (err) {
      console.error("[RichTextEditor] Failed to serialize editor state", err);
      toast.error("Erreur lors de la sauvegarde de l'état. Les dernières modifications peuvent ne pas être enregistrées.");
    }
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
        <ImagePlugin />
        <OnChangePlugin onChange={handleChange} />
      </LexicalComposer>
      <input type="hidden" name={name} value={jsonValue} />
    </div>
  );
}
