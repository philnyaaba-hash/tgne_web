import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const lighthouseCli = require.resolve('lighthouse/cli/index.js');

const url = process.env.LIGHTHOUSE_URL || 'http://127.0.0.1:3000';
const outputPath = process.env.LIGHTHOUSE_OUTPUT || 'lighthouse-report.html';
const outputFormat = outputPath.toLowerCase().endsWith('.json') ? 'json' : 'html';

try {
  const response = await fetch(url);
  if (!response.ok) {
    console.error(
      `Lighthouse target ${url} returned HTTP ${response.status}. ` +
        'Start the dev server or set LIGHTHOUSE_URL.'
    );
    process.exit(1);
  }
} catch (error) {
  console.error(`Cannot reach ${url}. Start the dev server or set LIGHTHOUSE_URL.`);
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const args = [
  lighthouseCli,
  url,
  '--chrome-flags=--headless --no-sandbox',
  '--only-categories=performance,accessibility,best-practices,seo',
  `--output=${outputFormat}`,
  `--output-path=${outputPath}`,
  '--quiet'
];

const child = spawn(process.execPath, args, { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 1));
