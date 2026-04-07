import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Root Prisma config for the timetable domain. Split domains such as core,
// calendar, and tasks are generated and pushed through scripts/run-prisma-workspaces.mjs.
dotenv.config({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL as string,
  },
});
