import "dotenv/config";
import { defineConfig } from "@prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Use the DIRECT_URL for syncing the schema
    url: process.env.DIRECT_URL,
  },
});