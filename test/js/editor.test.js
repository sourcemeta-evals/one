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
    test("highlights returns empty array by default", () => {
      const editor = new Editor(container, "hello world");
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("highlights returns single highlight after highlight call", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 5]);
      assert.strictEqual(highlights[0].color, "#ff0000");
    });

    test("highlights returns multiple highlights in order", () => {
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

    test("highlights returns empty array after unhighlight", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.unhighlight();
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("highlights returns copy of range array", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      highlights[0].range[0] = 999;
      const freshHighlights = editor.highlights();
      assert.deepStrictEqual(freshHighlights[0].range, [1, 1, 1, 5]);
    });

    test("highlights works with multiline content", () => {
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

    test("highlights works with multiline highlight span", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([1, 1, 3, 6], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 3, 6]);
    });

    test("highlights preserves different color formats", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 7, 1, 11], "rgb(0, 255, 0)");
      const highlights = editor.highlights();
      assert.strictEqual(highlights[0].color, "#ff0000");
      assert.strictEqual(highlights[1].color, "rgb(0, 255, 0)");
    });
  });

  describe("highlight", () => {
    test("highlight applies to single character", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 1], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 1]);
    });

    test("highlight applies to entire line", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 11], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 11]);
    });

    test("highlight applies to middle of line", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 3, 1, 8], "#ff0000");
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [1, 3, 1, 8]);
    });

    test("highlight applies across multiple lines", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([1, 3, 2, 4], "#ff0000");
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [1, 3, 2, 4]);
    });

    test("highlight applies to last line", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([3, 1, 3, 6], "#ff0000");
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [3, 1, 3, 6]);
    });

    test("highlight can be called multiple times without overriding", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 7, 1, 11], "#00ff00");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 2);
    });

    test("highlight with columnEnd 0 creates zero-width highlight at line start", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 0], "#ff0000");
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 0]);
    });
  });

  describe("highlight range validation", () => {
    test("throws RangeError for lineStart less than 1", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([0, 1, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for lineStart greater than line count", () => {
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

    test("throws RangeError for lineEnd greater than line count", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 1, 2, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for lineEnd less than lineStart", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
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

    test("throws RangeError for columnStart greater than line length + 1", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 7, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for columnEnd less than 0", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 1, 1, -1], "#ff0000"),
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

    test("throws RangeError for columnEnd less than columnStart - 1 on same line", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 5, 1, 2], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError with descriptive message for lineStart out of bounds", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([0, 1, 1, 5], "#ff0000"),
        { message: /lineStart 0 is out of bounds/ }
      );
    });

    test("throws RangeError with descriptive message for lineEnd out of bounds", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 1, 5, 5], "#ff0000"),
        { message: /lineEnd 5 is out of bounds/ }
      );
    });

    test("throws RangeError with descriptive message for columnStart out of bounds", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 10, 1, 5], "#ff0000"),
        { message: /columnStart 10 is out of bounds/ }
      );
    });

    test("throws RangeError with descriptive message for columnEnd out of bounds", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 1, 1, 10], "#ff0000"),
        { message: /columnEnd 10 is out of bounds/ }
      );
    });

    test("does not throw for valid boundary values", () => {
      const editor = new Editor(container, "hello");
      assert.doesNotThrow(() => editor.highlight([1, 1, 1, 5], "#ff0000"));
    });

    test("does not throw for columnStart at line length + 1", () => {
      const editor = new Editor(container, "hello");
      assert.doesNotThrow(() => editor.highlight([1, 6, 1, 5], "#ff0000"));
    });

    test("does not throw for columnEnd at 0", () => {
      const editor = new Editor(container, "hello");
      assert.doesNotThrow(() => editor.highlight([1, 1, 1, 0], "#ff0000"));
    });

    test("does not throw for multiline highlight with valid bounds", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      assert.doesNotThrow(() => editor.highlight([1, 1, 3, 6], "#ff0000"));
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

    test("validates lineStart before lineEnd", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([0, 1, 0, 5], "#ff0000"),
        { message: /lineStart 0 is out of bounds/ }
      );
    });

    test("validates lineEnd after lineStart passes", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 1, 0, 5], "#ff0000"),
        { message: /lineEnd 0 is out of bounds/ }
      );
    });

    test("validates columnStart for specific line", () => {
      const editor = new Editor(container, "hi\nhello world");
      assert.throws(
        () => editor.highlight([1, 5, 1, 2], "#ff0000"),
        { message: /columnStart 5 is out of bounds.*for line 1/ }
      );
    });

    test("validates columnEnd for specific line", () => {
      const editor = new Editor(container, "hello world\nhi");
      assert.throws(
        () => editor.highlight([2, 1, 2, 5], "#ff0000"),
        { message: /columnEnd 5 is out of bounds.*for line 2/ }
      );
    });
  });

  describe("unhighlight", () => {
    test("unhighlight clears single highlight", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.unhighlight();
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("unhighlight clears multiple highlights", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 7, 1, 11], "#00ff00");
      editor.unhighlight();
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("unhighlight on empty highlights does not throw", () => {
      const editor = new Editor(container, "hello world");
      assert.doesNotThrow(() => editor.unhighlight());
    });

    test("unhighlight can be called multiple times", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.unhighlight();
      editor.unhighlight();
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("highlight works after unhighlight", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.unhighlight();
      editor.highlight([1, 7, 1, 11], "#00ff00");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 7, 1, 11]);
    });
  });

  describe("highlight edge cases", () => {
    test("highlight on empty content throws RangeError", () => {
      const editor = new Editor(container, "");
      assert.throws(
        () => editor.highlight([1, 1, 1, 1], "#ff0000"),
        RangeError
      );
    });

    test("highlight on single character content", () => {
      const editor = new Editor(container, "a");
      editor.highlight([1, 1, 1, 1], "#ff0000");
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 1]);
    });

    test("highlight on content with only newlines", () => {
      const editor = new Editor(container, "\n\n");
      editor.highlight([1, 1, 1, 0], "#ff0000");
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 0]);
    });

    test("highlight on line with spaces", () => {
      const editor = new Editor(container, "   ");
      editor.highlight([1, 1, 1, 3], "#ff0000");
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 3]);
    });

    test("highlight with same start and end position", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 3, 1, 2], "#ff0000");
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [1, 3, 1, 2]);
    });

    test("highlight preserves content", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      assert.strictEqual(editor.content(), "hello world");
    });

    test("multiple overlapping highlights are allowed", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 8], "#ff0000");
      editor.highlight([1, 5, 1, 11], "#00ff00");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 2);
    });

    test("highlight with very long line", () => {
      const longLine = "a".repeat(1000);
      const editor = new Editor(container, longLine);
      editor.highlight([1, 1, 1, 1000], "#ff0000");
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 1000]);
    });

    test("highlight with many lines", () => {
      const manyLines = Array(100).fill("line").join("\n");
      const editor = new Editor(container, manyLines);
      editor.highlight([1, 1, 100, 4], "#ff0000");
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [1, 1, 100, 4]);
    });

    test("highlight with unicode content", () => {
      const editor = new Editor(container, "héllo wörld");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 5]);
    });

    test("highlight with emoji content", () => {
      const editor = new Editor(container, "hello 🌍 world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 5]);
    });

    test("highlight with tab characters", () => {
      const editor = new Editor(container, "hello\tworld");
      editor.highlight([1, 1, 1, 11], "#ff0000");
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 11]);
    });
  });

  describe("highlight color formats", () => {
    test("highlight with hex color", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      assert.strictEqual(editor.highlights()[0].color, "#ff0000");
    });

    test("highlight with short hex color", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 5], "#f00");
      assert.strictEqual(editor.highlights()[0].color, "#f00");
    });

    test("highlight with rgb color", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 5], "rgb(255, 0, 0)");
      assert.strictEqual(editor.highlights()[0].color, "rgb(255, 0, 0)");
    });

    test("highlight with rgba color", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 5], "rgba(255, 0, 0, 0.5)");
      assert.strictEqual(editor.highlights()[0].color, "rgba(255, 0, 0, 0.5)");
    });

    test("highlight with named color", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 5], "red");
      assert.strictEqual(editor.highlights()[0].color, "red");
    });

    test("highlight with hsl color", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 5], "hsl(0, 100%, 50%)");
      assert.strictEqual(editor.highlights()[0].color, "hsl(0, 100%, 50%)");
    });
  });
});
