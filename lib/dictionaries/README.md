# Native dictionary rendering

The app installs ZIP archives of SQLite dictionary bundles from
`yomitan-dictionary-transformer`. The Dictionaries toolbar's **+** action opens the
file picker. Select a `.zip` containing these files at the archive root or inside
one enclosing folder. Archives with multiple possible bundles are rejected;
macOS `__MACOSX` metadata is not treated as a bundle:

```text
term_bank.db          # Prebuilt terms table and lookup indexes
index.json            # Original dictionary metadata
manifest.json         # mobile-mining-app-sqlite package contract
styles.css            # Optional, as declared in the manifest
assets/               # Images, fonts and other resources
supporting/           # Supporting banks and ancillary metadata, when present
```

`manifest.json` identifies package schema 1, database schema 1, and
`react-native-component-tree` definition schema 1. Its `database.path` is
`term_bank.db`. `sourceBanks` is an informational conversion count; the application
does not read source term banks or insert term rows. Raw Yomitan dictionaries and
legacy JSON-bank packages must be converted by the transformer before installation.

## Pipeline

1. The Rust transformer builds the standalone terms database, preserves the
   semantic/source definition tree in `definitions_json`, and normalizes CSS.
2. `import-dictionary.ts` copies the selected ZIP into app-owned staging storage,
   checks archive paths and available extraction space, and extracts with
   `react-native-zip-archive`, without loading the archive into JavaScript memory.
   It validates the manifest and declared files, moves the extracted folder into
   place without a second full copy, and registers metadata and CSS. The prebuilt
   database is unchanged; the selected source ZIP is retained. Staging is removed
   after success or failure and before dictionaries are attached on the next launch.
   A receipt written before the move lets startup remove an unregistered destination
   after a force-close, while preserving a successfully registered dictionary.
3. `attachAndBuildViews()` attaches installed `term_bank.db` files on the main lookup
   connection at startup and constructs the temporary `term_bank` union view. Lookups
   read this view. Uninstall removes the metadata, rebuilds the attachments/view, and
   deletes the dictionary folder; it never deletes rows from an attached terms table.
4. `cache.ts` compiles styles once per dictionary/CSS value. Startup initialization
   runs after both databases migrate and loads registered dictionary styles. Uninstall
   removes the corresponding cache entry.
5. `css.ts` reconstructs the original element tree, matches selectors, applies the
   cascade, resolves variables/shorthands, and builds a computed-style tree. Synthetic
   text wrappers are not selector elements. Yomitan `data.class` becomes
   `data-sc-class`, **not** HTML `class`; actual class/id props are matched separately.
   Generated `::before`/`::after` text is added after selector matching.
6. `dictionary-flow.ts` derives block segments and inline runs from computed
   `display`, preserving box boundaries and HTML whitespace rules.
7. `render-entry-modal.tsx` renders native Text/View trees. Pure text runs share a
   Text host; ruby, images and styled inline boxes use wrapping native views.
   `entry-modal.tsx` supplies viewport/theme/font context, dictionary styles and asset
   resolution, and renders each matching entry with its own dictionary context.

Bundle directories have bounded title-derived identifiers and relative paths; sandbox
absolute URIs are not stored in SQLite. The complete package, including its database,
assets and supporting files, stays under that directory. Deletion removes the folder
and style cache. Application lookups read the runtime union view; the app does not
maintain a writable terms table in the main database.

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

## ZIP installation

The native ZIP dependency requires rebuilding the development client/app; a Metro
reload is not enough, and Expo Go is not supported. Rebuild using `npm run ios` or
`npm run android` (install iOS pods as required by your native build workflow).

Allow storage for both the ZIP and its extracted contents. Extraction failures,
including running out of storage, are cleaned up normally; force-closed imports
are cleaned up on the next successful launch, not while the app is stopped.
Raw Yomitan ZIPs still require conversion before installation.

## Verification

From the app directory:

```sh
node --test features/video-player/lib/dictionary-flow.test.mjs
node --test lib/dictionaries/import-dictionary.test.mjs

# Optional rendering check against the first eight rows of a prebuilt bundle:
DICTIONARY_TEST_BUNDLE=/path/to/dictionary-bundle \
  node --test features/video-player/lib/dictionary-flow.test.mjs
```

The bundle tests use real SQLite files and a filesystem adapter, verify that copied
databases remain byte-for-byte unchanged, and exercise union lookups and detachment
before uninstall. ZIP tests use a JavaScript extraction adapter and cover invalid
archives, failed extraction/moving/registration, and interrupted-install recovery.
They do not verify native extraction; test a large real ZIP on iOS and Android,
including force-closing during import and reopening. Native renderer
tests stub host components and do not verify device measurements. Visual acceptance
on iOS/Android, narrow widths, larger fonts and both themes is still required, along
with the additional real dictionaries when their samples are available.
