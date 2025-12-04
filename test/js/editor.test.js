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

    test("returns single highlight with correct range and color", () => {
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

    test("returns highlight spanning multiple lines", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([1, 1, 3, 6], "#0000ff");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 3, 6]);
      assert.strictEqual(highlights[0].color, "#0000ff");
    });

    test("returns empty array after unhighlight", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.unhighlight();
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("returns highlights with various color formats", () => {
      const editor = new Editor(container, "hello world test");
      editor.highlight([1, 1, 1, 5], "red");
      editor.highlight([1, 7, 1, 11], "rgb(0, 255, 0)");
      editor.highlight([1, 13, 1, 16], "#0000ff");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 3);
      assert.strictEqual(highlights[0].color, "red");
      assert.strictEqual(highlights[1].color, "rgb(0, 255, 0)");
      assert.strictEqual(highlights[2].color, "#0000ff");
    });

    test("returns correct range for highlight at end of line", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 5]);
    });

    test("returns correct range for single character highlight", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 3, 1, 3], "#ff0000");
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [1, 3, 1, 3]);
    });

    test("returns highlights on different lines", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([1, 1, 1, 6], "#ff0000");
      editor.highlight([2, 1, 2, 6], "#00ff00");
      editor.highlight([3, 1, 3, 6], "#0000ff");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 3);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 6]);
      assert.deepStrictEqual(highlights[1].range, [2, 1, 2, 6]);
      assert.deepStrictEqual(highlights[2].range, [3, 1, 3, 6]);
    });
  });

  describe("highlight() method", () => {
    test("highlights single word on single line", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
    });

    test("highlights entire line", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 11], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 11]);
    });

    test("highlights across multiple lines", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([1, 3, 2, 4], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 3, 2, 4]);
    });

    test("adds multiple non-overlapping highlights", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 7, 1, 11], "#00ff00");
      assert.strictEqual(editor.highlights().length, 2);
    });

    test("preserves existing highlights when adding new one", () => {
      const editor = new Editor(container, "hello world test");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 13, 1, 16], "#0000ff");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 2);
      assert.strictEqual(highlights[0].color, "#ff0000");
      assert.strictEqual(highlights[1].color, "#0000ff");
    });

    test("highlights with hex color", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 5], "#abcdef");
      assert.strictEqual(editor.highlights()[0].color, "#abcdef");
    });

    test("highlights with named color", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 5], "blue");
      assert.strictEqual(editor.highlights()[0].color, "blue");
    });

    test("highlights with rgb color", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 5], "rgb(128, 128, 128)");
      assert.strictEqual(editor.highlights()[0].color, "rgb(128, 128, 128)");
    });

    test("highlights with rgba color", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 5], "rgba(255, 0, 0, 0.5)");
      assert.strictEqual(editor.highlights()[0].color, "rgba(255, 0, 0, 0.5)");
    });
  });

  describe("highlight() range validation", () => {
    test("throws RangeError for lineStart less than 1", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([0, 1, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for lineStart greater than total lines", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([2, 1, 2, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for lineEnd less than 1", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 1, 0, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for lineEnd greater than total lines", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 1, 2, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for negative lineStart", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([-1, 1, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for negative lineEnd", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 1, -1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError when lineStart is greater than lineEnd", () => {
      const editor = new Editor(container, "line 1\nline 2");
      assert.throws(
        () => editor.highlight([2, 1, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for columnStart less than 1", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 0, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for columnStart greater than line length plus 1", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 7, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for negative columnStart", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, -1, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for columnEnd greater than line length", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 1, 1, 6], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for negative columnEnd", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 1, 1, -1], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError when columnStart is greater than columnEnd on same line", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 6, 1, 3], "#ff0000"),
        RangeError
      );
    });

    test("does not throw for valid range at line boundaries", () => {
      const editor = new Editor(container, "hello");
      assert.doesNotThrow(() => editor.highlight([1, 1, 1, 5], "#ff0000"));
    });

    test("does not throw for valid range spanning multiple lines", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      assert.doesNotThrow(() => editor.highlight([1, 1, 3, 6], "#ff0000"));
    });

    test("does not throw for columnStart at end of line", () => {
      const editor = new Editor(container, "hello");
      assert.doesNotThrow(() => editor.highlight([1, 6, 1, 5], "#ff0000"));
    });

    test("does not throw for columnEnd at zero", () => {
      const editor = new Editor(container, "hello\nworld");
      assert.doesNotThrow(() => editor.highlight([1, 1, 2, 0], "#ff0000"));
    });

    test("throws RangeError with descriptive message for lineStart out of bounds", () => {
      const editor = new Editor(container, "hello world");
      try {
        editor.highlight([5, 1, 5, 5], "#ff0000");
        assert.fail("Expected RangeError to be thrown");
      } catch (error) {
        assert(error instanceof RangeError);
        assert(error.message.includes("lineStart"));
        assert(error.message.includes("5"));
      }
    });

    test("throws RangeError with descriptive message for lineEnd out of bounds", () => {
      const editor = new Editor(container, "hello world");
      try {
        editor.highlight([1, 1, 10, 5], "#ff0000");
        assert.fail("Expected RangeError to be thrown");
      } catch (error) {
        assert(error instanceof RangeError);
        assert(error.message.includes("lineEnd"));
        assert(error.message.includes("10"));
      }
    });

    test("throws RangeError with descriptive message for columnStart out of bounds", () => {
      const editor = new Editor(container, "hello");
      try {
        editor.highlight([1, 10, 1, 5], "#ff0000");
        assert.fail("Expected RangeError to be thrown");
      } catch (error) {
        assert(error instanceof RangeError);
        assert(error.message.includes("columnStart"));
        assert(error.message.includes("10"));
      }
    });

    test("throws RangeError with descriptive message for columnEnd out of bounds", () => {
      const editor = new Editor(container, "hello");
      try {
        editor.highlight([1, 1, 1, 20], "#ff0000");
        assert.fail("Expected RangeError to be thrown");
      } catch (error) {
        assert(error instanceof RangeError);
        assert(error.message.includes("columnEnd"));
        assert(error.message.includes("20"));
      }
    });

    test("validates range on multiline document with varying line lengths", () => {
      const editor = new Editor(container, "short\nlonger line here\nx");
      assert.doesNotThrow(() => editor.highlight([1, 1, 1, 5], "#ff0000"));
      assert.doesNotThrow(() => editor.highlight([2, 1, 2, 16], "#00ff00"));
      assert.doesNotThrow(() => editor.highlight([3, 1, 3, 1], "#0000ff"));
      assert.throws(
        () => editor.highlight([1, 1, 1, 6], "#ff0000"),
        RangeError
      );
      assert.throws(
        () => editor.highlight([2, 1, 2, 17], "#ff0000"),
        RangeError
      );
      assert.throws(
        () => editor.highlight([3, 1, 3, 2], "#ff0000"),
        RangeError
      );
    });
  });

  describe("unhighlight() method", () => {
    test("removes single highlight", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
      editor.unhighlight();
      assert.strictEqual(editor.highlights().length, 0);
    });

    test("removes all highlights", () => {
      const editor = new Editor(container, "hello world test");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 7, 1, 11], "#00ff00");
      editor.highlight([1, 13, 1, 16], "#0000ff");
      assert.strictEqual(editor.highlights().length, 3);
      editor.unhighlight();
      assert.strictEqual(editor.highlights().length, 0);
    });

    test("can be called when no highlights exist", () => {
      const editor = new Editor(container, "hello world");
      assert.doesNotThrow(() => editor.unhighlight());
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
      assert.strictEqual(highlights[0].color, "#00ff00");
    });
  });

  describe("highlighting edge cases", () => {
    test("highlights empty line", () => {
      const editor = new Editor(container, "line 1\n\nline 3");
      assert.throws(
        () => editor.highlight([2, 1, 2, 1], "#ff0000"),
        RangeError
      );
    });

    test("highlights single character document", () => {
      const editor = new Editor(container, "x");
      editor.highlight([1, 1, 1, 1], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 1]);
    });

    test("handles document with only newlines", () => {
      const editor = new Editor(container, "\n\n\n");
      assert.throws(
        () => editor.highlight([1, 1, 1, 1], "#ff0000"),
        RangeError
      );
    });

    test("highlights last character of document", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 5, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [1, 5, 1, 5]);
    });

    test("highlights first character of document", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 1], "#ff0000");
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 1]);
    });

    test("highlights entire multiline document", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([1, 1, 3, 6], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 3, 6]);
    });

    test("handles unicode content", () => {
      const editor = new Editor(container, "hello \u4e16\u754c");
      editor.highlight([1, 1, 1, 8], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
    });

    test("handles content with tabs", () => {
      const editor = new Editor(container, "hello\tworld");
      editor.highlight([1, 1, 1, 11], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
    });

    test("handles content with special characters", () => {
      const editor = new Editor(container, "hello!@#$%^&*()");
      editor.highlight([1, 1, 1, 15], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
    });

    test("handles very long line", () => {
      const longLine = "a".repeat(1000);
      const editor = new Editor(container, longLine);
      editor.highlight([1, 1, 1, 1000], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 1000]);
    });

    test("handles many lines", () => {
      const manyLines = Array(100).fill("line").join("\n");
      const editor = new Editor(container, manyLines);
      editor.highlight([1, 1, 100, 4], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 100, 4]);
    });

    test("handles many highlights", () => {
      const editor = new Editor(container, "a b c d e f g h i j");
      for (let i = 0; i < 10; i++) {
        editor.highlight([1, i * 2 + 1, 1, i * 2 + 1], "#ff0000");
      }
      assert.strictEqual(editor.highlights().length, 10);
    });
  });

  describe("highlighting with content changes", () => {
    test("highlights persist after setContent with same length", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.setContent("world");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
    });

    test("highlights cleared after setContent with different length", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.setContent("hi");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 0);
    });

    test("can add highlights after setContent", () => {
      const editor = new Editor(container, "hello");
      editor.setContent("world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
    });
  });
});
