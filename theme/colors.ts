
export type ColorTokens = {
  background: string;
  foreground: string;
  surface: string;
  surfaceElevated: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryMuted: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  jp: string;
  jpMuted: string;
  posNoun: string;
  posVerb: string;
  posAdj: string;
  posParticle: string;
  posAdv: string;
}

export const lightColors: ColorTokens = {
  background: 'rgb(247, 248, 252)',
  foreground: 'rgb(9, 11, 18)',

  surface: 'rgb(236, 238, 244)',
  surfaceElevated: 'rgb(255, 255, 255)',

  card: 'rgb(255, 255, 255)',
  cardForeground: 'rgb(9, 11, 18)',

  popover: 'rgb(255, 255, 255)',
  popoverForeground: 'rgb(9, 11, 18)',

  primary: 'rgb(222, 28, 70)',
  primaryMuted: 'rgba(222, 28, 70, 0.15)',
  primaryForeground: 'rgb(250, 248, 245)',

  secondary: 'rgb(224, 228, 239)',
  secondaryForeground: 'rgb(18, 22, 31)',

  muted: 'rgb(232, 235, 242)',
  mutedForeground: 'rgb(81, 85, 97)',

  accent: 'rgb(0, 163, 176)',
  accentForeground: 'rgb(250, 248, 245)',

  destructive: 'rgb(219, 0, 23)',
  destructiveForeground: 'rgb(250, 248, 245)',

  border: 'rgba(211, 215, 226, 0.6)',
  input: 'rgb(219, 222, 229)',
  ring: 'rgb(222, 28, 70)',

  jp: 'rgb(19, 22, 29)',
  jpMuted: 'rgb(67, 71, 83)',

  posNoun: 'rgb(156, 95, 0)',
  posVerb: 'rgb(0, 121, 158)',
  posAdj: 'rgb(0, 124, 70)',
  posParticle: 'rgb(120, 112, 133)',
  posAdv: 'rgb(169, 63, 151)',
};

export const darkColors: ColorTokens = {
  background: 'rgb(11, 13, 20)',
  foreground: 'rgb(246, 245, 241)',

  surface: 'rgb(19, 22, 30)',
  surfaceElevated: 'rgb(26, 30, 41)',

  card: 'rgb(19, 22, 30)',
  cardForeground: 'rgb(246, 245, 241)',

  popover: 'rgb(23, 27, 40)',
  popoverForeground: 'rgb(246, 245, 241)',

  primary: 'rgb(255, 116, 127)',
  primaryMuted: 'rgba(255, 116, 127, 0.15)',
  primaryForeground: 'rgb(11, 13, 20)',

  secondary: 'rgb(38, 45, 66)',
  secondaryForeground: 'rgb(246, 245, 241)',

  muted: 'rgb(31, 36, 48)',
  mutedForeground: 'rgb(146, 152, 168)',

  accent: 'rgb(0, 212, 223)',
  accentForeground: 'rgb(11, 13, 20)',

  destructive: 'rgb(249, 65, 68)',
  destructiveForeground: 'rgb(250, 248, 245)',

  border: 'rgba(41, 45, 59, 0.6)',
  input: 'rgb(36, 40, 53)',
  ring: 'rgb(255, 116, 127)',

  jp: 'rgb(251, 248, 241)',
  jpMuted: 'rgb(188, 183, 169)',

  posNoun: 'rgb(238, 183, 82)',
  posVerb: 'rgb(68, 206, 221)',
  posAdj: 'rgb(83, 210, 136)',
  posParticle: 'rgb(137, 128, 153)',
  posAdv: 'rgb(225, 139, 218)',
};

// export const lightColors: ColorTokens = {
//   background: '#eff1f5',
//   foreground: '#4c4f69',
//
//   surface: '#e6e9ef',
//   surfaceElevated: '#ccd0da',
//
//   card: '#e6e9ef',
//   cardForeground: '#4c4f69',
//
//   popover: '#eff1f5',
//   popoverForeground: '#4c4f69',
//
//   primary: '#8839ef',
//   primaryMuted: '#ea76cb',
//   primaryForeground: '#eff1f5',
//
//   secondary: '#dce0e8',
//   secondaryForeground: '#4c4f69',
//
//   muted: '#ccd0da',
//   mutedForeground: '#6c6f85',
//
//   accent: '#1e66f5',
//   accentForeground: '#eff1f5',
//
//   destructive: '#d20f39',
//   destructiveForeground: '#eff1f5',
//
//   border: '#bcc0cc',
//   input: '#ccd0da',
//   ring: '#8839ef',
//
//   jp: '#4c4f69',
//   jpMuted: '#6c6f85',
//
//   posNoun: '#1e66f5',
//   posVerb: '#40a02b',
//   posAdj: '#8839ef',
//   posParticle: '#df8e1d',
//   posAdv: '#179299',
// };
//
// export const darkColors: ColorTokens = {
//   background: '#1e1e2e',
//   foreground: '#cdd6f4',
//
//   surface: '#181825',
//   surfaceElevated: '#313244',
//
//   card: '#313244',
//   cardForeground: '#cdd6f4',
//
//   popover: '#313244',
//   popoverForeground: '#cdd6f4',
//
//   primary: '#cba6f7',
//   primaryMuted: '#b4befe',
//   primaryForeground: '#1e1e2e',
//
//   secondary: '#45475a',
//   secondaryForeground: '#cdd6f4',
//
//   muted: '#45475a',
//   mutedForeground: '#a6adc8',
//
//   accent: '#89b4fa',
//   accentForeground: '#1e1e2e',
//
//   destructive: '#f38ba8',
//   destructiveForeground: '#1e1e2e',
//
//   border: '#585b70',
//   input: '#45475a',
//   ring: '#cba6f7',
//
//   jp: '#cdd6f4',
//   jpMuted: '#a6adc8',
//
//   posNoun: '#89b4fa',
//   posVerb: '#a6e3a1',
//   posAdj: '#cba6f7',
//   posParticle: '#f9e2af',
//   posAdv: '#94e2d5',
// };


export type ThemeName = 'light' | 'dark';
