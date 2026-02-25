import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
const { window } = dom;

globalThis.window = window;
globalThis.document = window.document;
globalThis.Node = window.Node;
globalThis.HTMLElement = window.HTMLElement;
globalThis.MutationObserver = window.MutationObserver;
Object.defineProperty(globalThis, "navigator", {
  value: window.navigator,
  configurable: true
});
globalThis.getSelection = window.getSelection.bind(window);
globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 0);
globalThis.cancelAnimationFrame = (handle) => clearTimeout(handle);
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

window.requestAnimationFrame = globalThis.requestAnimationFrame;
window.cancelAnimationFrame = globalThis.cancelAnimationFrame;
window.ResizeObserver = globalThis.ResizeObserver;

const { Editor } = await import("../../src/web/scripts/editor.js");

function createEditor(contents = "") {
  const parent = document.createElement("div");
  document.body.append(parent);
  const editor = new Editor(parent, contents);
  return { editor, parent };
}

test("Editor#content returns the current contents", () => {
  const { editor, parent } = createEditor("{\n  \"type\": \"string\"\n}");

  assert.equal(editor.content(), "{\n  \"type\": \"string\"\n}");

  editor.view.destroy();
  parent.remove();
});

test("Editor#setContent replaces the current contents", () => {
  const { editor, parent } = createEditor("{\"type\":\"string\"}");

  editor.setContent("{\"type\":\"number\"}");

  assert.equal(editor.content(), "{\"type\":\"number\"}");

  editor.view.destroy();
  parent.remove();
});
