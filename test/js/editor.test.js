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

  test("highlights returns empty array for empty editor", () => {
    const editor = new Editor(container);
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("highlight single word on single line", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [1, 1, 1, 5]);
    assert.strictEqual(result[0].color, "#ff0000");
  });

  test("highlight entire single line", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 11], "#00ff00");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [1, 1, 1, 11]);
    assert.strictEqual(result[0].color, "#00ff00");
  });

  test("highlight preserves color value", () => {
    const editor = new Editor(container, "some text");
    editor.highlight([1, 1, 1, 4], "#abcdef");
    const result = editor.highlights();
    assert.strictEqual(result[0].color, "#abcdef");
  });

  test("highlight span across multiple lines", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    editor.highlight([1, 1, 3, 6], "#0000ff");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [1, 1, 3, 6]);
    assert.strictEqual(result[0].color, "#0000ff");
  });

  test("highlight middle of a line", () => {
    const editor = new Editor(container, "hello world foo");
    editor.highlight([1, 7, 1, 11], "#123456");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [1, 7, 1, 11]);
  });

  test("highlight second line only", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    editor.highlight([2, 1, 2, 6], "#ff00ff");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [2, 1, 2, 6]);
    assert.strictEqual(result[0].color, "#ff00ff");
  });

  test("highlight last line", () => {
    const editor = new Editor(container, "aaa\nbbb\nccc");
    editor.highlight([3, 1, 3, 3], "#999999");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [3, 1, 3, 3]);
  });

  test("multiple highlights accumulate", () => {
    const editor = new Editor(container, "aaaa\nbbbb\ncccc");
    editor.highlight([1, 1, 1, 4], "#ff0000");
    editor.highlight([3, 1, 3, 4], "#00ff00");
    const result = editor.highlights();
    assert.strictEqual(result.length, 2);
    assert.deepStrictEqual(result[0].range, [1, 1, 1, 4]);
    assert.strictEqual(result[0].color, "#ff0000");
    assert.deepStrictEqual(result[1].range, [3, 1, 3, 4]);
    assert.strictEqual(result[1].color, "#00ff00");
  });

  test("multiple highlights with different colors", () => {
    const editor = new Editor(container, "alpha bravo charlie");
    editor.highlight([1, 1, 1, 5], "#111111");
    editor.highlight([1, 7, 1, 11], "#222222");
    editor.highlight([1, 13, 1, 19], "#333333");
    const result = editor.highlights();
    assert.strictEqual(result.length, 3);
    assert.strictEqual(result[0].color, "#111111");
    assert.strictEqual(result[1].color, "#222222");
    assert.strictEqual(result[2].color, "#333333");
  });

  test("unhighlight clears all highlights", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    assert.strictEqual(editor.highlights().length, 1);
    editor.unhighlight();
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("unhighlight on editor with no highlights", () => {
    const editor = new Editor(container, "hello");
    editor.unhighlight();
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("unhighlight clears multiple highlights", () => {
    const editor = new Editor(container, "aaa\nbbb\nccc");
    editor.highlight([1, 1, 1, 3], "#ff0000");
    editor.highlight([2, 1, 2, 3], "#00ff00");
    editor.highlight([3, 1, 3, 3], "#0000ff");
    assert.strictEqual(editor.highlights().length, 3);
    editor.unhighlight();
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("highlight after unhighlight works", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    editor.unhighlight();
    editor.highlight([1, 7, 1, 11], "#00ff00");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [1, 7, 1, 11]);
    assert.strictEqual(result[0].color, "#00ff00");
  });

  test("highlight with zero columnEnd", () => {
    const editor = new Editor(container, "hello\nworld");
    editor.highlight([1, 1, 2, 0], "#aabbcc");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [1, 1, 2, 0]);
  });

  test("highlight throws RangeError for lineStart below 1", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([0, 1, 1, 5], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for negative lineStart", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([-1, 1, 1, 5], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for lineStart beyond total lines", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([2, 1, 2, 1], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for lineEnd below 1", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([1, 1, 0, 5], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for lineEnd beyond total lines", () => {
    const editor = new Editor(container, "hello\nworld");
    assert.throws(() => {
      editor.highlight([1, 1, 3, 1], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for lineEnd less than lineStart", () => {
    const editor = new Editor(container, "hello\nworld");
    assert.throws(() => {
      editor.highlight([2, 1, 1, 5], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for columnStart below 1", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([1, 0, 1, 5], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for columnStart beyond line length", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([1, 7, 1, 5], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for negative columnEnd", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([1, 1, 1, -1], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for columnEnd beyond line length", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([1, 1, 1, 6], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError when start exceeds end on same line", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([1, 8, 1, 3], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for lineStart far beyond range", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([100, 1, 100, 1], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for columnStart far beyond range", () => {
    const editor = new Editor(container, "hi");
    assert.throws(() => {
      editor.highlight([1, 100, 1, 2], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for columnEnd far beyond range", () => {
    const editor = new Editor(container, "hi");
    assert.throws(() => {
      editor.highlight([1, 1, 1, 100], "#ff0000");
    }, RangeError);
  });

  test("highlight valid boundary: columnStart at line length + 1", () => {
    const editor = new Editor(container, "hi");
    editor.highlight([1, 3, 1, 2], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
  });

  test("highlight valid boundary: columnEnd at 0", () => {
    const editor = new Editor(container, "hello\nworld");
    editor.highlight([1, 1, 2, 0], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [1, 1, 2, 0]);
  });

  test("highlight valid boundary: last column of last line", () => {
    const editor = new Editor(container, "abc\ndef");
    editor.highlight([2, 1, 2, 3], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [2, 1, 2, 3]);
  });

  test("highlight single character", () => {
    const editor = new Editor(container, "hello");
    editor.highlight([1, 1, 1, 1], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [1, 1, 1, 1]);
  });

  test("highlights are sorted by position", () => {
    const editor = new Editor(container, "aaa bbb ccc");
    editor.highlight([1, 9, 1, 11], "#333333");
    editor.highlight([1, 1, 1, 3], "#111111");
    editor.highlight([1, 5, 1, 7], "#222222");
    const result = editor.highlights();
    assert.strictEqual(result.length, 3);
    assert.deepStrictEqual(result[0].range, [1, 1, 1, 3]);
    assert.deepStrictEqual(result[1].range, [1, 5, 1, 7]);
    assert.deepStrictEqual(result[2].range, [1, 9, 1, 11]);
  });

  test("highlights on multiline editor across all lines", () => {
    const content = "line 1\nline 2\nline 3\nline 4\nline 5";
    const editor = new Editor(container, content);
    editor.highlight([1, 1, 5, 6], "#aaaaaa");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [1, 1, 5, 6]);
  });

  test("setContent clears highlights implicitly via doc change mapping", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    editor.setContent("new content");
    const result = editor.highlights();
    assert.strictEqual(result.length, 0);
  });
});
