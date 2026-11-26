import { ImageResponse } from "next/og"

export const alt = "SyncBoard: run incidents together, in real time"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// Social preview. Literals are the dark canvas, off-white text and brand tokens.
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0e1214",
          color: "#f2f6f7",
          padding: 80,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="72" height="72" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="8" fill="#06726e" />
            <rect x="6.3" y="18.5" width="3.2" height="6" rx="1.1" fill="#f3fcfb" opacity="0.55" />
            <rect x="11.7" y="14.5" width="3.2" height="10" rx="1.1" fill="#f3fcfb" opacity="0.7" />
            <rect x="17.1" y="10.5" width="3.2" height="14" rx="1.1" fill="#f3fcfb" opacity="0.85" />
            <rect x="22.5" y="6.5" width="3.2" height="18" rx="1.1" fill="#f3fcfb" />
          </svg>
          <div style={{ fontSize: 40, fontWeight: 700 }}>SyncBoard</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              fontSize: 88,
              fontWeight: 800,
              lineHeight: 1.04,
              letterSpacing: -2,
              maxWidth: 940,
            }}
          >
            Run incidents together, in real time.
          </div>
          <div style={{ fontSize: 34, color: "#a9b8bc" }}>
            Severity, status, owner and who is looking, updated live for the whole on-call team.
          </div>
        </div>
      </div>
    ),
    size
  )
}
