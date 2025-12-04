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

  describe("highlights()", () => {
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

    test("returns highlight at end of line", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 5]);
    });

    test("returns highlight starting at column 1", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 3], "#ff0000");
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 3]);
    });

    test("returns highlight on second line", () => {
      const editor = new Editor(container, "line 1\nline 2");
      editor.highlight([2, 1, 2, 6], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [2, 1, 2, 6]);
    });

    test("returns highlight spanning from middle of one line to middle of another", () => {
      const editor = new Editor(container, "hello world\nfoo bar baz");
      editor.highlight([1, 7, 2, 3], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 7, 2, 3]);
    });
  });

  describe("highlight() range validation", () => {
    test("throws RangeError when lineStart is 0", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([0, 1, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError when lineStart is negative", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([-1, 1, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError when lineStart exceeds document lines", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([2, 1, 2, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError when lineEnd is 0", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 1, 0, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError when lineEnd is negative", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 1, -1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError when lineEnd exceeds document lines", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 1, 2, 5], "#ff0000"),
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

    test("throws RangeError when columnStart is 0", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 0, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError when columnStart is negative", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, -1, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError when columnStart exceeds line length", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 7, 1, 7], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError when columnEnd is negative", () => {
      const editor = new Editor(container, "hello world");
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

    test("throws RangeError when columnStart > columnEnd + 1 on same line", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 5, 1, 2], "#ff0000"),
        RangeError
      );
    });

    test("allows columnStart equal to columnEnd + 1 on same line (zero-width)", () => {
      const editor = new Editor(container, "hello world");
      assert.doesNotThrow(
        () => editor.highlight([1, 3, 1, 2], "#ff0000")
      );
    });

    test("allows columnEnd of 0 (before first character)", () => {
      const editor = new Editor(container, "hello world");
      assert.doesNotThrow(
        () => editor.highlight([1, 1, 1, 0], "#ff0000")
      );
    });

    test("allows columnStart at end of line (after last character)", () => {
      const editor = new Editor(container, "hello");
      assert.doesNotThrow(
        () => editor.highlight([1, 6, 1, 5], "#ff0000")
      );
    });

    test("error message includes lineStart value", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([5, 1, 5, 5], "#ff0000"),
        /lineStart 5/
      );
    });

    test("error message includes lineEnd value", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 1, 5, 5], "#ff0000"),
        /lineEnd 5/
      );
    });

    test("error message includes columnStart value", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 10, 1, 5], "#ff0000"),
        /columnStart 10/
      );
    });

    test("error message includes columnEnd value", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 1, 1, 10], "#ff0000"),
        /columnEnd 10/
      );
    });

    test("validates range on multiline document", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      assert.throws(
        () => editor.highlight([4, 1, 4, 5], "#ff0000"),
        RangeError
      );
    });

    test("validates columnEnd against correct line in multiline highlight", () => {
      const editor = new Editor(container, "short\nvery long line here");
      assert.throws(
        () => editor.highlight([1, 1, 2, 20], "#ff0000"),
        RangeError
      );
    });

    test("validates columnStart against correct line in multiline highlight", () => {
      const editor = new Editor(container, "short\nab");
      assert.throws(
        () => editor.highlight([1, 10, 2, 2], "#ff0000"),
        RangeError
      );
    });
  });

  describe("highlight() valid ranges", () => {
    test("highlights single character", () => {
      const editor = new Editor(container, "hello world");
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

    test("highlights middle of line", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 3, 1, 8], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 3, 1, 8]);
    });

    test("highlights across two lines", () => {
      const editor = new Editor(container, "hello\nworld");
      editor.highlight([1, 1, 2, 5], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 2, 5]);
    });

    test("highlights across three lines", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([1, 1, 3, 6], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 3, 6]);
    });

    test("highlights last line only", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([3, 1, 3, 6], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [3, 1, 3, 6]);
    });

    test("highlights with hex color", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights[0].color, "#ff0000");
    });

    test("highlights with named color", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "red");
      const highlights = editor.highlights();
      assert.strictEqual(highlights[0].color, "red");
    });

    test("highlights with rgb color", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "rgb(255, 0, 0)");
      const highlights = editor.highlights();
      assert.strictEqual(highlights[0].color, "rgb(255, 0, 0)");
    });

    test("highlights with rgba color", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "rgba(255, 0, 0, 0.5)");
      const highlights = editor.highlights();
      assert.strictEqual(highlights[0].color, "rgba(255, 0, 0, 0.5)");
    });

    test("highlights empty line", () => {
      const editor = new Editor(container, "hello\n\nworld");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
    });

    test("highlights line with only spaces", () => {
      const editor = new Editor(container, "   ");
      editor.highlight([1, 1, 1, 3], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 3]);
    });
  });

  describe("unhighlight()", () => {
    test("removes single highlight", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
      editor.unhighlight();
      assert.strictEqual(editor.highlights().length, 0);
    });

    test("removes multiple highlights", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 7, 1, 11], "#00ff00");
      assert.strictEqual(editor.highlights().length, 2);
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

  describe("multiple highlights interaction", () => {
    test("preserves existing highlights when adding new one", () => {
      const editor = new Editor(container, "hello world foo bar");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 7, 1, 11], "#00ff00");
      editor.highlight([1, 13, 1, 15], "#0000ff");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 3);
    });

    test("maintains highlight order by position", () => {
      const editor = new Editor(container, "hello world foo");
      editor.highlight([1, 13, 1, 15], "#0000ff");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 7, 1, 11], "#00ff00");
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 5]);
      assert.deepStrictEqual(highlights[1].range, [1, 7, 1, 11]);
      assert.deepStrictEqual(highlights[2].range, [1, 13, 1, 15]);
    });

    test("handles overlapping highlights", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 7], "#ff0000");
      editor.highlight([1, 5, 1, 11], "#00ff00");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 2);
    });

    test("handles adjacent highlights", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 6, 1, 11], "#00ff00");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 2);
    });

    test("handles highlights on different lines", () => {
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

    test("handles nested highlights", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 11], "#ff0000");
      editor.highlight([1, 3, 1, 8], "#00ff00");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 2);
    });
  });

  describe("highlights after content changes", () => {
    test("highlights returns empty after setContent clears document", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.setContent("");
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("highlights persist after setContent with same length", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.setContent("world");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
    });
  });

  describe("edge cases", () => {
    test("highlights single character document", () => {
      const editor = new Editor(container, "a");
      editor.highlight([1, 1, 1, 1], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 1]);
    });

    test("handles document with many lines", () => {
      const lines = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`).join("\n");
      const editor = new Editor(container, lines);
      editor.highlight([50, 1, 50, 7], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [50, 1, 50, 7]);
    });

    test("handles very long line", () => {
      const longLine = "a".repeat(1000);
      const editor = new Editor(container, longLine);
      editor.highlight([1, 500, 1, 600], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 500, 1, 600]);
    });

    test("handles unicode content", () => {
      const editor = new Editor(container, "héllo wörld");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
    });

    test("handles emoji content", () => {
      const editor = new Editor(container, "hello 🌍 world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
    });

    test("handles tab characters", () => {
      const editor = new Editor(container, "hello\tworld");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
    });

    test("handles carriage return characters", () => {
      const editor = new Editor(container, "hello\r\nworld");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
    });
  });
});
