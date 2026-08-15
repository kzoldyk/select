import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import SchemaDiagram from "../SchemaDiagram.vue";
import { useConnectionStore } from "../../stores/connection";
import { useSchemaStore } from "../../stores/schema";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async (cmd: string, args?: any) => {
    if (cmd === "fetch_table_foreign_keys") {
      if (args?.table === "orders") {
        return [
          {
            tableSchema: "shop",
            tableName: "orders",
            columnName: "user_id",
            referencedTableSchema: "auth",
            referencedTable: "users",
            referencedColumn: "id",
          },
          {
            tableSchema: "shop",
            tableName: "order_items",
            columnName: "order_id",
            referencedTableSchema: "shop",
            referencedTable: "orders",
            referencedColumn: "id",
          },
        ];
      }
      return [];
    }
    if (cmd === "fetch_table_details") {
      return {
        columns: [
          { name: "id", columnType: "bigint", nullable: false, default: null, pk: true, extra: "" },
          { name: "name", columnType: "varchar(255)", nullable: true, default: null, pk: false, extra: "" },
        ],
        indexes: [],
        constraints: [],
        ddl: "",
      };
    }
    return [];
  }),
}));

describe("SchemaDiagram.vue", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("visualizes both outbound and inbound foreign keys with cross-schema support", async () => {
    const connStore = useConnectionStore();
    const schemaStore = useSchemaStore();

    connStore.status = "connected";
    connStore.activeId = "conn-1";
    connStore.activeConnection = {
      id: "conn-1",
      name: "Local Shop",
      host: "localhost",
      port: 3306,
      user: "root",
      database: "shop",
    };

    schemaStore.tables = [
      { name: "orders", type: "table" },
      { name: "order_items", type: "table" },
    ];

    const wrapper = mount(SchemaDiagram, {
      props: {
        tableName: "orders",
      },
      global: {
        stubs: {
          Table: true,
          Key: true,
          Link: true,
          Badge: { template: "<span class='badge'><slot /></span>" },
          Button: { template: "<button><slot /></button>" },
        },
      },
    });

    await flushPromises();

    // Verify all 3 tables are present: focus table (orders), inbound referencing table (order_items), cross-schema referenced table (users)
    const text = wrapper.text();
    expect(text).toContain("orders");
    expect(text).toContain("order_items");
    expect(text).toContain("users");

    // Verify cross-schema badge displays for external database "auth"
    expect(text).toContain("auth");
  });
});
