import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Unmount any React components rendered by Testing Library between tests so
// the jsdom document stays clean and tests stay isolated.
afterEach(() => {
  cleanup();
});
