// This is hella vibecoded, sorry

// Build release assets, upload them to GitHub, and update the Homebrew formula
// Usage: pnpm release {build,publish,formula} --help
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, promisify } from 'node:util';
import { gzipSync } from 'node:zlib';

const exec = promisify(execFile);
export const sha256 = (bytes) =>
  createHash('sha256').update(bytes).digest('hex');

export function versionFromTag(tag) {
  const match =
    /^v((?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*))$/.exec(tag);
  if (!match || match[0] !== tag || BigInt(match[1].split('.')[0]) < 2n) {
    throw new Error('expected a stable v2+ tag such as v2.0.0');
  }
  return match[1];
}

// The release has three USTAR entries. Fixed ownership, mode, and timestamps make its bytes reproducible without platform-specific tar command options.
function tarEntry(name, data, epoch, link = '') {
  const header = Buffer.alloc(512);
  function text(value, offset, width) {
    if (Buffer.byteLength(value) > width)
      throw new Error('tar field is too long');
    header.write(value, offset, width, 'utf8');
  }
  function octal(value, offset, width) {
    text(value.toString(8).padStart(width - 1, '0') + '\0', offset, width);
  }
  text(name, 0, 100);
  octal(link ? 0o777 : 0o644, 100, 8);
  octal(0, 108, 8);
  octal(0, 116, 8);
  octal(data.length, 124, 12);
  octal(epoch, 136, 12);
  header.fill(32, 148, 156);
  text(link ? '2' : '0', 156, 1);
  text(link, 157, 100);
  text('ustar\0', 257, 6);
  text('00', 263, 2);
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  text(checksum.toString(8).padStart(6, '0') + '\0 ', 148, 8);
  return Buffer.concat([
    header,
    data,
    Buffer.alloc((512 - (data.length % 512)) % 512),
  ]);
}

export function build({ source = '.', output, tag, epoch }) {
  const version = versionFromTag(tag);
  if (!Number.isSafeInteger(epoch) || epoch < 0)
    throw new Error('epoch must be a nonnegative integer');
  const original = readFileSync(path.join(source, 'koi'));
  const newline = original.indexOf(10);
  if (newline < 0) throw new Error('library is missing its first line');
  const license = readFileSync(path.join(source, 'LICENSE'));
  const comments = license
    .toString('utf8')
    .trimEnd()
    .split('\n')
    .map((line) => `# ${line}\n`)
    .join('');
  const library = Buffer.concat([
    original.subarray(0, newline + 1),
    Buffer.from(`\n# koi ${version}\n${comments}\n`),
    original.subarray(newline + 1),
  ]);
  const prefix = `koi-${version}`;
  const archive = gzipSync(
    Buffer.concat([
      tarEntry(`${prefix}/koi`, library, epoch),
      tarEntry(`${prefix}/LICENSE`, license, epoch),
      tarEntry(`${prefix}/bin/koi`, Buffer.alloc(0), epoch, '../koi'),
      Buffer.alloc(1024),
    ]),
    { level: 9 },
  );
  const files = [
    ['koi', library],
    [`${prefix}.tar.gz`, archive],
  ];
  mkdirSync(output, { recursive: true });
  for (const [name, bytes] of files)
    writeFileSync(path.join(output, name), bytes);
  writeFileSync(
    path.join(output, 'SHA256SUMS'),
    files.map(([name, bytes]) => `${sha256(bytes)}  ${name}\n`).join(''),
  );
}

export function updateFormula({
  formula = 'Formula/koi.rb',
  tag,
  digest,
  repository = 'wcarhart/koi',
}) {
  const version = versionFromTag(tag);
  if (!/^[0-9a-f]{64}$/.test(digest) || digest.length !== 64)
    throw new Error('expected a SHA-256 digest');
  const repoMatch = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.exec(repository);
  if (!repoMatch || repoMatch[0] !== repository)
    throw new Error('expected an owner/repository name');
  let text = readFileSync(formula, 'utf8').replace(
    /^  (?:url|sha256) ".*"\n/gm,
    '',
  );
  if (text.split('  head "').length !== 2)
    throw new Error('formula must contain exactly one HEAD declaration');
  const metadata = `  url "https://github.com/${repository}/releases/download/${tag}/koi-${version}.tar.gz"\n  sha256 "${digest}"\n`;
  text = text.replace('  head "', metadata + '  head "');
  writeFileSync(formula, text);
}

async function gh(...args) {
  const { stdout } = await exec('gh', args);
  return stdout;
}

export async function publishAssets({ directory, tag, repository, run = gh }) {
  const version = versionFromTag(tag);
  const release = JSON.parse(
    await run('api', `repos/${repository}/releases/tags/${tag}`),
  );
  if (release.draft || release.prerelease || release.immutable) {
    throw new Error('publishing requires a mutable, published stable release');
  }
  const assets = new Set(release.assets.map(({ name }) => name));
  for (const name of ['koi', `koi-${version}.tar.gz`, 'SHA256SUMS']) {
    const file = path.join(directory, name);
    if (assets.has(name)) {
      const temporary = mkdtempSync(path.join(tmpdir(), 'koi-release-'));
      try {
        const existing = path.join(temporary, name);
        await run(
          'release',
          'download',
          tag,
          '--repo',
          repository,
          '--pattern',
          name,
          '--output',
          existing,
        );
        if (!readFileSync(existing).equals(readFileSync(file))) {
          throw new Error(
            `published asset differs: ${name}, refusing to overwrite it`,
          );
        }
      } finally {
        rmSync(temporary, { recursive: true, force: true });
      }
    } else {
      await run('release', 'upload', tag, file, '--repo', repository);
    }
  }
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      help: { type: 'boolean', short: 'h' },
      ...Object.fromEntries(
        [
          'source',
          'output',
          'tag',
          'epoch',
          'formula',
          'sha256',
          'repository',
          'directory',
        ].map((name) => [name, { type: 'string' }]),
      ),
    },
  });
  if (values.help) {
    console.log(
      'Usage:\n  pnpm release build --tag TAG --epoch SECONDS --output DIR [--source DIR]\n  pnpm release formula --tag TAG --sha256 HASH [--formula FILE] [--repository OWNER/REPO]\n  pnpm release publish --tag TAG --repository OWNER/REPO --directory DIR',
    );
    return;
  }
  const [command] = positionals;
  const required = {
    build: ['tag', 'output', 'epoch'],
    formula: ['tag', 'sha256'],
    publish: ['tag', 'repository', 'directory'],
  }[command];
  if (!required || positionals.length !== 1)
    throw new Error('usage: pnpm release {build,publish,formula} [options]');
  for (const name of required) {
    if (!values[name]) throw new Error(`--${name} is required`);
  }
  if (command === 'build') build({ ...values, epoch: Number(values.epoch) });
  else if (command === 'formula')
    updateFormula({ ...values, digest: values.sha256 });
  else await publishAssets(values);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(`koi release: ${error.message}`);
    process.exitCode = 1;
  });
}
