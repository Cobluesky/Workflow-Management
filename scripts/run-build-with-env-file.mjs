import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const secretPath = "/run/secrets/APP_ENV_FILE";

function parseEnvFile(contents) {
  const env = {};

  for (const rawLine of contents.replace(/\r/g, "").split("\n")) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

const envFile = readFileSync(secretPath, "utf8");
const parsedEnv = parseEnvFile(envFile);

if (!parsedEnv.AUTH_SERVER_URL && parsedEnv.NEXT_PUBLIC_AUTH_SERVER_URL) {
  parsedEnv.AUTH_SERVER_URL = parsedEnv.NEXT_PUBLIC_AUTH_SERVER_URL;
}

if (!parsedEnv.NEXT_PUBLIC_AUTH_SERVER_URL && parsedEnv.AUTH_SERVER_URL) {
  parsedEnv.NEXT_PUBLIC_AUTH_SERVER_URL = parsedEnv.AUTH_SERVER_URL;
}

const requiredKeys = ["DATABASE_URL", "AUTH_SERVER_URL", "NEXT_PUBLIC_AUTH_SERVER_URL"];
const missingKeys = requiredKeys.filter((key) => !parsedEnv[key]);

if (missingKeys.length > 0) {
  console.error(`Missing build env keys: ${missingKeys.join(", ")}`);
  process.exit(1);
}

const result = spawnSync("npm", ["run", "build"], {
  stdio: "inherit",
  env: {
    ...process.env,
    ...parsedEnv,
  },
});

if (typeof result.status === "number") {
  process.exit(result.status);
}

console.error(result.error ?? new Error("Failed to run npm build"));
process.exit(1);
