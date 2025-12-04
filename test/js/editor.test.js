import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { JSDOM } from "jsdom";

// Set up jsdom environment before importing Editor
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost",
  pretendToBeVisual: true
});

globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.MutationObserver = dom.window.MutationObserver;
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.Range = dom.window.Range;
globalThis.Node = dom.window.Node;
globalThis.Selection = dom.window.Selection;

// Import Editor after setting up the DOM environment
const { Editor } = await import("../../src/web/scripts/editor.js");

describe("Editor", () => {
  let container;
  let editor;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    editor = null;
  });

  describe("constructor", () => {
    it("should create an editor with empty content by default", () => {
      editor = new Editor(container);
      assert.strictEqual(editor.content(), "");
    });

    it("should create an editor with initial content", () => {
      const initialContent = "Hello, World!";
      editor = new Editor(container, initialContent);
      assert.strictEqual(editor.content(), initialContent);
    });
  });

  describe("content()", () => {
    it("should return the current document content", () => {
      const content = "Test content";
      editor = new Editor(container, content);
      assert.strictEqual(editor.content(), content);
    });

    it("should return multiline content correctly", () => {
      const content = "Line 1\nLine 2\nLine 3";
      editor = new Editor(container, content);
      assert.strictEqual(editor.content(), content);
    });

    it("should return empty string for empty editor", () => {
      editor = new Editor(container);
      assert.strictEqual(editor.content(), "");
    });
  });

  describe("setContent()", () => {
    it("should replace empty content with new content", () => {
      editor = new Editor(container);
      const newContent = "New content";
      editor.setContent(newContent);
      assert.strictEqual(editor.content(), newContent);
    });

    it("should replace existing content with new content", () => {
      editor = new Editor(container, "Old content");
      const newContent = "New content";
      editor.setContent(newContent);
      assert.strictEqual(editor.content(), newContent);
    });

    it("should handle multiline content", () => {
      editor = new Editor(container);
      const newContent = "Line 1\nLine 2\nLine 3";
      editor.setContent(newContent);
      assert.strictEqual(editor.content(), newContent);
    });

    it("should handle empty string", () => {
      editor = new Editor(container, "Some content");
      editor.setContent("");
      assert.strictEqual(editor.content(), "");
    });

    it("should handle special characters", () => {
      editor = new Editor(container);
      const newContent = '{"key": "value", "array": [1, 2, 3]}';
      editor.setContent(newContent);
      assert.strictEqual(editor.content(), newContent);
    });

    it("should handle unicode content", () => {
      editor = new Editor(container);
      const newContent = "Hello 世界 🌍";
      editor.setContent(newContent);
      assert.strictEqual(editor.content(), newContent);
    });

    it("should allow multiple consecutive setContent calls", () => {
      editor = new Editor(container);
      editor.setContent("First");
      editor.setContent("Second");
      editor.setContent("Third");
      assert.strictEqual(editor.content(), "Third");
    });
  });
});
