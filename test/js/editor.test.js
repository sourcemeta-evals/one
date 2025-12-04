import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { JSDOM } from "jsdom";

import { Editor } from "../../src/web/scripts/editor.js";

describe("Editor", () => {
  let dom;
  let container;

  beforeEach(() => {
    dom = new JSDOM("<!DOCTYPE html><html><body><div id=\"editor\"></div></body></html>", {
      pretendToBeVisual: true
    });
    global.document = dom.window.document;
    global.window = dom.window;
    global.MutationObserver = dom.window.MutationObserver;
    global.getComputedStyle = dom.window.getComputedStyle;
    global.requestAnimationFrame = (callback) => setTimeout(callback, 0);
    global.cancelAnimationFrame = (id) => clearTimeout(id);
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    container = dom.window.document.getElementById("editor");
  });

  afterEach(() => {
    dom.window.close();
    delete global.document;
    delete global.window;
    delete global.MutationObserver;
    delete global.getComputedStyle;
    delete global.requestAnimationFrame;
    delete global.cancelAnimationFrame;
    delete global.ResizeObserver;
  });

  describe("content", () => {
    it("returns empty string for empty editor", () => {
      const editor = new Editor(container);
      assert.strictEqual(editor.content(), "");
    });

    it("returns initial content passed to constructor", () => {
      const initialContent = "hello world";
      const editor = new Editor(container, initialContent);
      assert.strictEqual(editor.content(), initialContent);
    });

    it("returns multiline content", () => {
      const multilineContent = "line 1\nline 2\nline 3";
      const editor = new Editor(container, multilineContent);
      assert.strictEqual(editor.content(), multilineContent);
    });
  });

  describe("setContent", () => {
    it("sets content on empty editor", () => {
      const editor = new Editor(container);
      const newContent = "new content";
      editor.setContent(newContent);
      assert.strictEqual(editor.content(), newContent);
    });

    it("replaces existing content", () => {
      const editor = new Editor(container, "initial content");
      const newContent = "replaced content";
      editor.setContent(newContent);
      assert.strictEqual(editor.content(), newContent);
    });

    it("can set empty content", () => {
      const editor = new Editor(container, "some content");
      editor.setContent("");
      assert.strictEqual(editor.content(), "");
    });

    it("handles multiline content", () => {
      const editor = new Editor(container);
      const multilineContent = "{\n  \"key\": \"value\"\n}";
      editor.setContent(multilineContent);
      assert.strictEqual(editor.content(), multilineContent);
    });

    it("can be called multiple times", () => {
      const editor = new Editor(container);
      editor.setContent("first");
      assert.strictEqual(editor.content(), "first");
      editor.setContent("second");
      assert.strictEqual(editor.content(), "second");
      editor.setContent("third");
      assert.strictEqual(editor.content(), "third");
    });
  });
});
