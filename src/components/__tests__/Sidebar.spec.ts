import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import Sidebar from "../Sidebar.vue";
import { useConnectionStore } from "../../stores/connection";
import { useSchemaStore } from "../../stores/schema";
import { useUiStore } from "../../stores/ui";

describe("Sidebar.vue", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("renders Connect to Database CTA when disconnected", () => {
    const connStore = useConnectionStore();
    connStore.status = "idle";
    connStore.activeId = null;

    const wrapper = mount(Sidebar, {
      global: {
        stubs: {
          ScrollArea: { template: "<div><slot /></div>" },
          Workflow: true,
          ChevronRight: true,
          Table: true,
          ContextMenu: true,
          ContextMenuTrigger: true,
          ContextMenuContent: true,
          ContextMenuItem: true,
          ContextMenuSeparator: true,
        },
      },
    });

    expect(wrapper.text()).toContain("Connect to Database");
  });

  it("renders database dropdown and schema diagram button when connected", () => {
    const connStore = useConnectionStore();
    const schemaStore = useSchemaStore();
    connStore.status = "connected";
    connStore.activeId = "conn-1";
    schemaStore.databases = ["main_db", "test_db"];

    const wrapper = mount(Sidebar, {
      global: {
        stubs: {
          ScrollArea: { template: "<div><slot /></div>" },
          Workflow: true,
          ChevronRight: true,
          Table: true,
          ContextMenu: true,
          ContextMenuTrigger: true,
          ContextMenuContent: true,
          ContextMenuItem: true,
          ContextMenuSeparator: true,
        },
      },
    });

    expect(wrapper.text()).toContain("Schema Diagram");
    expect(wrapper.find("select").exists()).toBe(true);
  });

  it("shows error banner and retry button when schemaError is present", () => {
    const connStore = useConnectionStore();
    const schemaStore = useSchemaStore();
    connStore.status = "connected";
    connStore.activeId = "conn-1";
    schemaStore.schemaError = "Access denied for user 'root'";

    const wrapper = mount(Sidebar, {
      global: {
        stubs: {
          ScrollArea: { template: "<div><slot /></div>" },
          Workflow: true,
          ChevronRight: true,
          Table: true,
          ContextMenu: true,
          ContextMenuTrigger: true,
          ContextMenuContent: true,
          ContextMenuItem: true,
          ContextMenuSeparator: true,
        },
      },
    });

    expect(wrapper.text()).toContain("Access denied for user 'root'");
    expect(wrapper.text()).toContain("Retry");
  });
});
