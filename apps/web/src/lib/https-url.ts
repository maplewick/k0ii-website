/** Allow only https image URLs before binding to img/src or CSS url(). */
export function httpsOnlyUrl(url: string | null | undefined): string | null {
  if (!url || !/^https:\/\//i.test(url)) return null;
  return url;
}
