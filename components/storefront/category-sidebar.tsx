"use client";

import { useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, ArrowDown01Icon } from "@hugeicons/core-free-icons";
import type { CategoryNode } from "@/lib/db/types";

interface CategorySidebarProps {
  categoryTree: CategoryNode[];
  activeCategorySlug?: string;
}

function isActiveOrAncestor(node: CategoryNode, activeSlug: string): boolean {
  if (node.slug === activeSlug) return true;
  return node.children.some((child) => isActiveOrAncestor(child, activeSlug));
}

function CategoryTreeNode({
  node,
  activeCategorySlug,
}: {
  node: CategoryNode;
  activeCategorySlug?: string;
}) {
  const isActive = node.slug === activeCategorySlug;
  const hasChildren = node.children.length > 0;
  const shouldAutoExpand = activeCategorySlug
    ? isActiveOrAncestor(node, activeCategorySlug)
    : false;
  const [expanded, setExpanded] = useState(shouldAutoExpand);

  return (
    <div>
      <div className="flex items-center">
        {hasChildren && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
            aria-label={expanded ? "Réduire" : "Développer"}
          >
            <HugeiconsIcon
              icon={expanded ? ArrowDown01Icon : ArrowRight01Icon}
              size={14}
              className="text-muted-foreground"
            />
          </button>
        )}
        {!hasChildren && <span className="w-6 shrink-0" />}
        <Link
          href={`/c/${node.slug}`}
          className={`block flex-1 rounded-md px-2 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none ${
            isActive
              ? "bg-primary/10 font-medium text-primary"
              : "text-foreground hover:bg-muted"
          }`}
        >
          {node.name}
        </Link>
      </div>
      {hasChildren && expanded && (
        <div className="ml-3 border-l border-border pl-1">
          {node.children.map((child) => (
            <CategoryTreeNode
              key={child.id}
              node={child}
              activeCategorySlug={activeCategorySlug}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CategorySidebar({
  categoryTree,
  activeCategorySlug,
}: CategorySidebarProps) {
  if (categoryTree.length === 0) return null;

  return (
    <fieldset>
      <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Catégories
      </legend>
      <div className="space-y-0.5">
        {categoryTree.map((node) => (
          <CategoryTreeNode
            key={node.id}
            node={node}
            activeCategorySlug={activeCategorySlug}
          />
        ))}
      </div>
    </fieldset>
  );
}
