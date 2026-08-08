/**
 * Browser can call the API same-origin via Next rewrite (`API_UPSTREAM_URL` +
 * `NEXT_PUBLIC_API_SAME_ORIGIN=1`) so CORS is not required on Railway.
 * Server always prefers the real upstream URL.
 */
export function getApiBase(): string {
  const upstream = process.env.API_UPSTREAM_URL?.replace(/\/$/, "");
  const publicUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  const sameOrigin = process.env.NEXT_PUBLIC_API_SAME_ORIGIN === "1";

  if (typeof window === "undefined") {
    return upstream || publicUrl || "http://localhost:3002";
  }

  if (sameOrigin) {
    return "";
  }

  return publicUrl || "http://localhost:3002";
}
