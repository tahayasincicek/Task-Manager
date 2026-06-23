#!/usr/bin/env node
/**
 * ESLint'i projenin kendi kodu üzerinde çalıştırır ve JSON raporunu
 * reports/<stage>/eslint.json yoluna yazar.
 *
 * ESLint bulgu bulduğunda exit code != 0 döner; yönerge sadece raporun
 * üretilmesini istediği için exit code'u 0'a normalleştiriyoruz
 * (gerçek başarısızlık — parse hatası vb. — yine propagate edilir).
 *
 * Kullanım:
 *   node scripts/run-eslint-report.mjs --stage stage1
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

function parseArgs(argv) {
  const args = { stage: 'stage1' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--stage' || a === '-s') args.stage = argv[++i];
    else if (a.startsWith('--stage=')) args.stage = a.slice('--stage='.length);
  }
  return args;
}

async function main() {
  const { stage } = parseArgs(process.argv);
  const outDir = path.join('reports', stage);
  await fs.mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, 'eslint.json');

  const eslintBin = path.join(
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'eslint.cmd' : 'eslint',
  );

  const eslintArgs = [
    '--ext', '.ts,.tsx',
    '--format', 'json',
    '--output-file', outFile,
    'src',
    'client/src',
    'tests',
  ];

  console.log(`[eslint] running -> ${outFile}`);

  const child = spawn(eslintBin, eslintArgs, {
    stdio: ['ignore', 'inherit', 'inherit'],
    shell: process.platform === 'win32',
  });

  await new Promise((resolve) => {
    child.on('close', (code) => {
      // ESLint exit codes:
      //   0 = no problems
      //   1 = lint errors (rapor üretilir, istenilen durum)
      //   2 = ESLint kendisi hata verdi (config/parse)
      if (code === 2) {
        console.error(`[eslint] aborted with code ${code}`);
        process.exit(code);
      }
      console.log(`[eslint] done (exit ${code})`);
      resolve();
    });
  });

  // Özet çıktısı
  try {
    const raw = await fs.readFile(outFile, 'utf8');
    const results = JSON.parse(raw);
    let errors = 0, warnings = 0, files = 0;
    for (const f of results) {
      if (f.messages.length > 0) files++;
      errors += f.errorCount || 0;
      warnings += f.warningCount || 0;
    }
    console.log(`[eslint] files with issues: ${files}, errors: ${errors}, warnings: ${warnings}`);
  } catch (e) {
    console.warn(`[eslint] summary unavailable: ${e.message}`);
  }
}

main().catch((e) => {
  console.error(e.stack || e.message || e);
  process.exit(1);
});
