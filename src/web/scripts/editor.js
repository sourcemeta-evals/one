import { EditorView, Decoration, ViewPlugin, ViewUpdate, keymap,
         drawSelection, highlightActiveLine, lineNumbers } from "@codemirror/view";
import { EditorState, StateField, StateEffect, RangeSetBuilder } from "@codemirror/state";
import { defaultHighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { history, historyKeymap } from "@codemirror/commands";
import { indentOnInput } from "@codemirror/language";
import { json } from "@codemirror/lang-json";

const setHighlights = StateEffect.define();
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

  highlight(range, color) {
    const [ lineStart, columnStart, lineEnd, columnEnd ] = range;
    const doc = this.view.state.doc;

    if (lineStart < 1 || lineStart > doc.lines) {
      throw new RangeError(`lineStart out of range: ${lineStart}`);
    }

    if (lineEnd < 1 || lineEnd > doc.lines) {
      throw new RangeError(`lineEnd out of range: ${lineEnd}`);
    }

    const fromLine = doc.line(lineStart);
    const toLine = doc.line(lineEnd);

    if (columnStart < 1 || columnStart > fromLine.length + 1) {
      throw new RangeError(`columnStart out of range: ${columnStart}`);
    }

    if (columnEnd < 0 || columnEnd > toLine.length) {
      throw new RangeError(`columnEnd out of range: ${columnEnd}`);
    }

    const from = fromLine.from + columnStart - 1;
    const to = toLine.from + columnEnd;

    if (from > to) {
      throw new RangeError("Highlight start position is after end position");
    }

    const decoration = Decoration.mark({
      attributes: {
        // Margin/padding to compensate whiteness between lines
        style: `
          background-color: ${color};
          margin: -2px 0 -2px 0;
          padding: 2px 0 2px 0;
        `
      }
    });

    // Make sure to not override existing highlights
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

  highlights() {
    const result = [];
    const set = this.view.state.field(highlightPlugin);
    const iter = set.iter();
    while (iter.value) {
      const fromLine = this.view.state.doc.lineAt(iter.from);
      const toLine = this.view.state.doc.lineAt(iter.to);
      const style = iter.value.spec.attributes.style;
      const colorMatch = style.match(/background-color:\s*([^;]+)/);
      result.push({
        range: [
          fromLine.number,
          iter.from - fromLine.from + 1,
          toLine.number,
          iter.to - toLine.from
        ],
        color: colorMatch ? colorMatch[1].trim() : ""
      });

      iter.next();
    }

    return result;
  }

  content() {
    return this.view.state.doc.toString();
  }
};
