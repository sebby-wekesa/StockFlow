import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // CRITICAL: Studio must use the Direct URL (Port 5432)
    url: env("DIRECT_URL"),
  },
  migrations: {
    seed: "npx tsx prisma/seed.ts",
  },
});