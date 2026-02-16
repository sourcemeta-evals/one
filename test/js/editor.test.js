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

describe("Editor highlight", () => {
  const container = document.getElementById("editor");

  beforeEach(() => {
    container.innerHTML = "";
  });

  test("highlights returns empty array by default", () => {
    const editor = new Editor(container, "hello world");
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("highlight a single-line range", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 5 ]);
    assert.strictEqual(result[0].color, "#ff0000");
  });

  test("highlight preserves the color", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 5 ], "#00ff00");
    const result = editor.highlights();
    assert.strictEqual(result[0].color, "#00ff00");
  });

  test("highlight a multi-line range", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    editor.highlight([ 1, 1, 2, 6 ], "#0000ff");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 2, 6 ]);
    assert.strictEqual(result[0].color, "#0000ff");
  });

  test("highlight middle of a line", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 3, 1, 7 ], "#aabbcc");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 3, 1, 7 ]);
  });

  test("highlight entire single line", () => {
    const editor = new Editor(container, "hello");
    editor.highlight([ 1, 1, 1, 5 ], "#112233");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 5 ]);
  });

  test("multiple highlights accumulate", () => {
    const editor = new Editor(container, "aaaa\nbbbb\ncccc");
    editor.highlight([ 1, 1, 1, 4 ], "#ff0000");
    editor.highlight([ 3, 1, 3, 4 ], "#00ff00");
    const result = editor.highlights();
    assert.strictEqual(result.length, 2);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 4 ]);
    assert.strictEqual(result[0].color, "#ff0000");
    assert.deepStrictEqual(result[1].range, [ 3, 1, 3, 4 ]);
    assert.strictEqual(result[1].color, "#00ff00");
  });

  test("multiple highlights with different colors", () => {
    const editor = new Editor(container, "aaa\nbbb\nccc");
    editor.highlight([ 1, 1, 1, 3 ], "#111111");
    editor.highlight([ 2, 1, 2, 3 ], "#222222");
    editor.highlight([ 3, 1, 3, 3 ], "#333333");
    const result = editor.highlights();
    assert.strictEqual(result.length, 3);
    assert.strictEqual(result[0].color, "#111111");
    assert.strictEqual(result[1].color, "#222222");
    assert.strictEqual(result[2].color, "#333333");
  });

  test("unhighlight clears all highlights", () => {
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

  test("unhighlight clears multiple highlights", () => {
    const editor = new Editor(container, "aaa\nbbb\nccc");
    editor.highlight([ 1, 1, 1, 3 ], "#ff0000");
    editor.highlight([ 2, 1, 2, 3 ], "#00ff00");
    editor.highlight([ 3, 1, 3, 3 ], "#0000ff");
    assert.strictEqual(editor.highlights().length, 3);
    editor.unhighlight();
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("highlight after unhighlight works", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    editor.unhighlight();
    editor.highlight([ 1, 1, 1, 3 ], "#00ff00");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 3 ]);
    assert.strictEqual(result[0].color, "#00ff00");
  });

  test("highlight spanning all lines", () => {
    const editor = new Editor(container, "aaa\nbbb\nccc");
    editor.highlight([ 1, 1, 3, 3 ], "#abcdef");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 3, 3 ]);
  });

  test("highlight single character", () => {
    const editor = new Editor(container, "hello");
    editor.highlight([ 1, 1, 1, 1 ], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 1 ]);
  });

  test("highlight last character of a line", () => {
    const editor = new Editor(container, "hello");
    editor.highlight([ 1, 5, 1, 5 ], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 5, 1, 5 ]);
  });

  test("highlight on second line", () => {
    const editor = new Editor(container, "aaa\nbbb");
    editor.highlight([ 2, 1, 2, 3 ], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 2, 1, 2, 3 ]);
  });

  test("highlight on last line of multi-line content", () => {
    const editor = new Editor(container, "aaa\nbbb\nccc\nddd");
    editor.highlight([ 4, 1, 4, 3 ], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 4, 1, 4, 3 ]);
  });

  test("highlight with zero columnEnd highlights nothing visible", () => {
    const editor = new Editor(container, "hello");
    editor.highlight([ 1, 1, 1, 0 ], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 0 ]);
  });

  test("highlights returns correct structure", () => {
    const editor = new Editor(container, "hello");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    const result = editor.highlights();
    assert.ok(Array.isArray(result));
    assert.ok(Array.isArray(result[0].range));
    assert.strictEqual(result[0].range.length, 4);
    assert.strictEqual(typeof result[0].color, "string");
  });
});

describe("Editor highlight RangeError", () => {
  const container = document.getElementById("editor");

  beforeEach(() => {
    container.innerHTML = "";
  });

  test("throws RangeError for lineStart less than 1", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 0, 1, 1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for lineEnd less than 1", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 1, 0, 5 ], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for negative lineStart", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ -1, 1, 1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for negative lineEnd", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 1, -1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for lineStart beyond document", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 2, 1, 2, 1 ], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for lineEnd beyond document", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 1, 2, 1 ], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for lineStart far beyond document", () => {
    const editor = new Editor(container, "aaa\nbbb");
    assert.throws(() => {
      editor.highlight([ 100, 1, 100, 1 ], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for columnStart less than 1", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 0, 1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for negative columnStart", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, -1, 1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for columnStart beyond line length", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 7, 1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for columnEnd beyond line length", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 1, 1, 6 ], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for negative columnEnd", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 1, 1, -1 ], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError when start line is after end line", () => {
    const editor = new Editor(container, "aaa\nbbb\nccc");
    assert.throws(() => {
      editor.highlight([ 3, 1, 1, 3 ], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError when same line but start column after end column", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 4, 1, 2 ], "#ff0000");
    }, RangeError);
  });

  test("does not throw for valid single-line range", () => {
    const editor = new Editor(container, "hello");
    assert.doesNotThrow(() => {
      editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    });
  });

  test("does not throw for valid multi-line range", () => {
    const editor = new Editor(container, "aaa\nbbb\nccc");
    assert.doesNotThrow(() => {
      editor.highlight([ 1, 1, 3, 3 ], "#ff0000");
    });
  });

  test("does not throw for columnStart at end of line", () => {
    const editor = new Editor(container, "hello");
    assert.doesNotThrow(() => {
      editor.highlight([ 1, 5, 1, 5 ], "#ff0000");
    });
  });

  test("does not throw for columnEnd equal to zero", () => {
    const editor = new Editor(container, "hello");
    assert.doesNotThrow(() => {
      editor.highlight([ 1, 1, 1, 0 ], "#ff0000");
    });
  });

  test("throws RangeError for columnStart beyond second line", () => {
    const editor = new Editor(container, "hello\nhi");
    assert.throws(() => {
      editor.highlight([ 2, 4, 2, 2 ], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for columnEnd beyond second line", () => {
    const editor = new Editor(container, "hello\nhi");
    assert.throws(() => {
      editor.highlight([ 2, 1, 2, 3 ], "#ff0000");
    }, RangeError);
  });

  test("does not modify highlights when RangeError is thrown", () => {
    const editor = new Editor(container, "hello");
    editor.highlight([ 1, 1, 1, 3 ], "#ff0000");
    assert.throws(() => {
      editor.highlight([ 5, 1, 5, 1 ], "#00ff00");
    }, RangeError);
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 3 ]);
    assert.strictEqual(result[0].color, "#ff0000");
  });
});
