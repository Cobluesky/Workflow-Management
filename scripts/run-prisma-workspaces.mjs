import { spawn } from "node:child_process";
import path from "node:path";

const command = process.argv[2];
const target = process.argv[3];

const DOMAIN_SCHEMAS = {
  core: "prisma/schemas/core.prisma",
  timetable: "prisma/schemas/timetable.prisma",
  calendar: "prisma/schemas/calendar.prisma",
  tasks: "prisma/schemas/tasks.prisma",
};

const prismaCliPath = path.resolve("node_modules/prisma/build/index.js");

function withFallbackDatabaseUrls(env) {
  const fallback = env.DATABASE_URL ?? "";

  return {
    ...env,
    WORKSPACE_CORE_DATABASE_URL: env.WORKSPACE_CORE_DATABASE_URL ?? fallback,
    TIMETABLE_DATABASE_URL: env.TIMETABLE_DATABASE_URL ?? fallback,
    CALENDAR_DATABASE_URL: env.CALENDAR_DATABASE_URL ?? fallback,
    TASKS_DATABASE_URL: env.TASKS_DATABASE_URL ?? fallback,
  };
}

function runPrismaCli(args, envOverrides = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [prismaCliPath, ...args], {
      stdio: "inherit",
      env: {
        ...process.env,
        ...envOverrides,
      },
      shell: false,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Prisma command failed with exit code ${code}`));
    });

    child.on("error", reject);
  });
}

function requireDatabaseUrl(envKey) {
  const value = process.env[envKey];

  if (!value) {
    throw new Error(`Missing required database env: ${envKey}`);
  }

  return value;
}

if (command === "generate") {
  for (const schemaPath of Object.values(DOMAIN_SCHEMAS)) {
    console.log(`\n> prisma generate --schema ${schemaPath}`);
    await runPrismaCli(["generate", "--schema", schemaPath], withFallbackDatabaseUrls(process.env)).catch(
      (error) => {
        throw new Error(`prisma generate failed for ${schemaPath}: ${error.message}`);
      }
    );
  }

  process.exit(0);
}

if (command === "db-push" && target) {
  const targetConfig =
    target === "timetable"
      ? {
          schemaPath: DOMAIN_SCHEMAS.timetable,
          env: process.env,
        }
      : target === "core"
        ? {
            schemaPath: DOMAIN_SCHEMAS.core,
            env: {
              ...process.env,
              DATABASE_URL: requireDatabaseUrl("WORKSPACE_CORE_DATABASE_URL"),
            },
          }
      : target === "calendar"
        ? {
            schemaPath: DOMAIN_SCHEMAS.calendar,
            env: {
              ...process.env,
              DATABASE_URL: requireDatabaseUrl("CALENDAR_DATABASE_URL"),
            },
          }
      : target === "tasks"
        ? {
            schemaPath: DOMAIN_SCHEMAS.tasks,
            env: {
              ...process.env,
              DATABASE_URL: requireDatabaseUrl("TASKS_DATABASE_URL"),
            },
          }
        : null;

  if (!targetConfig) {
    console.error(`Unsupported Prisma db-push target: ${target}`);
    process.exit(1);
  }

  console.log(`\n> prisma db push --schema ${targetConfig.schemaPath}`);
  await runPrismaCli(["db", "push", "--schema", targetConfig.schemaPath], targetConfig.env)
    .catch((error) => {
      throw new Error(`prisma db push failed for ${target}: ${error.message}`);
    });

  process.exit(0);
}

console.error(`Unsupported Prisma workspace command: ${command ?? "(missing)"}`);
process.exit(1);
