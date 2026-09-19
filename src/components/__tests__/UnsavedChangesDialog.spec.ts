import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import UnsavedChangesDialog from "../UnsavedChangesDialog.vue";
import { useEditorStore } from "@/stores/editor";

describe("UnsavedChangesDialog.vue", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders when confirmCloseTabId is set", async () => {
    const store = useEditorStore();
    const tab = store.tabs[0];
    store.updateSql(tab.id, "SELECT * FROM secrets");

    mount(UnsavedChangesDialog, {
      attachTo: document.body,
    });

    // Before confirm close
    expect(document.body.textContent).not.toContain("Save Changes?");

    // Trigger tab close
    store.closeTab(tab.id);
    await new Promise((r) => setTimeout(r, 50));

    // Dialog should now be open
    expect(document.body.textContent).toContain("Save Changes?");
    expect(document.body.textContent).toContain("Query 1");
    expect(document.body.textContent).toContain("Don't Save");
    expect(document.body.textContent).toContain("Cancel");
    expect(document.body.textContent).toContain("Save");
  });

  it("clicking Cancel dismisses dialog and keeps tab", async () => {
    const store = useEditorStore();
    const tab = store.tabs[0];
    store.updateSql(tab.id, "SELECT * FROM keep_me");
    store.closeTab(tab.id);

    mount(UnsavedChangesDialog, {
      attachTo: document.body,
    });
    await new Promise((r) => setTimeout(r, 50));

    const cancelBtn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Cancel")
    );
    expect(cancelBtn).toBeDefined();
    cancelBtn!.click();
    await new Promise((r) => setTimeout(r, 50));

    expect(store.confirmCloseTabId).toBeNull();
    expect(store.tabs).toHaveLength(1);
  });

  it("clicking Don't Save discards changes and closes tab", async () => {
    const store = useEditorStore();
    const id2 = store.addTab();
    store.updateSql(id2, "SELECT * FROM discard_me");
    store.closeTab(id2);

    mount(UnsavedChangesDialog, {
      attachTo: document.body,
    });
    await new Promise((r) => setTimeout(r, 50));

    const dontSaveBtn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Don't Save")
    );
    expect(dontSaveBtn).toBeDefined();
    dontSaveBtn!.click();
    await new Promise((r) => setTimeout(r, 50));

    expect(store.confirmCloseTabId).toBeNull();
    expect(store.tabs.find((t) => t.id === id2)).toBeUndefined();
  });

  it("clicking Save triggers saveAndCloseTab", async () => {
    const store = useEditorStore();
    const tab = store.tabs[0];
    store.updateSql(tab.id, "SELECT * FROM save_me");
    store.closeTab(tab.id);

    const saveSpy = vi.spyOn(store, "saveAndCloseTab");

    mount(UnsavedChangesDialog, {
      attachTo: document.body,
    });
    await new Promise((r) => setTimeout(r, 50));

    const saveBtn = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Save"
    );
    expect(saveBtn).toBeDefined();
    saveBtn!.click();
    await new Promise((r) => setTimeout(r, 50));

    expect(saveSpy).toHaveBeenCalled();
  });
});
