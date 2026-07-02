import { mkdir, writeFile } from "node:fs/promises";

const distDir = new URL("../dist/", import.meta.url);
const assetsIgnorePath = new URL(".assetsignore", distDir);

await mkdir(distDir, { recursive: true });
await writeFile(assetsIgnorePath, "_worker.js\n", "utf8");
