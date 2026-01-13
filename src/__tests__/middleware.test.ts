import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../../middleware";

vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(),
}));

const { getToken } = await import("next-auth/jwt");

const makeRequest = (path: string) => {
  return new NextRequest(`http://localhost${path}`);
};

describe("middleware auth gating", () => {
  it("redirects unauthenticated users from hike pages", async () => {
    vi.mocked(getToken).mockResolvedValueOnce(null);
    const response = await middleware(makeRequest("/hikes/abc"));
    expect(response.headers.get("location")).toBe(
      "http://localhost/auth/signin?callbackUrl=%2Fhikes%2Fabc&reason=auth_required"
    );
  });

  it("allows authenticated users to access hike pages", async () => {
    vi.mocked(getToken).mockResolvedValueOnce({ sub: "user" });
    const response = await middleware(makeRequest("/hikes/abc"));
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects unauthenticated users from dashboard", async () => {
    vi.mocked(getToken).mockResolvedValueOnce(null);
    const response = await middleware(makeRequest("/dashboard"));
    expect(response.headers.get("location")).toBe(
      "http://localhost/auth/signin?callbackUrl=%2Fdashboard&reason=auth_required"
    );
  });
});
