import { describe, it, expect, afterEach, vi } from "vitest";
import { sameOrigin } from "../src/lib/request-security";
describe("same-origin browser requests", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("uses the configured public origin behind a reverse proxy", () => {
    vi.stubEnv("APP_ORIGIN", "https://civic.example");
    expect(sameOrigin(new Request("http://localhost/api/reports", {headers:{Host:"internal:3000",Origin:"https://civic.example"}}))).toBe(true);
    expect(sameOrigin(new Request("http://localhost/api/reports", {headers:{Host:"internal:3000",Origin:"https://foreign.example"}}))).toBe(false);
  });
  it("uses the original Host header when the framework normalizes the internal URL", () =>
    expect(
      sameOrigin(
        new Request("http://localhost:3187/api/session", {
          headers: { Host: "127.0.0.1:3187", Origin: "http://127.0.0.1:3187" },
        }),
      ),
    ).toBe(true));
  it("rejects a cross-origin browser request", () =>
    expect(
      sameOrigin(
        new Request("http://localhost:3187/api/session", {
          headers: {
            Host: "127.0.0.1:3187",
            Origin: "https://untrusted.example",
          },
        }),
      ),
    ).toBe(false));
  it("rejects missing browser-origin metadata", () =>
    expect(sameOrigin(new Request("http://localhost:3187/api/session"))).toBe(
      false,
    ));
});
