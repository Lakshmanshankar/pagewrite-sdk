import fs from "node:fs/promises";

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function writeTextFile(filePath: string, content: string): Promise<void> {
  await fs.writeFile(filePath, content, "utf8");
}
