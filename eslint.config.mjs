import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".open-next/**",
    ".wrangler/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "NETEREKA_Homepage_Concept.jsx",
    "scripts/**",
    // Nested git worktrees created by Claude Code agents. They carry a full
    // copy of the repo, so linting the root would lint them too and the
    // pre-commit hook fails on files that belong to another branch.
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
