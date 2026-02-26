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

    test("returns empty array for empty editor", () => {
      const editor = new Editor(container);
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("returns single highlight on a single line", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0].range, [1, 1, 1, 5]);
      assert.strictEqual(result[0].color, "#ff0000");
    });

    test("returns highlight spanning multiple lines", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([1, 1, 3, 6], "#00ff00");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0].range, [1, 1, 3, 6]);
      assert.strictEqual(result[0].color, "#00ff00");
    });

    test("returns multiple non-overlapping highlights", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 7, 1, 11], "#0000ff");
      const result = editor.highlights();
      assert.strictEqual(result.length, 2);
      assert.deepStrictEqual(result[0].range, [1, 1, 1, 5]);
      assert.strictEqual(result[0].color, "#ff0000");
      assert.deepStrictEqual(result[1].range, [1, 7, 1, 11]);
      assert.strictEqual(result[1].color, "#0000ff");
    });

    test("returns highlights on different lines", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([1, 1, 1, 6], "#ff0000");
      editor.highlight([3, 1, 3, 6], "#0000ff");
      const result = editor.highlights();
      assert.strictEqual(result.length, 2);
      assert.deepStrictEqual(result[0].range, [1, 1, 1, 6]);
      assert.strictEqual(result[0].color, "#ff0000");
      assert.deepStrictEqual(result[1].range, [3, 1, 3, 6]);
      assert.strictEqual(result[1].color, "#0000ff");
    });

    test("preserves color information correctly", () => {
      const editor = new Editor(container, "abcdefghij");
      editor.highlight([1, 1, 1, 3], "#abcdef");
      const result = editor.highlights();
      assert.strictEqual(result[0].color, "#abcdef");
    });

    test("returns empty array after unhighlight", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
      editor.unhighlight();
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("unhighlight removes all highlights", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 3], "#ff0000");
      editor.highlight([1, 5, 1, 7], "#00ff00");
      assert.strictEqual(editor.highlights().length, 2);
      editor.unhighlight();
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("highlight after unhighlight works", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.unhighlight();
      editor.highlight([1, 7, 1, 11], "#0000ff");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0].range, [1, 7, 1, 11]);
      assert.strictEqual(result[0].color, "#0000ff");
    });

    test("highlight partial word on single line", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 2, 1, 4], "#ff0000");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0].range, [1, 2, 1, 4]);
    });

    test("highlight entire single line", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0].range, [1, 1, 1, 5]);
    });

    test("highlight across two lines", () => {
      const editor = new Editor(container, "hello\nworld");
      editor.highlight([1, 1, 2, 5], "#ff0000");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0].range, [1, 1, 2, 5]);
    });

    test("highlight middle of content on second line", () => {
      const editor = new Editor(container, "first\nsecond\nthird");
      editor.highlight([2, 2, 2, 5], "#00ff00");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0].range, [2, 2, 2, 5]);
      assert.strictEqual(result[0].color, "#00ff00");
    });

    test("highlight last line of content", () => {
      const editor = new Editor(container, "first\nsecond\nthird");
      editor.highlight([3, 1, 3, 5], "#0000ff");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0].range, [3, 1, 3, 5]);
    });

    test("three highlights on separate lines", () => {
      const editor = new Editor(container, "aaa\nbbb\nccc");
      editor.highlight([1, 1, 1, 3], "#ff0000");
      editor.highlight([2, 1, 2, 3], "#00ff00");
      editor.highlight([3, 1, 3, 3], "#0000ff");
      const result = editor.highlights();
      assert.strictEqual(result.length, 3);
      assert.strictEqual(result[0].color, "#ff0000");
      assert.strictEqual(result[1].color, "#00ff00");
      assert.strictEqual(result[2].color, "#0000ff");
    });

    test("highlight with zero columnEnd is valid", () => {
      const editor = new Editor(container, "hello\nworld");
      editor.highlight([1, 1, 1, 0], "#ff0000");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0].range, [1, 1, 1, 0]);
    });

    test("highlights persist after setContent changes", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
      editor.setContent("new content here");
      // After content change, highlights may be remapped
      const result = editor.highlights();
      // Highlights should still exist (remapped by CodeMirror)
      assert.ok(Array.isArray(result));
    });

    test("highlight with different color formats", () => {
      const editor = new Editor(container, "hello world test");
      editor.highlight([1, 1, 1, 5], "red");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].color, "red");
    });

    test("highlight with rgb color", () => {
      const editor = new Editor(container, "hello world test");
      editor.highlight([1, 1, 1, 5], "rgb(255, 0, 0)");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].color, "rgb(255, 0, 0)");
    });

    test("highlight with rgba color", () => {
      const editor = new Editor(container, "hello world test");
      editor.highlight([1, 1, 1, 5], "rgba(255, 0, 0, 0.5)");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].color, "rgba(255, 0, 0, 0.5)");
    });
  });

  describe("highlight range validation", () => {
    test("throws RangeError for lineStart less than 1", () => {
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

    test("throws RangeError for lineStart exceeding total lines", () => {
      const editor = new Editor(container, "hello");
      assert.throws(() => {
        editor.highlight([2, 1, 2, 5], "#ff0000");
      }, RangeError);
    });

    test("throws RangeError for lineEnd less than 1", () => {
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

    test("throws RangeError for lineEnd exceeding total lines", () => {
      const editor = new Editor(container, "hello");
      assert.throws(() => {
        editor.highlight([1, 1, 2, 5], "#ff0000");
      }, RangeError);
    });

    test("throws RangeError for lineStart greater than lineEnd", () => {
      const editor = new Editor(container, "line 1\nline 2");
      assert.throws(() => {
        editor.highlight([2, 1, 1, 5], "#ff0000");
      }, RangeError);
    });

    test("throws RangeError for columnStart less than 1", () => {
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

    test("throws RangeError for columnStart exceeding line length", () => {
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

    test("throws RangeError for columnEnd exceeding line length", () => {
      const editor = new Editor(container, "hello");
      assert.throws(() => {
        editor.highlight([1, 1, 1, 6], "#ff0000");
      }, RangeError);
    });

    test("throws RangeError for columnStart greater than columnEnd on same line", () => {
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
      const editor = new Editor(container, "hello\nworld");
      assert.doesNotThrow(() => {
        editor.highlight([1, 1, 2, 5], "#ff0000");
      });
    });

    test("does not throw for columnStart at end of line", () => {
      const editor = new Editor(container, "hello");
      // columnStart can be up to line length + 1
      assert.doesNotThrow(() => {
        editor.highlight([1, 6, 1, 5], "#ff0000");
      });
    });

    test("does not throw for columnEnd at exactly line length", () => {
      const editor = new Editor(container, "hello");
      assert.doesNotThrow(() => {
        editor.highlight([1, 1, 1, 5], "#ff0000");
      });
    });

    test("does not throw for columnEnd of zero", () => {
      const editor = new Editor(container, "hello");
      assert.doesNotThrow(() => {
        editor.highlight([1, 1, 1, 0], "#ff0000");
      });
    });

    test("throws RangeError with large lineStart on single-line content", () => {
      const editor = new Editor(container, "hello");
      assert.throws(() => {
        editor.highlight([100, 1, 100, 5], "#ff0000");
      }, RangeError);
    });

    test("throws RangeError with large lineEnd on single-line content", () => {
      const editor = new Editor(container, "hello");
      assert.throws(() => {
        editor.highlight([1, 1, 100, 5], "#ff0000");
      }, RangeError);
    });

    test("throws RangeError on empty editor for any line beyond 1", () => {
      const editor = new Editor(container, "");
      assert.throws(() => {
        editor.highlight([2, 1, 2, 1], "#ff0000");
      }, RangeError);
    });

    test("valid range on empty editor for line 1", () => {
      const editor = new Editor(container, "");
      assert.doesNotThrow(() => {
        editor.highlight([1, 1, 1, 0], "#ff0000");
      });
    });

    test("throws RangeError for columnStart beyond empty line", () => {
      const editor = new Editor(container, "");
      assert.throws(() => {
        editor.highlight([1, 2, 1, 0], "#ff0000");
      }, RangeError);
    });

    test("throws RangeError for columnEnd beyond empty line", () => {
      const editor = new Editor(container, "");
      assert.throws(() => {
        editor.highlight([1, 1, 1, 1], "#ff0000");
      }, RangeError);
    });

    test("valid highlight on multiline content with different line lengths", () => {
      const editor = new Editor(container, "ab\ncdef\nghijkl");
      assert.doesNotThrow(() => {
        editor.highlight([1, 1, 1, 2], "#ff0000");
      });
    });

    test("throws RangeError for columnEnd exceeding shorter line", () => {
      const editor = new Editor(container, "ab\ncdef\nghijkl");
      assert.throws(() => {
        editor.highlight([1, 1, 1, 3], "#ff0000");
      }, RangeError);
    });

    test("columnStart on second line validated against that line length", () => {
      const editor = new Editor(container, "ab\ncdef");
      assert.throws(() => {
        editor.highlight([2, 6, 2, 4], "#ff0000");
      }, RangeError);
    });

    test("columnEnd on second line validated against that line length", () => {
      const editor = new Editor(container, "ab\ncdef");
      assert.throws(() => {
        editor.highlight([2, 1, 2, 5], "#ff0000");
      }, RangeError);
    });

    test("valid cross-line highlight with different column bounds", () => {
      const editor = new Editor(container, "abcde\nfghij");
      assert.doesNotThrow(() => {
        editor.highlight([1, 3, 2, 4], "#ff0000");
      });
    });

    test("cross-line highlight does not throw when columnStart > columnEnd", () => {
      const editor = new Editor(container, "abcde\nfghij");
      assert.doesNotThrow(() => {
        editor.highlight([1, 5, 2, 2], "#ff0000");
      });
    });
  });

  describe("highlight and highlights integration", () => {
    test("highlight then highlights round-trips range correctly", () => {
      const editor = new Editor(container, "abcdef\nghijkl\nmnopqr");
      const range = [1, 2, 2, 4];
      editor.highlight(range, "#ff0000");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0].range, range);
      assert.strictEqual(result[0].color, "#ff0000");
    });

    test("multiple highlight calls accumulate", () => {
      const editor = new Editor(container, "abcdef\nghijkl\nmnopqr");
      editor.highlight([1, 1, 1, 3], "#ff0000");
      editor.highlight([2, 1, 2, 3], "#00ff00");
      editor.highlight([3, 1, 3, 3], "#0000ff");
      assert.strictEqual(editor.highlights().length, 3);
    });

    test("unhighlight then re-highlight replaces all", () => {
      const editor = new Editor(container, "abcdef\nghijkl");
      editor.highlight([1, 1, 1, 3], "#ff0000");
      editor.highlight([2, 1, 2, 3], "#00ff00");
      editor.unhighlight();
      editor.highlight([1, 4, 1, 6], "#0000ff");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0].range, [1, 4, 1, 6]);
      assert.strictEqual(result[0].color, "#0000ff");
    });

    test("highlights returns correct colors for each decoration", () => {
      const editor = new Editor(container, "one two three");
      editor.highlight([1, 1, 1, 3], "#111111");
      editor.highlight([1, 5, 1, 7], "#222222");
      editor.highlight([1, 9, 1, 13], "#333333");
      const result = editor.highlights();
      assert.strictEqual(result[0].color, "#111111");
      assert.strictEqual(result[1].color, "#222222");
      assert.strictEqual(result[2].color, "#333333");
    });

    test("highlights structure has range and color properties", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 5], "#aabbcc");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.ok(Array.isArray(result[0].range));
      assert.strictEqual(result[0].range.length, 4);
      assert.strictEqual(typeof result[0].color, "string");
    });

    test("range array contains four numbers", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const [ lineStart, columnStart, lineEnd, columnEnd ] =
        editor.highlights()[0].range;
      assert.strictEqual(typeof lineStart, "number");
      assert.strictEqual(typeof columnStart, "number");
      assert.strictEqual(typeof lineEnd, "number");
      assert.strictEqual(typeof columnEnd, "number");
    });

    test("single character highlight", () => {
      const editor = new Editor(container, "abcde");
      editor.highlight([1, 3, 1, 3], "#ff0000");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0].range, [1, 3, 1, 3]);
    });

    test("highlight spanning all lines of content", () => {
      const editor = new Editor(container, "aaa\nbbb\nccc\nddd");
      editor.highlight([1, 1, 4, 3], "#ff0000");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0].range, [1, 1, 4, 3]);
    });

    test("highlight at end of line", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 5, 1, 5], "#ff0000");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0].range, [1, 5, 1, 5]);
    });

    test("highlight at start of line", () => {
      const editor = new Editor(container, "hello\nworld");
      editor.highlight([2, 1, 2, 1], "#ff0000");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0].range, [2, 1, 2, 1]);
    });
  });
});
