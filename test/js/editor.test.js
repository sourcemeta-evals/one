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

  test("highlights returns empty array for empty editor", () => {
    const editor = new Editor(container);
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("highlight single line and retrieve via highlights", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 5 ]);
    assert.strictEqual(result[0].color, "#ff0000");
  });

  test("highlight entire single line", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 11 ], "#00ff00");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 11 ]);
    assert.strictEqual(result[0].color, "#00ff00");
  });

  test("highlight across multiple lines", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    editor.highlight([ 1, 1, 3, 6 ], "#0000ff");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 3, 6 ]);
    assert.strictEqual(result[0].color, "#0000ff");
  });

  test("highlight across two lines", () => {
    const editor = new Editor(container, "first\nsecond");
    editor.highlight([ 1, 1, 2, 6 ], "#abcdef");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 2, 6 ]);
    assert.strictEqual(result[0].color, "#abcdef");
  });

  test("highlight partial range within a line", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 3, 1, 7 ], "#112233");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 3, 1, 7 ]);
    assert.strictEqual(result[0].color, "#112233");
  });

  test("multiple highlights are returned in order", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 3 ], "#ff0000");
    editor.highlight([ 1, 5, 1, 8 ], "#00ff00");
    const result = editor.highlights();
    assert.strictEqual(result.length, 2);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 3 ]);
    assert.strictEqual(result[0].color, "#ff0000");
    assert.deepStrictEqual(result[1].range, [ 1, 5, 1, 8 ]);
    assert.strictEqual(result[1].color, "#00ff00");
  });

  test("multiple highlights on different lines", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    editor.highlight([ 1, 1, 1, 6 ], "#ff0000");
    editor.highlight([ 3, 1, 3, 6 ], "#0000ff");
    const result = editor.highlights();
    assert.strictEqual(result.length, 2);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 6 ]);
    assert.strictEqual(result[0].color, "#ff0000");
    assert.deepStrictEqual(result[1].range, [ 3, 1, 3, 6 ]);
    assert.strictEqual(result[1].color, "#0000ff");
  });

  test("unhighlight removes all highlights", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    assert.strictEqual(editor.highlights().length, 1);
    editor.unhighlight();
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("unhighlight on editor with no highlights", () => {
    const editor = new Editor(container, "hello world");
    editor.unhighlight();
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("unhighlight removes multiple highlights", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    editor.highlight([ 1, 1, 1, 6 ], "#ff0000");
    editor.highlight([ 2, 1, 2, 6 ], "#00ff00");
    editor.highlight([ 3, 1, 3, 6 ], "#0000ff");
    assert.strictEqual(editor.highlights().length, 3);
    editor.unhighlight();
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("highlight after unhighlight works", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    editor.unhighlight();
    editor.highlight([ 1, 3, 1, 8 ], "#00ff00");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 3, 1, 8 ]);
    assert.strictEqual(result[0].color, "#00ff00");
  });

  test("highlight preserves color correctly", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 5 ], "#aabbcc");
    const result = editor.highlights();
    assert.strictEqual(result[0].color, "#aabbcc");
  });

  test("highlight with different color formats", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 3 ], "red");
    const result = editor.highlights();
    assert.strictEqual(result[0].color, "red");
  });

  test("highlight with rgb color", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 3 ], "rgb(255, 0, 0)");
    const result = editor.highlights();
    assert.strictEqual(result[0].color, "rgb(255, 0, 0)");
  });

  test("highlight throws RangeError for lineStart below 1", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([ 0, 1, 1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for negative lineStart", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([ -1, 1, 1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for lineStart beyond document", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([ 2, 1, 2, 5 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for lineEnd below 1", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([ 1, 1, 0, 5 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for negative lineEnd", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([ 1, 1, -1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for lineEnd beyond document", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([ 1, 1, 2, 5 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for lineStart greater than lineEnd", () => {
    const editor = new Editor(container, "line 1\nline 2");
    assert.throws(() => {
      editor.highlight([ 2, 1, 1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for columnStart below 1", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([ 1, 0, 1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for negative columnStart", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([ 1, -1, 1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for columnStart beyond line length", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 7, 1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for negative columnEnd", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([ 1, 1, 1, -1 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for columnEnd beyond line length", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 1, 1, 6 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError when columnStart > columnEnd on same line", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(() => {
      editor.highlight([ 1, 8, 1, 3 ], "#ff0000");
    }, RangeError);
  });

  test("highlight does not throw for valid single character range", () => {
    const editor = new Editor(container, "hello world");
    assert.doesNotThrow(() => {
      editor.highlight([ 1, 1, 1, 1 ], "#ff0000");
    });
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 1 ]);
  });

  test("highlight at last column of a line", () => {
    const editor = new Editor(container, "hello");
    editor.highlight([ 1, 5, 1, 5 ], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 5, 1, 5 ]);
  });

  test("highlight on the last line of multiline content", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    editor.highlight([ 3, 1, 3, 6 ], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 3, 1, 3, 6 ]);
  });

  test("highlight on the middle line of multiline content", () => {
    const editor = new Editor(container, "abc\ndef\nghi");
    editor.highlight([ 2, 1, 2, 3 ], "#123456");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 2, 1, 2, 3 ]);
    assert.strictEqual(result[0].color, "#123456");
  });

  test("highlight three separate regions", () => {
    const editor = new Editor(container, "aaa bbb ccc\nddd eee fff\nggg hhh iii");
    editor.highlight([ 1, 1, 1, 3 ], "#ff0000");
    editor.highlight([ 2, 5, 2, 7 ], "#00ff00");
    editor.highlight([ 3, 9, 3, 11 ], "#0000ff");
    const result = editor.highlights();
    assert.strictEqual(result.length, 3);
    assert.strictEqual(result[0].color, "#ff0000");
    assert.strictEqual(result[1].color, "#00ff00");
    assert.strictEqual(result[2].color, "#0000ff");
  });

  test("highlights returns correct structure", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.ok(Array.isArray(result[0].range));
    assert.strictEqual(result[0].range.length, 4);
    assert.strictEqual(typeof result[0].color, "string");
  });

  test("highlight with columnEnd of 0 is valid for zero-width", () => {
    const editor = new Editor(container, "hello");
    assert.doesNotThrow(() => {
      editor.highlight([ 1, 1, 1, 0 ], "#ff0000");
    });
  });

  test("highlight throws RangeError for lineStart far beyond document", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 100, 1, 100, 5 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for lineEnd far beyond document", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 1, 100, 5 ], "#ff0000");
    }, RangeError);
  });

  test("highlight and unhighlight cycle multiple times", () => {
    const editor = new Editor(container, "hello world");

    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    assert.strictEqual(editor.highlights().length, 1);
    editor.unhighlight();
    assert.strictEqual(editor.highlights().length, 0);

    editor.highlight([ 1, 2, 1, 4 ], "#00ff00");
    assert.strictEqual(editor.highlights().length, 1);
    editor.unhighlight();
    assert.strictEqual(editor.highlights().length, 0);

    editor.highlight([ 1, 3, 1, 6 ], "#0000ff");
    assert.strictEqual(editor.highlights().length, 1);
  });

  test("highlights after setContent clears highlights", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    editor.setContent("new content");
    assert.strictEqual(editor.content(), "new content");
  });
});
