import * as fs from "fs";
import * as path from "path";

const ROOT = process.cwd();
const IGNORE_DIRS = new Set([".git", ".svn", ".hg", ".idea", ".vscode"]);

let deletedCount = 0;

function safeRm(targetPath: string) {
    try {
        fs.rmSync(targetPath, { recursive: true, force: true });
        console.log("✔ Eliminado:", path.relative(ROOT, targetPath));
        deletedCount++;
    } catch (e: any) {
        console.warn("⚠ No se pudo eliminar:", targetPath, "-", e.message);
    }
}

function cleanDir(dir: string) {
    let entries: fs.Dirent[];
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return;
    }

    for (const ent of entries) {
        if (ent.isDirectory() && ent.name === "node_modules") {
            safeRm(path.join(dir, "node_modules"));
        }
    }

    for (const ent of entries) {
        if (!ent.isFile()) continue;
        if (
            ent.name === "package-lock.json" ||
            ent.name === "pnpm-lock.yaml" ||
            ent.name === "yarn.lock"
        ) {
            safeRm(path.join(dir, ent.name));
        }
    }

    for (const ent of entries) {
        if (!ent.isDirectory()) continue;
        if (ent.name === "node_modules") continue;
        if (IGNORE_DIRS.has(ent.name)) continue;
        cleanDir(path.join(dir, ent.name));
    }
}

console.log("🧹 Limpiando node_modules y lockfiles desde:", ROOT);
cleanDir(ROOT);
console.log(`✅ Listo. Elementos eliminados: ${deletedCount}`);
