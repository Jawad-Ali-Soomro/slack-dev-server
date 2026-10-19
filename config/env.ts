import fs from "fs";
import path from "path";
import dotenv from "dotenv";

const envPath = path.resolve(__dirname, ".env");
const samplePath = path.resolve(__dirname, ".sample.env");

if (!fs.existsSync(envPath)) {
  if (!process.env.MONGODB_URI) {
    throw new Error(
      `Environment file not found: ${envPath}. Copy ${samplePath} to ${envPath} and fill in the values. See ENV-SETUP.md.`,
    );
  }
} else {
  const result = dotenv.config({ path: envPath });

  if (result.error) {
    throw new Error(`Failed to load environment file: ${result.error.message}`);
  }

  if (!result.parsed || Object.keys(result.parsed).length === 0) {
    throw new Error(`Environment file is empty: ${envPath}`);
  }
}
