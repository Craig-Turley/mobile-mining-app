# Native dictionary rendering

The app imports **schema-2 `react-native-component-tree` output** from
`yomitan-dictionary-transformer`. The Dictionaries toolbar offers **Import ZIP** and
**Import folder**. ZIPs can contain the transformed files directly or inside one
enclosing folder; `manifest.json` and `index.json` identify the dictionary root.
Archives containing multiple dictionary roots are rejected. Raw Yomitan dictionaries
must be transformed first.

ZIPs are extracted natively into a unique cache directory before the existing importer
runs. The import overlay covers extraction and database insertion. Extraction files
and the document picker's cached archive are removed afterward, including on failure;
the user's original ZIP is not deleted. The permanent dictionary assets remain after
temporary extraction cleanup.

## Pipeline

1. The Rust transformer preserves the semantic/source tree and uses Lightning CSS
   to flatten nesting and minify `styles.css`. Media queries remain conditional.
2. `db/lib/dictionary-to-sqlite.ts` validates the manifest, streams its banks into
   SQLite, stores CSS in `dictionaries.css`, and copies assets into app-owned storage.
   Assets are staged before the database transaction and promoted before commit;
   ordinary failures roll back rows and clean up staged/promoted files. Re-importing
   an installed title requires deleting the previous revision first.
3. `cache.ts` compiles styles once per dictionary/CSS value. Startup initialization
   runs after both databases migrate. Import/deletion update the cache.
4. `css.ts` reconstructs the original element tree, matches selectors, applies the
   cascade, resolves variables/shorthands, and builds a computed-style tree. Synthetic
   text wrappers are not selector elements. Yomitan `data.class` becomes
   `data-sc-class`, **not** HTML `class`; actual class/id props are matched separately.
   Generated `::before`/`::after` text is added after selector matching.
5. `dictionary-flow.ts` derives block segments and inline runs from computed
   `display`, preserving box boundaries and HTML whitespace rules.
6. `render-entry-modal.tsx` renders native Text/View trees. Pure text runs share a
   Text host; ruby, images and styled inline boxes use wrapping native views.
   `entry-modal.tsx` supplies viewport/theme/font context, dictionary styles and asset
   resolution, and renders each matching entry with its own dictionary context.

Asset directories have bounded title-derived identifiers and relative paths; sandbox
absolute URIs are not stored in SQLite. Deletion removes the assets and style cache.
Old imports with raw nested schema-2 CSS are supported at runtime too. Old imports
that never persisted assets need re-importing to display dictionary images.

## CSS support and fallbacks

- Tag, id, class, attribute, ancestor/child/sibling, structural and supported
  functional selectors via `css-select`; specificity, source order, inline styles
  and `!important` are resolved before layout. Stateful browser interactions such as
  hover do not have a native equivalent.
- Media width/height bounds, one-sided range comparisons, orientation, screen/all/print
  types, and preferred color scheme. Queries use viewport density-independent units;
  percentage layout uses the measured content width. Unsupported conditions fail
  closed, including negated unknown conditions. Other at-rules (including supports,
  layers and keyframes) are skipped with a deduplicated diagnostic.
- Inherited font/color/text properties, variables with fallbacks, font and common
  box shorthands, px/em/rem/percent/vw/vh, numeric `calc()`, borders, spacing, backgrounds,
  text alignment/decoration, basic flex layout, normal/pre/pre-wrap/pre-line/nowrap
  whitespace, and generated string/`attr()` content. Font-relative box spacing follows
  native font scaling. Logical inline/block spacing assumes horizontal LTR layout.
- Standard native colors and the sRGB color mixing used by Jitendex. Color mixing
  supports hex/RGB/common named colors. Unsupported color functions fall back to the
  inherited/default color or omit the unsupported decoration.
- Gradients become a solid color when a stop can be resolved. Clipping, text emphasis,
  browser positioning, grid and transforms retain content in ordinary native layout.
  Unsupported selectors/effects produce deduplicated console diagnostics.
- Lists support decimal, disc, circle, square, custom string and absent markers.
  Tables scroll horizontally and approximate column spans using flex weights; true
  row-span geometry, browser column measurement, margin collapsing, and browser line
  breaking/baselines are not implemented. Mixed inline boxes use Yoga wrapping.
- Details/summary content expands natively, initially respecting `props.open`.
  Expansion does not rerun selectors against a mutated `[open]` attribute. Images
  resolve local assets and explicit dimensions; optional Yomitan image appearance and
  collapse controls currently use the ordinary native image presentation.

Anki serialization and queue integration are outside this rendering pipeline.

## Verification

From the app directory:

```sh
node --test features/video-player/lib/dictionary-flow.test.mjs

# Optional real-dictionary end-to-end test: transforms the first eight entries into
# a temporary directory and verifies native host structure using the normalized CSS.
YOMITAN_SOURCE=../yomitan-dictionary-transformer/jitendex-yomitan \
  YOMITAN_TRANSFORMER=../yomitan-dictionary-transformer \
  node --test features/video-player/lib/dictionary-flow.test.mjs
```

The import tests use real in-memory SQLite and a filesystem adapter; native renderer
tests stub host components and do not verify device measurements. Visual acceptance
on iOS/Android, narrow widths, larger fonts and both themes is still required, along
with the additional real dictionaries when their samples are available.
