# Admin Sidebar Reorganization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Group the flat 13-item admin sidebar into 3 named sections (Opérations / Gestion / Paramètres), with domain-specific icons for the WhatsApp and AI config items, and skip empty sections per role.

**Architecture:** Single-file refactor of `components/admin/sidebar.tsx`. Replace the `navItems` flat array with a `navSections` array of `{ label, items }` objects. Render each section with a small-caps header above its items; if the role filters all items in a section, the entire section (including header) is skipped.

**Tech Stack:** Next.js 16 App Router, React, Tailwind CSS, HugeIcons (`@hugeicons/react`, `@hugeicons/core-free-icons`).

**Spec:** `docs/superpowers/specs/2026-04-25-admin-sidebar-reorganization-design.md`

---

## File structure

**Modify (1 file):**
- `components/admin/sidebar.tsx` — restructure `navItems` → `navSections`, swap two icons, render with section headers, skip empty sections.

**No new files. No tests added** (sidebar is purely presentational, no test convention exists for admin components in this repo).

---

## Task 1: Refactor sidebar into 3 sections with new icons

**Files:**
- Modify: `/home/superz/netereka/components/admin/sidebar.tsx` (full rewrite below — file is small enough that a complete replacement is clearer than partial edits)

- [ ] **Step 1: Replace the file contents**

Open `/home/superz/netereka/components/admin/sidebar.tsx` and replace its ENTIRE contents with:

```tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DashboardSquare01Icon,
  Package02Icon,
  FolderLibraryIcon,
  Image02Icon,
  ShoppingBag01Icon,
  UserGroup02Icon,
  UserSettings01Icon,
  Audit01Icon,
  StoreLocation01Icon,
  MessageMultiple02Icon,
  ChartLineData02Icon,
  WhatsappIcon,
  AiBrain01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgObject } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { SidebarUserMenu } from "./sidebar-user-menu";
import { useAdminSessionUser } from "./admin-user-context";

type Role = "agent" | "admin" | "super_admin";

interface NavItem {
  href: string;
  label: string;
  icon: IconSvgObject;
  minRole: Role;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: "Opérations",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: DashboardSquare01Icon, minRole: "agent" },
      { href: "/orders", label: "Commandes", icon: ShoppingBag01Icon, minRole: "agent" },
      { href: "/customers", label: "Clients", icon: UserGroup02Icon, minRole: "agent" },
      { href: "/whatsapp/conversations", label: "Conversations WA", icon: MessageMultiple02Icon, minRole: "agent" },
    ],
  },
  {
    label: "Gestion",
    items: [
      { href: "/products", label: "Produits", icon: Package02Icon, minRole: "admin" },
      { href: "/categories", label: "Catégories", icon: FolderLibraryIcon, minRole: "admin" },
      { href: "/banners", label: "Bannières", icon: Image02Icon, minRole: "admin" },
      { href: "/stores", label: "Boutiques", icon: StoreLocation01Icon, minRole: "admin" },
      { href: "/whatsapp/analytics", label: "Analytics WA", icon: ChartLineData02Icon, minRole: "admin" },
    ],
  },
  {
    label: "Paramètres",
    items: [
      { href: "/whatsapp/settings", label: "Config WhatsApp", icon: WhatsappIcon, minRole: "admin" },
      { href: "/ai-settings", label: "Config AI", icon: AiBrain01Icon, minRole: "admin" },
      { href: "/users", label: "Utilisateurs", icon: UserSettings01Icon, minRole: "admin" },
      { href: "/audit-log", label: "Journal d'audit", icon: Audit01Icon, minRole: "admin" },
    ],
  },
];

const ROLE_RANK: Record<Role, number> = { agent: 0, admin: 1, super_admin: 2 };

export function Sidebar() {
  const pathname = usePathname();
  const { role } = useAdminSessionUser();

  return (
    <div className="flex h-full flex-col">
      <nav className="flex flex-col gap-1 p-4">
        <div className="mb-6 px-3">
          <Image
            src="/logo.png"
            alt="NETEREKA"
            width={120}
            height={43}
            className="h-8 w-auto"
          />
          <p className="mt-1 text-xs text-muted-foreground">Administration</p>
        </div>
        {navSections.map((section, sectionIdx) => {
          const visibleItems = section.items.filter(
            (item) => ROLE_RANK[role] >= ROLE_RANK[item.minRole],
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.label} className="flex flex-col gap-1">
              <div
                className={cn(
                  "text-muted-foreground px-3 pb-2 text-xs font-medium uppercase tracking-wider",
                  sectionIdx === 0 ? "pt-0" : "pt-4",
                )}
              >
                {section.label}
              </div>
              {visibleItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                    )}
                  >
                    <HugeiconsIcon icon={item.icon} size={20} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
      <div className="mt-auto">
        <SidebarUserMenu />
      </div>
    </div>
  );
}
```

Notable changes vs current:
- `navItems` flat array → `navSections` array of `{ label, items }`
- Three section labels: "Opérations", "Gestion", "Paramètres"
- Two new icon imports: `WhatsappIcon`, `AiBrain01Icon`
- `Configuration01Icon` import REMOVED (no longer used)
- New `IconSvgObject` type-only import (replaces the implicit `as const` typing of icon entries)
- Section header rendered as styled `<div>` (small caps, `text-muted-foreground`, `tracking-wider`)
- Section is skipped entirely (header included) when `visibleItems.length === 0`
- `pt-0` for the first section header so it doesn't push down right after the logo block; `pt-4` for subsequent sections to give breathing room
- `Role` type extracted for typing consistency
- `ROLE_RANK` retains its current values (`agent: 0, admin: 1, super_admin: 2`)
- All hover/active states preserved unchanged
- The `isActive` logic is unchanged (`pathname === href || (href !== "/dashboard" && pathname.startsWith(href))`)

- [ ] **Step 2: Verify the imports resolve and tsc passes**

Run from `/home/superz/netereka`:
```bash
npx tsc --noEmit
```

Expected: 0 errors.

If it fails on the `IconSvgObject` import, check `node_modules/@hugeicons/core-free-icons/dist/types/index.d.ts` to confirm it's exported (it is — verified during brainstorming). If it's not the right path, fall back to `import type { IconSvgObject } from "@hugeicons/core-free-icons/dist/types"` — but the public package re-export should work.

- [ ] **Step 3: Verify lint passes**

```bash
npm run lint
```

Expected: clean.

If it flags the `Configuration01Icon` import as unused — that means you forgot to remove it. Remove it.

- [ ] **Step 4: Verify tests still pass**

```bash
npm run test
```

Expected: all 820 tests still pass (no test touches the sidebar).

- [ ] **Step 5: Commit**

ONLY add the specific file (do NOT use `git add -A` — repo has untracked AI-tool config folders that must NOT be committed):
```bash
git add components/admin/sidebar.tsx
git commit -m "$(cat <<'EOF'
feat(admin): group sidebar into Opérations / Gestion / Paramètres

- Three named sections with small-caps headers replace the
  flat 13-item list. Empty sections (filtered by role) are
  skipped entirely — agents now see only the "Opérations"
  section.
- Config WhatsApp and Config AI gain domain-specific icons
  (WhatsappIcon, AiBrain01Icon) instead of sharing the
  generic Configuration01Icon.
EOF
)"
```

If pre-commit fails (tsc + eslint + vitest), fix the underlying issue and re-commit (do NOT --no-verify).

Verify with:
```bash
git show --stat HEAD
```
Expected: exactly 1 file (`components/admin/sidebar.tsx`), no `.claude/` drift.

---

## Task 2: Manual visual verification

**Files:** none (manual UI check)

This task is OPTIONAL for the implementer subagent (browser verification is awkward in a sandboxed environment). The controller / user will do the visual check. The subagent should skip this and proceed to Task 3.

The user will eventually verify:
- Login as `agent` user → only "OPÉRATIONS" section header visible, with 4 items beneath; no other sections rendered.
- Login as `admin` / `super_admin` → all 3 sections rendered.
- Section headers are styled with small caps, `text-muted-foreground`, slightly larger top padding for sections 2 and 3.
- "Config WhatsApp" displays the WhatsApp logo icon.
- "Config AI" displays the brain icon.
- Active link state still works (visiting `/products` highlights the "Produits" item).
- Hover state unchanged on every item.

If any of those break, file a follow-up fix task.

---

## Task 3: Push + open PR (no merge)

**Files:** none (git + gh CLI)

- [ ] **Step 1: Push the branch**

```bash
git push -u origin feat/admin-sidebar-reorganization
```

- [ ] **Step 2: Open the PR (no merge)**

```bash
gh pr create --title "feat(admin): group sidebar into 3 sections + domain icons" --body "$(cat <<'EOF'
## Summary
- Flat 13-item sidebar regrouped into 3 named sections: **Opérations** / **Gestion** / **Paramètres**
- Sections without items for the current role are skipped entirely (agents see only "Opérations")
- "Config WhatsApp" gets the WhatsApp icon, "Config AI" gets a brain icon (was: both shared `Configuration01Icon`)

## Test plan
- [ ] \`npm run test\` passes (no test touches the sidebar; all 820 still green)
- [ ] Login as \`agent\` → only "OPÉRATIONS" section visible
- [ ] Login as \`admin\` → all 3 sections visible with their items
- [ ] Section headers: small caps, muted color, breathing room between sections
- [ ] Active link state still highlights the correct item
- [ ] Config WhatsApp = WhatsApp logo, Config AI = brain icon

## Docs
- Spec: \`docs/superpowers/specs/2026-04-25-admin-sidebar-reorganization-design.md\`
- Plan: \`docs/superpowers/plans/2026-04-25-admin-sidebar-reorganization.md\`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Report PR URL**

Capture the URL printed by `gh pr create` and report it.

- [ ] **Step 4: DO NOT MERGE**

Workflow rule from project memory: never merge without explicit user approval. Just report the URL and stop.

---

## Self-review checklist (executed by author)

- [x] **Spec coverage:**
  - 3 sections with exact item lists → Task 1 navSections
  - Small-caps headers per shadcn convention → Task 1 className `text-xs font-medium uppercase tracking-wider`
  - Empty sections skipped → Task 1 `if (visibleItems.length === 0) return null`
  - WhatsappIcon + AiBrain01Icon, Configuration01Icon removed → Task 1 import block
  - No tests added → consistent with spec
  - Manual verification of role-based visibility → Task 2
- [x] **No placeholders:** every step has concrete code or commands.
- [x] **Type consistency:** `Role`, `NavItem`, `NavSection`, `ROLE_RANK` defined once and consumed coherently throughout the file.
- [x] **Single-file scope:** only `components/admin/sidebar.tsx` modified, nothing else touched.
