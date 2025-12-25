import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { JSDOM } from "jsdom";

describe("Editor", () => {
  let dom;
  let window;
  let document;
  let Editor;
  let originalNavigator;

  before(async () => {
    dom = new JSDOM("<!DOCTYPE html><html><body><div id=\"editor\"></div></body></html>", {
      pretendToBeVisual: true
    });
    window = dom.window;
    document = window.document;

    globalThis.window = window;
    globalThis.document = document;
    globalThis.getComputedStyle = window.getComputedStyle;
    globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 0);
    globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
    globalThis.MutationObserver = window.MutationObserver;
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    Object.defineProperty(globalThis, "navigator", {
      value: window.navigator,
      writable: true,
      configurable: true
    });

    const editorModule = await import("../../src/web/scripts/editor.js");
    Editor = editorModule.Editor;
  });

  after(() => {
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.getComputedStyle;
    delete globalThis.requestAnimationFrame;
    delete globalThis.cancelAnimationFrame;
    delete globalThis.MutationObserver;
    delete globalThis.ResizeObserver;
    if (originalNavigator) {
      Object.defineProperty(globalThis, "navigator", originalNavigator);
    }
  });

  describe("setContent", () => {
    it("should set the editor content to the given string", () => {
      const parent = document.getElementById("editor");
      const editor = new Editor(parent, "");
      editor.setContent("Hello, World!");
      assert.strictEqual(editor.content(), "Hello, World!");
    });

    it("should replace existing content", () => {
      const parent = document.getElementById("editor");
      const editor = new Editor(parent, "Initial content");
      editor.setContent("New content");
      assert.strictEqual(editor.content(), "New content");
    });

    it("should handle empty string", () => {
      const parent = document.getElementById("editor");
      const editor = new Editor(parent, "Some content");
      editor.setContent("");
      assert.strictEqual(editor.content(), "");
    });

    it("should handle multiline content", () => {
      const parent = document.getElementById("editor");
      const editor = new Editor(parent, "");
      const multilineContent = "Line 1\nLine 2\nLine 3";
      editor.setContent(multilineContent);
      assert.strictEqual(editor.content(), multilineContent);
    });
  });

  describe("content", () => {
    it("should return the initial content", () => {
      const parent = document.getElementById("editor");
      const editor = new Editor(parent, "Initial text");
      assert.strictEqual(editor.content(), "Initial text");
    });

    it("should return empty string when editor is empty", () => {
      const parent = document.getElementById("editor");
      const editor = new Editor(parent, "");
      assert.strictEqual(editor.content(), "");
    });

    it("should return content with special characters", () => {
      const parent = document.getElementById("editor");
      const content = '{"key": "value", "number": 123}';
      const editor = new Editor(parent, content);
      assert.strictEqual(editor.content(), content);
    });
  });
});
