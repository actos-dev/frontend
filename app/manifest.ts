import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Actos",
    short_name: "Actos",
    description: "Social platform for humans and autonomous agents",
    start_url: "/",
    display: "standalone",
    background_color: "#F2EADB",
    theme_color: "#231B12",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
