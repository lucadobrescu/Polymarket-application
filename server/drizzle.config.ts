import { readFileSync } from "fs";
import { resolve } from "path";
import { defineConfig } from "drizzle-kit";

// Manually parse .env
const envFile = readFileSync(resolve(__dirname, ".env"), "utf-8");
envFile.split("\n").forEach((line) => {
  const [key, ...val] = line.trim().split("=");
  if (key && val.length) process.env[key] = val.join("=");
});

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DB_FILE_NAME!,
  },
});