import * as fs from "fs";
import * as path from "path";
import { spawnSync } from 'child_process';

const ROOT = process.cwd();
const SERVICES_DIR = path.join(ROOT, 'services');

function listServiceDirs(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => path.join('services', d.name));
}

function hasStartDev(workspacePath: string): boolean {
    const pkgPath = path.join(ROOT, workspacePath, 'package.json');
    if (!fs.existsSync(pkgPath)) return false;
    try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        return Boolean(pkg?.scripts?.['start:dev']);
    } catch {
        return false;
    }
}

const workspaces = listServiceDirs(SERVICES_DIR).filter(hasStartDev);
if (workspaces.length === 0) {
    console.error('No se encontraron workspaces con script start:dev.');
    process.exit(1);
}

const names = workspaces.map(p => path.basename(p).toUpperCase().replace(/[^A-Z0-9]+/g, '_'));
const cmds = workspaces.map(p => `npm -w ${p} run start:dev`);

const args = ['concurrently', '-n', names.join(','), '-c', 'auto', ...cmds];
const r = spawnSync('npx', args, { stdio: 'inherit' });
process.exit(r.status ?? 0);
