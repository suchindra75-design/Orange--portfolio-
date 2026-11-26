import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon (Bold Colour): the nav's dot as a sticker, cream with an ink ring, on orange. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#FF5A1F" }}>
        <div style={{ width: 92, height: 92, borderRadius: 46, background: "#FFF3E8", border: "14px solid #140F0B", display: "flex" }} />
      </div>
    ),
    size,
  );
}
