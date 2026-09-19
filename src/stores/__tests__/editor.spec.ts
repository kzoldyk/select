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

    it("createFolder calls create_query_folder invoke", async () => {
      mockInvoke.mockResolvedValueOnce("analytics");
      mockInvoke.mockResolvedValueOnce([]);
      mockInvoke.mockResolvedValueOnce(["analytics"]);
      const store = useEditorStore();
      await store.createFolder("analytics");
      expect(mockInvoke).toHaveBeenCalledWith("create_query_folder", {
        name: "analytics",
        parentFolder: null,
      });
    });

    it("deleteFolder calls delete_query_folder and resets matching tabs", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      mockInvoke.mockResolvedValueOnce([]);
      mockInvoke.mockResolvedValueOnce([]);
      const store = useEditorStore();
      store.tabs[0].savedQueryId = "analytics/report.sql";
      await store.deleteFolder("analytics");
      expect(mockInvoke).toHaveBeenCalledWith("delete_query_folder", {
        folderPath: "analytics",
      });
      expect(store.tabs[0].savedQueryId).toBeNull();
      expect(store.tabs[0].isUnsaved).toBe(true);
    });

    it("moveQuery calls move_query_file and updates tab savedQueryId", async () => {
      const moved = { id: "reports/My Query.sql", name: "My Query", sql: "SELECT 1", createdAt: "", updatedAt: "", folder: "reports" };
      mockInvoke.mockResolvedValueOnce(moved);
      mockInvoke.mockResolvedValueOnce([moved]);
      mockInvoke.mockResolvedValueOnce(["reports"]);
      const store = useEditorStore();
      store.tabs[0].savedQueryId = "My Query.sql";
      await store.moveQuery("My Query.sql", "reports");
      expect(mockInvoke).toHaveBeenCalledWith("move_query_file", {
        id: "My Query.sql",
        targetFolder: "reports",
      });
      expect(store.tabs[0].savedQueryId).toBe("reports/My Query.sql");
    });

    it("saveQueryAs passes folder if provided", async () => {
      const saved = { id: "reports/Q.sql", name: "Q", sql: "", createdAt: "", updatedAt: "", folder: "reports" };
      mockInvoke.mockResolvedValueOnce(saved);
      mockInvoke.mockResolvedValueOnce([saved]);
      mockInvoke.mockResolvedValueOnce(["reports"]);
      const store = useEditorStore();
      await store.saveQueryAs("tab-1", "Q", "reports");
      expect(mockInvoke).toHaveBeenCalledWith("save_query", {
        name: "Q",
        sql: "",
        id: null,
        folder: "reports",
      });
      expect(store.tabs[0].savedQueryId).toBe("reports/Q.sql");
    });

    it("openNewQueryInFolder opens dialog with folder preselected", () => {
      const store = useEditorStore();
      const tabId = store.openNewQueryInFolder("reports");
      expect(tabId).toBeTruthy();
      expect(store.saveDialogOpen).toBe(true);
      expect(store.saveDialogFolder).toBe("reports");
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

  describe("notebook mode actions", () => {
    it("addNotebookTab creates a tab with format 'notebook'", () => {
      const store = useEditorStore();
      const id = store.addNotebookTab();
      const tab = store.tabs.find(t => t.id === id);
      expect(tab).toBeDefined();
      expect(tab!.format).toBe("notebook");
      expect(tab!.name).toMatch(/^Notes /);
      expect(tab!.sql).toContain("```sql");
    });

    it("convertTabToNotebook wraps existing SQL into notebook format", () => {
      const store = useEditorStore();
      const tab = store.tabs[0];
      tab.sql = "SELECT * FROM users;";
      store.convertTabToNotebook(tab.id);
      expect(tab.format).toBe("notebook");
      expect(tab.sql).toContain("# Query 1");
      expect(tab.sql).toContain("```sql\nSELECT * FROM users;\n```");
    });

    it("convertTabToSql converts notebook prose to comments without data loss", () => {
      const store = useEditorStore();
      const id = store.addNotebookTab("# My Notes\n\n```sql\nSELECT 42;\n```");
      const tab = store.tabs.find(t => t.id === id)!;
      store.convertTabToSql(tab.id);
      expect(tab.format).toBe("sql");
      expect(tab.sql).toContain("/*\n# My Notes\n*/");
      expect(tab.sql).toContain("SELECT 42;");
    });
  });

  describe("closeTab confirmation for unsaved queries", () => {
    it("requests confirmation when closing unsaved tab with content", () => {
      const store = useEditorStore();
      const tab = store.tabs[0];
      store.updateSql(tab.id, "SELECT * FROM users");
      expect(tab.isUnsaved).toBe(true);

      const closed = store.closeTab(tab.id);
      expect(closed).toBe(false);
      expect(store.confirmCloseTabId).toBe(tab.id);
      expect(store.tabs).toHaveLength(1);
    });

    it("cancelCloseTab dismisses confirmation without closing tab", () => {
      const store = useEditorStore();
      const tab = store.tabs[0];
      store.updateSql(tab.id, "SELECT 123");
      store.closeTab(tab.id);
      expect(store.confirmCloseTabId).toBe(tab.id);

      store.cancelCloseTab();
      expect(store.confirmCloseTabId).toBeNull();
      expect(store.tabs).toHaveLength(1);
    });

    it("discardAndCloseTab closes unsaved tab without saving", () => {
      const store = useEditorStore();
      const id2 = store.addTab();
      store.updateSql(id2, "SELECT * FROM dirty");
      store.closeTab(id2);
      expect(store.confirmCloseTabId).toBe(id2);

      store.discardAndCloseTab();
      expect(store.confirmCloseTabId).toBeNull();
      expect(store.tabs.find(t => t.id === id2)).toBeUndefined();
    });

    it("saveAndCloseTab saves existing query and closes tab", async () => {
      const store = useEditorStore();
      const tab = store.tabs[0];
      tab.savedQueryId = "users.sql";
      tab.name = "users.sql";
      store.updateSql(tab.id, "SELECT count(*) FROM users");
      store.closeTab(tab.id);
      expect(store.confirmCloseTabId).toBe(tab.id);

      mockInvoke.mockResolvedValueOnce({ id: "users.sql", name: "users.sql", sql: tab.sql });
      mockInvoke.mockResolvedValueOnce([]); // refresh saved queries

      await store.saveAndCloseTab();
      expect(mockInvoke).toHaveBeenCalledWith("save_query", {
        id: "users.sql",
        name: "users.sql",
        sql: "SELECT count(*) FROM users",
      });
      expect(store.confirmCloseTabId).toBeNull();
    });

    it("saveAndCloseTab on new query opens save dialog and auto-closes on saveQueryAs", async () => {
      const store = useEditorStore();
      const tab = store.tabs[0];
      store.updateSql(tab.id, "SELECT 'unsaved' AS test");
      store.closeTab(tab.id);
      expect(store.confirmCloseTabId).toBe(tab.id);

      await store.saveAndCloseTab();
      expect(store.confirmCloseTabId).toBeNull();
      expect(store.saveDialogOpen).toBe(true);
      expect(store.saveDialogTabId).toBe(tab.id);
      expect(store.pendingCloseAfterSaveTabId).toBe(tab.id);

      mockInvoke.mockResolvedValueOnce({ id: "test.sql", name: "test.sql", sql: tab.sql });
      mockInvoke.mockResolvedValueOnce([]); // refresh saved queries

      await store.saveQueryAs(tab.id, "test.sql");
      expect(store.saveDialogOpen).toBe(false);
      expect(store.pendingCloseAfterSaveTabId).toBeNull();
    });

    it("renameFolder updates open tabs savedQueryId and refreshes queries", async () => {
      const store = useEditorStore();
      const tab = store.tabs[0];
      tab.savedQueryId = "reports/daily.sql";
      tab.name = "daily.sql";

      mockInvoke.mockResolvedValueOnce("analytics"); // rename_query_folder returns new folder path
      mockInvoke.mockResolvedValueOnce([]); // refresh saved queries

      const result = await store.renameFolder("reports", "analytics");
      expect(mockInvoke).toHaveBeenCalledWith("rename_query_folder", {
        oldFolderPath: "reports",
        newName: "analytics",
      });
      expect(result).toBe("analytics");
      expect(tab.savedQueryId).toBe("analytics/daily.sql");
    });

    it("moveQuery moves query to folder and updates open tabs", async () => {
      const store = useEditorStore();
      const tab = store.tabs[0];
      tab.savedQueryId = "monthly.sql";
      tab.name = "monthly.sql";

      mockInvoke.mockResolvedValueOnce({
        id: "reports/monthly.sql",
        name: "monthly.sql",
        sql: "SELECT 1",
        folder: "reports",
      });
      mockInvoke.mockResolvedValueOnce([]); // refresh saved queries

      await store.moveQuery("monthly.sql", "reports");
      expect(mockInvoke).toHaveBeenCalledWith("move_query_file", {
        id: "monthly.sql",
        targetFolder: "reports",
      });
      expect(tab.savedQueryId).toBe("reports/monthly.sql");
    });
  });
});
