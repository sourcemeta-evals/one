import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");

dom.window.requestAnimationFrame =
  dom.window.requestAnimationFrame || ((cb) => setTimeout(cb, 0));
dom.window.cancelAnimationFrame =
  dom.window.cancelAnimationFrame || ((id) => clearTimeout(id));

for (const key of [
  "window", "document",
  "Node", "Element", "HTMLElement", "Text", "Range",
  "DocumentFragment", "MutationObserver",
  "getComputedStyle", "CustomEvent",
  "requestAnimationFrame", "cancelAnimationFrame"
]) {
  if (dom.window[key] !== undefined) {
    globalThis[key] = dom.window[key];
  }
}

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

const { Editor } = await import("../../src/web/scripts/editor.js");

describe("Editor", () => {
  let parent;
  let editor;

  beforeEach(() => {
    parent = document.createElement("div");
    document.body.appendChild(parent);
    editor = new Editor(parent);
  });

  describe("#content", () => {
    it("returns empty string for a default editor", () => {
      assert.equal(editor.content(), "");
    });

    it("returns the initial content passed to the constructor", () => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const ed = new Editor(container, "hello world");
      assert.equal(ed.content(), "hello world");
    });
  });

  describe("#setContent", () => {
    it("sets content on an empty editor", () => {
      editor.setContent("new content");
      assert.equal(editor.content(), "new content");
    });

    it("replaces existing content", () => {
      editor.setContent("first");
      editor.setContent("second");
      assert.equal(editor.content(), "second");
    });

    it("can set content to an empty string", () => {
      editor.setContent("something");
      editor.setContent("");
      assert.equal(editor.content(), "");
    });

    it("handles multiline content", () => {
      const multiline = "line 1\nline 2\nline 3";
      editor.setContent(multiline);
      assert.equal(editor.content(), multiline);
    });
  });
});
