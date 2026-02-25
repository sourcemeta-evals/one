import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// Set up a minimal DOM environment before importing the editor,
// as CodeMirror expects certain browser globals to exist.
function setupDOM() {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
    pretendToBeVisual: true
  });

  const globals = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    MutationObserver: dom.window.MutationObserver,
    CharacterData: dom.window.CharacterData,
    DocumentType: dom.window.DocumentType,
    Element: dom.window.Element,
    getComputedStyle: dom.window.getComputedStyle,
    CSSStyleDeclaration: dom.window.CSSStyleDeclaration,
    HTMLElement: dom.window.HTMLElement,
    Range: dom.window.Range,
    Selection: dom.window.Selection,
    Node: dom.window.Node,
    Text: dom.window.Text,
    DocumentFragment: dom.window.DocumentFragment,
    requestAnimationFrame: (callback) => setTimeout(callback, 0),
    cancelAnimationFrame: (id) => clearTimeout(id)
  };

  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, {
      value,
      writable: true,
      configurable: true
    });
  }

  return dom;
}

let dom;

describe("Editor", async () => {
  let Editor;

  // Set up DOM globals before dynamically importing the module
  dom = setupDOM();
  const mod = await import("../../src/web/scripts/editor.js");
  Editor = mod.Editor;

  let container;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  describe("#content()", () => {
    it("should return the initial content passed to the constructor", () => {
      const editor = new Editor(container, "hello world");
      assert.equal(editor.content(), "hello world");
    });

    it("should return an empty string when created with no content", () => {
      const editor = new Editor(container);
      assert.equal(editor.content(), "");
    });

    it("should return an empty string when created with an explicit empty string", () => {
      const editor = new Editor(container, "");
      assert.equal(editor.content(), "");
    });

    it("should return multi-line content", () => {
      const text = "line one\nline two\nline three";
      const editor = new Editor(container, text);
      assert.equal(editor.content(), text);
    });
  });

  describe("#setContent()", () => {
    it("should replace the editor content", () => {
      const editor = new Editor(container, "initial");
      editor.setContent("replaced");
      assert.equal(editor.content(), "replaced");
    });

    it("should set content on an initially empty editor", () => {
      const editor = new Editor(container);
      editor.setContent("new content");
      assert.equal(editor.content(), "new content");
    });

    it("should clear content when set to an empty string", () => {
      const editor = new Editor(container, "some text");
      editor.setContent("");
      assert.equal(editor.content(), "");
    });

    it("should handle multi-line content", () => {
      const editor = new Editor(container, "old");
      const text = "first\nsecond\nthird";
      editor.setContent(text);
      assert.equal(editor.content(), text);
    });

    it("should allow multiple consecutive setContent calls", () => {
      const editor = new Editor(container, "start");
      editor.setContent("middle");
      assert.equal(editor.content(), "middle");
      editor.setContent("end");
      assert.equal(editor.content(), "end");
    });
  });
});
