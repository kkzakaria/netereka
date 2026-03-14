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
      throw new Error("ImagePlugin: ImageNode must be registered in the editor config");
    }

    return editor.registerCommand(
      INSERT_IMAGE_COMMAND,
      ({ src, alt }) => {
        editor.update(() => {
          $insertNodes([$createImageNode(src, alt)]);
        });
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);

  return null;
}
