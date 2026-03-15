"use client";

import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $insertNodes, COMMAND_PRIORITY_EDITOR, createCommand, type LexicalCommand } from "lexical";
import { $createImageNode, ImageNode } from "./rich-text-editor-image-node";

export const INSERT_IMAGE_COMMAND: LexicalCommand<{ src: string; alt: string }> =
  createCommand("INSERT_IMAGE_COMMAND");

export function ImagePlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([ImageNode])) {
      // Log rather than throw — throwing inside useEffect bypasses React Error Boundaries
      // and crashes the entire component tree. Degrading gracefully keeps the editor usable.
      console.error("ImagePlugin: ImageNode must be registered in the editor config — image insertion disabled");
      return;
    }

    return editor.registerCommand(
      INSERT_IMAGE_COMMAND,
      ({ src, alt }) => {
        try {
          editor.update(() => {
            $insertNodes([$createImageNode(src, alt)]);
          });
        } catch (err) {
          console.error("[ImagePlugin] INSERT_IMAGE_COMMAND: editor.update failed", err);
          return false;
        }
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);

  return null;
}
