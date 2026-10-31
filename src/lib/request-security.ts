export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin"),
    host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    const parsed = new URL(origin);
    return (
      ["http:", "https:"].includes(parsed.protocol) &&
      parsed.origin === origin &&
      (process.env.APP_ORIGIN ? origin === process.env.APP_ORIGIN : parsed.host.toLowerCase() === host.toLowerCase())
    );
  } catch {
    return false;
  }
}
