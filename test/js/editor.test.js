import "./setup.js";
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { Editor } from "../../src/web/scripts/editor.js";

describe("Editor", () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = "<div id=\"editor\"></div>";
    container = document.getElementById("editor");
  });

  describe("#setContent", () => {
    it("should set the editor content", () => {
      const editor = new Editor(container, "");
      editor.setContent("hello world");
      assert.strictEqual(editor.content(), "hello world");
    });

    it("should replace existing content", () => {
      const editor = new Editor(container, "initial content");
      editor.setContent("new content");
      assert.strictEqual(editor.content(), "new content");
    });

    it("should handle empty string", () => {
      const editor = new Editor(container, "some content");
      editor.setContent("");
      assert.strictEqual(editor.content(), "");
    });

    it("should handle multiline content", () => {
      const editor = new Editor(container, "");
      const multiline = "line 1\nline 2\nline 3";
      editor.setContent(multiline);
      assert.strictEqual(editor.content(), multiline);
    });
  });

  describe("#content", () => {
    it("should return initial content", () => {
      const editor = new Editor(container, "initial");
      assert.strictEqual(editor.content(), "initial");
    });

    it("should return empty string for empty editor", () => {
      const editor = new Editor(container, "");
      assert.strictEqual(editor.content(), "");
    });

    it("should return content after multiple setContent calls", () => {
      const editor = new Editor(container, "first");
      editor.setContent("second");
      editor.setContent("third");
      assert.strictEqual(editor.content(), "third");
    });
  });
});
