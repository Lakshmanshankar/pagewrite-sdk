import { afterEach, describe, expect, it } from "vitest";
import { resolveToken } from "../src/token.js";

describe("resolveToken", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("uses an explicit token first", () => {
    process.env.REMOTE_MDX_TOKEN = "env-token";

    expect(resolveToken({ siteId: "site", token: " direct-token " })).toBe("direct-token");
  });

  it("uses the default environment variable", () => {
    process.env.REMOTE_MDX_TOKEN = " env-token ";

    expect(resolveToken({ siteId: "site" })).toBe("env-token");
  });

  it("uses a custom environment variable", () => {
    process.env.PAGEWRITE_BUILD_TOKEN = "custom-token";

    expect(
      resolveToken({
        siteId: "site",
        tokenEnvVar: "PAGEWRITE_BUILD_TOKEN",
      })
    ).toBe("custom-token");
  });

  it("throws when no token is available", () => {
    delete process.env.REMOTE_MDX_TOKEN;

    expect(() => resolveToken({ siteId: "site" })).toThrow("Build token not found");
  });

  it("uses a token passed directly as a string", () => {
    process.env.REMOTE_MDX_TOKEN = "env-token";

    expect(resolveToken({ siteId: "site" }, "passed-token")).toBe("passed-token");
  });

  it("uses the token from a passed env object", () => {
    process.env.REMOTE_MDX_TOKEN = "env-token";

    expect(resolveToken({ siteId: "site" }, { REMOTE_MDX_TOKEN: "passed-env-token" })).toBe(
      "passed-env-token"
    );
  });

  it("falls back to process.env if the passed env object does not contain the token", () => {
    process.env.REMOTE_MDX_TOKEN = "fallback-env-token";

    expect(resolveToken({ siteId: "site" }, {})).toBe("fallback-env-token");
  });
});
