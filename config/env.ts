import fs from "fs";
import path from "path";
import dotenv from "dotenv";

const envPath = path.resolve(__dirname, ".env");

if (!fs.existsSync(envPath)) {
  throw new Error(`Environment file not found: ${envPath}`);
}

const result = dotenv.config({ path: envPath });

if (result.error) {
  throw new Error(`Failed to load environment file: ${result.error.message}`);
}

if (!result.parsed || Object.keys(result.parsed).length === 0) {
  throw new Error(`Environment file is empty: ${envPath}`);
}
