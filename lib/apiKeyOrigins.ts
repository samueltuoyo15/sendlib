// This is a browser restriction, not proof of identity: non-browser clients can forge Origin.
export function isOriginAllowed(origin: string | null, allowed: string[]): boolean {
  if (!allowed || allowed.length === 0) return true;
  if (!origin) return false;
  const host = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/^(https?:\/\/)/, "")
      .split("/")[0];
  return allowed.some((pattern) => host(pattern) === host(origin));
}
