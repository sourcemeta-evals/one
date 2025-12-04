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
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 7, 1, 11], "rgb(0, 255, 0)");
      editor.highlight([1, 13, 1, 16], "blue");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 3);
      assert.strictEqual(highlights[0].color, "#ff0000");
      assert.strictEqual(highlights[1].color, "rgb(0, 255, 0)");
      assert.strictEqual(highlights[2].color, "blue");
    });

    test("returns correct range for single character highlight", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 1], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 1]);
    });

    test("returns correct range for entire line highlight", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 5]);
    });

    test("returns correct range for highlight on second line", () => {
      const editor = new Editor(container, "line 1\nline 2");
      editor.highlight([2, 1, 2, 6], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [2, 1, 2, 6]);
    });

    test("returns correct range for highlight on last line", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([3, 1, 3, 6], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [3, 1, 3, 6]);
    });

    test("returns highlights after content change preserves mapped positions", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.setContent("new content here");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 0);
    });
  });

  describe("highlight() method", () => {
    test("highlights single word on single line", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
    });

    test("highlights across multiple lines", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([1, 1, 2, 6], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 2, 6]);
    });

    test("adds multiple non-overlapping highlights", () => {
      const editor = new Editor(container, "hello world test");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 13, 1, 16], "#00ff00");
      assert.strictEqual(editor.highlights().length, 2);
    });

    test("adds overlapping highlights", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 8], "#ff0000");
      editor.highlight([1, 5, 1, 11], "#00ff00");
      assert.strictEqual(editor.highlights().length, 2);
    });

    test("highlights empty range at start of line", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 0], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
    });

    test("highlights with columnEnd at 0", () => {
      const editor = new Editor(container, "hello\nworld");
      editor.highlight([1, 1, 2, 0], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 2, 0]);
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

    test("throws RangeError for lineStart greater than lineEnd", () => {
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

    test("throws RangeError for columnStart greater than columnEnd + 1 on same line", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 5, 1, 2], "#ff0000"),
        RangeError
      );
    });

    test("allows columnStart equal to columnEnd + 1 on same line (empty range)", () => {
      const editor = new Editor(container, "hello world");
      assert.doesNotThrow(
        () => editor.highlight([1, 3, 1, 2], "#ff0000")
      );
    });

    test("throws RangeError with descriptive message for lineStart out of bounds", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([5, 1, 5, 5], "#ff0000"),
        { message: /lineStart 5 is out of bounds/ }
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

    test("validates range on multiline content", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      assert.doesNotThrow(
        () => editor.highlight([1, 1, 3, 6], "#ff0000")
      );
    });

    test("throws RangeError for line beyond multiline content", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      assert.throws(
        () => editor.highlight([1, 1, 4, 1], "#ff0000"),
        RangeError
      );
    });

    test("validates columnEnd against correct line length on multiline", () => {
      const editor = new Editor(container, "short\nlonger line");
      assert.throws(
        () => editor.highlight([1, 1, 1, 6], "#ff0000"),
        RangeError
      );
    });

    test("allows valid columnEnd on longer second line", () => {
      const editor = new Editor(container, "short\nlonger line");
      assert.doesNotThrow(
        () => editor.highlight([2, 1, 2, 11], "#ff0000")
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

    test("throws RangeError for very large lineStart", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1000000, 1, 1000000, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for very large columnStart", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 1000000, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for very large columnEnd", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 1, 1, 1000000], "#ff0000"),
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

    test("removes multiple highlights", () => {
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
      assert.deepStrictEqual(highlights[0].range, [1, 7, 1, 11]);
      assert.strictEqual(highlights[0].color, "#00ff00");
    });
  });

  describe("edge cases", () => {
    test("highlight on empty content throws RangeError", () => {
      const editor = new Editor(container, "");
      assert.throws(
        () => editor.highlight([1, 1, 1, 1], "#ff0000"),
        RangeError
      );
    });

    test("highlights() on empty content returns empty array", () => {
      const editor = new Editor(container, "");
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("highlight at end of line", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 5, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 5, 1, 5]);
    });

    test("highlight spanning from middle of one line to middle of another", () => {
      const editor = new Editor(container, "hello world\nfoo bar baz");
      editor.highlight([1, 7, 2, 3], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 7, 2, 3]);
    });

    test("highlight with special characters in content", () => {
      const editor = new Editor(container, "hello\tworld\n\"quoted\"");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
    });

    test("highlight with unicode content", () => {
      const editor = new Editor(container, "héllo wörld");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
    });

    test("multiple highlights on same position", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 1, 1, 5], "#00ff00");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 2);
    });

    test("highlight with rgba color", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "rgba(255, 0, 0, 0.5)");
      const highlights = editor.highlights();
      assert.strictEqual(highlights[0].color, "rgba(255, 0, 0, 0.5)");
    });

    test("highlight with hsl color", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "hsl(0, 100%, 50%)");
      const highlights = editor.highlights();
      assert.strictEqual(highlights[0].color, "hsl(0, 100%, 50%)");
    });

    test("highlight preserves order when added out of order", () => {
      const editor = new Editor(container, "hello world test");
      editor.highlight([1, 13, 1, 16], "#0000ff");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 7, 1, 11], "#00ff00");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 3);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 5]);
      assert.deepStrictEqual(highlights[1].range, [1, 7, 1, 11]);
      assert.deepStrictEqual(highlights[2].range, [1, 13, 1, 16]);
    });

    test("highlight on very long line", () => {
      const longLine = "a".repeat(1000);
      const editor = new Editor(container, longLine);
      editor.highlight([1, 1, 1, 1000], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 1000]);
    });

    test("highlight on content with many lines", () => {
      const manyLines = Array(100).fill("line").join("\n");
      const editor = new Editor(container, manyLines);
      editor.highlight([50, 1, 50, 4], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [50, 1, 50, 4]);
    });

    test("highlight spanning many lines", () => {
      const manyLines = Array(100).fill("line").join("\n");
      const editor = new Editor(container, manyLines);
      editor.highlight([1, 1, 100, 4], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 100, 4]);
    });
  });
});
