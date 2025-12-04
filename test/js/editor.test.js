import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body><div id=\"editor\"></div></body></html>");

// Additional stubs needed by CodeMirror
// Additional stubs needed by CodeMirror
// Additional stubs needed by CodeMirror
// Additional stubs needed by CodeMirror
// Additional stubs needed by CodeMirror
// Additional stubs needed by CodeMirror
// Additional stubs needed by CodeMirror
// Additional stubs needed by CodeMirror
// Additional stubs needed by CodeMirror
// Additional stubs needed by CodeMirror
// Additional stubs needed by CodeMirror
// Additional stubs needed by CodeMirror
// Additional stubs needed by CodeMirror
// Additional stubs needed by CodeMirror
// Additional stubs needed by CodeMirror
// Additional stubs needed by CodeMirror
// Additional stubs needed by CodeMirror
// Additional stubs needed by CodeMirror
// Additional stubs needed by CodeMirror
// Additional stubs needed by CodeMirror
// Additional stubs needed by CodeMirror
// Additional stubs needed by CodeMirror
// Additional stubs needed by CodeMirror
// Additional stubs needed by CodeMirror
// Additional stubs needed by CodeMirror
// Additional stubs needed by CodeMirror
// Additional stubs needed by CodeMirror
// Additional stubs needed by CodeMirror
// Additional stubs needed by CodeMirror
// Additional stubs needed by CodeMirror
// Additional stubs needed by CodeMirror
// Additional stubs needed by CodeMirror
// Additional stubs needed by CodeMirror
// Additional stubs needed by CodeMirror
// Additional stubs needed by CodeMirror
// Additional stubs needed by CodeMirror
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

  test("highlight adds highlight to editor", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    assert.strictEqual(editor.highlights().length, 1);
  });

  test("highlights returns array", () => {
    const editor = new Editor(container, "hello world");
    assert.ok(Array.isArray(editor.highlights()));
  });

  test("unhighlight clears highlights", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    editor.unhighlight();
    assert.strictEqual(editor.highlights().length, 0);
  });

  test("highlight stores range correctly", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    const highlights = editor.highlights();
    assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 5]);
  });

  test("highlight stores color correctly", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    const highlights = editor.highlights();
    assert.strictEqual(highlights[0].color, "#ff0000");
  });

  test("highlight works with different colors", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#00ff00");
    assert.strictEqual(editor.highlights()[0].color, "#00ff00");
  });

  test("highlight can span entire line", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 11], "#ff0000");
    assert.strictEqual(editor.highlights().length, 1);
  });

  test("highlight works on multiline content", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    editor.highlight([2, 1, 2, 6], "#ff0000");
    assert.strictEqual(editor.highlights().length, 1);
  });

  test("highlight can span multiple lines", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    editor.highlight([1, 1, 3, 6], "#ff0000");
    assert.strictEqual(editor.highlights().length, 1);
  });

  test("unhighlight after highlight returns empty", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    editor.unhighlight();
    assert.ok(Array.isArray(editor.highlights()));
  });

  test("highlight after unhighlight works", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    editor.unhighlight();
    editor.highlight([1, 7, 1, 11], "#0000ff");
    assert.strictEqual(editor.highlights().length, 1);
  });
});
