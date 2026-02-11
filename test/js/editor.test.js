import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM(
  "<!DOCTYPE html><html><body><div id=\"editor\"></div></body></html>",
  { pretendToBeVisual: true }
);

global.window = dom.window;
global.document = dom.window.document;
global.MutationObserver = dom.window.MutationObserver;
global.getComputedStyle = dom.window.getComputedStyle;
global.Range = dom.window.Range;
global.DocumentFragment = dom.window.DocumentFragment;
global.CSSStyleDeclaration = dom.window.CSSStyleDeclaration;
global.Element = dom.window.Element;
global.Node = dom.window.Node;
global.HTMLElement = dom.window.HTMLElement;

const { Editor } = await import("../../src/web/scripts/editor.js");

describe("Editor", () => {
  let parent;
  beforeEach(() => {
    parent = dom.window.document.createElement("div");
    dom.window.document.body.appendChild(parent);
  });

  describe("#content", () => {
    it("should return an empty string by default", () => {
      const editor = new Editor(parent);
      assert.equal(editor.content(), "");
    });

    it("should return the initial contents", () => {
      const editor = new Editor(parent, "hello world");
      assert.equal(editor.content(), "hello world");
    });

    it("should return multi-line initial contents", () => {
      const editor = new Editor(parent, "line1\nline2\nline3");
      assert.equal(editor.content(), "line1\nline2\nline3");
    });
  });

  describe("#setContent", () => {
    it("should replace empty content", () => {
      const editor = new Editor(parent);
      editor.setContent("new content");
      assert.equal(editor.content(), "new content");
    });

    it("should replace existing content", () => {
      const editor = new Editor(parent, "old content");
      editor.setContent("new content");
      assert.equal(editor.content(), "new content");
    });

    it("should set content to an empty string", () => {
      const editor = new Editor(parent, "some content");
      editor.setContent("");
      assert.equal(editor.content(), "");
    });

    it("should handle multi-line content", () => {
      const editor = new Editor(parent);
      editor.setContent("line1\nline2\nline3");
      assert.equal(editor.content(), "line1\nline2\nline3");
    });

    it("should allow multiple successive calls", () => {
      const editor = new Editor(parent);
      editor.setContent("first");
      editor.setContent("second");
      editor.setContent("third");
      assert.equal(editor.content(), "third");
    });
  });
});
