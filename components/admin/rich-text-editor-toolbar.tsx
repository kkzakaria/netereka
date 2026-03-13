"use client";

import { useCallback, useEffect, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
} from "lexical";
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  type HeadingTagType,
} from "@lexical/rich-text";
import {
  $isListNode,
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListNode,
  REMOVE_LIST_COMMAND,
} from "@lexical/list";
import { $getNearestNodeOfType, mergeRegister } from "@lexical/utils";
import { $setBlocksType } from "@lexical/selection";
import { INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/react/LexicalHorizontalRuleNode";
import { TOGGLE_LINK_COMMAND } from "@lexical/link";
import { cn } from "@/lib/utils";

type BlockType =
  | "paragraph"
  | "h1"
  | "h2"
  | "h3"
  | "bullet"
  | "number"
  | "check"
  | "quote"
  | "code";

export function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [blockType, setBlockType] = useState<BlockType>("paragraph");

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;

    setIsBold(selection.hasFormat("bold"));
    setIsItalic(selection.hasFormat("italic"));
    setIsUnderline(selection.hasFormat("underline"));
    setIsStrikethrough(selection.hasFormat("strikethrough"));
    setIsCode(selection.hasFormat("code"));

    const anchorNode = selection.anchor.getNode();
    const element =
      anchorNode.getKey() === "root"
        ? anchorNode
        : anchorNode.getTopLevelElementOrThrow();

    if ($isListNode(element)) {
      const parentList = $getNearestNodeOfType<ListNode>(anchorNode, ListNode);
      setBlockType(((parentList ?? element).getListType() as BlockType) ?? "bullet");
    } else if ($isHeadingNode(element)) {
      setBlockType(element.getTag() as BlockType);
    } else {
      setBlockType(element.getType() as BlockType);
    }
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(updateToolbar);
      }),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
    );
  }, [editor, updateToolbar]);

  function setBlock(type: BlockType) {
    if (type === "bullet") {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    } else if (type === "number") {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    } else if (type === "check") {
      editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
    } else {
      // Switching to a non-list block — remove the list first if needed
      if (["bullet", "number", "check"].includes(blockType)) {
        editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
      }
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        if (type === "h1" || type === "h2" || type === "h3") {
          $setBlocksType(selection, () => $createHeadingNode(type as HeadingTagType));
        } else if (type === "quote") {
          $setBlocksType(selection, () => $createQuoteNode());
        } else {
          $setBlocksType(selection, () => $createParagraphNode());
        }
      });
    }
  }

  function insertLink() {
    // eslint-disable-next-line no-alert
    const url = window.prompt("URL du lien :");
    if (!url) return;
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, { url });
  }

  return (
    <div className="flex flex-wrap gap-0.5 border-b bg-muted/30 p-1.5">
      {/* Undo / Redo */}
      <Btn title="Annuler" disabled={!canUndo} onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}>
        ↩
      </Btn>
      <Btn title="Rétablir" disabled={!canRedo} onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}>
        ↪
      </Btn>

      <Divider />

      {/* Block type selector */}
      <select
        value={blockType}
        onChange={(e) => setBlock(e.target.value as BlockType)}
        className="rounded border-0 bg-transparent px-1.5 py-1 text-xs text-muted-foreground outline-none ring-1 ring-border hover:bg-accent"
      >
        <option value="paragraph">Paragraphe</option>
        <option value="h1">Titre 1</option>
        <option value="h2">Titre 2</option>
        <option value="h3">Titre 3</option>
        <option value="bullet">Liste à puces</option>
        <option value="number">Liste numérotée</option>
        <option value="check">Liste de tâches</option>
        <option value="quote">Citation</option>
      </select>

      <Divider />

      {/* Text formats */}
      <Btn active={isBold} title="Gras" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}>
        <strong>B</strong>
      </Btn>
      <Btn active={isItalic} title="Italique" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}>
        <em>I</em>
      </Btn>
      <Btn active={isUnderline} title="Souligné" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}>
        <u>U</u>
      </Btn>
      <Btn active={isStrikethrough} title="Barré" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")}>
        <s>S</s>
      </Btn>
      <Btn active={isCode} title="Code inline" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code")}>
        {"</>"}
      </Btn>

      <Divider />

      {/* Alignment */}
      <Btn title="Aligner à gauche" onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "left")}>
        ≡
      </Btn>
      <Btn title="Centrer" onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "center")}>
        ≡
      </Btn>
      <Btn title="Aligner à droite" onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "right")}>
        ≡
      </Btn>
      <Btn title="Justifier" onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "justify")}>
        ≡
      </Btn>

      <Divider />

      {/* Insert */}
      <Btn title="Lien" onClick={insertLink}>
        🔗
      </Btn>
      <Btn title="Séparateur horizontal" onClick={() => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)}>
        ─
      </Btn>
    </div>
  );
}

function Btn({
  active,
  disabled,
  title,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "min-w-7 rounded px-1.5 py-1 text-sm transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 self-stretch border-l" />;
}
