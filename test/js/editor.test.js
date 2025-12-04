import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body><div id=\"editor\"></div></body></html>", {
  pretendToBeVisual: true
});

globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator,
  writable: true,
  configurable: true
});
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.MutationObserver = dom.window.MutationObserver;
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const { Editor } = await import("../../src/web/scripts/editor.js");

describe("Editor", () => {
  let container;

  before(() => {
    container = document.getElementById("editor");
  });

  after(() => {
    dom.window.close();
  });

  describe("content", () => {
    it("should return empty string for empty editor", () => {
      const editor = new Editor(container);
      assert.strictEqual(editor.content(), "");
    });

    it("should return initial content passed to constructor", () => {
      const initialContent = "Hello, World!";
      const editor = new Editor(container, initialContent);
      assert.strictEqual(editor.content(), initialContent);
    });

    it("should return multiline content correctly", () => {
      const multilineContent = "Line 1\nLine 2\nLine 3";
      const editor = new Editor(container, multilineContent);
      assert.strictEqual(editor.content(), multilineContent);
    });
  });

  describe("setContent", () => {
    it("should set content on empty editor", () => {
      const editor = new Editor(container);
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

    it("should handle empty string", () => {
      const editor = new Editor(container, "Some content");
      editor.setContent("");
      assert.strictEqual(editor.content(), "");
    });

    it("should handle multiline content", () => {
      const editor = new Editor(container);
      const multilineContent = "Line 1\nLine 2\nLine 3";
      editor.setContent(multilineContent);
      assert.strictEqual(editor.content(), multilineContent);
    });

    it("should handle JSON content", () => {
      const editor = new Editor(container, "", { json: true });
      const jsonContent = '{"key": "value", "number": 42}';
      editor.setContent(jsonContent);
      assert.strictEqual(editor.content(), jsonContent);
    });

    it("should handle special characters", () => {
      const editor = new Editor(container);
      const specialContent = "Special chars: \t\n\"'<>&";
      editor.setContent(specialContent);
      assert.strictEqual(editor.content(), specialContent);
    });

    it("should handle unicode content", () => {
      const editor = new Editor(container);
      const unicodeContent = "Unicode: \u00e9\u00e8\u00ea \u4e2d\u6587 \ud83d\ude00";
      editor.setContent(unicodeContent);
      assert.strictEqual(editor.content(), unicodeContent);
    });
  });
});
