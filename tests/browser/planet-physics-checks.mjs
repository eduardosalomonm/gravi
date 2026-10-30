/** Runs in the isolated browser against the game's actual animation/physics loop. */
export async function runPhysicsChecks() {
  const w = await import('../../lib/planet-world.mjs');
  const p = await import('../../lib/planet-physics.mjs');
  const a = await import('../../lib/awakening.mjs');
  const qa = window.__graviQA;
  const R = w.PLANET_RADIUS;
  const read = () => qa.read();
  const ticks = (n = 1) => window.__qaTicks(n);
  const check = (condition, message) => {
    if (!condition) throw new Error(message + '\n' + JSON.stringify(read()));
  };
  const until = (predicate, max = 1800) => {
    for (let i = 0; i < max; i++) {
      ticks();
      if (predicate()) return;
    }
    throw new Error('Physics operation timed out\n' + JSON.stringify(read()));
  };
  const solids = qa.solids();
  const height = () => Math.hypot(...Object.values(read().state.position)) - R;
  const at = (direction) => ({
    x: direction.x * R,
    y: direction.y * R,
    z: direction.z * R,
  });
  const distance = (direction) =>
    w.surfaceDistance(w.normalizeDirection(read().state.position), direction);
  const clearPoint = Array.from({ length: 200 }, (_, i) =>
    w.normalizeDirection({
      x: Math.cos(i * 2.4),
      y: 1 - i / 100,
      z: Math.sin(i * 2.4),
    }),
  ).find((d) =>
    solids.every((s) => w.surfaceDistance(d, s.direction) > s.radius + 2),
  );
  check(clearPoint, 'a clear jump fixture must exist');
  const completed = [...read().progress.completed];
  const jumps = [];
  for (const [name, gravity] of [
    ['Luna', 1.62],
    ['Marte', 3.71],
    ['Tierra', 9.81],
    ['Júpiter', 24.79],
  ]) {
    qa.place(clearPoint);
    qa.handle.setGravity(gravity);
    ticks(2);
    const landings = read().landings.length;
    qa.handle.requestJump();
    ticks();
    check(!read().state.grounded, `${name} jump did not launch`);
    let apex = height();
    until(() => {
      apex = Math.max(apex, height());
      return read().landings.length > landings;
    });
    const expected = 49 / (2 * gravity);
    check(
      Math.abs(apex - expected) < 0.1,
      `${name} apex ${apex}, expected ${expected}`,
    );
    check(
      read().state.grounded && Math.abs(height()) < 1e-6,
      `${name} landing sinks into planet`,
    );
    const gap = qa.footGap();
    check(
      gap.min > -0.12 && gap.min < 0.12,
      `${name} visual feet mismatch ${gap.min}`,
    );
    jumps.push({ name, gravity, apex, expected, footGap: gap.min });
  }
  qa.place(clearPoint);
  qa.handle.setGravity(0);
  ticks(2);
  qa.handle.requestJump();
  ticks(120);
  check(
    !read().state.grounded && height() > 10,
    'zero gravity must permit flight',
  );
  const speedBefore = Math.hypot(...Object.values(read().state.velocity));
  qa.handle.setGravity(9.81);
  check(
    Math.abs(
      Math.hypot(...Object.values(read().state.velocity)) - speedBefore,
    ) < 1e-8,
    'restoring gravity must preserve velocity',
  );
  until(() => read().state.grounded);
  check(Math.abs(height()) < 1e-6, 'zero-gravity return did not land');
  jumps.push({ name: 'Cero', gravity: 0, flight: true, return: true });

  const collisions = [];
  const lowRock = solids.find(
    (s) =>
      s.kind === 'platform' &&
      s.id.startsWith('forest-rock-') &&
      s.height <= 0.6 &&
      p.planetSupportAt(at(s.direction), solids).id === s.id,
  );
  const pillar = a.WIND_PILLARS.find(
    (s) => p.planetSupportAt(at(s.direction), solids).id === s.id,
  );
  const canopy = solids.find(
    (s) =>
      s.kind === 'canopy' &&
      p.planetSupportAt(at(s.direction), solids).kind === 'canopy',
  );
  check(lowRock && pillar && canopy, 'collision fixtures missing');
  for (const solid of [lowRock, a.SKY_STEPS[0], pillar, canopy]) {
    const support = p.planetSupportAt(at(solid.direction), solids);
    qa.place(solid.direction, support.radius - R + 0.5, -80);
    qa.handle.setGravity(24.79);
    const before = read().landings.length;
    until(() => read().landings.length > before, 120);
    check(
      read().state.supportId === support.id,
      `fast Jupiter fall tunneled through ${solid.id}`,
    );
    check(
      Math.abs(height() - (support.radius - R)) < 1e-5,
      `wrong collision height ${solid.id}`,
    );
    const gap = qa.footGap();
    check(
      gap.min > -0.12 && gap.min < 0.12,
      `visual feet sink into ${solid.id}: ${gap.min}`,
    );
    collisions.push({
      kind: 'fast Jupiter landing',
      id: support.id,
      footGap: gap.min,
    });
  }
  const trunk = solids.find(
    (s) => s.kind === 'tree' && s.id.startsWith('forest-tree'),
  );
  for (const solid of [lowRock, trunk]) {
    check(solid, 'trunk fixture missing');
    qa.place(w.offsetDirection(solid.direction, solid.radius + 2, 0));
    qa.handle.setGravity(24.79);
    ticks(2);
    window.__qaTask = {
      direction: solid.direction,
      jump: false,
      kp: 1.6,
      kd: 1.3,
    };
    let min = Infinity;
    for (let n = 0; n < 180; n++) {
      ticks();
      min = Math.min(min, distance(solid.direction));
    }
    check(
      min >= solid.radius + p.PLAYER_RADIUS - 0.025,
      `walk penetrates ${solid.id}: ${min}`,
    );
    check(
      min < solid.radius + p.PLAYER_RADIUS + 0.25,
      `side contact fixture did not reach ${solid.id}`,
    );
    window.__qaTask = {
      direction: w.offsetDirection(solid.direction, solid.radius + 3, 0),
      jump: false,
      kp: 1.6,
      kd: 1.3,
    };
    until(() => distance(solid.direction) > solid.radius + 2, 600);
    window.__qaTask = null;
    qa.handle.setMove(0, 0);
    collisions.push({
      kind: 'side collision and escape',
      id: solid.id,
      closest: min,
    });
  }
  const ceiling = a.FOREST_CANOPIES[0];
  qa.place(ceiling.direction);
  qa.handle.setGravity(1.62);
  ticks(2);
  const landings = read().landings.length;
  qa.handle.requestJump();
  ticks();
  let apex = height();
  until(() => {
    apex = Math.max(apex, height());
    return read().landings.length > landings;
  });
  check(apex < 8, 'jump passed through the underside of the canopy');
  check(
    read().state.supportKind === 'planet',
    'underside collision should return to the ground',
  );
  collisions.push({ kind: 'canopy underside', apex });
  qa.handle.reset();
  ticks(2);
  check(
    Math.hypot(...Object.values(read().state.velocity)) < 1e-6,
    'return button must stop velocity',
  );
  check(
    JSON.stringify(read().progress.completed) === JSON.stringify(completed),
    'physics checks or return lost completed challenges',
  );
  check(
    read().bursts.length === 0,
    'completed rewards fired again during physics checks',
  );
  return { jumps, collisions, returnPreservesProgress: true };
}
