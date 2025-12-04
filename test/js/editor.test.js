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

describe("Editor highlighting", () => {
  const container = document.getElementById("editor");

  beforeEach(() => {
    container.innerHTML = "";
  });

  describe("highlights() method", () => {
    test("returns empty array when no highlights exist", () => {
      const editor = new Editor(container, "hello world");
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("returns single highlight after highlighting", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 5]);
      assert.strictEqual(highlights[0].color, "#ff0000");
    });

    test("returns multiple highlights in order", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 7, 1, 11], "#00ff00");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 2);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 5]);
      assert.strictEqual(highlights[0].color, "#ff0000");
      assert.deepStrictEqual(highlights[1].range, [1, 7, 1, 11]);
      assert.strictEqual(highlights[1].color, "#00ff00");
    });

    test("returns copy of highlights array (not reference)", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights1 = editor.highlights();
      const highlights2 = editor.highlights();
      assert.notStrictEqual(highlights1, highlights2);
    });

    test("returns copy of range array (not reference)", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      highlights[0].range[0] = 999;
      const freshHighlights = editor.highlights();
      assert.strictEqual(freshHighlights[0].range[0], 1);
    });

    test("returns empty array after unhighlight", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 7, 1, 11], "#00ff00");
      editor.unhighlight();
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("handles multiline highlights", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([1, 1, 2, 6], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 2, 6]);
    });

    test("handles highlights spanning all lines", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([1, 1, 3, 6], "#0000ff");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 3, 6]);
      assert.strictEqual(highlights[0].color, "#0000ff");
    });

    test("preserves different color formats", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "rgb(255, 0, 0)");
      editor.highlight([1, 7, 1, 11], "rgba(0, 255, 0, 0.5)");
      const highlights = editor.highlights();
      assert.strictEqual(highlights[0].color, "rgb(255, 0, 0)");
      assert.strictEqual(highlights[1].color, "rgba(0, 255, 0, 0.5)");
    });
  });

  describe("highlight() method - valid ranges", () => {
    test("highlights single character", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 1], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
    });

    test("highlights entire single line", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
    });

    test("highlights middle of line", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 3, 1, 8], "#ff0000");
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [1, 3, 1, 8]);
    });

    test("highlights last character of line", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 5, 1, 5], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
    });

    test("highlights across two lines", () => {
      const editor = new Editor(container, "line 1\nline 2");
      editor.highlight([1, 1, 2, 6], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
    });

    test("highlights across multiple lines", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3\nline 4");
      editor.highlight([1, 1, 4, 6], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
    });

    test("highlights from middle of one line to middle of another", () => {
      const editor = new Editor(container, "hello world\nfoo bar baz");
      editor.highlight([1, 7, 2, 3], "#ff0000");
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [1, 7, 2, 3]);
    });

    test("allows columnEnd of 0 for empty highlight at line start", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 0], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
    });

    test("allows columnStart at end of line plus one", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 6, 1, 5], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
    });
  });

  describe("highlight() method - RangeError for invalid lineStart", () => {
    test("throws RangeError when lineStart is 0", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([0, 1, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError when lineStart is negative", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([-1, 1, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError when lineStart exceeds total lines", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([2, 1, 2, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError with correct message for lineStart out of bounds", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([5, 1, 5, 5], "#ff0000"),
        (err) => {
          assert(err instanceof RangeError);
          assert(err.message.includes("lineStart"));
          assert(err.message.includes("5"));
          return true;
        }
      );
    });
  });

  describe("highlight() method - RangeError for invalid lineEnd", () => {
    test("throws RangeError when lineEnd is 0", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 1, 0, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError when lineEnd is negative", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 1, -1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError when lineEnd exceeds total lines", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 1, 2, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError when lineEnd exceeds total lines in multiline doc", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      assert.throws(
        () => editor.highlight([1, 1, 4, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError with correct message for lineEnd out of bounds", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 1, 10, 5], "#ff0000"),
        (err) => {
          assert(err instanceof RangeError);
          assert(err.message.includes("lineEnd"));
          assert(err.message.includes("10"));
          return true;
        }
      );
    });
  });

  describe("highlight() method - RangeError for lineStart > lineEnd", () => {
    test("throws RangeError when lineStart is greater than lineEnd", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      assert.throws(
        () => editor.highlight([3, 1, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError with correct message for lineStart > lineEnd", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      assert.throws(
        () => editor.highlight([2, 1, 1, 5], "#ff0000"),
        (err) => {
          assert(err instanceof RangeError);
          assert(err.message.includes("lineStart"));
          assert(err.message.includes("lineEnd"));
          return true;
        }
      );
    });
  });

  describe("highlight() method - RangeError for invalid columnStart", () => {
    test("throws RangeError when columnStart is 0", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 0, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError when columnStart is negative", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, -1, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError when columnStart exceeds line length plus one", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 7, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError with correct message for columnStart out of bounds", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 10, 1, 5], "#ff0000"),
        (err) => {
          assert(err instanceof RangeError);
          assert(err.message.includes("columnStart"));
          assert(err.message.includes("10"));
          return true;
        }
      );
    });

    test("throws RangeError for columnStart on empty line", () => {
      const editor = new Editor(container, "hello\n\nworld");
      assert.throws(
        () => editor.highlight([2, 2, 2, 0], "#ff0000"),
        RangeError
      );
    });
  });

  describe("highlight() method - RangeError for invalid columnEnd", () => {
    test("throws RangeError when columnEnd is negative", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 1, 1, -1], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError when columnEnd exceeds line length", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 1, 1, 6], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError with correct message for columnEnd out of bounds", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 1, 1, 20], "#ff0000"),
        (err) => {
          assert(err instanceof RangeError);
          assert(err.message.includes("columnEnd"));
          assert(err.message.includes("20"));
          return true;
        }
      );
    });

    test("throws RangeError for columnEnd exceeding different line lengths", () => {
      const editor = new Editor(container, "short\nlonger line");
      assert.throws(
        () => editor.highlight([1, 1, 1, 10], "#ff0000"),
        RangeError
      );
    });
  });

  describe("highlight() method - RangeError for columnStart > columnEnd on same line", () => {
    test("throws RangeError when columnStart > columnEnd on same line", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 5, 1, 2], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError with correct message for columnStart > columnEnd", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 8, 1, 3], "#ff0000"),
        (err) => {
          assert(err instanceof RangeError);
          assert(err.message.includes("columnStart"));
          assert(err.message.includes("columnEnd"));
          return true;
        }
      );
    });

    test("does not throw when columnStart > columnEnd on different lines", () => {
      const editor = new Editor(container, "hello world\nfoo bar");
      editor.highlight([1, 8, 2, 3], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
    });
  });

  describe("highlight() method - edge cases", () => {
    test("handles single character document", () => {
      const editor = new Editor(container, "x");
      editor.highlight([1, 1, 1, 1], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
    });

    test("handles empty line in multiline document", () => {
      const editor = new Editor(container, "hello\n\nworld");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([3, 1, 3, 5], "#00ff00");
      assert.strictEqual(editor.highlights().length, 2);
    });

    test("handles document with only newlines", () => {
      const editor = new Editor(container, "\n\n\n");
      editor.highlight([1, 1, 1, 0], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
    });

    test("handles very long line", () => {
      const longLine = "a".repeat(1000);
      const editor = new Editor(container, longLine);
      editor.highlight([1, 1, 1, 1000], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
    });

    test("handles many highlights", () => {
      const editor = new Editor(container, "hello world foo bar baz");
      for (let i = 0; i < 10; i++) {
        editor.highlight([1, 1, 1, 5], `#ff000${i}`);
      }
      assert.strictEqual(editor.highlights().length, 10);
    });

    test("handles unicode content", () => {
      const editor = new Editor(container, "héllo wörld 你好");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
    });
  });

  describe("unhighlight() method", () => {
    test("clears single highlight", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
      editor.unhighlight();
      assert.strictEqual(editor.highlights().length, 0);
    });

    test("clears multiple highlights", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 7, 1, 11], "#00ff00");
      editor.highlight([1, 1, 1, 11], "#0000ff");
      assert.strictEqual(editor.highlights().length, 3);
      editor.unhighlight();
      assert.strictEqual(editor.highlights().length, 0);
    });

    test("can be called when no highlights exist", () => {
      const editor = new Editor(container, "hello world");
      editor.unhighlight();
      assert.strictEqual(editor.highlights().length, 0);
    });

    test("can be called multiple times", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.unhighlight();
      editor.unhighlight();
      editor.unhighlight();
      assert.strictEqual(editor.highlights().length, 0);
    });

    test("allows new highlights after unhighlight", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.unhighlight();
      editor.highlight([1, 7, 1, 11], "#00ff00");
      assert.strictEqual(editor.highlights().length, 1);
      assert.deepStrictEqual(editor.highlights()[0].range, [1, 7, 1, 11]);
    });
  });

  describe("highlight interaction with content changes", () => {
    test("highlights persist after setContent is called", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.setContent("new content here");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
    });

    test("highlights array is preserved but may be invalid after content change", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.setContent("hi");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 5]);
    });
  });

  describe("highlight() does not modify original range array", () => {
    test("original range array is not modified", () => {
      const editor = new Editor(container, "hello world");
      const range = [1, 1, 1, 5];
      editor.highlight(range, "#ff0000");
      range[0] = 999;
      const highlights = editor.highlights();
      assert.strictEqual(highlights[0].range[0], 1);
    });
  });
});
