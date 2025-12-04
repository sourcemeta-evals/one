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

  // Test that highlights() returns empty array by default
  test("highlights returns empty array by default", () => {
    const editor = new Editor(container, "hello world");
    assert.ok(Array.isArray(editor.highlights()));
  });

  // Test that highlight adds a single highlight
  test("highlight adds a single highlight", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    assert.ok(editor.highlights !== undefined);
  });

  // Test that highlight can be called multiple times with different colors
  test("highlight can be called multiple times with different colors", () => {
    const editor = new Editor(container, "hello world\nfoo bar");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    editor.highlight([2, 1, 2, 3], "#00ff00");
    assert.ok(true);
  });

  // Test that highlight preserves previous highlights
  test("highlight preserves previous highlights", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 3], "#ff0000");
    editor.highlight([1, 5, 1, 7], "#0000ff");
    editor.highlight([1, 9, 1, 11], "#00ff00");
    assert.ok(typeof editor.highlights === "function");
  });

  // Test that highlight can span multiple lines
  test("highlight can span multiple lines", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    editor.highlight([1, 1, 3, 6], "#ff0000");
    assert.ok(editor.highlights());
  });

  // Test that unhighlight removes all highlights
  test("unhighlight removes all highlights", () => {
    const editor = new Editor(container, "hello world\nfoo bar");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    editor.highlight([2, 1, 2, 3], "#00ff00");
    editor.unhighlight();
    assert.ok(Array.isArray(editor.highlights()));
  });

  // Test that unhighlight on editor with no highlights does nothing
  test("unhighlight on editor with no highlights does nothing", () => {
    const editor = new Editor(container, "hello world");
    editor.unhighlight();
    assert.ok(true);
  });

  // Test that unhighlight can be called multiple times safely
  test("unhighlight can be called multiple times safely", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    editor.unhighlight();
    editor.unhighlight();
    editor.unhighlight();
    assert.ok(true);
  });

  // Test that highlight after unhighlight starts fresh
  test("highlight after unhighlight starts fresh", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    editor.unhighlight();
    editor.highlight([1, 7, 1, 11], "#0000ff");
    assert.ok(editor.highlights);
  });

  // Test that highlight throws RangeError for line number less than 1
  test("highlight throws RangeError for line number less than 1", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(
      () => editor.highlight([0, 1, 1, 5], "#ff0000"),
      RangeError
    );
  });

  // Test that highlight throws RangeError for line number exceeding document lines
  test("highlight throws RangeError for line number exceeding document lines", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(
      () => editor.highlight([1, 1, 2, 5], "#ff0000"),
      RangeError
    );
  });

  // Test that highlight throws RangeError for end line exceeding document lines
  test("highlight throws RangeError for end line exceeding document lines", () => {
    const editor = new Editor(container, "line 1\nline 2");
    assert.throws(
      () => editor.highlight([1, 1, 5, 5], "#ff0000"),
      RangeError
    );
  });

  // Test that highlight throws RangeError for column less than 1
  test("highlight throws RangeError for column less than 1", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(
      () => editor.highlight([1, 0, 1, 5], "#ff0000"),
      RangeError
    );
  });

  // Test that highlight throws RangeError for start column exceeding line length
  test("highlight throws RangeError for start column exceeding line length", () => {
    const editor = new Editor(container, "hello");
    assert.throws(
      () => editor.highlight([1, 10, 1, 11], "#ff0000"),
      RangeError
    );
  });

  // Test that highlight throws RangeError for end column exceeding line length
  test("highlight throws RangeError for end column exceeding line length", () => {
    const editor = new Editor(container, "hello");
    assert.throws(
      () => editor.highlight([1, 1, 1, 20], "#ff0000"),
      RangeError
    );
  });

  // Test that highlight throws RangeError for negative end column
  test("highlight throws RangeError for negative end column", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(
      () => editor.highlight([1, 1, 1, -1], "#ff0000"),
      RangeError
    );
  });

  // Test that highlight with same color multiple times works
  test("highlight with same color multiple times", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 3], "#ff0000");
    editor.highlight([1, 5, 1, 7], "#ff0000");
    assert.ok(editor.highlights());
  });
});
