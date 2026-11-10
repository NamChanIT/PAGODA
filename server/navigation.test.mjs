import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gardenExitStep, moveOnGround } from '../src/world/navigation.mjs';
const layout = JSON.parse(readFileSync(new URL('../src/world/layout.json', import.meta.url)));
const move = (from, to) => moveOnGround(from, to, layout.movement, layout.obstacles);

test('exit route survives delayed corrections and completes only after server confirmation', () => {
  let next = gardenExitStep({ x: 6, z: 17 }, null, { x: 6, z: 17 });
  assert.deepEqual(next.goal, { x: 0, z: 15 });
  next = gardenExitStep({ x: 0, z: 15 }, next.route, { x: 1, z: 15 });
  assert.equal(next.route.stage, 'exit');
  next = gardenExitStep({ x: .6, z: 16 }, next.route, { x: .6, z: 16 });
  assert.deepEqual(next.goal, { x: 0, z: 23 }, 'Corrections must not restart the centering waypoint');
  next = gardenExitStep({ x: 0, z: 23 }, next.route, { x: 0, z: 18 });
  assert.equal(next.arrived, false, 'Do not stop while the server is still inside the hall');
  assert.equal(gardenExitStep({ x: 0, z: 23 }, next.route, { x: 0, z: 23 }).arrived, true);
  assert.equal(gardenExitStep({ x: 0, z: 23 }, next.route, null).arrived, false);
});

test('visitors can leave the hall, walk both garden loops and return through the entrance', () => {
  for (const side of [-1, 1]) {
    let p = { x: 0, z: 12.5 };
    for (const goal of [{ x: 0, z: 23 }, { x: side * 25, z: 23 }, { x: side * 25, z: 4 },
      { x: side * 25, z: 38 }, { x: 0, z: 43 }, { x: 0, z: 12.5 }]) {
      p = move(p, goal);
      assert.ok(Math.hypot(p.x - goal.x, p.z - goal.z) < .001, JSON.stringify({ p, goal }));
    }
  }
});
test('hall walls, ponds and flower beds block swept movement without blocking sliding', () => {
  assert.ok(move({ x: 10, z: 10 }, { x: 20, z: 10 }).x <= 12.5);
  const slide = move({ x: 12, z: 10 }, { x: 15, z: 15 });
  assert.ok(slide.x <= 12.5); assert.ok(slide.z > 14.9);
  for (const side of [-1, 1]) {
    assert.ok(Math.abs(move({ x: side * 19.6, z: 4 }, { x: side * 19.6, z: -4 }).z) < .4);
    assert.ok(Math.abs(move({ x: side * 8, z: 30 }, { x: side * 17, z: 30 }).x) < 10.5);
  }
  assert.deepEqual(move({ x: 0, z: 45 }, { x: 0, z: 60 }), { x: 0, z: 49 });
});
