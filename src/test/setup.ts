import { vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { config } from "@vue/test-utils";

//
// Mock Tauri invoke globally
//
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("../lib/cuelume", () => ({
  initCuelume: vi.fn(),
  syncSoundsEnabled: vi.fn(),
  playSound: vi.fn(),
}));

//
// Mock localStorage
//
const storage = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
  get length() {
    return storage.size;
  },
  key: (index: number) => [...storage.keys()][index] ?? null,
});

//
// Mock IntersectionObserver and ResizeObserver
//
class MockObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

vi.stubGlobal("IntersectionObserver", MockObserver);
vi.stubGlobal("ResizeObserver", MockObserver);

//
// Mock clipboard API
//
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: vi.fn() },
  writable: true,
});

//
// Activate Pinia before each test
//
beforeEach(() => {
  setActivePinia(createPinia());
});

//
// suppress console.error in tests
//
vi.spyOn(console, "error").mockImplementation(() => {});
