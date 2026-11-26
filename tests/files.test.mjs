import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Chargé en module ES sans package.json « type: module »
const source = readFileSync(new URL('../src/files.js', import.meta.url), 'utf8');
const { formatSize, keepLargest, toFileUri, toGB } = await import(
  'data:text/javascript,' + encodeURIComponent(source)
);

test('tailles lisibles', () => {
  assert.equal(formatSize(2_500_000_000), '2,5 Go');
  assert.equal(formatSize(12_340_000), '12,3 Mo');
  assert.equal(formatSize(900), '1 Ko');
  assert.equal(toGB(128e9), '128,0');
});

test('adresses avec caractères spéciaux', () => {
  const uri = toFileUri('file:///storage/emulated/0/Movies/été #1 100%.mp4');
  assert.equal(new URL(uri).hash, '');
  assert.equal(decodeURIComponent(new URL(uri).pathname), '/storage/emulated/0/Movies/été #1 100%.mp4');
});

test('garde les plus gros, ignore les tailles inconnues', () => {
  const out = keepLargest([{ size: 5 }], [{ size: 9 }, { size: 0 }, { size: 1 }], 2);
  assert.deepEqual(out.map((f) => f.size), [9, 5]);
});
