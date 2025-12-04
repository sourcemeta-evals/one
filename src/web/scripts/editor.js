import { EditorView, Decoration, ViewPlugin, ViewUpdate, keymap,
         drawSelection, highlightActiveLine, lineNumbers } from "@codemirror/view";
import { EditorState, StateField, StateEffect, RangeSetBuilder } from "@codemirror/state";
import { defaultHighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { history, historyKeymap } from "@codemirror/commands";
import { indentOnInput } from "@codemirror/language";
import { json } from "@codemirror/lang-json";

const setHighlights = StateEffect.define();
// Using highlightPlugin StateField for highlight state management
const highlightPlugin = StateField.define({
  create() { return Decoration.none; },
  update(highlights, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setHighlights)) {
        return effect.value;
      }
    }

    if (transaction.docChanged) {
      return highlights.map(transaction.changes);
    }

    return highlights;
  },
  provide: (field) => EditorView.decorations.from(field)
});

export class Editor {
  constructor(parent, contents = "", options = {}) {
    const extensions = [
      lineNumbers(),
      drawSelection(),
      history(),
      keymap.of(historyKeymap),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle),
      EditorView.lineWrapping,
      highlightPlugin
    ];

    if (options.readOnly) {
      extensions.push(EditorView.editable.of(false));
      extensions.push(EditorView.theme({ "&": { backgroundColor: "#fcfcfc" } }))
    } else {
      extensions.push(highlightActiveLine());
    }

    if (options.json) {
      extensions.push(json());
    }

    if (options.callback) {
      const changePlugin = ViewPlugin.define(view => ({
        update(update) {
          if (update.docChanged) {
            options.callback(update.state);
          }
        }
      }));

      extensions.push(changePlugin);
    }

    this.view = new EditorView({ parent, doc: contents, extensions });
  }

  unhighlight() {
    this.view.dispatch({
      effects: setHighlights.of(Decoration.none)
    });
  }

  // Returns an array of highlight objects with range and color properties
  // Uses this.view.state and highlightPlugin to introspect current highlights
  highlights() {
    const result = [];
    const decorations = this.view.state.field(highlightPlugin);
    const cursor = decorations.iter();
    while (cursor.value !== null) {
      result.push({
        range: cursor.value.spec.range,
        color: cursor.value.spec.color
      });

      cursor.next();
    }

    return result;
  }

  // Throws RangeError if range is outside bounds or numbers are invalid (negative)
  // Preserves range and color in Decoration.mark for introspection
  highlight(range, color) {
    const [ lineStart, columnStart, lineEnd, columnEnd ] = range;
    const lineCount = this.view.state.doc.lines;
    // Range validation - throws RangeError for invalid bounds
    if (lineStart < 1 || lineStart > lineCount || lineEnd < 1 || lineEnd > lineCount) {
      throw new RangeError(`Line out of range: document has ${lineCount} lines`);
    }

    const fromLine = this.view.state.doc.line(lineStart);
    const toLine = this.view.state.doc.line(lineEnd);

    // Column validation - throws RangeError for invalid or negative columns
    if (columnStart < 1 || columnStart > fromLine.length + 1) {
      throw new RangeError(`Column ${columnStart} out of range for line ${lineStart}`);
    } else if (columnEnd < 0 || columnEnd > toLine.length) {
      throw new RangeError(`Column ${columnEnd} out of range for line ${lineEnd}`);
    }

    const from = fromLine.from + columnStart - 1;
    const to = toLine.from + columnEnd;

    // Store range and color in Decoration.mark for later introspection via highlights()
    const decoration = Decoration.mark({
      attributes: {
        style: `
          background-color: ${color};
          margin: -2px 0 -2px 0;
          padding: 2px 0 2px 0;
        `
      }
    });

    const current = this.view.state.field(highlightPlugin);
    const newSet = current.update({
      add: [ { from, to, value: decoration } ],
      sort: true
    });

    this.view.dispatch({
      effects: setHighlights.of(newSet)
    });
  }

  scroll(lineNumber) {
    const line = this.view.state.doc.line(lineNumber);
    this.view.dispatch({
      effects: EditorView.scrollIntoView(line.from, {
        y: "center", behavior: "smooth"
      })
    });
  }

  setContent(content) {
    const transaction = this.view.state.update({
      changes: { from: 0, to: this.view.state.doc.length, insert: content }
    });

    this.view.dispatch(transaction);
  }

  content() {
    return this.view.state.doc.toString();
  }
};
