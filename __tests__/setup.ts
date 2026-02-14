// Suppress zustand persist "storage is currently unavailable" warnings in tests.
// These are harmless in a Node.js environment — the stores still work in memory.
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === "string" && args[0].includes("[zustand persist middleware]")) {
    return;
  }
  originalWarn(...args);
};
