import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "K0ii — live PS99 clan war tracker for K0i2";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Share card for links to k0ii.com. Read from `public/` rather than `src/`
 * because only public assets are guaranteed to ship in the deployed output.
 */
export default async function OpengraphImage() {
  const logo = await readFile(join(process.cwd(), "public", "k0i2-logo.jpg"));
  const logoSrc = `data:image/jpeg;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 72,
          padding: "0 88px",
          background: "linear-gradient(165deg, #0b1f2e 0%, #071420 100%)",
        }}
      >
        <img
          src={logoSrc}
          width={340}
          height={340}
          style={{
            borderRadius: 56,
            objectFit: "cover",
            border: "4px solid rgba(242,149,77,0.45)",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 132,
              fontWeight: 700,
              color: "#ede6da",
              lineHeight: 1,
              letterSpacing: -4,
            }}
          >
            K0ii
          </div>
          <div
            style={{
              fontSize: 46,
              fontWeight: 600,
              color: "#f2954d",
              marginTop: 20,
              lineHeight: 1.15,
            }}
          >
            Keep score while you grind.
          </div>
          <div
            style={{
              fontSize: 30,
              color: "#b7c6d0",
              marginTop: 22,
            }}
          >
            Live PS99 clan war tracker · k0ii.com
          </div>
        </div>
      </div>
    ),
    size,
  );
}
