// Project-authored notice collector. Reads installed packages only; no upload,
// registry calls, environment-file reads or license grant over business code.
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const legalName = /^(?:licen[cs]e|copying|copyright|notice|third.party.notice)/i;
const read = path => readFileSync(path, 'utf8');
const json = path => JSON.parse(read(path));

function legalFiles(directory, depth = 0) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isFile() && legalName.test(entry.name) && !/\.(?:[cm]?js|ts|map|go|json|ya?ml|svg|png)$/i.test(entry.name)) {
      const path = join(directory, entry.name);
      files.push({ path, text: read(path) });
    } else if (entry.isDirectory() && depth < 2 && !/^(?:node_modules|tests?|fixtures?|examples?|\.git)$/.test(entry.name)) {
      files.push(...legalFiles(join(directory, entry.name), depth + 1));
    }
  }
  return files;
}

function licenseString(value) {
  if (Array.isArray(value)) return value.map(licenseString).join(' OR ');
  if (value && typeof value === 'object') return licenseString(value.type);
  return typeof value === 'string' ? value : '';
}

function record(directory) {
  const metadata = json(join(directory, 'package.json'));
  const files = legalFiles(directory);
  // Exact upstream texts collected for npm tarballs that omitted their license.
  const supplement = join(root, 'docs/license-evidence', `${metadata.name.replaceAll('/', '-').replaceAll('@', '')}-${metadata.version}.txt`);
  if (existsSync(supplement)) files.push({ path: supplement, text: read(supplement) });
  let license = licenseString(metadata.license || metadata.licenses);
  // Some upstream tarballs omit the manifest field but retain the actual grant.
  const evidence = files.map(file => file.text).join('\n');
  if (!license && /Permission is hereby granted, free of charge/.test(evidence)) license = 'MIT';
  if (!license && /Apache License[\s\S]{0,80}Version 2\.0/.test(evidence)) license = 'Apache-2.0';
  if (!files.length) {
    // Preserve upstream README grants/copyrights when no separate file exists.
    for (const entry of readdirSync(directory)) {
      if (/^readme(?:\.|$)/i.test(entry)) {
        const path = join(directory, entry);
        files.push({ path, text: read(path) });
      }
    }
    function sourceHeaders(folder, depth = 0) {
      for (const entry of readdirSync(folder, { withFileTypes: true })) {
        const path = join(folder, entry.name);
        if (entry.isDirectory() && depth < 2 && !/^(?:node_modules|tests?|examples?)$/.test(entry.name)) sourceHeaders(path, depth + 1);
        if (!entry.isFile() || !/\.[cm]?js$/.test(entry.name)) continue;
        const header = read(path).split('\n').slice(0, 80).filter(line => line.length < 2000).join('\n');
        if (/copyright|permission is hereby granted/i.test(header)) files.push({ path, text: header });
      }
    }
    sourceHeaders(directory);
  }
  return {
    name: metadata.name, version: metadata.version, license: license || 'UNRESOLVED',
    source: metadata.repository?.url || metadata.repository || metadata.homepage || '',
    author: metadata.author || metadata.contributors || '',
    evidenceStatus: files.some(file => /Permission is hereby granted|Apache License|Redistribution and use|Mozilla Public License|ISC License|OFL|SIL OPEN FONT/i.test(file.text)) ? 'grant-text' : 'metadata-and-attribution-review',
    directory, files,
  };
}

function inventory() {
  const packages = new Map(), visited = new Set();
  const lockPath = join(root, 'pnpm-lock.yaml');
  const locked = existsSync(lockPath)
    ? new Set([...read(lockPath).matchAll(/^  ['"]?(.+?)@(\d[^\s'":(]*)(?:[('":]|$)/gm)].map(match => `${match[1]}@${match[2]}`))
    : null;
  function scan(directory) {
    if (!existsSync(directory)) return;
    directory = realpathSync(directory);
    if (visited.has(directory)) return;
    visited.add(directory);
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === '.pnpm') {
        for (const store of readdirSync(join(directory, entry.name))) scan(join(directory, entry.name, store, 'node_modules'));
      } else if (entry.name.startsWith('@')) {
        scan(join(directory, entry.name));
      } else if (!entry.name.startsWith('.')) {
        const candidate = join(directory, entry.name);
        if (!existsSync(join(candidate, 'package.json'))) continue;
        const actual = realpathSync(candidate);
        const meta = json(join(actual, 'package.json'));
        const key = `${meta.name}@${meta.version}`;
        if (meta.name && meta.version && !packages.has(key) && (!locked || locked.has(key))) packages.set(key, record(actual));
        scan(join(actual, 'node_modules'));
      }
    }
  }
  scan(join(root, 'node_modules'));
  return [...packages.values()].sort((a, b) => `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`));
}

function notices(records) {
  const lines = ['THIRD-PARTY SOFTWARE NOTICES', '',
    'These notices apply to their respective third-party components only.',
    'They do not license the application business code, customer content or trademarks.',
    'MPL-covered components remain unmodified; the versioned upstream source is identified below.', ''];
  if (existsSync(join(root, 'LICENSE'))) lines.push('Vben framework (modified for this application):', read(join(root, 'LICENSE')), '');
  for (const item of records) {
    lines.push('='.repeat(72), `${item.name}@${item.version}`, `License: ${item.license}`, `Selected license: ${item.selectedLicense || item.license}`, `Source: ${typeof item.source === 'string' ? item.source : JSON.stringify(item.source)}`, `Author metadata: ${JSON.stringify(item.author)}`);
    for (const file of item.files) lines.push(`--- ${file.path.startsWith(item.directory) ? file.path.slice(item.directory.length + 1) : file.path.slice(root.length + 1)} ---`, file.text);
  }
  for (const name of ['ASSET_NOTICES.txt', 'ICON_NOTICES.txt']) {
    if (existsSync(join(root, 'docs', name))) lines.push(read(join(root, 'docs', name)));
  }
  return lines.join('\n') + '\n';
}

export function licenseNoticesPlugin() {
  return {
    name: 'project-third-party-notices',
    apply: 'build',
    generateBundle(_options, bundle) {
      const directories = new Set();
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') continue;
        for (const id of Object.keys(output.modules)) {
          if (!id.includes('node_modules')) continue;
          let directory = dirname(id.replace(/^\0/, '').split('?')[0]);
          while (directory !== dirname(directory)) {
            if (existsSync(join(directory, 'package.json'))) {
              const metadata = json(join(directory, 'package.json'));
              if (metadata.name && metadata.version) { directories.add(directory); break; }
            }
            directory = dirname(directory);
          }
        }
      }
      const packages = [...directories].map(record).sort((a, b) => a.name.localeCompare(b.name));
      const approved = new Set(['MIT', 'Apache-2.0', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', '0BSD', 'CC0-1.0', 'Unlicense', 'OFL-1.1']);
      for (const item of packages) {
        // Only simple, reviewed SPDX expressions. A dual GPL license may be
        // used under an explicitly available permissive alternative.
        const expression = item.license.replace(/^\(([^()]+)\)$/, '$1');
        const alternative = expression.split(/\s+OR\s+/).find(option => option.split(/\s+AND\s+/).every(term => approved.has(term.trim())));
        if (!alternative) this.error(`Review license before release: ${item.name}@${item.version}: ${item.license}`);
        item.selectedLicense = alternative;
      }
      this.emitFile({ type: 'asset', fileName: 'static/licenses/THIRD_PARTY_NOTICES.txt', source: notices(packages) });
      this.emitFile({ type: 'asset', fileName: 'static/licenses/components.json', source: JSON.stringify(packages.map(({ name, version, license, selectedLicense, source }) => ({ name, version, license, selectedLicense, source })), null, 2) });
    },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const packages = inventory();
  mkdirSync(join(root, 'docs/licenses'), { recursive: true });
  writeFileSync(join(root, 'docs/licenses/inventory.json'), JSON.stringify(packages.map(({ directory, files, ...item }) => ({ ...item, evidence: files.map(file => file.path.startsWith(directory) ? file.path.slice(directory.length + 1) : file.path.slice(root.length + 1)) })), null, 2) + '\n');
  writeFileSync(join(root, 'docs/licenses/THIRD_PARTY_NOTICES.txt'), notices(packages));
  const unknown = packages.filter(item => item.license === 'UNRESOLVED').map(item => `${item.name}@${item.version}`);
  console.log(JSON.stringify({ packages: packages.length, unresolved: unknown }));
}
