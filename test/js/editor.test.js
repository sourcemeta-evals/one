import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
dom.window.requestAnimationFrame = (cb) => dom.window.setTimeout(cb, 0);
dom.window.cancelAnimationFrame = (id) => dom.window.clearTimeout(id);
for (const key of [
  "document", "window", "MutationObserver", "CSSStyleSheet",
  "requestAnimationFrame", "cancelAnimationFrame",
  "getComputedStyle", "HTMLElement", "Range", "Selection"
]) {
  if (dom.window[key] !== undefined) {
    Object.defineProperty(globalThis, key, {
      value: dom.window[key],
      writable: true,
      configurable: true
    });
  }
}
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator,
  writable: true,
  configurable: true
});

const { Editor } = await import("../../src/web/scripts/editor.js");

describe("Editor", () => {
  let container;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  describe("content", () => {
    it("returns the initial content", () => {
      const editor = new Editor(container, "hello world");
      assert.equal(editor.content(), "hello world");
    });

    it("returns an empty string when created without content", () => {
      const editor = new Editor(container);
      assert.equal(editor.content(), "");
    });
  });

  describe("setContent", () => {
    it("replaces the document with the given string", () => {
      const editor = new Editor(container, "old");
      editor.setContent("new");
      assert.equal(editor.content(), "new");
    });

    it("can set content to an empty string", () => {
      const editor = new Editor(container, "something");
      editor.setContent("");
      assert.equal(editor.content(), "");
    });

    it("can set content multiple times", () => {
      const editor = new Editor(container);
      editor.setContent("first");
      assert.equal(editor.content(), "first");
      editor.setContent("second");
      assert.equal(editor.content(), "second");
    });

    it("handles multiline content", () => {
      const editor = new Editor(container);
      const multiline = "line 1\nline 2\nline 3";
      editor.setContent(multiline);
      assert.equal(editor.content(), multiline);
    });
  });
});
