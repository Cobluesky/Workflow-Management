import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/metrics/route";

describe("metrics route", () => {
  it("returns prometheus metrics output", async () => {
    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(body).toContain("workspace_app_info");
  });
});
