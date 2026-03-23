import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma CLI reads DATABASE_URL from the root .env file.
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
