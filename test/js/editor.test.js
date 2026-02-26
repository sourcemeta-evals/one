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
});

describe("Editor highlights", () => {
  const container = document.getElementById("editor");

  beforeEach(() => {
    container.innerHTML = "";
  });

  test("highlights returns empty array by default", () => {
    const editor = new Editor(container, "hello world");
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("highlights returns empty array for empty document", () => {
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

  test("highlight preserves color value", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#00ff00");
    const result = editor.highlights();
    assert.strictEqual(result[0].color, "#00ff00");
  });

  test("highlight with rgb color", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "rgb(255, 0, 0)");
    const result = editor.highlights();
    assert.strictEqual(result[0].color, "rgb(255, 0, 0)");
  });

  test("highlight entire single line", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 11], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [1, 1, 1, 11]);
  });

  test("highlight middle of a line", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 3, 1, 8], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [1, 3, 1, 8]);
  });

  test("highlight last character of a line", () => {
    const editor = new Editor(container, "hello");
    editor.highlight([1, 5, 1, 5], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [1, 5, 1, 5]);
  });

  test("highlight spanning multiple lines", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    editor.highlight([1, 1, 2, 6], "#0000ff");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [1, 1, 2, 6]);
    assert.strictEqual(result[0].color, "#0000ff");
  });

  test("highlight spanning all lines", () => {
    const editor = new Editor(container, "aaa\nbbb\nccc");
    editor.highlight([1, 1, 3, 3], "#abcdef");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [1, 1, 3, 3]);
  });

  test("highlight on second line only", () => {
    const editor = new Editor(container, "first\nsecond\nthird");
    editor.highlight([2, 1, 2, 6], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [2, 1, 2, 6]);
  });

  test("highlight on last line only", () => {
    const editor = new Editor(container, "first\nsecond\nthird");
    editor.highlight([3, 1, 3, 5], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [3, 1, 3, 5]);
  });

  test("multiple non-overlapping highlights", () => {
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
    const editor = new Editor(container, "aaa\nbbb\nccc");
    editor.highlight([1, 1, 1, 3], "#ff0000");
    editor.highlight([3, 1, 3, 3], "#0000ff");
    const result = editor.highlights();
    assert.strictEqual(result.length, 2);
    assert.deepStrictEqual(result[0].range, [1, 1, 1, 3]);
    assert.strictEqual(result[0].color, "#ff0000");
    assert.deepStrictEqual(result[1].range, [3, 1, 3, 3]);
    assert.strictEqual(result[1].color, "#0000ff");
  });

  test("multiple highlights with different colors", () => {
    const editor = new Editor(container, "abcdefghij");
    editor.highlight([1, 1, 1, 3], "#111111");
    editor.highlight([1, 5, 1, 7], "#222222");
    editor.highlight([1, 9, 1, 10], "#333333");
    const result = editor.highlights();
    assert.strictEqual(result.length, 3);
    assert.strictEqual(result[0].color, "#111111");
    assert.strictEqual(result[1].color, "#222222");
    assert.strictEqual(result[2].color, "#333333");
  });

  test("unhighlight removes all highlights", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    assert.strictEqual(editor.highlights().length, 1);
    editor.unhighlight();
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("unhighlight removes multiple highlights", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    editor.highlight([1, 7, 1, 11], "#00ff00");
    assert.strictEqual(editor.highlights().length, 2);
    editor.unhighlight();
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("unhighlight on editor with no highlights is a no-op", () => {
    const editor = new Editor(container, "hello world");
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
    editor.highlight([1, 1, 2, 0], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [1, 1, 2, 0]);
  });

  test("highlight single character", () => {
    const editor = new Editor(container, "abcdef");
    editor.highlight([1, 3, 1, 3], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [1, 3, 1, 3]);
  });

  test("highlight first character only", () => {
    const editor = new Editor(container, "abcdef");
    editor.highlight([1, 1, 1, 1], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [1, 1, 1, 1]);
  });

  test("highlights returns correct data after setContent", () => {
    const editor = new Editor(container, "old content");
    editor.highlight([1, 1, 1, 3], "#ff0000");
    editor.setContent("new content here");
    editor.unhighlight();
    editor.highlight([1, 1, 1, 3], "#00ff00");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].color, "#00ff00");
  });
});

describe("Editor highlight range validation", () => {
  const container = document.getElementById("editor");

  beforeEach(() => {
    container.innerHTML = "";
  });

  test("throws RangeError for lineStart of 0", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([0, 1, 1, 5], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for negative lineStart", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([-1, 1, 1, 5], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for lineStart beyond document", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([2, 1, 2, 1], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for lineEnd of 0", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([1, 1, 0, 5], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for negative lineEnd", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([1, 1, -1, 5], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for lineEnd beyond document", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([1, 1, 2, 5], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for lineEnd beyond document with multiline", () => {
    const editor = new Editor(container, "aaa\nbbb\nccc");
    assert.throws(() => {
      editor.highlight([1, 1, 4, 1], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError when lineStart greater than lineEnd", () => {
    const editor = new Editor(container, "aaa\nbbb\nccc");
    assert.throws(() => {
      editor.highlight([3, 1, 1, 3], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for columnStart of 0", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([1, 0, 1, 5], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for negative columnStart", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([1, -1, 1, 5], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for columnStart beyond line length", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([1, 7, 1, 5], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for negative columnEnd", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([1, 1, 1, -1], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for columnEnd beyond line length", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([1, 1, 1, 6], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for columnEnd beyond second line length", () => {
    const editor = new Editor(container, "hello\nhi");
    assert.throws(() => {
      editor.highlight([1, 1, 2, 3], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError when columnStart exceeds columnEnd on same line", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([1, 6, 1, 3], "#ff0000");
    }, RangeError);
  });

  test("does not throw for valid single-line range", () => {
    const editor = new Editor(container, "hello world");
    assert.doesNotThrow(() => {
      editor.highlight([1, 1, 1, 5], "#ff0000");
    });
  });

  test("does not throw for valid multi-line range", () => {
    const editor = new Editor(container, "aaa\nbbb\nccc");
    assert.doesNotThrow(() => {
      editor.highlight([1, 1, 3, 3], "#ff0000");
    });
  });

  test("does not throw when columnStart equals columnEnd on same line", () => {
    const editor = new Editor(container, "hello");
    assert.doesNotThrow(() => {
      editor.highlight([1, 3, 1, 3], "#ff0000");
    });
  });

  test("does not throw for columnEnd of 0 on a different line", () => {
    const editor = new Editor(container, "hello\nworld");
    assert.doesNotThrow(() => {
      editor.highlight([1, 1, 2, 0], "#ff0000");
    });
  });

  test("does not throw for columnStart at end of line", () => {
    const editor = new Editor(container, "hello\nworld");
    assert.doesNotThrow(() => {
      editor.highlight([1, 6, 2, 5], "#ff0000");
    });
  });

  test("throws RangeError for lineStart beyond single-line document", () => {
    const editor = new Editor(container, "a");
    assert.throws(() => {
      editor.highlight([2, 1, 2, 1], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for columnStart beyond single-char line", () => {
    const editor = new Editor(container, "a");
    assert.throws(() => {
      editor.highlight([1, 3, 1, 1], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for columnEnd beyond single-char line", () => {
    const editor = new Editor(container, "a");
    assert.throws(() => {
      editor.highlight([1, 1, 1, 2], "#ff0000");
    }, RangeError);
  });

  test("valid highlight at boundary of line length", () => {
    const editor = new Editor(container, "abcde");
    assert.doesNotThrow(() => {
      editor.highlight([1, 1, 1, 5], "#ff0000");
    });
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [1, 1, 1, 5]);
  });

  test("RangeError message includes lineStart info", () => {
    const editor = new Editor(container, "hello");
    try {
      editor.highlight([5, 1, 5, 1], "#ff0000");
      assert.fail("Expected RangeError");
    } catch (error) {
      assert.ok(error instanceof RangeError);
      assert.ok(error.message.includes("lineStart"));
    }
  });

  test("RangeError message includes lineEnd info", () => {
    const editor = new Editor(container, "hello");
    try {
      editor.highlight([1, 1, 5, 1], "#ff0000");
      assert.fail("Expected RangeError");
    } catch (error) {
      assert.ok(error instanceof RangeError);
      assert.ok(error.message.includes("lineEnd"));
    }
  });

  test("RangeError message includes columnStart info", () => {
    const editor = new Editor(container, "hello");
    try {
      editor.highlight([1, 0, 1, 5], "#ff0000");
      assert.fail("Expected RangeError");
    } catch (error) {
      assert.ok(error instanceof RangeError);
      assert.ok(error.message.includes("columnStart"));
    }
  });

  test("RangeError message includes columnEnd info", () => {
    const editor = new Editor(container, "hello");
    try {
      editor.highlight([1, 1, 1, 99], "#ff0000");
      assert.fail("Expected RangeError");
    } catch (error) {
      assert.ok(error instanceof RangeError);
      assert.ok(error.message.includes("columnEnd"));
    }
  });
});
