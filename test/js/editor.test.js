import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body><div id=\"editor\"></div></body></html>");

// Additional stubs needed by CodeMirror
global.document = dom.window.document;
global.window = dom.window;
global.MutationObserver = dom.window.MutationObserver;
dom.window.requestAnimationFrame = (callback) => setTimeout(callback, 16);
dom.window.cancelAnimationFrame = (id) => clearTimeout(id);
dom.window.Range.prototype.getClientRects = () => [];
dom.window.Range.prototype.getBoundingClientRect = () =>
  ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 });

// Dynamic import is required because static imports are hoisted and execute
// before any code runs. The JSDOM globals must be set up before CodeMirror
// loads, as it checks for browser APIs like MutationObserver at import time
const { Editor } = await import("../../src/web/scripts/editor.js");

describe("Editor", () => {
  const container = document.getElementById("editor");

  beforeEach(() => {
    container.innerHTML = "";
  });

  test("content returns empty string by default", () => {
    const editor = new Editor(container);
    assert.strictEqual(editor.content(), "");
  });

  test("content returns initial content", () => {
    const editor = new Editor(container, "hello world");
    assert.strictEqual(editor.content(), "hello world");
  });

  test("content returns multiline content", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    assert.strictEqual(editor.content(), "line 1\nline 2\nline 3");
  });

  test("setContent replaces empty content", () => {
    const editor = new Editor(container);
    editor.setContent("new content");
    assert.strictEqual(editor.content(), "new content");
  });

  test("setContent replaces existing content", () => {
    const editor = new Editor(container, "initial");
    editor.setContent("replaced");
    assert.strictEqual(editor.content(), "replaced");
  });

  test("setContent with empty string clears content", () => {
    const editor = new Editor(container, "some content");
    editor.setContent("");
    assert.strictEqual(editor.content(), "");
  });

  test("setContent can be called multiple times", () => {
    const editor = new Editor(container, "first");
    editor.setContent("second");
    editor.setContent("third");
    assert.strictEqual(editor.content(), "third");
  });

  test("setContent handles multiline content", () => {
    const editor = new Editor(container);
    editor.setContent("line 1\nline 2\nline 3");
    assert.strictEqual(editor.content(), "line 1\nline 2\nline 3");
  });

  test("highlights returns empty array by default", () => {
    const editor = new Editor(container, "hello");
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("highlight records range and color", () => {
    const editor = new Editor(container, "hello");
    editor.highlight([ 1, 2, 1, 4 ], "#ff0000");

    assert.deepStrictEqual(editor.highlights(), [
      { range: [ 1, 2, 1, 4 ], color: "#ff0000" }
    ]);
  });

  test("highlight supports multiline ranges", () => {
    const editor = new Editor(container, "abc\ndefg");
    editor.highlight([ 1, 2, 2, 3 ], "#00ff00");

    assert.deepStrictEqual(editor.highlights(), [
      { range: [ 1, 2, 2, 3 ], color: "#00ff00" }
    ]);
  });

  test("highlight accumulates multiple highlights", () => {
    const editor = new Editor(container, "hello\nworld");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    editor.highlight([ 2, 2, 2, 4 ], "#0000ff");

    assert.deepStrictEqual(editor.highlights(), [
      { range: [ 1, 1, 1, 5 ], color: "#ff0000" },
      { range: [ 2, 2, 2, 4 ], color: "#0000ff" }
    ]);
  });

  test("unhighlight clears all highlights", () => {
    const editor = new Editor(container, "hello\nworld");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    editor.highlight([ 2, 1, 2, 5 ], "#0000ff");

    editor.unhighlight();

    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("highlights track document changes", () => {
    const editor = new Editor(container, "hello");
    editor.highlight([ 1, 2, 1, 4 ], "#ff0000");

    editor.view.dispatch({
      changes: { from: 0, to: 0, insert: "X" }
    });

    assert.deepStrictEqual(editor.highlights(), [
      { range: [ 1, 3, 1, 5 ], color: "#ff0000" }
    ]);
  });

  test("highlight throws RangeError for invalid line bounds", () => {
    const editor = new Editor(container, "hello\nworld");

    assert.throws(() => editor.highlight([ 0, 1, 1, 1 ], "#ff0000"), RangeError);
    assert.throws(() => editor.highlight([ 1, 1, 3, 1 ], "#ff0000"), RangeError);
    assert.throws(() => editor.highlight([ 2, 1, 1, 1 ], "#ff0000"), RangeError);
  });

  test("highlight throws RangeError for invalid column bounds", () => {
    const editor = new Editor(container, "hello\nworld");

    assert.throws(() => editor.highlight([ 1, 0, 1, 1 ], "#ff0000"), RangeError);
    assert.throws(() => editor.highlight([ 1, 7, 1, 1 ], "#ff0000"), RangeError);
    assert.throws(() => editor.highlight([ 1, 1, 1, -1 ], "#ff0000"), RangeError);
    assert.throws(() => editor.highlight([ 1, 1, 1, 6 ], "#ff0000"), RangeError);
    assert.throws(() => editor.highlight([ 1, 5, 1, 3 ], "#ff0000"), RangeError);
  });

  test("highlight throws RangeError for malformed ranges", () => {
    const editor = new Editor(container, "hello");

    assert.throws(() => editor.highlight([ 1, 1, 1 ], "#ff0000"), RangeError);
    assert.throws(() => editor.highlight([ 1, 1.5, 1, 2 ], "#ff0000"), RangeError);
  });
});
