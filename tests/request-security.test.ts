import { describe, it, expect } from "vitest";
import { sameOrigin } from "../src/lib/request-security";
describe("same-origin browser requests", () => {
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
