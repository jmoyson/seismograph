#!/usr/bin/env node
/*
 * Patches Superset's MainPreset.{js,ts} to import and register the
 * @seismograph/superset-plugins package. Run from inside the Superset
 * frontend root (e.g. /src/superset-frontend) during the Docker build.
 *
 * Why a Node script and not sed:
 *   - sed cannot reason about "the last import statement" or "the start of
 *     the plugins array", so it breaks the moment Superset shuffles whitespace
 *     or imports between releases.
 *   - This script does string-level (not AST) edits but anchors them on
 *     stable landmarks (`import ... ;` and `plugins: [`), which survive most
 *     formatting changes.
 *
 * If Superset ever changes the MainPreset shape badly enough to break this
 * script, the cleanest fallback is to COPY a full custom MainPreset.js
 * pinned to the Superset version we ship.
 *
 * History:
 *   - Up to ~5.x: file was MainPreset.ts
 *   - 6.0.0+: migrated to MainPreset.js
 *   We probe both, in that order.
 */

const fs = require('fs');
const path = require('path');

const CANDIDATE_PATHS = [
  'src/visualizations/presets/MainPreset.js',
  'src/visualizations/presets/MainPreset.ts',
];

const IMPORT_LINE =
  "import { SeismoGlobePlugin, MagnitudePulsePlugin } from '@seismograph/superset-plugins';";

const PLUGIN_LINES = [
  "    new SeismoGlobePlugin().configure({ key: 'seismo-globe' }),",
  "    new MagnitudePulsePlugin().configure({ key: 'magnitude-pulse' }),",
].join('\n');

function fail(message) {
  console.error(`[register-plugins] ${message}`);
  process.exit(1);
}

const PRESET_FILE = CANDIDATE_PATHS.map((p) => path.resolve(p)).find(
  (p) => fs.existsSync(p),
);

if (!PRESET_FILE) {
  fail(
    `MainPreset.{js,ts} not found. Tried:\n  ${CANDIDATE_PATHS.map((p) => path.resolve(p)).join('\n  ')}`,
  );
}

console.log(`[register-plugins] Patching ${PRESET_FILE}`);

let content = fs.readFileSync(PRESET_FILE, 'utf8');

if (content.includes('@seismograph/superset-plugins')) {
  console.log('[register-plugins] Plugins already registered, skipping.');
  process.exit(0);
}

// 1. Insert the import after the last existing import statement.
const lastImportIdx = content.lastIndexOf('\nimport ');
if (lastImportIdx === -1) {
  fail('Could not find any import statement in MainPreset');
}
const importEnd = content.indexOf(';', lastImportIdx);
if (importEnd === -1) {
  fail('Could not find the end (";") of the last import statement');
}
content =
  content.slice(0, importEnd + 1) +
  '\n' +
  IMPORT_LINE +
  content.slice(importEnd + 1);

// 2. Insert the plugin instances at the top of the `plugins: [` array.
const pluginsKeyIdx = content.indexOf('plugins:');
if (pluginsKeyIdx === -1) {
  fail('Could not find a `plugins:` key in MainPreset');
}
const arrayOpenIdx = content.indexOf('[', pluginsKeyIdx);
if (arrayOpenIdx === -1) {
  fail('Could not find the opening "[" of the plugins array');
}
content =
  content.slice(0, arrayOpenIdx + 1) +
  '\n' +
  PLUGIN_LINES +
  content.slice(arrayOpenIdx + 1);

fs.writeFileSync(PRESET_FILE, content);

console.log('[register-plugins] Patched successfully.');
console.log('[register-plugins] First 30 lines after patch:');
console.log(content.split('\n').slice(0, 30).join('\n'));
