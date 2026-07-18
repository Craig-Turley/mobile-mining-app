/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    './features/**/*.{js,jsx,ts,tsx}',
  ],

  presets: [require('nativewind/preset')],

  theme: {
    extend: {
      colors: {
        background: 'var(--color-background)',
        foreground: 'var(--color-foreground)',

        surface: 'var(--color-surface)',
        surfaceElevated: 'var(--color-surface-elevated)',

        card: 'var(--color-card)',
        cardForeground: 'var(--color-card-foreground)',

        popover: 'var(--color-popover)',
        popoverForeground: 'var(--color-popover-foreground)',

        primary: 'var(--color-primary)',
        primaryForeground: 'var(--color-primary-foreground)',

        secondary: 'var(--color-secondary)',
        secondaryForeground: 'var(--color-secondary-foreground)',

        muted: 'var(--color-muted)',
        mutedForeground: 'var(--color-muted-foreground)',

        accent: 'var(--color-accent)',
        accentForeground: 'var(--color-accent-foreground)',

        destructive: 'var(--color-destructive)',
        destructiveForeground: 'var(--color-destructive-foreground)',

        border: 'var(--color-border)',
        input: 'var(--color-input)',
        ring: 'var(--color-ring)',

        jp: 'var(--color-jp)',
        jpMuted: 'var(--color-jp-muted)',

        posNoun: 'var(--color-pos-noun)',
        posVerb: 'var(--color-pos-verb)',
        posAdj: 'var(--color-pos-adj)',
        posParticle: 'var(--color-pos-particle)',
        posAdv: 'var(--color-pos-adv)',
      },
    },
  },

  plugins: [],
};
