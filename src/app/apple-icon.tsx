import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: the wall and its opening of light. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#120A0F" }}>
        <svg width="180" height="180" viewBox="0 0 32 32">
          <rect x="6" y="5" width="8.6" height="22" fill="#7C3A2B" />
          <rect x="17.4" y="5" width="8.6" height="22" fill="#7C3A2B" />
          <rect x="14.6" y="5" width="2.8" height="22" fill="#FFD9A0" />
        </svg>
      </div>
    ),
    size,
  );
}
