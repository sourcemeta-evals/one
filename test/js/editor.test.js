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

    test("returns copy of range array (not reference)", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights1 = editor.highlights();
      const highlights2 = editor.highlights();
      assert.notStrictEqual(highlights1[0].range, highlights2[0].range);
      assert.deepStrictEqual(highlights1[0].range, highlights2[0].range);
    });

    test("returns highlights for multiline content", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([1, 1, 2, 4], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 2, 4]);
    });
  });

  describe("highlight() method", () => {
    test("highlights single character", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 1], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
    });

    test("highlights entire single line", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 11], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 11]);
    });

    test("highlights partial line", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 3, 1, 7], "#ff0000");
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [1, 3, 1, 7]);
    });

    test("highlights across multiple lines", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([1, 1, 3, 6], "#ff0000");
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [1, 1, 3, 6]);
    });

    test("highlights middle of multiline content", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([2, 1, 2, 6], "#ff0000");
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [2, 1, 2, 6]);
    });

    test("supports various color formats", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 7, 1, 11], "rgb(0, 255, 0)");
      const highlights = editor.highlights();
      assert.strictEqual(highlights[0].color, "#ff0000");
      assert.strictEqual(highlights[1].color, "rgb(0, 255, 0)");
    });

    test("allows overlapping highlights", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 7], "#ff0000");
      editor.highlight([1, 5, 1, 11], "#00ff00");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 2);
    });

    test("highlights at end of line", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 5, 1, 5], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
    });

    test("highlights spanning from middle to end of line", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 6, 1, 11], "#ff0000");
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [1, 6, 1, 11]);
    });
  });

  describe("unhighlight() method", () => {
    test("clears single highlight", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
      editor.unhighlight();
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("clears multiple highlights", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 7, 1, 11], "#00ff00");
      assert.strictEqual(editor.highlights().length, 2);
      editor.unhighlight();
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("can be called when no highlights exist", () => {
      const editor = new Editor(container, "hello world");
      editor.unhighlight();
      assert.deepStrictEqual(editor.highlights(), []);
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

    test("can be called multiple times", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.unhighlight();
      editor.unhighlight();
      editor.unhighlight();
      assert.deepStrictEqual(editor.highlights(), []);
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
        () => editor.highlight([1, 7, 1, 7], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for columnEnd less than 1", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 1, 1, 0], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for columnEnd greater than line length + 1", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 1, 1, 7], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for columnStart greater than columnEnd on same line", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 5, 1, 3], "#ff0000"),
        RangeError
      );
    });

    test("allows columnStart greater than columnEnd on different lines", () => {
      const editor = new Editor(container, "line 1\nline 2");
      editor.highlight([1, 5, 2, 3], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
    });

    test("throws RangeError with negative line numbers", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([-1, 1, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError with negative column numbers", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, -1, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("allows highlighting at column position equal to line length + 1", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 6, 1, 6], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
    });

    test("RangeError message includes lineStart bounds info", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([0, 1, 1, 5], "#ff0000"),
        (err) => err instanceof RangeError && err.message.includes("lineStart")
      );
    });

    test("RangeError message includes lineEnd bounds info", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 1, 5, 5], "#ff0000"),
        (err) => err instanceof RangeError && err.message.includes("lineEnd")
      );
    });

    test("RangeError message includes columnStart bounds info", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 0, 1, 5], "#ff0000"),
        (err) => err instanceof RangeError && err.message.includes("columnStart")
      );
    });

    test("RangeError message includes columnEnd bounds info", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 1, 1, 10], "#ff0000"),
        (err) => err instanceof RangeError && err.message.includes("columnEnd")
      );
    });
  });

  describe("highlight edge cases", () => {
    test("highlights empty line", () => {
      const editor = new Editor(container, "line 1\n\nline 3");
      editor.highlight([2, 1, 2, 1], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
    });

    test("highlights content with special characters", () => {
      const editor = new Editor(container, "hello\tworld");
      editor.highlight([1, 1, 1, 11], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
    });

    test("highlights content with unicode characters", () => {
      const editor = new Editor(container, "hello 世界");
      editor.highlight([1, 1, 1, 8], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
    });

    test("highlights single line document", () => {
      const editor = new Editor(container, "single line");
      editor.highlight([1, 1, 1, 11], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 11]);
    });

    test("highlights last line of multiline document", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([3, 1, 3, 6], "#ff0000");
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [3, 1, 3, 6]);
    });

    test("highlights first line of multiline document", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([1, 1, 1, 6], "#ff0000");
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 6]);
    });

    test("highlights entire multiline document", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([1, 1, 3, 6], "#ff0000");
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [1, 1, 3, 6]);
    });

    test("multiple highlights on same line", () => {
      const editor = new Editor(container, "hello world test");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 7, 1, 11], "#00ff00");
      editor.highlight([1, 13, 1, 16], "#0000ff");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 3);
    });

    test("highlights on different lines", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([1, 1, 1, 6], "#ff0000");
      editor.highlight([2, 1, 2, 6], "#00ff00");
      editor.highlight([3, 1, 3, 6], "#0000ff");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 3);
    });

    test("highlight with same start and end position", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 3, 1, 3], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 3, 1, 3]);
    });

    test("highlight preserves color exactly", () => {
      const editor = new Editor(container, "hello world");
      const color = "#AbCdEf";
      editor.highlight([1, 1, 1, 5], color);
      assert.strictEqual(editor.highlights()[0].color, color);
    });
  });

  describe("highlight interaction with content changes", () => {
    test("highlights persist after setContent clears them implicitly", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.setContent("new content");
      // After setContent, the internal _highlights array still has the old highlight
      // but the visual decoration may be invalid. This tests the current behavior.
      assert.strictEqual(editor.highlights().length, 1);
    });

    test("unhighlight after setContent clears highlights array", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.setContent("new content");
      editor.unhighlight();
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("can add new highlight after setContent and unhighlight", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.setContent("new content here");
      editor.unhighlight();
      editor.highlight([1, 1, 1, 3], "#00ff00");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 3]);
    });
  });
});
