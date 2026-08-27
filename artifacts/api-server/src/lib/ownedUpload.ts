export function isOwnedUploadPath(value: string | null | undefined, userId: number): boolean {
  if (!value) return true;
  if (value.includes("?") || value.includes("#") || value.includes("\\")) return false;
  const prefix = `/api/storage/objects/uploads/${userId}/`;
  return value.startsWith(prefix) && value.length > prefix.length;
}