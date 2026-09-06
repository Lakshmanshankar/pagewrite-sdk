import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";

const cliPath = path.resolve("src/cli.ts");

describe("pagewrite-astro CLI", () => {
  it("prints help", () => {
    const result = spawnSync(process.execPath, ["--import", "tsx", cliPath, "--help"], {
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("pagewrite-astro fetch --site-id <siteId>");
  });

  it("requires site id", () => {
    const result = spawnSync(process.execPath, ["--import", "tsx", cliPath, "fetch", "--dry-run"], {
      encoding: "utf8",
      env: { ...process.env, REMOTE_MDX_TOKEN: "token" },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Missing required --site-id option");
  });
});
