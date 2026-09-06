#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { stageSiteContent } from "./client.js";
import { resolveToken } from "./token.js";
import type { RemoteMdxLogger } from "./types.js";

interface CliOptions {
  command: "fetch" | "help";
  siteId?: string;
  outDir: string;
  token?: string;
  tokenEnvVar?: string;
  clean: boolean;
  dryRun: boolean;
  pageSize?: number;
  timeoutMs?: number;
}

const HELP = `Usage:
  pagewrite-astro fetch --site-id <siteId> [options]

Options:
  --site-id <id>          Pagewrite site id to fetch. Required.
  --out <dir>             Output directory. Default: src/content/docs
  --token <token>         Build token. Defaults to env lookup.
  --token-env <name>      Token env var. Default: REMOTE_MDX_TOKEN
  --clean                 Remove output directory before writing.
  --dry-run               Fetch and validate content without keeping written files.
  --page-size <number>    File document page size. Default: 100
  --timeout-ms <number>   Request timeout in milliseconds. Default: 30000
  -h, --help              Show this help.
`;

async function main(argv: string[]): Promise<void> {
  const options = parseArgs(argv);

  if (options.command === "help") {
    console.log(HELP);
    return;
  }

  if (!options.siteId) {
    throw new Error("Missing required --site-id option.");
  }

  const token = resolveToken({
    siteId: options.siteId,
    token: options.token,
    tokenEnvVar: options.tokenEnvVar,
  });
  const outputDir = path.resolve(process.cwd(), options.outDir);
  const targetDir = options.dryRun
    ? await fs.mkdtemp(path.join(await fs.realpath("/tmp"), "pagewrite-astro-"))
    : outputDir;

  try {
    if (options.clean && !options.dryRun) {
      await fs.rm(targetDir, { recursive: true, force: true });
    }

    const result = await stageSiteContent(options.siteId, token, targetDir, {
      logger: createConsoleLogger(),
      pageSize: options.pageSize,
      timeoutMs: options.timeoutMs,
    });

    if (options.dryRun) {
      console.log(
        `Pagewrite dry run complete: fetched ${result.files.length} file(s) for site ${options.siteId}.`
      );
      return;
    }

    console.log(`Pagewrite fetch complete: wrote ${result.files.length} file(s) to ${outputDir}.`);
  } finally {
    if (options.dryRun) {
      await fs.rm(targetDir, { recursive: true, force: true });
    }
  }
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    command: "fetch",
    outDir: "src/content/docs",
    clean: false,
    dryRun: false,
  };

  const [firstArg, ...rest] = argv;
  const args = firstArg === "fetch" ? rest : argv;

  if (firstArg === "help" || firstArg === "--help" || firstArg === "-h") {
    return { ...options, command: "help" };
  }

  if (firstArg && firstArg !== "fetch" && firstArg.startsWith("-") === false) {
    throw new Error(`Unknown command: ${firstArg}`);
  }

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];

    switch (arg) {
      case "--site-id":
        options.siteId = readValue(args, ++index, arg);
        break;
      case "--out":
      case "--output-dir":
        options.outDir = readValue(args, ++index, arg);
        break;
      case "--token":
        options.token = readValue(args, ++index, arg);
        break;
      case "--token-env":
      case "--token-env-var":
        options.tokenEnvVar = readValue(args, ++index, arg);
        break;
      case "--clean":
        options.clean = true;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--page-size":
        options.pageSize = parsePositiveInteger(readValue(args, ++index, arg), arg);
        break;
      case "--timeout-ms":
        options.timeoutMs = parsePositiveInteger(readValue(args, ++index, arg), arg);
        break;
      case "--help":
      case "-h":
        return { ...options, command: "help" };
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function readValue(args: string[], index: number, option: string): string {
  const value = args[index];

  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${option}.`);
  }

  return value;
}

function parsePositiveInteger(value: string, option: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${option} must be a positive integer.`);
  }

  return parsed;
}

function createConsoleLogger(): Pick<RemoteMdxLogger, "info" | "warn" | "error"> {
  return {
    info: (message) => console.info(`[pagewrite-astro] ${message}`),
    warn: (message) => console.warn(`[pagewrite-astro] ${message}`),
    error: (message) => console.error(`[pagewrite-astro] ${message}`),
  };
}

main(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[pagewrite-astro] ${message}`);
  process.exitCode = 1;
});
