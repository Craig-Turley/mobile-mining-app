# Application appearance

`DEFAULT_THEME` in `app-theme.ts` is currently `dark`. There is no exposed theme
selector. Both palettes and the provider's `setTheme`/`toggleTheme` APIs remain usable
so light mode can be enabled later without changing individual screens.

## One resolved theme

`AppThemeProvider` owns the resolved `ThemeName`. It derives:

- semantic color tokens and NativeWind variables;
- React Navigation's theme (including `dark`, fonts, card and content colors);
- one app-level React Native Appearance override;
- the native root background via `expo-system-ui`;
- one explicit status-bar contrast setting.

Appearance is synchronized in a root layout effect only when the theme changes, not
on route focus. There is intentionally no cleanup that resets it to the system mode
when a view unmounts. NativeWind observes the same React Native Appearance value;
there is no second NativeWind color-scheme setter or competing system-theme listener.

The gesture root, root Stack, and native tab content all have palette-derived backing
colors. Nested native stacks inherit the navigation theme. Tab icon/label colors use
native dynamic colors on iOS so Liquid Glass can maintain its contrast; Android uses
the resolved palette directly. No static experimental tab appearance override is used,
and no opaque tab-bar background replaces Liquid Glass.

## Native defaults

`app.json` sets `userInterfaceStyle` to `dark`, and the root/splash backgrounds match
the default palette. `expo-system-ui` applies the supported native configuration on
iOS and Android. Changing these values or adding that native module requires a new
development/release build; Fast Refresh does not update the installed Info.plist or
Android resources. Regenerate through Expo config/prebuild rather than patching library
code or forcing colors in individual native components.

## Enabling light or system mode later

1. Change native `userInterfaceStyle` to `automatic` and rebuild.
2. Add and persist a `system | light | dark` preference; resolve it to a `ThemeName`
   before rendering navigation. Keep the current provider as the single output owner.
3. Replace the fixed startup choice with that resolved preference. Keep the splash
   visible while restoring a saved preference if necessary to avoid a wrong-theme frame.
4. For system preference, release the native app override explicitly and observe the
   system scheme. Do not use the app's own forced Appearance value as an independent
   source of truth and feed it back into competing overrides.
5. Check custom controls, dictionary styling, and native presentations under both
   palettes. Components should consume semantic tokens, not hardcoded dark colors.

## Verification

```sh
node --test theme/theme.test.mjs
```

The tests cover palette/navigation/native/status synchronization, stable appearance
across renders, future light-mode transitions, native-tab backing colors, and build
configuration consistency. They adapt native hosts; final visual acceptance requires
the rebuilt app on iOS 26 with the device in light mode, repeated tab switches,
stack push/pop and interactive back gestures, dialogs/pickers/share sheets, and
background/resume. Repeat with the device in dark mode. Normal glass contrast
adaptation should remain, with no light backing-surface flashes during transitions.
