import type { RemoteMdxOptions } from "./types.js";

export const DEFAULT_TOKEN_ENV_VAR = "REMOTE_MDX_TOKEN";

export function resolveToken(
  options: RemoteMdxOptions,
  env?: Record<string, string | undefined> | string
): string {
  if (options.token?.trim()) {
    return options.token.trim();
  }

  if (typeof env === "string" && env.trim()) {
    return env.trim();
  }

  const envVar = options.tokenEnvVar ?? DEFAULT_TOKEN_ENV_VAR;
  let token: string | undefined;

  if (typeof env === "object" && env !== null) {
    token = env[envVar]?.trim();
  }

  if (!token) {
    token = process.env[envVar]?.trim();
  }

  if (token) {
    return token;
  }

  throw new Error(
    `[pagewrite:astro] Build token not found. Set ${envVar} or pass token in the integration options.`
  );
}
