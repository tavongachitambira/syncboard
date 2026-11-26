import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SyncBoard",
    short_name: "SyncBoard",
    description:
      "Incident management for teams on call. Everyone works the same incident, live.",
    start_url: "/dashboard",
    display: "standalone",
    // Light canvas and brand tokens; a manifest needs literals.
    background_color: "#f2f6f7",
    theme_color: "#06726e",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
