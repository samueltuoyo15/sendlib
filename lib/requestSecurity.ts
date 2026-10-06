/** Browser requests must originate on the app; server clients can omit Origin. */
export function isTrustedBrowserRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  if (!origin) return true;
  const allowed = [new URL(request.url).origin];
  for (const value of [process.env.NEXT_PUBLIC_APP_URL, process.env.APP_URL]) {
    if (value) allowed.push(new URL(value).origin);
  }
  return allowed.includes(origin);
}
