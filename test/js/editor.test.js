import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { JSDOM } from "jsdom";

describe("Editor", () => {
  let dom;
  let window;
  let document;
  let Editor;

  before(async () => {
    dom = new JSDOM("<!DOCTYPE html><html><body><div id=\"editor\"></div></body></html>", {
      pretendToBeVisual: true
    });
    window = dom.window;
    document = window.document;

    globalThis.window = window;
    globalThis.document = document;
    globalThis.MutationObserver = window.MutationObserver;
    globalThis.getComputedStyle = window.getComputedStyle;
    globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 0);
    globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

    const editorModule = await import("../../src/web/scripts/editor.js");
    Editor = editorModule.Editor;
  });

  after(() => {
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.MutationObserver;
    delete globalThis.getComputedStyle;
    delete globalThis.requestAnimationFrame;
    delete globalThis.cancelAnimationFrame;
    dom.window.close();
  });

  describe("#setContent", () => {
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
      const multiline = "Line 1\nLine 2\nLine 3";
      editor.setContent(multiline);
      assert.strictEqual(editor.content(), multiline);
    });
  });

  describe("#content", () => {
    it("should return the initial content", () => {
      const parent = document.getElementById("editor");
      const editor = new Editor(parent, "Initial text");
      assert.strictEqual(editor.content(), "Initial text");
    });

    it("should return empty string when initialized empty", () => {
      const parent = document.getElementById("editor");
      const editor = new Editor(parent, "");
      assert.strictEqual(editor.content(), "");
    });

    it("should return content after multiple setContent calls", () => {
      const parent = document.getElementById("editor");
      const editor = new Editor(parent, "First");
      editor.setContent("Second");
      editor.setContent("Third");
      assert.strictEqual(editor.content(), "Third");
    });
  });
});
