export const lightColors = {
  background: "rgb(247, 248, 252)",
  foreground: "rgb(9, 11, 18)",

  surface: "rgb(236, 238, 244)",
  surfaceElevated: "rgb(255, 255, 255)",

  card: "rgb(255, 255, 255)",
  cardForeground: "rgb(9, 11, 18)",

  popover: "rgb(255, 255, 255)",
  popoverForeground: "rgb(9, 11, 18)",

  primary: "rgb(222, 28, 70)",
  primaryForeground: "rgb(250, 248, 245)",

  secondary: "rgb(224, 228, 239)",
  secondaryForeground: "rgb(18, 22, 31)",

  muted: "rgb(232, 235, 242)",
  mutedForeground: "rgb(81, 85, 97)",

  accent: "rgb(0, 163, 176)",
  accentForeground: "rgb(250, 248, 245)",

  destructive: "rgb(219, 0, 23)",
  destructiveForeground: "rgb(250, 248, 245)",

  border: "rgba(211, 215, 226, 0.6)",
  input: "rgb(219, 222, 229)",
  ring: "rgb(222, 28, 70)",

  jp: "rgb(19, 22, 29)",
  jpMuted: "rgb(67, 71, 83)",

  posNoun: "rgb(156, 95, 0)",
  posVerb: "rgb(0, 121, 158)",
  posAdj: "rgb(0, 124, 70)",
  posParticle: "rgb(120, 112, 133)",
  posAdv: "rgb(169, 63, 151)",
};

export const darkColors = {
  background: "rgb(11, 13, 20)",
  foreground: "rgb(246, 245, 241)",

  surface: "rgb(19, 22, 30)",
  surfaceElevated: "rgb(26, 30, 41)",

  card: "rgb(19, 22, 30)",
  cardForeground: "rgb(246, 245, 241)",

  popover: "rgb(23, 27, 40)",
  popoverForeground: "rgb(246, 245, 241)",

  primary: "rgb(255, 116, 127)",
  primaryForeground: "rgb(11, 13, 20)",

  secondary: "rgb(38, 45, 66)",
  secondaryForeground: "rgb(246, 245, 241)",

  muted: "rgb(31, 36, 48)",
  mutedForeground: "rgb(146, 152, 168)",

  accent: "rgb(0, 212, 223)",
  accentForeground: "rgb(11, 13, 20)",

  destructive: "rgb(249, 65, 68)",
  destructiveForeground: "rgb(250, 248, 245)",

  border: "rgba(41, 45, 59, 0.6)",
  input: "rgb(36, 40, 53)",
  ring: "rgb(255, 116, 127)",

  jp: "rgb(251, 248, 241)",
  jpMuted: "rgb(188, 183, 169)",

  posNoun: "rgb(238, 183, 82)",
  posVerb: "rgb(68, 206, 221)",
  posAdj: "rgb(83, 210, 136)",
  posParticle: "rgb(137, 128, 153)",
  posAdv: "rgb(225, 139, 218)",
};

export type ColorTokens = typeof lightColors;
export type ThemeName = "light" | "dark";
