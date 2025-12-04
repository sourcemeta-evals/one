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

    test("returns single highlight after highlight() call", () => {
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

    test("returns copy of range array (not reference)", () => {
      const editor = new Editor(container, "hello world");
      const originalRange = [1, 1, 1, 5];
      editor.highlight(originalRange, "#ff0000");
      const highlights = editor.highlights();
      originalRange[0] = 999;
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 5]);
    });

    test("returned range is independent copy", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights1 = editor.highlights();
      const highlights2 = editor.highlights();
      highlights1[0].range[0] = 999;
      assert.deepStrictEqual(highlights2[0].range, [1, 1, 1, 5]);
    });

    test("returns empty array after unhighlight()", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 7, 1, 11], "#00ff00");
      editor.unhighlight();
      assert.deepStrictEqual(editor.highlights(), []);
    });
  });

  describe("highlight() with valid ranges", () => {
    test("highlights single character on single line", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 1], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 1]);
    });

    test("highlights entire single line", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 5]);
    });

    test("highlights middle portion of line", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 3, 1, 8], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 3, 1, 8]);
    });

    test("highlights across multiple lines", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([1, 1, 3, 6], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 3, 6]);
    });

    test("highlights on second line only", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([2, 1, 2, 6], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [2, 1, 2, 6]);
    });

    test("highlights on last line only", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([3, 1, 3, 6], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [3, 1, 3, 6]);
    });

    test("highlights with columnEnd at 0 (empty selection at line start)", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 0], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
    });

    test("highlights with different colors", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 7, 1, 11], "#00ff00");
      editor.highlight([1, 1, 1, 11], "rgba(0, 0, 255, 0.5)");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 3);
      assert.strictEqual(highlights[0].color, "#ff0000");
      assert.strictEqual(highlights[1].color, "#00ff00");
      assert.strictEqual(highlights[2].color, "rgba(0, 0, 255, 0.5)");
    });

    test("highlights overlapping ranges", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 7], "#ff0000");
      editor.highlight([1, 5, 1, 11], "#00ff00");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 2);
    });

    test("highlights same range multiple times", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 1, 1, 5], "#00ff00");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 2);
    });

    test("highlights with columnStart at end of line", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 6, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
    });
  });

  describe("highlight() range validation - lineStart errors", () => {
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

    test("throws RangeError when lineStart exceeds total lines (multiline)", () => {
      const editor = new Editor(container, "line 1\nline 2");
      assert.throws(
        () => editor.highlight([3, 1, 3, 5], "#ff0000"),
        RangeError
      );
    });

    test("error message includes lineStart value and bounds", () => {
      const editor = new Editor(container, "hello");
      try {
        editor.highlight([5, 1, 5, 5], "#ff0000");
        assert.fail("Expected RangeError to be thrown");
      } catch (e) {
        assert(e instanceof RangeError);
        assert(e.message.includes("lineStart"));
        assert(e.message.includes("5"));
        assert(e.message.includes("1-1"));
      }
    });
  });

  describe("highlight() range validation - lineEnd errors", () => {
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

    test("throws RangeError when lineEnd exceeds total lines (multiline)", () => {
      const editor = new Editor(container, "line 1\nline 2");
      assert.throws(
        () => editor.highlight([1, 1, 5, 5], "#ff0000"),
        RangeError
      );
    });

    test("error message includes lineEnd value and bounds", () => {
      const editor = new Editor(container, "line 1\nline 2");
      try {
        editor.highlight([1, 1, 10, 5], "#ff0000");
        assert.fail("Expected RangeError to be thrown");
      } catch (e) {
        assert(e instanceof RangeError);
        assert(e.message.includes("lineEnd"));
        assert(e.message.includes("10"));
        assert(e.message.includes("1-2"));
      }
    });
  });

  describe("highlight() range validation - lineStart > lineEnd errors", () => {
    test("throws RangeError when lineStart > lineEnd", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      assert.throws(
        () => editor.highlight([3, 1, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError when lineStart > lineEnd (adjacent lines)", () => {
      const editor = new Editor(container, "line 1\nline 2");
      assert.throws(
        () => editor.highlight([2, 1, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("error message indicates lineStart cannot be greater than lineEnd", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      try {
        editor.highlight([3, 1, 2, 5], "#ff0000");
        assert.fail("Expected RangeError to be thrown");
      } catch (e) {
        assert(e instanceof RangeError);
        assert(e.message.includes("lineStart"));
        assert(e.message.includes("lineEnd"));
        assert(e.message.includes("greater"));
      }
    });
  });

  describe("highlight() range validation - columnStart errors", () => {
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

    test("throws RangeError when columnStart exceeds line length + 1", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 7, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError when columnStart exceeds line length + 1 (short line)", () => {
      const editor = new Editor(container, "hi");
      assert.throws(
        () => editor.highlight([1, 4, 1, 2], "#ff0000"),
        RangeError
      );
    });

    test("error message includes columnStart value and bounds", () => {
      const editor = new Editor(container, "hello");
      try {
        editor.highlight([1, 10, 1, 5], "#ff0000");
        assert.fail("Expected RangeError to be thrown");
      } catch (e) {
        assert(e instanceof RangeError);
        assert(e.message.includes("columnStart"));
        assert(e.message.includes("10"));
        assert(e.message.includes("1-6"));
      }
    });

    test("columnStart at line length + 1 is valid", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 6, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
    });
  });

  describe("highlight() range validation - columnEnd errors", () => {
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

    test("throws RangeError when columnEnd exceeds line length (short line)", () => {
      const editor = new Editor(container, "hi");
      assert.throws(
        () => editor.highlight([1, 1, 1, 3], "#ff0000"),
        RangeError
      );
    });

    test("error message includes columnEnd value and bounds", () => {
      const editor = new Editor(container, "hello");
      try {
        editor.highlight([1, 1, 1, 10], "#ff0000");
        assert.fail("Expected RangeError to be thrown");
      } catch (e) {
        assert(e instanceof RangeError);
        assert(e.message.includes("columnEnd"));
        assert(e.message.includes("10"));
        assert(e.message.includes("0-5"));
      }
    });

    test("columnEnd at 0 is valid", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 0], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
    });

    test("columnEnd at line length is valid", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
    });
  });

  describe("highlight() range validation - columnStart > columnEnd on same line", () => {
    test("throws RangeError when columnStart > columnEnd + 1 on same line", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 8, 1, 3], "#ff0000"),
        RangeError
      );
    });

    test("error message indicates column ordering issue", () => {
      const editor = new Editor(container, "hello world");
      try {
        editor.highlight([1, 10, 1, 5], "#ff0000");
        assert.fail("Expected RangeError to be thrown");
      } catch (e) {
        assert(e instanceof RangeError);
        assert(e.message.includes("columnStart"));
        assert(e.message.includes("columnEnd"));
      }
    });

    test("columnStart equal to columnEnd + 1 is valid (zero-width)", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 3, 1, 2], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
    });
  });

  describe("highlight() with multiline content edge cases", () => {
    test("highlights across lines with different lengths", () => {
      const editor = new Editor(container, "short\nvery long line here\nx");
      editor.highlight([1, 1, 3, 1], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
    });

    test("validates columnEnd against correct line length (end line)", () => {
      const editor = new Editor(container, "long line\nhi");
      assert.throws(
        () => editor.highlight([1, 1, 2, 3], "#ff0000"),
        RangeError
      );
    });

    test("validates columnStart against correct line length (start line)", () => {
      const editor = new Editor(container, "hi\nlong line");
      assert.throws(
        () => editor.highlight([1, 5, 2, 5], "#ff0000"),
        RangeError
      );
    });

    test("highlights empty line", () => {
      const editor = new Editor(container, "line 1\n\nline 3");
      editor.highlight([2, 1, 2, 0], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
    });

    test("throws for columnStart > 1 on empty line", () => {
      const editor = new Editor(container, "line 1\n\nline 3");
      assert.throws(
        () => editor.highlight([2, 2, 2, 0], "#ff0000"),
        RangeError
      );
    });

    test("throws for columnEnd > 0 on empty line", () => {
      const editor = new Editor(container, "line 1\n\nline 3");
      assert.throws(
        () => editor.highlight([2, 1, 2, 1], "#ff0000"),
        RangeError
      );
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
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 7, 1, 11]);
      assert.strictEqual(highlights[0].color, "#00ff00");
    });
  });

  describe("highlight() with special content", () => {
    test("highlights content with unicode characters", () => {
      const editor = new Editor(container, "hello \u4e16\u754c");
      editor.highlight([1, 1, 1, 8], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
    });

    test("highlights content with emoji", () => {
      const editor = new Editor(container, "hello \ud83d\ude00 world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
    });

    test("highlights content with tabs", () => {
      const editor = new Editor(container, "hello\tworld");
      editor.highlight([1, 1, 1, 11], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
    });

    test("highlights content with special characters", () => {
      const editor = new Editor(container, "<div class=\"test\">");
      editor.highlight([1, 1, 1, 18], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
    });
  });

  describe("highlight() preserves existing highlights", () => {
    test("adding highlight does not remove existing ones", () => {
      const editor = new Editor(container, "hello world test");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 7, 1, 11], "#00ff00");
      editor.highlight([1, 13, 1, 16], "#0000ff");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 3);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 5]);
      assert.deepStrictEqual(highlights[1].range, [1, 7, 1, 11]);
      assert.deepStrictEqual(highlights[2].range, [1, 13, 1, 16]);
    });

    test("highlights on different lines are preserved", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([1, 1, 1, 6], "#ff0000");
      editor.highlight([2, 1, 2, 6], "#00ff00");
      editor.highlight([3, 1, 3, 6], "#0000ff");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 3);
    });
  });

  describe("highlights() return value structure", () => {
    test("returns array", () => {
      const editor = new Editor(container, "hello");
      const highlights = editor.highlights();
      assert(Array.isArray(highlights));
    });

    test("each highlight has range property", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      assert("range" in highlights[0]);
    });

    test("each highlight has color property", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      assert("color" in highlights[0]);
    });

    test("range is array of 4 numbers", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      const range = highlights[0].range;
      assert(Array.isArray(range));
      assert.strictEqual(range.length, 4);
      assert(range.every(n => typeof n === "number"));
    });

    test("color is string", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(typeof highlights[0].color, "string");
    });
  });
});
