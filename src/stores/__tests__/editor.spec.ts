import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useEditorStore } from "../editor";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

describe("editor store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockInvoke.mockReset();
  });

  it("starts with one tab named 'Query 1'", () => {
    const store = useEditorStore();
    expect(store.tabs).toHaveLength(1);
    expect(store.tabs[0].name).toBe("Query 1");
    expect(store.tabs[0].id).toBe("tab-1");
  });

  it("activeTab getter returns the active tab", () => {
    const store = useEditorStore();
    expect(store.activeTab).not.toBeNull();
    expect(store.activeTab!.id).toBe("tab-1");
  });

  it("addTab creates a new tab and selects it", () => {
    const store = useEditorStore();
    const id = store.addTab();
    expect(store.tabs).toHaveLength(2);
    expect(store.activeTabId).toBe(id);
    expect(store.activeTab!.name).toMatch(/^Query /);
  });

  it("closeTab removes a tab", () => {
    const store = useEditorStore();
    const id = store.addTab();
    expect(store.tabs).toHaveLength(2);
    store.closeTab(id);
    expect(store.tabs).toHaveLength(1);
  });

  it("closing the only tab creates a new one", () => {
    const store = useEditorStore();
    store.closeTab("tab-1");
    expect(store.tabs).toHaveLength(1);
  });

  it("updateSql changes sql content and marks unsaved", () => {
    const store = useEditorStore();
    const tab = store.tabs[0];
    store.updateSql(tab.id, "SELECT 1");
    expect(tab.sql).toBe("SELECT 1");
    expect(tab.isUnsaved).toBe(true);
  });

  it("selectTab switches active tab", () => {
    const store = useEditorStore();
    const id = store.addTab();
    store.selectTab("tab-1");
    expect(store.activeTabId).toBe("tab-1");
    store.selectTab(id);
    expect(store.activeTabId).toBe(id);
  });

  it("selectPrevTab and selectNextTab navigate tabs", () => {
    const store = useEditorStore();
    store.addTab();
    store.addTab();
    store.selectTab("tab-1");
    store.selectNextTab();
    expect(store.activeTabId).not.toBe("tab-1");
    store.selectPrevTab();
    expect(store.activeTabId).toBe("tab-1");
  });

  it("setSplitRatio clamps between 0.15 and 0.85", () => {
    const store = useEditorStore();
    store.setSplitRatio(0.5);
    expect(store.splitRatio).toBe(0.5);
    store.setSplitRatio(0.0);
    expect(store.splitRatio).toBe(0.15);
    store.setSplitRatio(1.0);
    expect(store.splitRatio).toBe(0.85);
  });

  it("saveTabState persists to localStorage", () => {
    const store = useEditorStore();
    store.updateSql("tab-1", "SELECT * FROM users");
    store.saveTabState();
    const raw = localStorage.getItem("tabState");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].sql).toBe("SELECT * FROM users");
  });

  it("restoreTabState recovers tabs from localStorage", () => {
    localStorage.setItem(
      "tabState",
      JSON.stringify([{ name: "Restored", sql: "SELECT 1", savedQueryId: null, cursorLine: 1, cursorCol: 1 }])
    );
    localStorage.setItem("activeTabId", "tab-0");
    const store = useEditorStore();
    store.restoreTabState();
    expect(store.tabs).toHaveLength(1);
    expect(store.tabs[0].name).toBe("Restored");
    expect(store.tabs[0].sql).toBe("SELECT 1");
  });

  describe("saved queries", () => {
    it("loadSavedQueries calls invoke and updates state", async () => {
      const fakeQueries = [{ id: "sq-1", name: "Q1", sql: "SELECT 1", createdAt: "", updatedAt: "" }];
      mockInvoke.mockResolvedValue(fakeQueries);
      const store = useEditorStore();
      await store.loadSavedQueries();
      expect(mockInvoke).toHaveBeenCalledWith("load_queries");
      expect(store.savedQueries).toEqual(fakeQueries);
    });

    it("saveQueryAs calls invoke and updates tab", async () => {
      const saved = { id: "My Query.sql", name: "My Query", sql: "SELECT 1", createdAt: "", updatedAt: "" };
      mockInvoke.mockResolvedValueOnce(saved);
      mockInvoke.mockResolvedValueOnce([]);
      const store = useEditorStore();
      await store.saveQueryAs("tab-1", "My Query");
      expect(mockInvoke).toHaveBeenCalledWith("save_query", { name: "My Query", sql: "", id: null });
      expect(store.tabs[0].name).toBe("My Query");
      expect(store.tabs[0].savedQueryId).toBe("My Query.sql");
      expect(store.tabs[0].isUnsaved).toBe(false);
    });

    it("saveTab re-saves existing .sql file by id", async () => {
      const saved = { id: "Users.sql", name: "Users", sql: "SELECT 2", createdAt: "", updatedAt: "" };
      mockInvoke.mockResolvedValueOnce(saved);
      mockInvoke.mockResolvedValueOnce([saved]);
      const store = useEditorStore();
      store.updateSql("tab-1", "SELECT 2");
      store.tabs[0].name = "Users";
      store.tabs[0].savedQueryId = "Users.sql";
      await store.saveTab("tab-1");
      expect(mockInvoke).toHaveBeenCalledWith("save_query", {
        name: "Users",
        sql: "SELECT 2",
        id: "Users.sql",
      });
      expect(store.tabs[0].isUnsaved).toBe(false);
    });

    it("dropSavedQuery calls invoke and clears tab ref", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      mockInvoke.mockResolvedValueOnce([]);
      const store = useEditorStore();
      store.tabs[0].savedQueryId = "Users.sql";
      await store.dropSavedQuery("Users.sql");
      expect(mockInvoke).toHaveBeenCalledWith("delete_query", { id: "Users.sql" });
      expect(store.tabs[0].savedQueryId).toBeNull();
    });

    it("renameSavedQuery updates tab id when filename changes", async () => {
      const renamed = { id: "New Name.sql", name: "New Name", sql: "SELECT 1", createdAt: "", updatedAt: "" };
      mockInvoke.mockResolvedValueOnce(renamed);
      mockInvoke.mockResolvedValueOnce([renamed]);
      const store = useEditorStore();
      store.tabs[0].savedQueryId = "Old Name.sql";
      store.tabs[0].name = "Old Name";
      await store.renameSavedQuery("Old Name.sql", "New Name");
      expect(mockInvoke).toHaveBeenCalledWith("rename_query", { id: "Old Name.sql", newName: "New Name" });
      expect(store.tabs[0].savedQueryId).toBe("New Name.sql");
      expect(store.tabs[0].name).toBe("New Name");
    });
  });

  describe("zoom and selection management", () => {
    it("zoomIn, zoomOut, resetZoom and setFontSize adjust font size within bounds", () => {
      const store = useEditorStore();
      expect(store.fontSize).toBe(13);

      store.zoomIn();
      expect(store.fontSize).toBe(14);

      store.zoomOut();
      expect(store.fontSize).toBe(13);

      store.setFontSize(40);
      expect(store.fontSize).toBe(32);

      store.setFontSize(5);
      expect(store.fontSize).toBe(9);

      store.resetZoom();
      expect(store.fontSize).toBe(13);
    });

    it("updateCursorAndSelection updates line, col, selection bounds and character count", () => {
      const store = useEditorStore();
      store.updateCursorAndSelection("tab-1", 4, 15, 10, 25, 15);
      const tab = store.tabs[0];
      expect(tab.cursorLine).toBe(4);
      expect(tab.cursorCol).toBe(15);
      expect(tab.selectionAnchor).toBe(10);
      expect(tab.selectionHead).toBe(25);
      expect(tab.selectedTextCount).toBe(15);
    });
  });
});
