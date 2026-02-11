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
    const editor = new Editor(container, "hello world");
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("highlights returns empty array for empty editor", () => {
    const editor = new Editor(container);
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("highlight single line and verify with highlights", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [1, 1, 1, 5]);
    assert.strictEqual(result[0].color, "#ff0000");
  });

  test("highlight partial single line", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 3, 1, 7], "#00ff00");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [1, 3, 1, 7]);
    assert.strictEqual(result[0].color, "#00ff00");
  });

  test("highlight entire single line", () => {
    const editor = new Editor(container, "hello");
    editor.highlight([1, 1, 1, 5], "#0000ff");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [1, 1, 1, 5]);
    assert.strictEqual(result[0].color, "#0000ff");
  });

  test("highlight spanning multiple lines", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    editor.highlight([1, 1, 3, 6], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [1, 1, 3, 6]);
    assert.strictEqual(result[0].color, "#ff0000");
  });

  test("highlight spanning two lines", () => {
    const editor = new Editor(container, "aaa\nbbb\nccc");
    editor.highlight([1, 2, 2, 2], "#aabbcc");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [1, 2, 2, 2]);
    assert.strictEqual(result[0].color, "#aabbcc");
  });

  test("multiple highlights do not override each other", () => {
    const editor = new Editor(container, "hello world foo bar");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    editor.highlight([1, 7, 1, 11], "#00ff00");
    const result = editor.highlights();
    assert.strictEqual(result.length, 2);
    assert.deepStrictEqual(result[0].range, [1, 1, 1, 5]);
    assert.strictEqual(result[0].color, "#ff0000");
    assert.deepStrictEqual(result[1].range, [1, 7, 1, 11]);
    assert.strictEqual(result[1].color, "#00ff00");
  });

  test("multiple highlights on different lines", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    editor.highlight([1, 1, 1, 6], "#ff0000");
    editor.highlight([3, 1, 3, 6], "#00ff00");
    const result = editor.highlights();
    assert.strictEqual(result.length, 2);
    assert.deepStrictEqual(result[0].range, [1, 1, 1, 6]);
    assert.strictEqual(result[0].color, "#ff0000");
    assert.deepStrictEqual(result[1].range, [3, 1, 3, 6]);
    assert.strictEqual(result[1].color, "#00ff00");
  });

  test("three highlights accumulate correctly", () => {
    const editor = new Editor(container, "aaa\nbbb\nccc");
    editor.highlight([1, 1, 1, 3], "#111111");
    editor.highlight([2, 1, 2, 3], "#222222");
    editor.highlight([3, 1, 3, 3], "#333333");
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

  test("unhighlight clears multiple highlights", () => {
    const editor = new Editor(container, "hello world foo bar");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    editor.highlight([1, 7, 1, 11], "#00ff00");
    assert.strictEqual(editor.highlights().length, 2);
    editor.unhighlight();
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("unhighlight on empty editor is a no-op", () => {
    const editor = new Editor(container);
    editor.unhighlight();
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("unhighlight when no highlights exist is a no-op", () => {
    const editor = new Editor(container, "hello");
    editor.unhighlight();
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("highlight after unhighlight works", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    editor.unhighlight();
    editor.highlight([1, 1, 1, 5], "#00ff00");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].color, "#00ff00");
  });

  test("highlight preserves color string exactly", () => {
    const editor = new Editor(container, "hello");
    editor.highlight([1, 1, 1, 5], "#abcdef");
    assert.strictEqual(editor.highlights()[0].color, "#abcdef");
  });

  test("highlight with rgb color", () => {
    const editor = new Editor(container, "hello");
    editor.highlight([1, 1, 1, 5], "rgb(255, 0, 0)");
    assert.strictEqual(editor.highlights()[0].color, "rgb(255, 0, 0)");
  });

  test("highlight last character of a line", () => {
    const editor = new Editor(container, "abcde");
    editor.highlight([1, 5, 1, 5], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [1, 5, 1, 5]);
  });

  test("highlight first character of a line", () => {
    const editor = new Editor(container, "abcde");
    editor.highlight([1, 1, 1, 1], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [1, 1, 1, 1]);
  });

  test("highlight on second line of multiline content", () => {
    const editor = new Editor(container, "first\nsecond\nthird");
    editor.highlight([2, 1, 2, 6], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [2, 1, 2, 6]);
  });

  test("highlight on last line of multiline content", () => {
    const editor = new Editor(container, "first\nsecond\nthird");
    editor.highlight([3, 1, 3, 5], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [3, 1, 3, 5]);
  });

  test("highlight throws RangeError for lineStart less than 1", () => {
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

  test("highlight throws RangeError for lineEnd less than 1", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([1, 1, 0, 5], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for lineStart beyond document", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([2, 1, 2, 1], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for lineEnd beyond document", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([1, 1, 2, 1], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for lineStart greater than lineEnd", () => {
    const editor = new Editor(container, "line 1\nline 2");
    assert.throws(() => {
      editor.highlight([2, 1, 1, 5], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for columnStart less than 1", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([1, 0, 1, 5], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for negative columnStart", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([1, -1, 1, 5], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for columnEnd less than 0", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([1, 1, 1, -1], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for columnStart beyond line length", () => {
    const editor = new Editor(container, "hi");
    assert.throws(() => {
      editor.highlight([1, 4, 1, 4], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for columnEnd beyond line length", () => {
    const editor = new Editor(container, "hi");
    assert.throws(() => {
      editor.highlight([1, 1, 1, 3], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for columnStart > columnEnd on same line", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([1, 4, 1, 2], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for lineStart beyond multiline document", () => {
    const editor = new Editor(container, "a\nb\nc");
    assert.throws(() => {
      editor.highlight([4, 1, 4, 1], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for lineEnd beyond multiline document", () => {
    const editor = new Editor(container, "a\nb\nc");
    assert.throws(() => {
      editor.highlight([1, 1, 4, 1], "#ff0000");
    }, RangeError);
  });

  test("valid highlight does not throw for boundary values", () => {
    const editor = new Editor(container, "abc\ndef\nghi");
    assert.doesNotThrow(() => {
      editor.highlight([1, 1, 3, 3], "#ff0000");
    });
  });

  test("highlight columnEnd 0 does not throw", () => {
    const editor = new Editor(container, "abc\ndef");
    assert.doesNotThrow(() => {
      editor.highlight([1, 1, 2, 0], "#ff0000");
    });
  });

  test("RangeError does not add highlight to state", () => {
    const editor = new Editor(container, "hello");
    try {
      editor.highlight([0, 1, 1, 5], "#ff0000");
    } catch (e) {
      // expected
    }
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("valid highlight after failed RangeError still works", () => {
    const editor = new Editor(container, "hello");
    try {
      editor.highlight([0, 1, 1, 5], "#ff0000");
    } catch (e) {
      // expected
    }
    editor.highlight([1, 1, 1, 5], "#00ff00");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].color, "#00ff00");
  });

  test("highlights returns correct structure", () => {
    const editor = new Editor(container, "test");
    editor.highlight([1, 1, 1, 4], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.ok(Array.isArray(result[0].range));
    assert.strictEqual(result[0].range.length, 4);
    assert.strictEqual(typeof result[0].color, "string");
  });

  test("highlights returns independent array copies", () => {
    const editor = new Editor(container, "test");
    editor.highlight([1, 1, 1, 4], "#ff0000");
    const result1 = editor.highlights();
    const result2 = editor.highlights();
    assert.notStrictEqual(result1, result2);
    assert.deepStrictEqual(result1, result2);
  });
});
