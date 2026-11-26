import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const load = (name) => import(
  'data:text/javascript,' + encodeURIComponent(readFileSync(new URL(`../src/${name}.js`, import.meta.url), 'utf8'))
);
const { addSample, dischargeRate, median, DAY } = await load('history');
const { identicalGroups, isOld, sameSizeGroups } = await load('files');

const H = 3600000;
const at = (hours, level, plugged = false) => ({ t: hours * H, level, plugged });

test('un point seulement si quelque chose change ou après 10 minutes', () => {
  const list = [at(0, 80)];
  assert.equal(addSample(list, { t: 60000, level: 80, plugged: false }), list);
  assert.equal(addSample(list, { t: 60000, level: 79, plugged: false }).length, 2);
  assert.equal(addSample(list, { t: 11 * 60000, level: 80, plugged: false }).length, 2);
});

test('les points de plus de 24 h sont oubliés', () => {
  assert.equal(addSample([at(0, 80)], { t: DAY + 1, level: 50, plugged: false }).length, 1);
});

test('décharge calculée depuis la dernière charge', () => {
  assert.equal(dischargeRate([at(0, 40, true), at(1, 90), at(2, 85), at(3, 80)]), 5);
  assert.equal(dischargeRate([at(0, 90), at(1, 80, true)]), null); // branché
  assert.equal(dischargeRate([at(0, 90), at(1, 89)]), null); // baisse trop faible
  assert.equal(dischargeRate([at(0, 50), at(1, 90), at(2, 86)]), 4); // recharge non observée
  assert.equal(dischargeRate([at(0, 99), at(10, 90), at(11, 87)]), 3); // long trou ignoré
  assert.equal(dischargeRate([]), null);
});

test('médiane', () => {
  assert.equal(median([9, 1, 5]), 5);
  assert.equal(median([4, 2]), 3);
});

test('anciens fichiers', () => {
  assert.equal(isOld({ modificationTime: 1 }, 2 * 365 * DAY), true);
  assert.equal(isOld({ modificationTime: 0 }, 2 * 365 * DAY), false); // date inconnue
});

test('doublons : même contenu seulement, le plus ancien en premier', () => {
  const f = (id, size, modificationTime) => ({ id, size, modificationTime });
  const files = [f('a', 5, 20), f('b', 5, 10), f('c', 5, 30), f('d', 7, 1), f('e', 9, 1), f('g', 9, 2)];
  assert.deepEqual(sameSizeGroups(files).flat().map((x) => x.id), ['e', 'g', 'a', 'b', 'c']);
  const digests = new Map([['a', 'x'], ['b', 'x'], ['c', 'y'], ['e', 'z']]); // g illisible
  const groups = identicalGroups(files, digests);
  assert.deepEqual(groups.map((g) => g.map((x) => x.id)), [['b', 'a']]);
});
