const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";

export function getApiBase(): string {
  return API_BASE.replace(/\/$/, "");
}
