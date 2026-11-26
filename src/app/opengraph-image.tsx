import { ImageResponse } from "next/og";
import { site } from "@/content/site";

export const alt = `${site.name}, ${site.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Share card: the wall at dusk, its opening of light between "Imagined" and "built." */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: "linear-gradient(180deg, #2B1620 0%, #120A0F 100%)", color: "#F2E9DD", position: "relative" }}>
        <div style={{ position: "absolute", left: 590, top: 0, width: 20, height: 630, background: "linear-gradient(180deg, #FFF1DC, #FFD9A0 40%, #FFB26B)", display: "flex" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, letterSpacing: 4, textTransform: "uppercase", color: "rgba(242,233,221,0.7)" }}>
          <span>{site.name}</span>
          <span>{`${site.role} · ${site.current.company}`}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 132, letterSpacing: -6, lineHeight: 1 }}>
          <span>Imagined</span>
          <span style={{ color: "#FFB26B", fontStyle: "italic" }}>built.</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "rgba(242,233,221,0.7)" }}>
          <span>Software · AI assistants · automation · hardware</span>
          <span>{site.location}</span>
        </div>
      </div>
    ),
    size,
  );
}
