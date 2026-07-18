import { vars } from 'nativewind';
import type { ColorTokens } from './colors';

export function createThemeVars(colors: ColorTokens) {
  return vars({
    '--color-background': colors.background,
    '--color-foreground': colors.foreground,

    '--color-surface': colors.surface,
    '--color-surface-elevated': colors.surfaceElevated,

    '--color-card': colors.card,
    '--color-card-foreground': colors.cardForeground,

    '--color-popover': colors.popover,
    '--color-popover-foreground': colors.popoverForeground,

    '--color-primary': colors.primary,
    '--color-primary-foreground': colors.primaryForeground,

    '--color-secondary': colors.secondary,
    '--color-secondary-foreground': colors.secondaryForeground,

    '--color-muted': colors.muted,
    '--color-muted-foreground': colors.mutedForeground,

    '--color-accent': colors.accent,
    '--color-accent-foreground': colors.accentForeground,

    '--color-destructive': colors.destructive,
    '--color-destructive-foreground': colors.destructiveForeground,

    '--color-border': colors.border,
    '--color-input': colors.input,
    '--color-ring': colors.ring,

    '--color-jp': colors.jp,
    '--color-jp-muted': colors.jpMuted,

    '--color-pos-noun': colors.posNoun,
    '--color-pos-verb': colors.posVerb,
    '--color-pos-adj': colors.posAdj,
    '--color-pos-particle': colors.posParticle,
    '--color-pos-adv': colors.posAdv,
  });
}
