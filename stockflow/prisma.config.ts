import "dotenv/config";
import { defineConfig } from "@prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // This tells Prisma to use the Supabase URL from your .env
    url: process.env.DATABASE_URL,
  },
});