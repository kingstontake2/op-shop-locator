export function photoUrl(photoReference: string, maxWidth = 400): string {
  return `/api/photo?ref=${encodeURIComponent(photoReference)}&maxwidth=${maxWidth}`;
}
