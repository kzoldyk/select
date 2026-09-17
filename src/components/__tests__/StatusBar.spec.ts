import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import StatusBar from "../StatusBar.vue";
import { useConnectionStore } from "../../stores/connection";
import { useUiStore } from "../../stores/ui";

describe("StatusBar.vue", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("shows disconnected status when no active connection", () => {
    const connStore = useConnectionStore();
    connStore.status = "idle";
    connStore.activeId = null;

    const wrapper = mount(StatusBar, {
      global: {
        stubs: {
          ThemeGalleryDialog: true,
          KeyboardShortcuts: true,
          Database: true,
          HardDrive: true,
          Moon: true,
          Sun: true,
          ChevronUp: true,
        },
      },
    });

    expect(wrapper.text()).toContain("No Connection");
  });

  it("shows connection name and database when connected", () => {
    const connStore = useConnectionStore();
    connStore.connections = [
      {
        id: "conn-1",
        name: "Production DB",
        host: "db.internal",
        port: 3306,
        database: "shop",
        username: "admin",
        password: "",
        dbType: "mysql",
        ssl: false,
        readOnly: false,
        sshTunnel: false,
        color: "#3B82F6",
        createdAt: new Date().toISOString(),
      },
    ];
    connStore.activeId = "conn-1";
    connStore.status = "connected";
    connStore.latency = 12;

    const wrapper = mount(StatusBar, {
      global: {
        stubs: {
          ThemeGalleryDialog: true,
          KeyboardShortcuts: true,
          Database: true,
          HardDrive: true,
          Moon: true,
          Sun: true,
          ChevronUp: true,
        },
      },
    });

    expect(wrapper.text()).toContain("Production DB");
    expect(wrapper.text()).toContain("shop");
  });

  it("shows Notebook mode badge when active tab is a notebook", async () => {
    const { useEditorStore } = await import("../../stores/editor");
    const editorStore = useEditorStore();
    editorStore.addNotebookTab();

    const wrapper = mount(StatusBar, {
      global: {
        stubs: {
          ThemeGalleryDialog: true,
          KeyboardShortcuts: true,
        },
      },
    });

    expect(wrapper.text()).toContain("Notebook");
  });
});
