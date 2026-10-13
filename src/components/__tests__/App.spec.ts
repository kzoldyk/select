import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import App from "../../App.vue";

describe("App.vue mount", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("mounts App.vue without crashing", () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          teleport: true,
          // Let real components mount where possible to catch any runtime errors
        },
      },
    });

    expect(wrapper.exists()).toBe(true);
  });

  it("renders sidebar resize handle and supports reset on dblclick", async () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          teleport: true,
        },
      },
    });

    const handle = wrapper.find(".sidebar-resize-handle");
    expect(handle.exists()).toBe(true);
    expect(handle.attributes("role")).toBe("separator");
    expect(handle.attributes("aria-orientation")).toBe("vertical");

    const { useUiStore } = await import("../../stores/ui");
    const uiStore = useUiStore();
    uiStore.setSidebarWidth(400);
    expect(uiStore.sidebarWidth).toBe(400);

    await handle.trigger("dblclick");
    expect(uiStore.sidebarWidth).toBe(260);
  });
});
