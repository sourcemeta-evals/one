import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  pretendToBeVisual: true
});

const { window } = dom;
for (const property of [
  "window",
  "document",
  "Node",
  "HTMLElement",
  "MutationObserver",
  "DOMRect",
  "Range",
  "Text"
]) {
  globalThis[property] = window[property];
}

Object.defineProperty(globalThis, "navigator", {
  value: window.navigator,
  configurable: true
});

globalThis.requestAnimationFrame = (callback) => setTimeout(() => callback(0), 0);
globalThis.cancelAnimationFrame = (handle) => clearTimeout(handle);
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

globalThis.getSelection = () => window.getSelection();

const { Editor } = await import("../../src/web/scripts/editor.js");

test("Editor#content returns constructor contents", () => {
  const parent = document.createElement("div");
  document.body.append(parent);
  const editor = new Editor(parent, "initial content");

  assert.equal(editor.content(), "initial content");

  editor.view.destroy();
  parent.remove();
});

test("Editor#setContent replaces current document content", () => {
  const parent = document.createElement("div");
  document.body.append(parent);
  const editor = new Editor(parent, "before");

  editor.setContent("after");
  assert.equal(editor.content(), "after");

  editor.setContent("");
  assert.equal(editor.content(), "");

  editor.view.destroy();
  parent.remove();
});
