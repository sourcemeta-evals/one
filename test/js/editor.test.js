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

  describe("highlights", () => {
    test("returns empty array when no highlights exist", () => {
      const editor = new Editor(container, "hello world");
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("returns single highlight on a single line", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 5 ]);
      assert.strictEqual(result[0].color, "#ff0000");
    });

    test("returns highlight spanning multiple lines", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([ 1, 1, 2, 6 ], "#00ff00");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0].range, [ 1, 1, 2, 6 ]);
      assert.strictEqual(result[0].color, "#00ff00");
    });

    test("returns multiple non-overlapping highlights", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
      editor.highlight([ 1, 7, 1, 11 ], "#0000ff");
      const result = editor.highlights();
      assert.strictEqual(result.length, 2);
      assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 5 ]);
      assert.strictEqual(result[0].color, "#ff0000");
      assert.deepStrictEqual(result[1].range, [ 1, 7, 1, 11 ]);
      assert.strictEqual(result[1].color, "#0000ff");
    });

    test("returns highlights on different lines", () => {
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

    test("returns empty array after unhighlight", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
      editor.unhighlight();
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("unhighlight clears all highlights", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([ 1, 1, 1, 3 ], "#ff0000");
      editor.highlight([ 1, 5, 1, 7 ], "#00ff00");
      assert.strictEqual(editor.highlights().length, 2);
      editor.unhighlight();
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("preserves color in highlight result", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([ 1, 1, 1, 5 ], "#abcdef");
      const result = editor.highlights();
      assert.strictEqual(result[0].color, "#abcdef");
    });

    test("highlight at start of content", () => {
      const editor = new Editor(container, "abcdef");
      editor.highlight([ 1, 1, 1, 1 ], "#111111");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 1 ]);
    });

    test("highlight at end of line", () => {
      const editor = new Editor(container, "abcdef");
      editor.highlight([ 1, 6, 1, 6 ], "#222222");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0].range, [ 1, 6, 1, 6 ]);
    });

    test("highlight entire single line", () => {
      const editor = new Editor(container, "abcdef");
      editor.highlight([ 1, 1, 1, 6 ], "#333333");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 6 ]);
      assert.strictEqual(result[0].color, "#333333");
    });

    test("highlight entire multiline content", () => {
      const editor = new Editor(container, "abc\ndef\nghi");
      editor.highlight([ 1, 1, 3, 3 ], "#444444");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0].range, [ 1, 1, 3, 3 ]);
    });

    test("highlight with middle column range", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([ 1, 3, 1, 8 ], "#555555");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0].range, [ 1, 3, 1, 8 ]);
    });

    test("highlight on second line only", () => {
      const editor = new Editor(container, "first\nsecond\nthird");
      editor.highlight([ 2, 1, 2, 6 ], "#666666");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0].range, [ 2, 1, 2, 6 ]);
    });

    test("highlight on last line only", () => {
      const editor = new Editor(container, "first\nsecond\nthird");
      editor.highlight([ 3, 1, 3, 5 ], "#777777");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0].range, [ 3, 1, 3, 5 ]);
    });

    test("three highlights on separate lines", () => {
      const editor = new Editor(container, "aaa\nbbb\nccc");
      editor.highlight([ 1, 1, 1, 3 ], "#ff0000");
      editor.highlight([ 2, 1, 2, 3 ], "#00ff00");
      editor.highlight([ 3, 1, 3, 3 ], "#0000ff");
      const result = editor.highlights();
      assert.strictEqual(result.length, 3);
      assert.strictEqual(result[0].color, "#ff0000");
      assert.strictEqual(result[1].color, "#00ff00");
      assert.strictEqual(result[2].color, "#0000ff");
    });

    test("highlight after setContent", () => {
      const editor = new Editor(container, "old");
      editor.setContent("new content here");
      editor.highlight([ 1, 1, 1, 3 ], "#aaaaaa");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 3 ]);
    });

    test("highlights cleared after setContent replaces content", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
      editor.unhighlight();
      editor.setContent("new content");
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("highlight with zero columnEnd", () => {
      const editor = new Editor(container, "abc\ndef");
      editor.highlight([ 1, 1, 2, 0 ], "#bbbbbb");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0].range, [ 1, 1, 2, 0 ]);
    });

    test("re-highlight after unhighlight", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
      editor.unhighlight();
      editor.highlight([ 1, 7, 1, 11 ], "#00ff00");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0].range, [ 1, 7, 1, 11 ]);
      assert.strictEqual(result[0].color, "#00ff00");
    });
  });

  describe("highlight range validation", () => {
    test("throws RangeError when lineStart is 0", () => {
      const editor = new Editor(container, "hello");
      assert.throws(() => {
        editor.highlight([ 0, 1, 1, 5 ], "#ff0000");
      }, RangeError);
    });

    test("throws RangeError when lineStart is negative", () => {
      const editor = new Editor(container, "hello");
      assert.throws(() => {
        editor.highlight([ -1, 1, 1, 5 ], "#ff0000");
      }, RangeError);
    });

    test("throws RangeError when lineStart exceeds total lines", () => {
      const editor = new Editor(container, "hello");
      assert.throws(() => {
        editor.highlight([ 2, 1, 2, 1 ], "#ff0000");
      }, RangeError);
    });

    test("throws RangeError when lineEnd is 0", () => {
      const editor = new Editor(container, "hello");
      assert.throws(() => {
        editor.highlight([ 1, 1, 0, 5 ], "#ff0000");
      }, RangeError);
    });

    test("throws RangeError when lineEnd is negative", () => {
      const editor = new Editor(container, "hello");
      assert.throws(() => {
        editor.highlight([ 1, 1, -1, 5 ], "#ff0000");
      }, RangeError);
    });

    test("throws RangeError when lineEnd exceeds total lines", () => {
      const editor = new Editor(container, "hello");
      assert.throws(() => {
        editor.highlight([ 1, 1, 2, 1 ], "#ff0000");
      }, RangeError);
    });

    test("throws RangeError when lineEnd is less than lineStart", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      assert.throws(() => {
        editor.highlight([ 3, 1, 1, 1 ], "#ff0000");
      }, RangeError);
    });

    test("throws RangeError when columnStart is 0", () => {
      const editor = new Editor(container, "hello");
      assert.throws(() => {
        editor.highlight([ 1, 0, 1, 5 ], "#ff0000");
      }, RangeError);
    });

    test("throws RangeError when columnStart is negative", () => {
      const editor = new Editor(container, "hello");
      assert.throws(() => {
        editor.highlight([ 1, -1, 1, 5 ], "#ff0000");
      }, RangeError);
    });

    test("throws RangeError when columnStart exceeds line length", () => {
      const editor = new Editor(container, "hello");
      assert.throws(() => {
        editor.highlight([ 1, 7, 1, 5 ], "#ff0000");
      }, RangeError);
    });

    test("throws RangeError when columnEnd is negative", () => {
      const editor = new Editor(container, "hello");
      assert.throws(() => {
        editor.highlight([ 1, 1, 1, -1 ], "#ff0000");
      }, RangeError);
    });

    test("throws RangeError when columnEnd exceeds line length", () => {
      const editor = new Editor(container, "hello");
      assert.throws(() => {
        editor.highlight([ 1, 1, 1, 6 ], "#ff0000");
      }, RangeError);
    });

    test("does not throw for valid single-line range", () => {
      const editor = new Editor(container, "hello");
      assert.doesNotThrow(() => {
        editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
      });
    });

    test("does not throw for valid multi-line range", () => {
      const editor = new Editor(container, "hello\nworld");
      assert.doesNotThrow(() => {
        editor.highlight([ 1, 1, 2, 5 ], "#ff0000");
      });
    });

    test("does not throw when columnEnd is 0", () => {
      const editor = new Editor(container, "hello\nworld");
      assert.doesNotThrow(() => {
        editor.highlight([ 1, 1, 2, 0 ], "#ff0000");
      });
    });

    test("does not throw for columnStart at end of line", () => {
      const editor = new Editor(container, "hello");
      assert.doesNotThrow(() => {
        editor.highlight([ 1, 5, 1, 5 ], "#ff0000");
      });
    });

    test("throws RangeError for lineStart beyond single line doc", () => {
      const editor = new Editor(container, "only one line");
      assert.throws(() => {
        editor.highlight([ 5, 1, 5, 1 ], "#ff0000");
      }, RangeError);
    });

    test("throws RangeError for large lineEnd on multiline doc", () => {
      const editor = new Editor(container, "a\nb\nc");
      assert.throws(() => {
        editor.highlight([ 1, 1, 10, 1 ], "#ff0000");
      }, RangeError);
    });

    test("does not throw for last line and last column", () => {
      const editor = new Editor(container, "abc\ndef\nghi");
      assert.doesNotThrow(() => {
        editor.highlight([ 3, 1, 3, 3 ], "#ff0000");
      });
    });

    test("throws RangeError when lineEnd less than lineStart in 3-line doc", () => {
      const editor = new Editor(container, "aaa\nbbb\nccc");
      assert.throws(() => {
        editor.highlight([ 2, 1, 1, 3 ], "#ff0000");
      }, RangeError);
    });

    test("does not throw when lineStart equals lineEnd", () => {
      const editor = new Editor(container, "aaa\nbbb\nccc");
      assert.doesNotThrow(() => {
        editor.highlight([ 2, 1, 2, 3 ], "#ff0000");
      });
    });

    test("range validation does not add highlight on failure", () => {
      const editor = new Editor(container, "hello");
      assert.throws(() => {
        editor.highlight([ 0, 1, 1, 5 ], "#ff0000");
      }, RangeError);
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("valid highlight still works after a failed range validation", () => {
      const editor = new Editor(container, "hello");
      assert.throws(() => {
        editor.highlight([ 0, 1, 1, 5 ], "#ff0000");
      }, RangeError);
      editor.highlight([ 1, 1, 1, 5 ], "#00ff00");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].color, "#00ff00");
    });
  });
});
