import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  pretendToBeVisual: true
});

const domGlobals = {
  window: dom.window,
  document: dom.window.document,
  navigator: dom.window.navigator,
  MutationObserver: dom.window.MutationObserver,
  getComputedStyle: dom.window.getComputedStyle,
  requestAnimationFrame: dom.window.requestAnimationFrame,
  cancelAnimationFrame: dom.window.cancelAnimationFrame,
  Range: dom.window.Range,
  Selection: dom.window.Selection,
  HTMLElement: dom.window.HTMLElement,
  Element: dom.window.Element,
  Node: dom.window.Node,
  Document: dom.window.Document,
  DocumentFragment: dom.window.DocumentFragment,
  Text: dom.window.Text,
  CSSStyleDeclaration: dom.window.CSSStyleDeclaration,
  StyleSheet: dom.window.StyleSheet,
  CSSStyleSheet: dom.window.CSSStyleSheet
};

for (const [key, value] of Object.entries(domGlobals)) {
  Object.defineProperty(globalThis, key, {
    value,
    writable: true,
    configurable: true
  });
}

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (typeof globalThis.IntersectionObserver === "undefined") {
  globalThis.IntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

const { Editor } = await import("../../src/web/scripts/editor.js");

describe("Editor", () => {
  let parent;
  let editor;

  beforeEach(() => {
    parent = document.createElement("div");
    document.body.appendChild(parent);
  });

  afterEach(() => {
    if (parent && parent.parentNode) {
      parent.parentNode.removeChild(parent);
    }
  });

  describe("content", () => {
    it("should return empty string for an editor initialized without content", () => {
      editor = new Editor(parent);
      assert.equal(editor.content(), "");
    });

    it("should return the initial content passed to the constructor", () => {
      editor = new Editor(parent, "hello world");
      assert.equal(editor.content(), "hello world");
    });

    it("should return multi-line initial content", () => {
      const multiline = "line one\nline two\nline three";
      editor = new Editor(parent, multiline);
      assert.equal(editor.content(), multiline);
    });
  });

  describe("setContent", () => {
    it("should replace empty content with new content", () => {
      editor = new Editor(parent);
      editor.setContent("new content");
      assert.equal(editor.content(), "new content");
    });

    it("should replace existing content", () => {
      editor = new Editor(parent, "old content");
      editor.setContent("new content");
      assert.equal(editor.content(), "new content");
    });

    it("should handle setting content to an empty string", () => {
      editor = new Editor(parent, "some content");
      editor.setContent("");
      assert.equal(editor.content(), "");
    });

    it("should handle multi-line content", () => {
      editor = new Editor(parent);
      const multiline = "{\n  \"key\": \"value\"\n}";
      editor.setContent(multiline);
      assert.equal(editor.content(), multiline);
    });

    it("should allow setting content multiple times", () => {
      editor = new Editor(parent);
      editor.setContent("first");
      assert.equal(editor.content(), "first");
      editor.setContent("second");
      assert.equal(editor.content(), "second");
      editor.setContent("third");
      assert.equal(editor.content(), "third");
    });
  });
});
