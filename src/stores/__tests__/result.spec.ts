import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useResultStore } from "../result";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

describe("result store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockInvoke.mockReset();
    mockInvoke.mockResolvedValue([]);
  });

  it("starts in idle state", () => {
    const store = useResultStore();
    expect(store.status).toBe("idle");
    expect(store.rows).toEqual([]);
    expect(store.columns).toEqual([]);
    expect(store.activeView).toBe("table");
  });

  it("clearResults resets all state", () => {
    const store = useResultStore();
    store.rows = [{ id: 1 }];
    store.columns = [{ name: "id", type: "integer" }];
    store.status = "success";
    store.clearResults();
    expect(store.rows).toEqual([]);
    expect(store.columns).toEqual([]);
    expect(store.status).toBe("idle");
  });

  it("setPageSize clamps between 50 and 500", () => {
    const store = useResultStore();
    store.setPageSize(100);
    expect(store.pageSize).toBe(100);
    store.setPageSize(10);
    expect(store.pageSize).toBe(50);
    store.setPageSize(1000);
    expect(store.pageSize).toBe(500);
  });

  it("toggleRowSelection toggles selected rows", () => {
    const store = useResultStore();
    store.toggleRowSelection("0");
    expect(store.selectedRows.has("0")).toBe(true);
    store.toggleRowSelection("0");
    expect(store.selectedRows.has("0")).toBe(false);
  });

  it("selectAllRows selects all", () => {
    const store = useResultStore();
    store.rows = [{ a: 1 }, { a: 2 }, { a: 3 }];
    store.selectAllRows();
    expect(store.selectedRows.size).toBe(3);
  });

  it("clearSelection clears all", () => {
    const store = useResultStore();
    store.selectedRows.add("0");
    store.selectedRows.add("1");
    store.clearSelection();
    expect(store.selectedRows.size).toBe(0);
  });

  it("setActiveView changes active view", () => {
    const store = useResultStore();
    store.setActiveView("json");
    expect(store.activeView).toBe("json");
    store.setActiveView("table");
    expect(store.activeView).toBe("table");
  });

  it("explainQuery invokes run_query with EXPLAIN prefix", async () => {
    mockInvoke.mockResolvedValue({ columns: [], rows: [], duration_ms: 5, row_count: 0 });
    const store = useResultStore();
    await store.explainQuery("SELECT * FROM users");
    expect(mockInvoke).toHaveBeenCalledWith("run_query", {
      sql: "EXPLAIN SELECT * FROM users",
      id: null,
    });
    expect(store.activeView).toBe("plan");
  });

  it("explainQuery reuses EXPLAIN prefix if already present", async () => {
    mockInvoke.mockResolvedValue({ columns: [], rows: [], duration_ms: 5, row_count: 0 });
    const store = useResultStore();
    await store.explainQuery("EXPLAIN SELECT * FROM users");
    expect(mockInvoke).toHaveBeenCalledWith("run_query", {
      sql: "EXPLAIN SELECT * FROM users",
      id: null,
    });
  });

  describe("CSV export", () => {
    it("exportCsv creates a downloadable Blob", () => {
      const store = useResultStore();
      store.columns = [{ name: "id", type: "integer" }, { name: "name", type: "text" }];
      store.rows = [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }];
      const createSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:url");
      const clickSpy = vi.fn();
      const anchor = { href: "", download: "", click: clickSpy };
      vi.spyOn(document, "createElement").mockReturnValue(anchor as unknown as HTMLAnchorElement);
      store.exportCsv();
      expect(createSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      createSpy.mockRestore();
    });
  });

  describe("runQuery", () => {
    it("rejects destructive queries in read-only mode", async () => {
      vi.doMock("../connection", () => ({
        useConnectionStore: () => ({
          activeConnection: { readOnly: true },
          activeId: null,
        }),
      }));
      const store = useResultStore();
      await store.runQuery("DROP TABLE users");
      expect(store.status).toBe("error");
    });
  });
});
