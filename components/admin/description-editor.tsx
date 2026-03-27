"use client";

import { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { lexicalJsonToHtml } from "@/lib/utils/lexical-to-html";

const RichTextEditor = dynamic(
  () => import("@/components/admin/rich-text-editor").then((m) => m.RichTextEditor),
);
const HtmlEditor = dynamic(
  () => import("@/components/admin/html-editor").then((m) => m.HtmlEditor),
);

/** Recursively extract all text from a Lexical JSON tree. */
function extractText(node: Record<string, unknown>): string {
  let text = "";
  if (typeof node.text === "string") text += node.text;
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      if (child && typeof child === "object") text += extractText(child as Record<string, unknown>);
    }
  }
  return text;
}

function isLexicalJsonNonEmpty(json: string): boolean {
  if (!json.trim()) return false;
  if (!json.trim().startsWith("{")) return json.trim().length > 0;
  try {
    const state = JSON.parse(json);
    if (!state?.root) return false;
    return extractText(state.root).trim().length > 0;
  } catch {
    return false;
  }
}

interface DescriptionEditorProps {
  name: string;
  descriptionType?: string;
  defaultValue?: string | null;
  placeholder?: string;
}

export function DescriptionEditor({
  name,
  descriptionType = "richtext",
  defaultValue,
  placeholder,
}: DescriptionEditorProps) {
  const [activeTab, setActiveTab] = useState<string>(descriptionType);
  const [richValue, setRichValue] = useState<string | null>(
    descriptionType === "richtext" ? (defaultValue ?? null) : null,
  );
  const [htmlValue, setHtmlValue] = useState<string>(
    descriptionType === "html" ? (defaultValue ?? "") : "",
  );
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [richKey, setRichKey] = useState(0);
  const [htmlKey, setHtmlKey] = useState(0);
  const richJsonRef = useRef<string>(
    descriptionType === "richtext" ? (defaultValue ?? "") : "",
  );

  const handleTabChange = useCallback(
    (newTab: string) => {
      if (newTab === activeTab) return;

      if (newTab === "html" && activeTab === "richtext") {
        // Check if richtext editor has actual text content
        // by extracting all text from the Lexical JSON tree
        const currentJson = richJsonRef.current;
        if (!isLexicalJsonNonEmpty(currentJson)) {
          setActiveTab(newTab);
          return;
        }

        setDialogMessage(
          "Le contenu de l'éditeur riche sera converti en HTML. Certains détails de mise en forme pourraient être simplifiés.",
        );
        setPendingTab(newTab);
        setDialogOpen(true);
        return;
      }

      if (newTab === "richtext" && activeTab === "html") {
        if (!htmlValue.trim()) {
          setActiveTab(newTab);
          return;
        }

        setDialogMessage(
          "Le contenu HTML sera importé en texte brut dans l'éditeur riche. Les styles CSS et la mise en page avancée seront perdus.",
        );
        setPendingTab(newTab);
        setDialogOpen(true);
        return;
      }
    },
    [activeTab, htmlValue],
  );

  const confirmSwitch = useCallback(() => {
    if (!pendingTab) return;

    if (pendingTab === "html") {
      const currentJson = richJsonRef.current;
      let converted = "";
      if (currentJson.trim().startsWith("{")) {
        try {
          const state = JSON.parse(currentJson);
          if (state?.root) {
            converted = lexicalJsonToHtml(state);
          }
        } catch (err) {
          console.error("[description-editor] Failed to convert richtext to HTML", err);
          toast.error("Impossible de convertir le contenu. Veuillez copier votre texte avant de changer d'éditeur.");
          setPendingTab(null);
          setDialogOpen(false);
          return;
        }
      }
      setHtmlValue(converted);
      setHtmlKey((k) => k + 1);
    } else if (pendingTab === "richtext") {
      // Strip tags and decode HTML entities via DOM
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = htmlValue;
      const stripped = (tempDiv.textContent || "").replace(/\s+/g, " ").trim();
      setRichValue(stripped || null);
      setRichKey((k) => k + 1);
    }

    setActiveTab(pendingTab);
    setPendingTab(null);
    setDialogOpen(false);
  }, [pendingTab, htmlValue]);

  const cancelSwitch = useCallback(() => {
    setPendingTab(null);
    setDialogOpen(false);
  }, []);

  return (
    <div>
      <input type="hidden" name="description_type" value={activeTab} />
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="richtext">Éditeur riche</TabsTrigger>
          <TabsTrigger value="html">HTML / CSS</TabsTrigger>
        </TabsList>
        <TabsContent value="richtext" className="mt-3">
          <RichTextEditor
            key={richKey}
            name={name}
            defaultValue={richValue}
            placeholder={placeholder}
            onValueChange={(v) => { richJsonRef.current = v; }}
          />
        </TabsContent>
        <TabsContent value="html" className="mt-3">
          <HtmlEditor
            key={htmlKey}
            name={name}
            defaultValue={htmlValue}
            placeholder={placeholder ?? "Saisissez votre HTML ici…"}
          />
        </TabsContent>
      </Tabs>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Changer d&apos;éditeur</AlertDialogTitle>
            <AlertDialogDescription>{dialogMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelSwitch}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSwitch}>Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
