// Ejecuta un comando con variables de entorno, igual en Windows, Mac y Linux.
// Uso: node scripts/entorno.mjs BUGS=0 MOTOR=x -- playwright test --project=chromium
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const corte = args.indexOf('--');
const asignaciones = corte === -1 ? [] : args.slice(0, corte);
const comando = corte === -1 ? args : args.slice(corte + 1);
const env = { ...process.env };
for (const a of asignaciones) {
  const i = a.indexOf('=');
  env[a.slice(0, i)] = a.slice(i + 1);
}
const hijo = spawn('npx', comando, { stdio: 'inherit', env, shell: process.platform === 'win32' });
hijo.on('exit', (codigo) => process.exit(codigo ?? 1));
