import localFont from "next/font/local"

/**
 * Atkinson Hyperlegible Next (UI) + Atkinson Hyperlegible Mono (IDs, hashes,
 * timestamps, key hints). Designed by the Braille Institute for character
 * distinction (I/l/1, O/0 read differently), which is what an incident board
 * needs when people read ids under stress. Self-hosted (no runtime request to
 * a font CDN).
 *
 * `latin-ext` is a separate family so the browser only downloads it when a
 * name actually needs it (unicode-range). It is listed first in --font-sans
 * so its glyphs win over the Arial metric fallback that the latin family
 * carries.
 */

export const fontSansExt = localFont({
  src: "../node_modules/@fontsource-variable/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-ext-wght-normal.woff2",
  weight: "200 800",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  variable: "--font-sans-ext",
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF",
    },
  ],
})

export const fontSans = localFont({
  src: "../node_modules/@fontsource-variable/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-wght-normal.woff2",
  weight: "200 800",
  display: "swap",
  adjustFontFallback: "Arial",
  variable: "--font-sans-latin",
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
    },
  ],
})

export const fontMono = localFont({
  src: "../node_modules/@fontsource-variable/atkinson-hyperlegible-mono/files/atkinson-hyperlegible-mono-latin-wght-normal.woff2",
  weight: "200 800",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  variable: "--font-mono-latin",
})
