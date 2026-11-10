// Shared by browser prediction and server validation. Small swept steps keep
// thin walls solid even when a network update covers more than one frame.
export function moveOnGround(from, target, bounds, obstacles) {
  const dx = target.x - from.x, dz = target.z - from.z;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .15));
  const blocked = (x, z) => obstacles.some(o => x > o.minX && x < o.maxX && z > o.minZ && z < o.maxZ);
  let { x, z } = from;
  for (let i = 0; i < steps; i++) {
    const nextX = Math.max(bounds.minX, Math.min(bounds.maxX, x + dx / steps));
    if (!blocked(nextX, z)) x = nextX;
    const nextZ = Math.max(bounds.minZ, Math.min(bounds.maxZ, z + dz / steps));
    if (!blocked(x, nextZ)) z = nextZ;
  }
  return { x, z };
}

export function gardenExitStep(position, priorRoute, confirmed) {
  const route = priorRoute ?? { stage: 'center', centerZ: Math.min(position.z, 15) };
  if (route.stage === 'center' && Math.hypot(position.x, position.z - route.centerZ) < .15) route.stage = 'exit';
  const goal = route.stage === 'center' ? { x: 0, z: route.centerZ } : { x: 0, z: 23 };
  const atGoal = Math.hypot(position.x - goal.x, position.z - goal.z) < .08;
  return { route, goal, atGoal, arrived: route.stage === 'exit' && atGoal && !!confirmed && Math.hypot(confirmed.x, confirmed.z - 23) < .3 };
}
