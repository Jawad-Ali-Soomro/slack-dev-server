import fs from "fs";
import path from "path";
import ts from "typescript";

const ROOT_DIR = process.cwd();

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next"
]);

const TARGET_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx"
]);

function walk(dir) {
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!IGNORE_DIRS.has(file)) walk(fullPath);
      continue;
    }

    if (!TARGET_EXTENSIONS.has(path.extname(file))) continue;
    if (file.endsWith(".d.ts")) continue;

    const code = fs.readFileSync(fullPath, "utf8");

    const result = ts.transpileModule(code, {
      compilerOptions: {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        removeComments: true
      }
    });

    fs.writeFileSync(fullPath, result.outputText, "utf8");
    console.log(`✔ Cleaned: ${fullPath}`);
  }
}

walk(ROOT_DIR);
console.log("✅ All comments removed using TypeScript compiler");
