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

    test("returns highlight spanning the entire single line", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 5], "#00ff00");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0].range, [1, 1, 1, 5]);
      assert.strictEqual(result[0].color, "#00ff00");
    });

    test("returns highlight spanning multiple lines", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([1, 1, 3, 6], "#0000ff");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0].range, [1, 1, 3, 6]);
      assert.strictEqual(result[0].color, "#0000ff");
    });

    test("returns multiple non-overlapping highlights", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 7, 1, 11], "#00ff00");
      const result = editor.highlights();
      assert.strictEqual(result.length, 2);
      assert.deepStrictEqual(result[0].range, [1, 1, 1, 5]);
      assert.strictEqual(result[0].color, "#ff0000");
      assert.deepStrictEqual(result[1].range, [1, 7, 1, 11]);
      assert.strictEqual(result[1].color, "#00ff00");
    });

    test("returns highlights on different lines", () => {
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

    test("returns empty after unhighlight clears all", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
      editor.unhighlight();
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("preserves highlight color correctly", () => {
      const editor = new Editor(container, "test content");
      editor.highlight([1, 1, 1, 4], "#abcdef");
      const result = editor.highlights();
      assert.strictEqual(result[0].color, "#abcdef");
    });

    test("highlights a middle portion of a line", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 3, 1, 7], "#123456");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0].range, [1, 3, 1, 7]);
    });

    test("highlights last character of a line", () => {
      const editor = new Editor(container, "abcde");
      editor.highlight([1, 5, 1, 5], "#ff0000");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0].range, [1, 5, 1, 5]);
    });

    test("highlights spanning two lines", () => {
      const editor = new Editor(container, "abc\ndef");
      editor.highlight([1, 2, 2, 2], "#ff0000");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0].range, [1, 2, 2, 2]);
      assert.strictEqual(result[0].color, "#ff0000");
    });

    test("highlights with different colors are tracked separately", () => {
      const editor = new Editor(container, "aaaa\nbbbb\ncccc");
      editor.highlight([1, 1, 1, 4], "#ff0000");
      editor.highlight([2, 1, 2, 4], "#00ff00");
      editor.highlight([3, 1, 3, 4], "#0000ff");
      const result = editor.highlights();
      assert.strictEqual(result.length, 3);
      assert.strictEqual(result[0].color, "#ff0000");
      assert.strictEqual(result[1].color, "#00ff00");
      assert.strictEqual(result[2].color, "#0000ff");
    });

    test("highlight then unhighlight then re-highlight", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.unhighlight();
      editor.highlight([1, 7, 1, 11], "#00ff00");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0].range, [1, 7, 1, 11]);
      assert.strictEqual(result[0].color, "#00ff00");
    });

    test("highlights after setContent changes", () => {
      const editor = new Editor(container, "original");
      editor.setContent("new content here");
      editor.highlight([1, 1, 1, 3], "#ff0000");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0].range, [1, 1, 1, 3]);
    });

    test("highlights returns correct structure", () => {
      const editor = new Editor(container, "test");
      editor.highlight([1, 1, 1, 4], "#aabbcc");
      const result = editor.highlights();
      assert.strictEqual(result.length, 1);
      assert.ok(Array.isArray(result[0].range));
      assert.strictEqual(result[0].range.length, 4);
      assert.strictEqual(typeof result[0].color, "string");
    });
  });

  describe("highlight range validation", () => {
    test("throws RangeError for lineStart less than 1", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([0, 1, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for negative lineStart", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([-1, 1, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for lineStart beyond document", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([2, 1, 2, 1], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for lineEnd less than 1", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 1, 0, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for negative lineEnd", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 1, -1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for lineEnd beyond document", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 1, 2, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for lineEnd less than lineStart", () => {
      const editor = new Editor(container, "aaa\nbbb\nccc");
      assert.throws(
        () => editor.highlight([3, 1, 1, 3], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for columnStart less than 1", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 0, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for negative columnStart", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, -1, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for columnStart beyond line length", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 7, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for negative columnEnd", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 1, 1, -1], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for columnEnd beyond line length", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 1, 1, 6], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError when columnEnd < columnStart on same line", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 5, 1, 2], "#ff0000"),
        RangeError
      );
    });

    test("does not throw for valid single-character highlight", () => {
      const editor = new Editor(container, "hello");
      assert.doesNotThrow(
        () => editor.highlight([1, 1, 1, 1], "#ff0000")
      );
    });

    test("does not throw for valid full-line highlight", () => {
      const editor = new Editor(container, "hello");
      assert.doesNotThrow(
        () => editor.highlight([1, 1, 1, 5], "#ff0000")
      );
    });

    test("does not throw for valid multi-line highlight", () => {
      const editor = new Editor(container, "aaa\nbbb\nccc");
      assert.doesNotThrow(
        () => editor.highlight([1, 1, 3, 3], "#ff0000")
      );
    });

    test("throws RangeError for lineStart beyond multi-line document", () => {
      const editor = new Editor(container, "aaa\nbbb");
      assert.throws(
        () => editor.highlight([3, 1, 3, 1], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for lineEnd beyond multi-line document", () => {
      const editor = new Editor(container, "aaa\nbbb");
      assert.throws(
        () => editor.highlight([1, 1, 3, 1], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError with descriptive message for bad lineStart", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([0, 1, 1, 5], "#ff0000"),
        (err) => {
          assert.ok(err instanceof RangeError);
          assert.ok(err.message.includes("lineStart"));
          return true;
        }
      );
    });

    test("throws RangeError with descriptive message for bad lineEnd", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 1, 5, 1], "#ff0000"),
        (err) => {
          assert.ok(err instanceof RangeError);
          assert.ok(err.message.includes("lineEnd"));
          return true;
        }
      );
    });

    test("throws RangeError with descriptive message for bad columnStart", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 0, 1, 5], "#ff0000"),
        (err) => {
          assert.ok(err instanceof RangeError);
          assert.ok(err.message.includes("columnStart"));
          return true;
        }
      );
    });

    test("throws RangeError with descriptive message for bad columnEnd", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 1, 1, 6], "#ff0000"),
        (err) => {
          assert.ok(err instanceof RangeError);
          assert.ok(err.message.includes("columnEnd"));
          return true;
        }
      );
    });

    test("valid highlight at boundary columnStart equals line length + 1", () => {
      const editor = new Editor(container, "abc");
      assert.doesNotThrow(
        () => editor.highlight([1, 4, 1, 3], "#ff0000")
      );
    });

    test("valid highlight with columnEnd equal to 0 on same line", () => {
      const editor = new Editor(container, "abc");
      assert.doesNotThrow(
        () => editor.highlight([1, 1, 1, 0], "#ff0000")
      );
    });

    test("does not throw for highlighting second line only", () => {
      const editor = new Editor(container, "aaa\nbbb\nccc");
      assert.doesNotThrow(
        () => editor.highlight([2, 1, 2, 3], "#ff0000")
      );
    });

    test("does not throw for highlighting last line only", () => {
      const editor = new Editor(container, "aaa\nbbb\nccc");
      assert.doesNotThrow(
        () => editor.highlight([3, 1, 3, 3], "#ff0000")
      );
    });
  });

  describe("unhighlight", () => {
    test("unhighlight on editor with no highlights is a no-op", () => {
      const editor = new Editor(container, "hello world");
      assert.doesNotThrow(() => editor.unhighlight());
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("unhighlight clears a single highlight", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
      editor.unhighlight();
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("unhighlight clears multiple highlights", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 7, 1, 11], "#00ff00");
      assert.strictEqual(editor.highlights().length, 2);
      editor.unhighlight();
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("unhighlight can be called multiple times safely", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.unhighlight();
      editor.unhighlight();
      assert.deepStrictEqual(editor.highlights(), []);
    });
  });
});
