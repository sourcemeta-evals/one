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
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 5 ]);
    assert.strictEqual(result[0].color, "#ff0000");
  });

  test("highlight the entire single line", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 11 ], "#00ff00");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 11 ]);
    assert.strictEqual(result[0].color, "#00ff00");
  });

  test("highlight a portion in the middle of a line", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 3, 1, 8 ], "#0000ff");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 3, 1, 8 ]);
    assert.strictEqual(result[0].color, "#0000ff");
  });

  test("highlight spanning multiple lines", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    editor.highlight([ 1, 1, 2, 6 ], "#ff00ff");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 2, 6 ]);
    assert.strictEqual(result[0].color, "#ff00ff");
  });

  test("highlight spanning all three lines", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    editor.highlight([ 1, 1, 3, 6 ], "#abcdef");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 3, 6 ]);
    assert.strictEqual(result[0].color, "#abcdef");
  });

  test("multiple non-overlapping highlights", () => {
    const editor = new Editor(container, "hello world foo bar");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    editor.highlight([ 1, 7, 1, 11 ], "#00ff00");
    const result = editor.highlights();
    assert.strictEqual(result.length, 2);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 5 ]);
    assert.strictEqual(result[0].color, "#ff0000");
    assert.deepStrictEqual(result[1].range, [ 1, 7, 1, 11 ]);
    assert.strictEqual(result[1].color, "#00ff00");
  });

  test("multiple highlights on different lines", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    editor.highlight([ 1, 1, 1, 6 ], "#ff0000");
    editor.highlight([ 3, 1, 3, 6 ], "#0000ff");
    const result = editor.highlights();
    assert.strictEqual(result.length, 2);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 6 ]);
    assert.strictEqual(result[0].color, "#ff0000");
    assert.deepStrictEqual(result[1].range, [ 3, 1, 3, 6 ]);
    assert.strictEqual(result[1].color, "#0000ff");
  });

  test("three highlights on three different lines", () => {
    const editor = new Editor(container, "aaa\nbbb\nccc");
    editor.highlight([ 1, 1, 1, 3 ], "#111111");
    editor.highlight([ 2, 1, 2, 3 ], "#222222");
    editor.highlight([ 3, 1, 3, 3 ], "#333333");
    const result = editor.highlights();
    assert.strictEqual(result.length, 3);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 3 ]);
    assert.strictEqual(result[0].color, "#111111");
    assert.deepStrictEqual(result[1].range, [ 2, 1, 2, 3 ]);
    assert.strictEqual(result[1].color, "#222222");
    assert.deepStrictEqual(result[2].range, [ 3, 1, 3, 3 ]);
    assert.strictEqual(result[2].color, "#333333");
  });

  test("unhighlight removes all highlights", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    assert.strictEqual(editor.highlights().length, 1);
    editor.unhighlight();
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("unhighlight removes multiple highlights", () => {
    const editor = new Editor(container, "hello world foo bar");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    editor.highlight([ 1, 7, 1, 11 ], "#00ff00");
    assert.strictEqual(editor.highlights().length, 2);
    editor.unhighlight();
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("unhighlight on empty highlights is a no-op", () => {
    const editor = new Editor(container, "hello world");
    editor.unhighlight();
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("highlight after unhighlight works", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    editor.unhighlight();
    editor.highlight([ 1, 7, 1, 11 ], "#00ff00");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 7, 1, 11 ]);
    assert.strictEqual(result[0].color, "#00ff00");
  });

  test("highlight preserves color exactly", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 5 ], "#abcdef");
    assert.strictEqual(editor.highlights()[0].color, "#abcdef");
  });

  test("highlight with named CSS color", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 5 ], "red");
    assert.strictEqual(editor.highlights()[0].color, "red");
  });

  test("highlight with rgb color", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 5 ], "rgb(255, 0, 0)");
    assert.strictEqual(editor.highlights()[0].color, "rgb(255, 0, 0)");
  });

  test("highlight single character", () => {
    const editor = new Editor(container, "hello");
    editor.highlight([ 1, 1, 1, 1 ], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 1 ]);
  });

  test("highlight last character on a line", () => {
    const editor = new Editor(container, "hello");
    editor.highlight([ 1, 5, 1, 5 ], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 5, 1, 5 ]);
  });

  test("highlight on second line only", () => {
    const editor = new Editor(container, "first\nsecond\nthird");
    editor.highlight([ 2, 1, 2, 6 ], "#aabbcc");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 2, 1, 2, 6 ]);
    assert.strictEqual(result[0].color, "#aabbcc");
  });

  test("highlight on last line only", () => {
    const editor = new Editor(container, "first\nsecond\nthird");
    editor.highlight([ 3, 1, 3, 5 ], "#ddeeff");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 3, 1, 3, 5 ]);
    assert.strictEqual(result[0].color, "#ddeeff");
  });

  test("highlights returns correct structure with range and color keys", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.ok(Array.isArray(result[0].range));
    assert.strictEqual(result[0].range.length, 4);
    assert.strictEqual(typeof result[0].color, "string");
  });

  test("highlights range elements are all numbers", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    const [ lineStart, columnStart, lineEnd, columnEnd ] =
      editor.highlights()[0].range;
    assert.strictEqual(typeof lineStart, "number");
    assert.strictEqual(typeof columnStart, "number");
    assert.strictEqual(typeof lineEnd, "number");
    assert.strictEqual(typeof columnEnd, "number");
  });

  test("highlight with columnEnd of 0 on an empty portion", () => {
    const editor = new Editor(container, "hello\n\nworld");
    // Line 2 is empty, columnEnd 0 is valid for an empty line
    editor.highlight([ 1, 1, 2, 0 ], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 2, 0 ]);
  });

  test("highlight throws RangeError for lineStart less than 1", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([ 0, 1, 1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for negative lineStart", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([ -1, 1, 1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for lineStart beyond document", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([ 2, 1, 2, 5 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for lineEnd less than 1", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([ 1, 1, 0, 5 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for negative lineEnd", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([ 1, 1, -1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for lineEnd beyond document", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([ 1, 1, 2, 5 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for lineEnd beyond document with multiline", () => {
    const editor = new Editor(container, "line 1\nline 2");
    assert.throws(() => {
      editor.highlight([ 1, 1, 3, 5 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for lineEnd less than lineStart", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    assert.throws(() => {
      editor.highlight([ 2, 1, 1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for columnStart less than 1", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([ 1, 0, 1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for negative columnStart", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([ 1, -1, 1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for columnStart beyond line length", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 7, 1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for negative columnEnd", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([ 1, 1, 1, -1 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for columnEnd beyond line length", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 1, 1, 6 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for columnEnd less than columnStart on same line", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([ 1, 5, 1, 2 ], "#ff0000");
    }, RangeError);
  });

  test("highlight does not throw for valid boundary values", () => {
    const editor = new Editor(container, "hello");
    assert.doesNotThrow(() => {
      editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    });
  });

  test("highlight does not throw for last valid line", () => {
    const editor = new Editor(container, "first\nsecond\nthird");
    assert.doesNotThrow(() => {
      editor.highlight([ 3, 1, 3, 5 ], "#ff0000");
    });
  });

  test("highlight does not throw when lineStart equals lineEnd", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    assert.doesNotThrow(() => {
      editor.highlight([ 2, 1, 2, 6 ], "#ff0000");
    });
  });

  test("highlight RangeError message includes lineStart value", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([ 0, 1, 1, 5 ], "#ff0000");
    }, (error) => {
      assert.ok(error instanceof RangeError);
      assert.ok(error.message.includes("0"));
      return true;
    });
  });

  test("highlight RangeError message includes lineEnd value", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([ 1, 1, 5, 1 ], "#ff0000");
    }, (error) => {
      assert.ok(error instanceof RangeError);
      assert.ok(error.message.includes("5"));
      return true;
    });
  });

  test("highlight RangeError message includes columnStart value", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 0, 1, 5 ], "#ff0000");
    }, (error) => {
      assert.ok(error instanceof RangeError);
      assert.ok(error.message.includes("0"));
      return true;
    });
  });

  test("highlight RangeError message includes columnEnd value", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 1, 1, 6 ], "#ff0000");
    }, (error) => {
      assert.ok(error instanceof RangeError);
      assert.ok(error.message.includes("6"));
      return true;
    });
  });

  test("highlight does not affect existing highlights", () => {
    const editor = new Editor(container, "hello world foo bar");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    editor.highlight([ 1, 13, 1, 15 ], "#00ff00");
    const result = editor.highlights();
    assert.strictEqual(result.length, 2);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 5 ]);
    assert.strictEqual(result[0].color, "#ff0000");
    assert.deepStrictEqual(result[1].range, [ 1, 13, 1, 15 ]);
    assert.strictEqual(result[1].color, "#00ff00");
  });

  test("highlights returns new array each time", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    const result1 = editor.highlights();
    const result2 = editor.highlights();
    assert.notStrictEqual(result1, result2);
    assert.deepStrictEqual(result1, result2);
  });

  test("highlight with very large lineStart throws RangeError", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([ 999, 1, 999, 5 ], "#ff0000");
    }, RangeError);
  });

  test("highlight with very large lineEnd throws RangeError", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([ 1, 1, 999, 5 ], "#ff0000");
    }, RangeError);
  });

  test("highlight with very large columnStart throws RangeError", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 999, 1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("highlight with very large columnEnd throws RangeError", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 1, 1, 999 ], "#ff0000");
    }, RangeError);
  });

  test("highlight columnStart at line length + 1 is valid", () => {
    const editor = new Editor(container, "hello");
    // columnStart = 6 on a 5-char line means just past the end
    assert.doesNotThrow(() => {
      editor.highlight([ 1, 6, 1, 5 ], "#ff0000");
    });
  });

  test("highlight entire content across all lines", () => {
    const editor = new Editor(container, "abc\ndef\nghi");
    editor.highlight([ 1, 1, 3, 3 ], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 3, 3 ]);
  });

  test("unhighlight then highlight then unhighlight", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    editor.unhighlight();
    assert.deepStrictEqual(editor.highlights(), []);
    editor.highlight([ 1, 1, 1, 3 ], "#00ff00");
    assert.strictEqual(editor.highlights().length, 1);
    editor.unhighlight();
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("highlight with different colors on adjacent ranges", () => {
    const editor = new Editor(container, "abcdefghij");
    editor.highlight([ 1, 1, 1, 3 ], "#ff0000");
    editor.highlight([ 1, 4, 1, 6 ], "#00ff00");
    editor.highlight([ 1, 7, 1, 10 ], "#0000ff");
    const result = editor.highlights();
    assert.strictEqual(result.length, 3);
    assert.strictEqual(result[0].color, "#ff0000");
    assert.strictEqual(result[1].color, "#00ff00");
    assert.strictEqual(result[2].color, "#0000ff");
  });

  test("highlight on multiline then unhighlight and re-highlight", () => {
    const editor = new Editor(container, "aaa\nbbb\nccc");
    editor.highlight([ 1, 1, 3, 3 ], "#ff0000");
    assert.strictEqual(editor.highlights().length, 1);
    editor.unhighlight();
    assert.strictEqual(editor.highlights().length, 0);
    editor.highlight([ 2, 1, 2, 3 ], "#00ff00");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 2, 1, 2, 3 ]);
    assert.strictEqual(result[0].color, "#00ff00");
  });
});
