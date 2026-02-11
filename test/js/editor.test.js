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

  test("highlight a single word on a single line", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [1, 1, 1, 5]);
    assert.strictEqual(result[0].color, "#ff0000");
  });

  test("highlight the entire single line", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 11], "#00ff00");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [1, 1, 1, 11]);
    assert.strictEqual(result[0].color, "#00ff00");
  });

  test("highlight a portion in the middle of a line", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 3, 1, 8], "#0000ff");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [1, 3, 1, 8]);
    assert.strictEqual(result[0].color, "#0000ff");
  });

  test("highlight spanning multiple lines", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    editor.highlight([1, 1, 3, 6], "#abcdef");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [1, 1, 3, 6]);
    assert.strictEqual(result[0].color, "#abcdef");
  });

  test("highlight spanning two lines", () => {
    const editor = new Editor(container, "first\nsecond\nthird");
    editor.highlight([1, 2, 2, 4], "#112233");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [1, 2, 2, 4]);
    assert.strictEqual(result[0].color, "#112233");
  });

  test("multiple highlights are returned in order", () => {
    const editor = new Editor(container, "aaaa\nbbbb\ncccc");
    editor.highlight([1, 1, 1, 2], "#ff0000");
    editor.highlight([2, 1, 2, 2], "#00ff00");
    editor.highlight([3, 1, 3, 2], "#0000ff");
    const result = editor.highlights();
    assert.strictEqual(result.length, 3);
    assert.deepStrictEqual(result[0].range, [1, 1, 1, 2]);
    assert.strictEqual(result[0].color, "#ff0000");
    assert.deepStrictEqual(result[1].range, [2, 1, 2, 2]);
    assert.strictEqual(result[1].color, "#00ff00");
    assert.deepStrictEqual(result[2].range, [3, 1, 3, 2]);
    assert.strictEqual(result[2].color, "#0000ff");
  });

  test("multiple highlights on the same line", () => {
    const editor = new Editor(container, "hello world foo");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    editor.highlight([1, 7, 1, 11], "#00ff00");
    const result = editor.highlights();
    assert.strictEqual(result.length, 2);
    assert.deepStrictEqual(result[0].range, [1, 1, 1, 5]);
    assert.strictEqual(result[0].color, "#ff0000");
    assert.deepStrictEqual(result[1].range, [1, 7, 1, 11]);
    assert.strictEqual(result[1].color, "#00ff00");
  });

  test("unhighlight clears all highlights", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    assert.strictEqual(editor.highlights().length, 1);
    editor.unhighlight();
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("unhighlight clears multiple highlights", () => {
    const editor = new Editor(container, "aaaa\nbbbb");
    editor.highlight([1, 1, 1, 2], "#ff0000");
    editor.highlight([2, 1, 2, 2], "#00ff00");
    assert.strictEqual(editor.highlights().length, 2);
    editor.unhighlight();
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("unhighlight on editor with no highlights is a no-op", () => {
    const editor = new Editor(container, "hello");
    editor.unhighlight();
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("highlight after unhighlight works correctly", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    editor.unhighlight();
    editor.highlight([1, 7, 1, 11], "#00ff00");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [1, 7, 1, 11]);
    assert.strictEqual(result[0].color, "#00ff00");
  });

  test("highlight preserves color string exactly", () => {
    const editor = new Editor(container, "test content");
    editor.highlight([1, 1, 1, 4], "#aAbBcC");
    const result = editor.highlights();
    assert.strictEqual(result[0].color, "#aAbBcC");
  });

  test("highlight with different color formats", () => {
    const editor = new Editor(container, "test content here");
    editor.highlight([1, 1, 1, 4], "red");
    const result = editor.highlights();
    assert.strictEqual(result[0].color, "red");
  });

  test("highlight single character", () => {
    const editor = new Editor(container, "abcdef");
    editor.highlight([1, 3, 1, 3], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [1, 3, 1, 3]);
  });

  test("highlight last line of multiline content", () => {
    const editor = new Editor(container, "first\nsecond\nthird");
    editor.highlight([3, 1, 3, 5], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [3, 1, 3, 5]);
  });

  test("highlight with setContent updates correctly", () => {
    const editor = new Editor(container, "old content");
    editor.highlight([1, 1, 1, 3], "#ff0000");
    editor.setContent("new content here");
    assert.strictEqual(editor.content(), "new content here");
  });

  test("highlight throws RangeError for lineStart less than 1", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([0, 1, 1, 5], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for lineStart greater than total lines", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([2, 1, 2, 5], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for lineEnd less than 1", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([1, 1, 0, 5], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for lineEnd greater than total lines", () => {
    const editor = new Editor(container, "hello\nworld");
    assert.throws(() => {
      editor.highlight([1, 1, 3, 5], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for lineEnd less than lineStart", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    assert.throws(() => {
      editor.highlight([3, 1, 1, 5], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for columnStart less than 1", () => {
    const editor = new Editor(container, "hello world");
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

  test("highlight throws RangeError for columnEnd beyond line length", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([1, 1, 1, 99], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for negative columnEnd", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([1, 1, 1, -1], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError when columnStart exceeds columnEnd on same line", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([1, 8, 1, 3], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for lineStart of negative value", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([-1, 1, 1, 5], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for lineEnd of negative value", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([1, 1, -1, 5], "#ff0000");
    }, RangeError);
  });

  test("highlight does not throw for valid edge case at line boundary", () => {
    const editor = new Editor(container, "abcde\nfghij");
    assert.doesNotThrow(() => {
      editor.highlight([1, 1, 2, 5], "#ff0000");
    });
  });

  test("highlight does not throw for columnEnd of zero", () => {
    const editor = new Editor(container, "abc\ndef");
    assert.doesNotThrow(() => {
      editor.highlight([1, 1, 2, 0], "#ff0000");
    });
  });

  test("highlights returns correct color from RangeError-free highlight", () => {
    const editor = new Editor(container, "abcdef\nghijkl");
    editor.highlight([1, 2, 2, 3], "#facade");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].color, "#facade");
    assert.deepStrictEqual(result[0].range, [1, 2, 2, 3]);
  });

  test("highlights result has correct shape", () => {
    const editor = new Editor(container, "content");
    editor.highlight([1, 1, 1, 7], "#123456");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.ok(Array.isArray(result[0].range));
    assert.strictEqual(result[0].range.length, 4);
    assert.strictEqual(typeof result[0].color, "string");
  });

  test("RangeError message includes lineStart value", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([5, 1, 5, 3], "#ff0000");
    }, (error) => {
      assert.ok(error instanceof RangeError);
      assert.ok(error.message.includes("5"));
      return true;
    });
  });

  test("RangeError message includes lineEnd value", () => {
    const editor = new Editor(container, "hello\nworld");
    assert.throws(() => {
      editor.highlight([1, 1, 10, 3], "#ff0000");
    }, (error) => {
      assert.ok(error instanceof RangeError);
      assert.ok(error.message.includes("10"));
      return true;
    });
  });

  test("RangeError message includes columnStart value", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([1, 99, 1, 3], "#ff0000");
    }, (error) => {
      assert.ok(error instanceof RangeError);
      assert.ok(error.message.includes("99"));
      return true;
    });
  });

  test("RangeError message includes columnEnd value", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([1, 1, 1, 50], "#ff0000");
    }, (error) => {
      assert.ok(error instanceof RangeError);
      assert.ok(error.message.includes("50"));
      return true;
    });
  });
});
