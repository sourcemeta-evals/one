import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { JSDOM } from "jsdom";

describe("Editor", () => {
  let dom;
  let window;
  let document;
  let container;
  let Editor;

  beforeEach(async () => {
    dom = new JSDOM("<!DOCTYPE html><html><body><div id=\"editor\"></div></body></html>", {
      pretendToBeVisual: true,
      runScripts: "dangerously"
    });

    window = dom.window;
    document = window.document;
    container = document.getElementById("editor");

    globalThis.window = window;
    globalThis.document = document;
    Object.defineProperty(globalThis, "navigator", {
      value: window.navigator,
      writable: true,
      configurable: true
    });
    globalThis.Element = window.Element;
    globalThis.Node = window.Node;
    globalThis.getComputedStyle = window.getComputedStyle;
    globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 0);
    globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
    globalThis.MutationObserver = window.MutationObserver;
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    const editorModule = await import("../../src/web/scripts/editor.js");
    Editor = editorModule.Editor;
  });

  afterEach(() => {
    if (dom) {
      dom.window.close();
    }

    delete globalThis.window;
    delete globalThis.document;
    Object.defineProperty(globalThis, "navigator", {
      value: undefined,
      writable: true,
      configurable: true
    });
    delete globalThis.Element;
    delete globalThis.Node;
    delete globalThis.getComputedStyle;
    delete globalThis.requestAnimationFrame;
    delete globalThis.cancelAnimationFrame;
    delete globalThis.MutationObserver;
    delete globalThis.ResizeObserver;
  });

  describe("content", () => {
    it("should return empty string for empty editor", () => {
      const editor = new Editor(container, "");
      assert.strictEqual(editor.content(), "");
    });

    it("should return initial content", () => {
      const initialContent = "Hello, World!";
      const editor = new Editor(container, initialContent);
      assert.strictEqual(editor.content(), initialContent);
    });

    it("should return multiline content", () => {
      const multilineContent = "Line 1\nLine 2\nLine 3";
      const editor = new Editor(container, multilineContent);
      assert.strictEqual(editor.content(), multilineContent);
    });

    it("should return JSON content", () => {
      const jsonContent = '{"key": "value", "number": 42}';
      const editor = new Editor(container, jsonContent, { json: true });
      assert.strictEqual(editor.content(), jsonContent);
    });
  });

  describe("setContent", () => {
    it("should set content on empty editor", () => {
      const editor = new Editor(container, "");
      const newContent = "New content";
      editor.setContent(newContent);
      assert.strictEqual(editor.content(), newContent);
    });

    it("should replace existing content", () => {
      const editor = new Editor(container, "Initial content");
      const newContent = "Replaced content";
      editor.setContent(newContent);
      assert.strictEqual(editor.content(), newContent);
    });

    it("should handle empty string replacement", () => {
      const editor = new Editor(container, "Some content");
      editor.setContent("");
      assert.strictEqual(editor.content(), "");
    });

    it("should handle multiline content", () => {
      const editor = new Editor(container, "Single line");
      const multilineContent = "Line 1\nLine 2\nLine 3";
      editor.setContent(multilineContent);
      assert.strictEqual(editor.content(), multilineContent);
    });

    it("should handle JSON content", () => {
      const editor = new Editor(container, "", { json: true });
      const jsonContent = '{\n  "name": "test",\n  "value": 123\n}';
      editor.setContent(jsonContent);
      assert.strictEqual(editor.content(), jsonContent);
    });

    it("should handle multiple setContent calls", () => {
      const editor = new Editor(container, "");
      editor.setContent("First");
      assert.strictEqual(editor.content(), "First");
      editor.setContent("Second");
      assert.strictEqual(editor.content(), "Second");
      editor.setContent("Third");
      assert.strictEqual(editor.content(), "Third");
    });

    it("should handle special characters", () => {
      const editor = new Editor(container, "");
      const specialContent = "Special chars: <>&\"'`\t\n";
      editor.setContent(specialContent);
      assert.strictEqual(editor.content(), specialContent);
    });

    it("should handle unicode content", () => {
      const editor = new Editor(container, "");
      const unicodeContent = "Unicode: \u00e9\u00e8\u00ea \u4e2d\u6587 \ud83d\ude00";
      editor.setContent(unicodeContent);
      assert.strictEqual(editor.content(), unicodeContent);
    });
  });
});
