import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useUiStore } from "../ui";

describe("ui store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    // Reset document classes
    document.documentElement.className = "";
  });

  it("starts with default theme and visibility states", () => {
    const store = useUiStore();
    expect(store.sidebarOpen).toBe(true);
    expect(store.settingsOpen).toBe(false);
    expect(store.theme).toBe("system");
    expect(store.systemIsDark).toBe(false);
    expect(store.isDark).toBe(false);
  });

  it("toggles sidebarOpen", () => {
    const store = useUiStore();
    expect(store.sidebarOpen).toBe(true);
    store.toggleSidebar();
    expect(store.sidebarOpen).toBe(false);
    store.toggleSidebar();
    expect(store.sidebarOpen).toBe(true);
  });

  it("manages settings visibility", () => {
    const store = useUiStore();
    expect(store.settingsOpen).toBe(false);
    store.openSettings();
    expect(store.settingsOpen).toBe(true);
    store.closeSettings();
    expect(store.settingsOpen).toBe(false);
  });

  it("setTheme updates theme state, persists to localStorage, and updates document class", () => {
    const store = useUiStore();
    
    store.setTheme("dark");
    expect(store.theme).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(store.isDark).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    store.setTheme("light");
    expect(store.theme).toBe("light");
    expect(localStorage.getItem("theme")).toBe("light");
    expect(store.isDark).toBe(false);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("isDark getter resolves system theme state correctly", () => {
    const store = useUiStore();
    store.setTheme("system");
    
    // With systemIsDark = false
    store.systemIsDark = false;
    expect(store.isDark).toBe(false);
    store.applyTheme();
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    // With systemIsDark = true
    store.systemIsDark = true;
    expect(store.isDark).toBe(true);
    store.applyTheme();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("toggleTheme cycles correctly through system -> light -> dark -> system", () => {
    const store = useUiStore();
    
    store.setTheme("system");
    expect(store.theme).toBe("system");

    store.toggleTheme();
    expect(store.theme).toBe("light");

    store.toggleTheme();
    expect(store.theme).toBe("dark");

    store.toggleTheme();
    expect(store.theme).toBe("system");
  });

  it("updateSystemTheme updates systemIsDark and triggers applyTheme", () => {
    const store = useUiStore();
    store.setTheme("system");
    
    store.updateSystemTheme(true);
    expect(store.systemIsDark).toBe(true);
    expect(store.isDark).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    store.updateSystemTheme(false);
    expect(store.systemIsDark).toBe(false);
    expect(store.isDark).toBe(false);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("closeAll closes settings along with other panels", () => {
    const store = useUiStore();
    store.settingsOpen = true;
    store.paletteOpen = true;
    store.inspectorOpen = true;
    
    store.closeAll();
    expect(store.settingsOpen).toBe(false);
    expect(store.paletteOpen).toBe(false);
    expect(store.inspectorOpen).toBe(false);
  });
});
