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

  test("highlights returns empty array by default", () => {
    const editor = new Editor(container, "hello world");
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("highlight adds a single highlight", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    const highlights = editor.highlights();
    assert.strictEqual(highlights.length, 1);
    assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 5]);
    assert.strictEqual(highlights[0].color, "#ff0000");
  });

  test("highlight adds multiple highlights", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    editor.highlight([1, 7, 1, 11], "#00ff00");
    const highlights = editor.highlights();
    assert.strictEqual(highlights.length, 2);
  });

  test("highlight preserves color information", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#abcdef");
    const highlights = editor.highlights();
    assert.strictEqual(highlights[0].color, "#abcdef");
  });

  test("highlight works with multiline content", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    editor.highlight([1, 1, 1, 6], "#ff0000");
    editor.highlight([2, 1, 2, 6], "#00ff00");
    editor.highlight([3, 1, 3, 6], "#0000ff");
    const highlights = editor.highlights();
    assert.strictEqual(highlights.length, 3);
  });

  test("highlight works across multiple lines", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    editor.highlight([1, 1, 3, 6], "#ff0000");
    const highlights = editor.highlights();
    assert.strictEqual(highlights.length, 1);
    assert.deepStrictEqual(highlights[0].range, [1, 1, 3, 6]);
  });

  test("highlight works with partial line selection", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 3, 1, 8], "#ff0000");
    const highlights = editor.highlights();
    assert.deepStrictEqual(highlights[0].range, [1, 3, 1, 8]);
  });

  test("unhighlight removes all highlights", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    editor.highlight([1, 7, 1, 11], "#00ff00");
    assert.strictEqual(editor.highlights().length, 2);
    editor.unhighlight();
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("unhighlight on empty highlights does nothing", () => {
    const editor = new Editor(container, "hello world");
    editor.unhighlight();
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("highlight after unhighlight works correctly", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    editor.unhighlight();
    editor.highlight([1, 7, 1, 11], "#00ff00");
    const highlights = editor.highlights();
    assert.strictEqual(highlights.length, 1);
    assert.strictEqual(highlights[0].color, "#00ff00");
  });

  test("highlight throws RangeError for lineStart less than 1", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([0, 1, 1, 5], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for lineStart greater than total lines", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([2, 1, 2, 5], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for lineEnd less than 1", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([1, 1, 0, 5], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for lineEnd greater than total lines", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([1, 1, 2, 5], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError when lineStart greater than lineEnd", () => {
    const editor = new Editor(container, "line 1\nline 2");
    assert.throws(() => {
      editor.highlight([2, 1, 1, 5], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for columnStart less than 1", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([1, 0, 1, 5], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for columnStart greater than line length", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([1, 13, 1, 13], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for columnEnd less than 0", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([1, 1, 1, -1], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for columnEnd greater than line length", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([1, 1, 1, 12], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError when columnStart greater than columnEnd on same line", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([1, 8, 1, 3], "#ff0000");
    }, RangeError);
  });

  test("highlight allows columnStart equal to columnEnd on same line", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 5, 1, 4], "#ff0000");
    const highlights = editor.highlights();
    assert.strictEqual(highlights.length, 1);
  });

  test("highlight works at line boundaries", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 11], "#ff0000");
    const highlights = editor.highlights();
    assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 11]);
  });

  test("highlight works with empty columnEnd (0)", () => {
    const editor = new Editor(container, "line 1\nline 2");
    editor.highlight([1, 1, 2, 0], "#ff0000");
    const highlights = editor.highlights();
    assert.deepStrictEqual(highlights[0].range, [1, 1, 2, 0]);
  });

  test("highlight works at end of line", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 12, 1, 11], "#ff0000");
    const highlights = editor.highlights();
    assert.strictEqual(highlights.length, 1);
  });

  test("highlights returns correct range for first character", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 1], "#ff0000");
    const highlights = editor.highlights();
    assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 1]);
  });

  test("highlights returns correct range for last character", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 11, 1, 11], "#ff0000");
    const highlights = editor.highlights();
    assert.deepStrictEqual(highlights[0].range, [1, 11, 1, 11]);
  });

  test("highlight with different color formats", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 3], "rgb(255, 0, 0)");
    const highlights = editor.highlights();
    assert.strictEqual(highlights[0].color, "rgb(255, 0, 0)");
  });

  test("highlight with named color", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 3], "red");
    const highlights = editor.highlights();
    assert.strictEqual(highlights[0].color, "red");
  });

  test("multiple highlights maintain order", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 3], "#ff0000");
    editor.highlight([1, 5, 1, 7], "#00ff00");
    editor.highlight([1, 9, 1, 11], "#0000ff");
    const highlights = editor.highlights();
    assert.strictEqual(highlights.length, 3);
    assert.strictEqual(highlights[0].color, "#ff0000");
    assert.strictEqual(highlights[1].color, "#00ff00");
    assert.strictEqual(highlights[2].color, "#0000ff");
  });

  test("highlight on multiline document with varying line lengths", () => {
    const editor = new Editor(container, "short\nmedium line\nvery long line here");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    editor.highlight([2, 1, 2, 11], "#00ff00");
    editor.highlight([3, 1, 3, 19], "#0000ff");
    const highlights = editor.highlights();
    assert.strictEqual(highlights.length, 3);
  });

  test("highlight spanning from middle of one line to middle of another", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    editor.highlight([1, 3, 3, 4], "#ff0000");
    const highlights = editor.highlights();
    assert.deepStrictEqual(highlights[0].range, [1, 3, 3, 4]);
  });

  test("highlight throws RangeError with descriptive message for lineStart", () => {
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

  test("highlight throws RangeError with descriptive message for columnStart", () => {
    const editor = new Editor(container, "hello world");
    try {
      editor.highlight([1, 50, 1, 50], "#ff0000");
      assert.fail("Expected RangeError to be thrown");
    } catch (error) {
      assert(error instanceof RangeError);
      assert(error.message.includes("columnStart"));
      assert(error.message.includes("50"));
    }
  });

  test("highlights returns empty array after setContent clears document", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    editor.setContent("");
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("highlight on single character", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 5, 1, 5], "#ff0000");
    const highlights = editor.highlights();
    assert.strictEqual(highlights.length, 1);
    assert.deepStrictEqual(highlights[0].range, [1, 5, 1, 5]);
  });

  test("highlight entire document", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    editor.highlight([1, 1, 3, 6], "#ff0000");
    const highlights = editor.highlights();
    assert.strictEqual(highlights.length, 1);
    assert.deepStrictEqual(highlights[0].range, [1, 1, 3, 6]);
  });

  test("overlapping highlights are preserved", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 7], "#ff0000");
    editor.highlight([1, 5, 1, 11], "#00ff00");
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

  test("highlight boundary at columnStart equals line length plus 1", () => {
    const editor = new Editor(container, "hello");
    editor.highlight([1, 6, 1, 5], "#ff0000");
    const highlights = editor.highlights();
    assert.strictEqual(highlights.length, 1);
  });

  test("highlight throws for columnStart beyond line length plus 1", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([1, 7, 1, 5], "#ff0000");
    }, RangeError);
  });

  test("highlight on empty line", () => {
    const editor = new Editor(container, "line 1\n\nline 3");
    editor.highlight([1, 1, 1, 6], "#ff0000");
    editor.highlight([3, 1, 3, 6], "#0000ff");
    const highlights = editor.highlights();
    assert.strictEqual(highlights.length, 2);
  });

  test("highlight throws for any column on empty line except column 1", () => {
    const editor = new Editor(container, "line 1\n\nline 3");
    assert.throws(() => {
      editor.highlight([2, 2, 2, 1], "#ff0000");
    }, RangeError);
  });

  test("highlight allows column 1 on empty line", () => {
    const editor = new Editor(container, "line 1\n\nline 3");
    editor.highlight([2, 1, 2, 0], "#ff0000");
    const highlights = editor.highlights();
    assert.strictEqual(highlights.length, 1);
  });

  test("highlights array contains objects with correct structure", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    const highlights = editor.highlights();
    assert(Array.isArray(highlights));
    assert(typeof highlights[0] === "object");
    assert(Array.isArray(highlights[0].range));
    assert(highlights[0].range.length === 4);
    assert(typeof highlights[0].color === "string");
  });

  test("highlights range values are all numbers", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    const highlights = editor.highlights();
    const [lineStart, columnStart, lineEnd, columnEnd] = highlights[0].range;
    assert(typeof lineStart === "number");
    assert(typeof columnStart === "number");
    assert(typeof lineEnd === "number");
    assert(typeof columnEnd === "number");
  });
});
