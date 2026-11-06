# Anki export

`lib/genanki` is the application-independent Anki wrapper. It accepts deck metadata,
package `Model` instances, and prepared `NoteFieldValues` (strings or `MediaContent`).
It does not read entries, dictionaries, queue rows, or application field definitions.
The Expo adapters provide SQLite, ZIP, media reading, and file output. No changes to
`packages/genanki-ts` are required.

## Application pipeline

- `lib/entry/entry.types.ts` defines a named-field Yomitan term snapshot, including
  dictionary identity and the unmodified transformed `definitions_json`.
- Add and Quick Add store the complete selected term. The model picker captures its
  entry when opened, so later navigation cannot change the queued selection.
- `features/queue/lib/prepare-anki-notes.ts` resolves models and dictionary CSS and
  prepares `expression`, `reading`, and `glossary`. Expression and reading are escaped
  as HTML text and otherwise map directly to their entry values.
- `lib/entry/entry-glossary.ts` reconstructs semantic browser HTML from preserved
  source tags/attributes. Synthetic text wrappers are flattened, numeric directional
  margins use em, and ruby, table spans, details, inline styles, and empty elements
  survive. Deinflection metadata is not glossary display content.
- `lib/entry/dictionary-css.ts` embeds compact, scoped CSS in a style element **inside
  the glossary field payload**, after its HTML. Dictionary CSS is not added to the
  Anki model. Browser media queries and pseudo-elements remain CSS; native layout
  approximations are not used. Selectors are scoped per entry/content/stylesheet,
  IDs are namespaced, and keyframes, custom counters, and font-face names are renamed.
  Legacy nested CSS is flattened with its parent-selector specificity preserved.
- `features/queue/lib/glossary-media.ts` stages local dictionary images and CSS assets
  under dictionary/path/content-derived filenames. References are rewritten to those
  filenames, and duplicate media attachments are removed before packaging. Staged
  files are deleted after packaging, including on failure.
- `exportQueueToAnki` builds a deck from the prepared notes and shares its `.apkg`.
  Temporary databases are closed/deleted on success and failure; completed packages
  live in the application cache.

Models retain their ordinary card templates and base CSS. `FrontSide` is a template
token, not an entry value; newly created models expose only the three data fields.

## Source availability and supported content

The source dictionary must remain installed until export if the model uses glossary.
CSS and images are resolved at export time, not snapshotted in the queue. The finished
package includes the HTML, CSS, and referenced media and no longer depends on the app.
Missing dictionaries/assets produce entry-specific errors shown in the queue screen.

Local image/font URLs and data URLs are supported. External URL assets and CSS imports
must be bundled into the dictionary before export. Conditional media/supports/layer/
container rules, font faces, keyframes, and counters are supported; other at-rules
produce an explicit export error. Internal dictionary query links are preserved as
links but do not gain the mobile app's lookup navigation inside Anki. Optional Yomitan
interactive image-collapse controls are not generated. Audio/video fields are outside
this pipeline.

## Data contracts

Queued entries contain complete term snapshots from the attached `term_bank` view.
The application reads `definitions_json` directly from prebuilt dictionary databases.
`mapStoredModel` normalizes saved `meaning` model/form/template references to `glossary`
when loading a model, preserving model IDs and field/requirement indexes.

## Verification

```sh
node --test lib/genanki/anki-export.test.mjs \
  features/video-player/components/entry-modal.test.mjs \
  features/video-player/lib/dictionary-flow.test.mjs

# Optional integration against a local transformed dictionary:
ANKI_TEST_DICTIONARY=/path/to/dictionary-bundle \
  node --test lib/genanki/anki-export.test.mjs
```

Tests use the unchanged package source, real SQLite and ZIP generation, and a native
filesystem/database adapter. They inspect the exported note fields, model CSS, cards,
and packaged media. Browser visual acceptance in Anki remains a device/client check.
