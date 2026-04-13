import "dotenv/config";
import { defineConfig } from "@prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    name: "db",
    provider: "postgresql",
    url: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
  },
 migrations: {
    // This is the property the CLI is looking for
    seed: 'node prisma/seed.js',
  },
});