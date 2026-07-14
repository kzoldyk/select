import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useSchemaStore } from "../schema";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

describe("schema store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockInvoke.mockReset();
  });

  it("starts with empty schema", () => {
    const store = useSchemaStore();
    expect(store.tables).toEqual([]);
    expect(store.views).toEqual([]);
    expect(store.databases).toEqual([]);
    expect(store.isLoading).toBe(false);
  });

  it("setSearchQuery updates search query", () => {
    const store = useSchemaStore();
    store.setSearchQuery("users");
    expect(store.searchQuery).toBe("users");
  });

  it("filteredTables filters by search query", () => {
    const store = useSchemaStore();
    store.tables = [
      { name: "users", rowCount: 10, type: "table" },
      { name: "orders", rowCount: 20, type: "table" },
    ];
    store.setSearchQuery("user");
    expect(store.filteredTables).toHaveLength(1);
    expect(store.filteredTables[0].name).toBe("users");
  });

  it("filteredTables returns all when no search query", () => {
    const store = useSchemaStore();
    store.tables = [
      { name: "users", rowCount: 10, type: "table" },
      { name: "orders", rowCount: 20, type: "table" },
    ];
    expect(store.filteredTables).toHaveLength(2);
  });

  it("clearSchema resets all state", () => {
    const store = useSchemaStore();
    store.tables = [{ name: "users", rowCount: 10, type: "table" }];
    store.databases = ["mysql"];
    store.clearSchema();
    expect(store.tables).toEqual([]);
    expect(store.databases).toEqual([]);
    expect(store.activeTable).toBeNull();
    expect(store.tableDetails).toBeNull();
  });

  it("setActiveTable sets active table and looks up cached details", () => {
    const store = useSchemaStore();
    store.detailsByTable["users"] = {
      columns: [{ name: "id", columnType: "int", nullable: false, default: null, pk: true, extra: "" }],
      indexes: [],
      constraints: [],
      ddl: "",
    };
    store.setActiveTable("users");
    expect(store.activeTable).toBe("users");
    expect(store.tableDetails).toBeTruthy();
    expect(store.tableDetails!.columns[0].name).toBe("id");
  });

  it("setActiveTable null clears table details", () => {
    const store = useSchemaStore();
    store.setActiveTable("users");
    store.setActiveTable(null);
    expect(store.activeTable).toBeNull();
    expect(store.tableDetails).toBeNull();
  });

  it("fetchDatabases calls invoke and updates state", async () => {
    mockInvoke.mockResolvedValue(["mysql", "test"]);
    const store = useSchemaStore();
    await store.fetchDatabases();
    expect(store.databases).toEqual(["mysql", "test"]);
  });

  it("refreshSchema maps tables from API response", async () => {
    mockInvoke.mockResolvedValue({
      tables: [
        { name: "users", rowCount: 100, type: "table" },
        { name: "orders", rowCount: 200, type: "table" },
      ],
      views: [],
      functions: [],
      indexes: [],
      triggers: [],
      procs: [],
    });
    const store = useSchemaStore();
    await store.refreshSchema("conn-1");
    expect(store.tables).toHaveLength(2);
    expect(store.tables[0].name).toBe("users");
    expect(store.tables[0].rowCount).toBe(100);
  });
});
