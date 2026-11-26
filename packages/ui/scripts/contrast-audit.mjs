// WCAG contrast audit for the token contract in globals.css.
// usage: node contrast-audit.mjs [path/to/globals.css] [--all]
// Parses `:root` and `.dark` blocks (flat `--token: oklch(...)` lines), resolves var() refs,
// composites alpha in gamma-encoded sRGB (how browsers blend), and checks the pairs below.
import fs from "node:fs"
import { fileURLToPath } from "node:url"

const args = process.argv.slice(2)
const showAll = args.includes("--all")
const file =
  args.find((a) => !a.startsWith("--")) ??
  fileURLToPath(new URL("../src/styles/globals.css", import.meta.url))
const css = fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "")

// ---- parse top-level blocks -------------------------------------------------
function topLevelBlocks(src) {
  const out = []
  let depth = 0
  let start = 0
  let sel = ""
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (ch === "{") {
      if (depth === 0) sel = src.slice(start, i).trim()
      depth++
      if (depth === 1) start = i + 1
    } else if (ch === "}") {
      depth--
      if (depth === 0) {
        out.push({ sel, body: src.slice(start, i) })
        start = i + 1
      }
    } else if (ch === ";" && depth === 0) {
      start = i + 1
    }
  }
  return out
}

function tokensOf(selectorTest) {
  const map = {}
  for (const b of topLevelBlocks(css)) {
    if (!selectorTest(b.sel)) continue
    for (const m of b.body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      map[m[1].slice(2)] = m[2].trim()
    }
  }
  return map
}

const rootTokens = tokensOf((s) => s === ":root" || s === ":root, :host" || s === ":root,:host")
const darkTokens = tokensOf((s) => s === ".dark" || s === ":root.dark" || s === ".dark, .dark *")
const themes = {
  light: rootTokens,
  dark: { ...rootTokens, ...darkTokens },
}

// ---- colour math ------------------------------------------------------------
const clamp01 = (x) => Math.min(1, Math.max(0, x))
const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))

function oklchToLinear(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = l_ ** 3
  const m = m_ ** 3
  const s = s_ ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

function num(s, pctScale = 1) {
  s = s.trim()
  if (s === "none") return 0
  if (s.endsWith("%")) return (parseFloat(s) / 100) * pctScale
  return parseFloat(s)
}

const gamutWarnings = new Set()
function maxChroma(L, H) {
  let lo = 0, hi = 0.4
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    const lin = oklchToLinear(L, mid, H)
    if (lin.some((v) => v < -0.0005 || v > 1.0005)) hi = mid
    else lo = mid
  }
  return lo
}

function parseColor(value, theme, depth = 0) {
  value = value.trim()
  if (depth > 8) throw new Error(`var() loop: ${value}`)
  let m = value.match(/^var\(--([\w-]+)(?:\s*,\s*(.+))?\)$/)
  if (m) {
    const ref = themes[theme][m[1]]
    if (ref === undefined) {
      if (m[2]) return parseColor(m[2], theme, depth + 1)
      throw new Error(`unresolved var(--${m[1]}) in ${theme}`)
    }
    return parseColor(ref, theme, depth + 1)
  }
  m = value.match(/^oklch\(\s*([^\s/)]+)\s+([^\s/)]+)\s+([^\s/)]+)(?:\s*\/\s*([^)]+))?\)$/)
  if (m) {
    const L = num(m[1], 1)
    const C = num(m[2], 0.4)
    const H = parseFloat(m[3])
    const A = m[4] !== undefined ? num(m[4], 1) : 1
    const lin = oklchToLinear(L, C, H)
    const out = lin.some((v) => v < -0.002 || v > 1.002)
    if (out) gamutWarnings.add(`${theme}: ${value}  -> max in-gamut chroma ${maxChroma(L, H).toFixed(3)}`)
    const g = lin.map((v) => toGamma(clamp01(v)))
    return { r: g[0], g: g[1], b: g[2], a: A }
  }
  m = value.match(/^#([0-9a-f]{3,8})$/i)
  if (m) {
    let h = m[1]
    if (h.length === 3) h = [...h].map((c) => c + c).join("")
    const r = parseInt(h.slice(0, 2), 16) / 255
    const g = parseInt(h.slice(2, 4), 16) / 255
    const b = parseInt(h.slice(4, 6), 16) / 255
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
    return { r, g, b, a }
  }
  if (value === "transparent") return { r: 0, g: 0, b: 0, a: 0 }
  throw new Error(`unsupported colour syntax: ${value}`)
}

function over(fg, bg) {
  const a = fg.a
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
    a: 1,
  }
}

function lum(c) {
  return 0.2126 * toLinear(c.r) + 0.7152 * toLinear(c.g) + 0.0722 * toLinear(c.b)
}
function ratio(a, b) {
  const [hi, lo] = lum(a) >= lum(b) ? [lum(a), lum(b)] : [lum(b), lum(a)]
  return (hi + 0.05) / (lo + 0.05)
}

// colour of token; if translucent, composite over `base` token (default background) first
function tok(name, theme, base = "background") {
  const raw = themes[theme][name]
  if (raw === undefined) throw new Error(`missing token --${name} in ${theme}`)
  const c = parseColor(raw, theme)
  if (c.a >= 1) return c
  const b = tok(base, theme)
  return over(c, b)
}

// ---- checks -----------------------------------------------------------------
// [fg, bg, min, label, {bgBase}] ; translucent fg composites over the resolved bg.
const SURFACES = ["background", "card", "popover", "secondary"]
const TEXT = 4.5
const NONTEXT = 3

const checks = []
const T = (fg, bg, min, opts = {}) => checks.push({ fg, bg, min, ...opts })

for (const s of SURFACES) {
  T("foreground", s, TEXT)
  T("muted-foreground", s, TEXT)
  T("subtle", s, TEXT)
  T("link", s, TEXT)
  T("destructive", s, TEXT)
  T("success", s, TEXT)
  T("warning", s, TEXT)
  for (const k of ["critical", "high", "medium", "low"]) T(`sev-${k}`, s, TEXT)
  T("ring", s, NONTEXT, { kind: "focus ring" })
  T("input", s, NONTEXT, { kind: "control edge" })
  T("chart-focus", s, NONTEXT, { kind: "chart" })
  T("chart-context", s, NONTEXT, { kind: "chart" })
  for (let i = 1; i <= 5; i++) T(`chart-${i}`, s, NONTEXT, { kind: "chart" })
  // cursors + avatar fills only sit on the board canvas and cards (labels carry the name elsewhere)
  if (s === "background" || s === "card") for (let i = 0; i < 8; i++) T(`presence-${i}`, s, NONTEXT, { kind: "cursor" })
}
// translucent hover / highlight fills carrying muted text
for (const base of ["background", "card", "popover"]) {
  T("muted-foreground", "muted", TEXT, { bgBase: base, label: `muted-foreground on muted@${base}` })
  T("foreground", "muted", TEXT, { bgBase: base, label: `foreground on muted@${base}` })
  T("accent-foreground", "accent", TEXT, { bgBase: base, label: `accent-foreground on accent@${base}` })
  T("foreground", "selection", TEXT, { bgBase: base, label: `foreground on selection@${base}` })
  T("muted-foreground", "selection", TEXT, { bgBase: base, label: `muted-foreground on selection@${base}` })
}
T("primary-foreground", "primary", TEXT)
T("primary-foreground", "primary-hover", TEXT)
T("primary-foreground", "primary-active", TEXT)
T("secondary-foreground", "secondary", TEXT)
T("destructive-solid-foreground", "destructive-solid", TEXT)
T("destructive-solid-foreground", "destructive-solid-hover", TEXT)
for (let i = 0; i < 8; i++) T("presence-fg", `presence-${i}`, TEXT)

let fails = 0
let total = 0
const lines = []
for (const theme of Object.keys(themes)) {
  for (const c of checks) {
    let r
    try {
      const bg = tok(c.bg, theme, c.bgBase ?? "background")
      const fgRaw = parseColor(themes[theme][c.fg] ?? (() => { throw new Error(`missing token --${c.fg}`) })(), theme)
      const fg = fgRaw.a >= 1 ? fgRaw : over(fgRaw, bg)
      r = ratio(fg, bg)
    } catch (e) {
      lines.push(`ERR   [${theme}] ${c.fg} on ${c.bg}: ${e.message}`)
      fails++
      total++
      continue
    }
    total++
    const ok = r >= c.min
    if (!ok) fails++
    if (!ok || showAll) {
      const label = c.label ?? `${c.fg} on ${c.bg}`
      lines.push(
        `${ok ? "ok  " : "FAIL"}  [${theme}] ${label}  ${r.toFixed(2)}:1 (min ${c.min})${c.kind ? "  " + c.kind : ""}`
      )
    }
  }
}
// dedupe identical lines
console.log([...new Set(lines)].join("\n"))
if (gamutWarnings.size) {
  console.log("\nOut-of-sRGB-gamut (will be gamut-mapped by the browser; ratios above use clipping):")
  for (const w of gamutWarnings) console.log("  " + w)
}
console.log(`\n${total - fails}/${total} checks pass${fails ? `, ${fails} fail` : ""}`)
process.exit(fails ? 1 : 0)
