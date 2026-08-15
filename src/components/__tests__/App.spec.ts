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
});
