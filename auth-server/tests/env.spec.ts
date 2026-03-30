import { describe, expect, it } from "vitest";
import { normalizeEnvString, normalizeOrigin, parseOriginList } from "../src/config/env.js";

describe("env normalization", () => {
  it("strips surrounding quotes from env strings", () => {
    expect(normalizeEnvString("\"https://auth.workspace.p-e.kr\"")).toBe("https://auth.workspace.p-e.kr");
    expect(normalizeEnvString("'workspace-clients'")).toBe("workspace-clients");
  });

  it("normalizes origins by trimming quotes and trailing slashes", () => {
    expect(normalizeOrigin("\"https://app.workspace.p-e.kr/\"")).toBe("https://app.workspace.p-e.kr");
  });

  it("parses client origins from a quoted comma-separated env value", () => {
    expect(
      parseOriginList("\"https://app.workspace.p-e.kr/, https://project1.workspace.p-e.kr\"")
    ).toEqual(["https://app.workspace.p-e.kr", "https://project1.workspace.p-e.kr"]);
  });
});
