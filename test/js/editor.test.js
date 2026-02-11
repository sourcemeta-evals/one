import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const GLOBALS = [
  "window", "document", "navigator", "MutationObserver",
  "getComputedStyle", "requestAnimationFrame",
  "StyleSheet", "CSSStyleSheet", "DocumentFragment", "ShadowRoot",
  "HTMLElement", "Range", "Node", "Selection", "Element"
];

let saved;

function setupDOM() {
  const dom = new JSDOM(
    "<!DOCTYPE html><html><body><div id=\"editor\"></div></body></html>",
    { pretendToBeVisual: true }
  );

  saved = {};
  for (const key of GLOBALS) {
    saved[key] = Object.getOwnPropertyDescriptor(globalThis, key);
  }

  for (const key of GLOBALS) {
    const value = key === "requestAnimationFrame"
      ? (cb) => setTimeout(cb, 0)
      : dom.window[key];
    Object.defineProperty(globalThis, key, {
      value, configurable: true, writable: true
    });
  }

  return dom;
}

function teardownDOM() {
  if (!saved) return;
  for (const key of GLOBALS) {
    if (saved[key]) {
      Object.defineProperty(globalThis, key, saved[key]);
    } else {
      delete globalThis[key];
    }
  }
  saved = null;
}

describe("Editor", () => {
  let dom;
  let Editor;
  const editors = [];

  function createEditor(...args) {
    const instance = new Editor(...args);
    editors.push(instance);
    return instance;
  }

  beforeEach(async () => {
    dom = setupDOM();
    const mod = await import("../../src/web/scripts/editor.js");
    Editor = mod.Editor;
  });

  afterEach(() => {
    while (editors.length) editors.pop().view.destroy();
    dom.window.close();
    teardownDOM();
  });

  describe("content", () => {
    it("returns the initial content when constructed with text", () => {
      const parent = document.getElementById("editor");
      const editor = createEditor(parent, "hello world");
      assert.equal(editor.content(), "hello world");
    });

    it("returns an empty string when constructed without content", () => {
      const parent = document.getElementById("editor");
      const editor = createEditor(parent);
      assert.equal(editor.content(), "");
    });
  });

  describe("setContent", () => {
    it("replaces the document content", () => {
      const parent = document.getElementById("editor");
      const editor = createEditor(parent, "original");
      editor.setContent("replaced");
      assert.equal(editor.content(), "replaced");
    });

    it("can set content to an empty string", () => {
      const parent = document.getElementById("editor");
      const editor = createEditor(parent, "not empty");
      editor.setContent("");
      assert.equal(editor.content(), "");
    });

    it("can set content multiple times", () => {
      const parent = document.getElementById("editor");
      const editor = createEditor(parent);
      editor.setContent("first");
      assert.equal(editor.content(), "first");
      editor.setContent("second");
      assert.equal(editor.content(), "second");
      editor.setContent("third");
      assert.equal(editor.content(), "third");
    });

    it("handles multiline content", () => {
      const parent = document.getElementById("editor");
      const editor = createEditor(parent);
      const multiline= "line one\nline two\nline three";
      editor.setContent(multiline);
      assert.equal(editor.content(), multiline);
    });
  });
});
