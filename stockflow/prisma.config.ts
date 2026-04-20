import "dotenv/config";
import { defineConfig } from "@prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DIRECT_URL,
    // Use @ts-ignore to bypass the "known properties" error
    // @ts-ignore
    // directUrl: process.env.DIRECT_URL,
  },
  migrations: {
    // This is the missing piece that Prisma is asking for
    seed: 'npx tsx prisma/seed.ts',
  },
});