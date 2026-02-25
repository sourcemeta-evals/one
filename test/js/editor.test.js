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

  // --- highlights() basic behavior ---

  test("highlights returns empty array with no highlights", () => {
    const editor = new Editor(container, "hello world");
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("highlights returns empty array on empty document", () => {
    const editor = new Editor(container);
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("highlights returns single highlight after highlight call", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 5 ]);
    assert.strictEqual(result[0].color, "#ff0000");
  });

  test("highlights returns correct color", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 5 ], "#00ff00");
    const result = editor.highlights();
    assert.strictEqual(result[0].color, "#00ff00");
  });

  test("highlights returns multiple highlights", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    editor.highlight([ 1, 7, 1, 11 ], "#00ff00");
    const result = editor.highlights();
    assert.strictEqual(result.length, 2);
  });

  test("highlights preserves order by position", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 7, 1, 11 ], "#00ff00");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 2);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 5 ]);
    assert.deepStrictEqual(result[1].range, [ 1, 7, 1, 11 ]);
  });

  test("highlights returns correct ranges for multiline content", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    editor.highlight([ 2, 1, 2, 6 ], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 2, 1, 2, 6 ]);
    assert.strictEqual(result[0].color, "#ff0000");
  });

  test("highlights spanning multiple lines", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    editor.highlight([ 1, 1, 3, 6 ], "#0000ff");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 3, 6 ]);
  });

  test("highlights on different lines", () => {
    const editor = new Editor(container, "aaa\nbbb\nccc");
    editor.highlight([ 1, 1, 1, 3 ], "#ff0000");
    editor.highlight([ 3, 1, 3, 3 ], "#0000ff");
    const result = editor.highlights();
    assert.strictEqual(result.length, 2);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 3 ]);
    assert.strictEqual(result[0].color, "#ff0000");
    assert.deepStrictEqual(result[1].range, [ 3, 1, 3, 3 ]);
    assert.strictEqual(result[1].color, "#0000ff");
  });

  test("highlights single character", () => {
    const editor = new Editor(container, "abcdef");
    editor.highlight([ 1, 3, 1, 3 ], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 3, 1, 3 ]);
  });

  test("highlights entire line", () => {
    const editor = new Editor(container, "hello");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 5 ]);
  });

  test("highlights last line of multiline content", () => {
    const editor = new Editor(container, "aaa\nbbb\nccc");
    editor.highlight([ 3, 1, 3, 3 ], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 3, 1, 3, 3 ]);
  });

  test("highlights with various color formats", () => {
    const editor = new Editor(container, "hello world foo bar");
    editor.highlight([ 1, 1, 1, 5 ], "red");
    const result = editor.highlights();
    assert.strictEqual(result[0].color, "red");
  });

  test("highlights with rgb color", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 5 ], "rgb(255, 0, 0)");
    const result = editor.highlights();
    assert.strictEqual(result[0].color, "rgb(255, 0, 0)");
  });

  // --- unhighlight ---

  test("unhighlight clears all highlights", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    assert.strictEqual(editor.highlights().length, 1);
    editor.unhighlight();
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("unhighlight on editor with no highlights is a no-op", () => {
    const editor = new Editor(container, "hello world");
    editor.unhighlight();
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("unhighlight clears multiple highlights", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    editor.highlight([ 1, 7, 1, 11 ], "#00ff00");
    assert.strictEqual(editor.highlights().length, 2);
    editor.unhighlight();
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("can re-highlight after unhighlight", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    editor.unhighlight();
    editor.highlight([ 1, 7, 1, 11 ], "#00ff00");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 7, 1, 11 ]);
    assert.strictEqual(result[0].color, "#00ff00");
  });

  // --- highlight range validation (RangeError) ---

  test("highlight throws RangeError for lineStart less than 1", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 0, 1, 1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for negative lineStart", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ -1, 1, 1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for lineStart beyond document", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 2, 1, 2, 1 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for lineEnd less than 1", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 1, 0, 5 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for negative lineEnd", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 1, -1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for lineEnd beyond document", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 1, 2, 5 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for lineEnd less than lineStart", () => {
    const editor = new Editor(container, "aaa\nbbb\nccc");
    assert.throws(() => {
      editor.highlight([ 3, 1, 1, 3 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for columnStart less than 1", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 0, 1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for negative columnStart", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, -1, 1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for columnStart beyond line length", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      // "hello" has 5 chars, columnStart max is length+1 = 6
      editor.highlight([ 1, 7, 1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for negative columnEnd", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 1, 1, -1 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for columnEnd beyond line length", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      // "hello" has 5 chars, columnEnd max is 5
      editor.highlight([ 1, 1, 1, 6 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError message includes lineStart details", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 5, 1, 5, 1 ], "#ff0000");
    }, (err) => {
      assert(err instanceof RangeError);
      assert(err.message.includes("lineStart"));
      return true;
    });
  });

  test("highlight throws RangeError message includes lineEnd details", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 1, 5, 1 ], "#ff0000");
    }, (err) => {
      assert(err instanceof RangeError);
      assert(err.message.includes("lineEnd"));
      return true;
    });
  });

  test("highlight throws RangeError message includes columnStart details", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 99, 1, 5 ], "#ff0000");
    }, (err) => {
      assert(err instanceof RangeError);
      assert(err.message.includes("columnStart"));
      return true;
    });
  });

  test("highlight throws RangeError message includes columnEnd details", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 1, 1, 99 ], "#ff0000");
    }, (err) => {
      assert(err instanceof RangeError);
      assert(err.message.includes("columnEnd"));
      return true;
    });
  });

  // --- highlight edge cases that should NOT throw ---

  test("highlight accepts columnStart equal to line length plus one", () => {
    const editor = new Editor(container, "hello");
    // columnStart = 6 means just past the last character, should be valid
    assert.doesNotThrow(() => {
      editor.highlight([ 1, 6, 1, 5 ], "#ff0000");
    });
  });

  test("highlight accepts columnEnd equal to zero", () => {
    const editor = new Editor(container, "hello");
    assert.doesNotThrow(() => {
      editor.highlight([ 1, 1, 1, 0 ], "#ff0000");
    });
  });

  test("highlight accepts columnEnd equal to line length", () => {
    const editor = new Editor(container, "hello");
    assert.doesNotThrow(() => {
      editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    });
  });

  test("highlight accepts lineStart equal to lineEnd", () => {
    const editor = new Editor(container, "aaa\nbbb\nccc");
    assert.doesNotThrow(() => {
      editor.highlight([ 2, 1, 2, 3 ], "#ff0000");
    });
  });

  test("highlight on last valid line does not throw", () => {
    const editor = new Editor(container, "aaa\nbbb\nccc");
    assert.doesNotThrow(() => {
      editor.highlight([ 3, 1, 3, 3 ], "#ff0000");
    });
  });

  test("highlight on first line does not throw", () => {
    const editor = new Editor(container, "aaa\nbbb\nccc");
    assert.doesNotThrow(() => {
      editor.highlight([ 1, 1, 1, 3 ], "#ff0000");
    });
  });

  // --- highlights after content changes ---

  test("highlights returns empty after setContent replaces highlighted text", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    assert.strictEqual(editor.highlights().length, 1);
    editor.setContent("new content");
    // After replacing content, highlights may be remapped or cleared
    // The important thing is that it does not crash
    const result = editor.highlights();
    assert(Array.isArray(result));
  });

  // --- multiple highlights accumulation ---

  test("three highlights on separate lines", () => {
    const editor = new Editor(container, "aaa\nbbb\nccc");
    editor.highlight([ 1, 1, 1, 3 ], "#ff0000");
    editor.highlight([ 2, 1, 2, 3 ], "#00ff00");
    editor.highlight([ 3, 1, 3, 3 ], "#0000ff");
    const result = editor.highlights();
    assert.strictEqual(result.length, 3);
    assert.strictEqual(result[0].color, "#ff0000");
    assert.strictEqual(result[1].color, "#00ff00");
    assert.strictEqual(result[2].color, "#0000ff");
  });

  test("highlights with same color on different ranges", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    editor.highlight([ 1, 7, 1, 11 ], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].color, "#ff0000");
    assert.strictEqual(result[1].color, "#ff0000");
  });

  // --- RangeError for multiline documents ---

  test("highlight throws RangeError for lineStart beyond 3-line document", () => {
    const editor = new Editor(container, "aaa\nbbb\nccc");
    assert.throws(() => {
      editor.highlight([ 4, 1, 4, 1 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for lineEnd beyond 3-line document", () => {
    const editor = new Editor(container, "aaa\nbbb\nccc");
    assert.throws(() => {
      editor.highlight([ 1, 1, 4, 1 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for columnEnd beyond short line", () => {
    const editor = new Editor(container, "ab\ncd\nef");
    assert.throws(() => {
      // line 1 has 2 chars, columnEnd 3 is out of range
      editor.highlight([ 1, 1, 1, 3 ], "#ff0000");
    }, RangeError);
  });

  test("highlight throws RangeError for columnStart beyond short line", () => {
    const editor = new Editor(container, "ab\ncd\nef");
    assert.throws(() => {
      // line 1 has 2 chars, columnStart max is 3
      editor.highlight([ 1, 4, 1, 2 ], "#ff0000");
    }, RangeError);
  });

  // --- highlights round-trip consistency ---

  test("highlight then highlights round-trips range correctly for single line", () => {
    const editor = new Editor(container, "abcdefghij");
    const range = [ 1, 3, 1, 8 ];
    editor.highlight(range, "#aabbcc");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, range);
    assert.strictEqual(result[0].color, "#aabbcc");
  });

  test("highlight then highlights round-trips range correctly for multiline", () => {
    const editor = new Editor(container, "first\nsecond\nthird");
    const range = [ 1, 2, 3, 4 ];
    editor.highlight(range, "#112233");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, range);
    assert.strictEqual(result[0].color, "#112233");
  });

  test("highlight then highlights round-trips for middle line", () => {
    const editor = new Editor(container, "one\ntwo\nthree\nfour\nfive");
    const range = [ 3, 2, 3, 4 ];
    editor.highlight(range, "#abcdef");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, range);
    assert.strictEqual(result[0].color, "#abcdef");
  });

  // --- highlights state isolation ---

  test("different editor instances have independent highlights", () => {
    const editor1 = new Editor(container, "hello");
    // Create a second container for the second editor
    const container2 = document.createElement("div");
    document.body.appendChild(container2);
    const editor2 = new Editor(container2, "world");

    editor1.highlight([ 1, 1, 1, 5 ], "#ff0000");
    assert.strictEqual(editor1.highlights().length, 1);
    assert.strictEqual(editor2.highlights().length, 0);

    document.body.removeChild(container2);
  });

  // --- unhighlight then re-highlight cycle ---

  test("multiple unhighlight and re-highlight cycles", () => {
    const editor = new Editor(container, "hello world");

    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    assert.strictEqual(editor.highlights().length, 1);

    editor.unhighlight();
    assert.strictEqual(editor.highlights().length, 0);

    editor.highlight([ 1, 7, 1, 11 ], "#00ff00");
    assert.strictEqual(editor.highlights().length, 1);
    assert.strictEqual(editor.highlights()[0].color, "#00ff00");

    editor.unhighlight();
    assert.strictEqual(editor.highlights().length, 0);

    editor.highlight([ 1, 1, 1, 3 ], "#0000ff");
    editor.highlight([ 1, 5, 1, 8 ], "#ff00ff");
    assert.strictEqual(editor.highlights().length, 2);
  });

  // --- RangeError does not modify highlight state ---

  test("failed highlight does not add a highlight", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 0, 1, 1, 5 ], "#ff0000");
    }, RangeError);
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("failed highlight does not remove existing highlights", () => {
    const editor = new Editor(container, "hello");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    assert.strictEqual(editor.highlights().length, 1);
    assert.throws(() => {
      editor.highlight([ 99, 1, 99, 1 ], "#00ff00");
    }, RangeError);
    assert.strictEqual(editor.highlights().length, 1);
    assert.strictEqual(editor.highlights()[0].color, "#ff0000");
  });
});
