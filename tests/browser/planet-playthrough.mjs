import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { instrumentPlanet } from './planet-instrumentation.mjs';

const base = process.env.GRAVI_QA_URL ?? 'http://localhost:3107';
assert.ok(
  ['localhost', '127.0.0.1'].includes(new URL(base).hostname),
  'The instrumented QA runner is local-only.',
);
const output =
  process.env.GRAVI_QA_OUTPUT ?? path.join(tmpdir(), 'gravi-playthrough');
await mkdir(output, { recursive: true });
await rm(path.join(output, 'failure.txt'), { force: true });
const installedChrome =
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const executablePath =
  process.env.GRAVI_CHROME_PATH ??
  (existsSync(installedChrome) ? installedChrome : undefined);
const browser = await chromium.launch({ executablePath, headless: true });
const results = [];
const errors = [];
try {
  for (const [character, name] of [
    ['gravi', 'Gravi'],
    ['mimo', 'Mimo'],
    ['pipo', 'Pipo'],
  ]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    await instrumentPlanet(context);
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push({ character, message: e.message }));
    page.on('console', (message) => {
      if (message.text().startsWith('CASE ')) console.log(message.text());
    });
    page.setDefaultTimeout(15000);
    await page.goto(base);
    await page
      .getByRole('button', { name: `Elegir a ${name}`, exact: true })
      .click();
    await page
      .getByRole('button', {
        name: 'Explorar el planeta Entrar ahora',
        exact: true,
      })
      .click();
    await page
      .getByRole('button', { name: 'Explorar por mi cuenta', exact: true })
      .click();
    await page.waitForFunction(() => !!window.__graviQA);
    await page.evaluate(() => {
      window.__graviManual = true;
    });
    await page.waitForFunction(() => window.__qaPending() > 0, null, {
      polling: 20,
    });
    console.log('START', character);
    const outcome = await page.evaluate(
      async ({ character }) => {
        const world = await import('/lib/planet-world.mjs');
        const a = await import('/lib/awakening.mjs');
        const f = await import('/lib/finale-course.mjs');
        const qa = window.__graviQA;
        const cases = [];
        const read = () => qa.read();
        const check = (value, message) => {
          if (!value) throw new Error(message + '\n' + JSON.stringify(read()));
        };
        const ticks = (n = 1) => window.__qaTicks(n);
        const distance = (target) =>
          world.surfaceDistance(
            world.normalizeDirection(read().state.position),
            target,
          );
        const task = (direction, jump = false, kp = 1.6, kd = 1.3) => {
          window.__qaTask = { direction, jump, kp, kd };
        };
        const brake = () => {
          window.__qaTask = null;
          qa.handle.setMove(0, 0);
        };
        const until = (predicate, max = 1800, label = 'operation') => {
          for (let i = 0; i < max; i++) {
            ticks();
            if (predicate()) return i;
          }
          throw new Error(label + ' timed out\n' + JSON.stringify(read()));
        };
        const walk = (
          direction,
          predicate = () => distance(direction) < 0.4,
          max = 1800,
        ) => {
          task(direction);
          until(predicate, max, 'walk');
          brake();
          ticks(40);
        };
        const jumpTo = (target, gravity = 1.62, kp = 1.6, kd = 1.3) => {
          qa.handle.setGravity(gravity);
          const before = read().landings.length;
          check(read().state.grounded, 'jump must start grounded');
          task(target.direction, true, kp, kd);
          until(
            () => read().landings.length > before,
            1800,
            `jump to ${target.id}`,
          );
          brake();
          const state = read();
          check(
            state.landings.at(-1).id === target.id,
            `landed on ${state.landings.at(-1).id}, expected ${target.id}`,
          );
          const gap = qa.footGap();
          check(
            gap.min > -0.12 && gap.min < 0.12,
            `feet mismatch on ${target.id}: ${gap.min}`,
          );
          ticks(2);
        };
        const start = (direction) => {
          qa.handle.setGravity(9.81);
          qa.place(direction);
          ticks(2);
        };
        const award = (id) => {
          brake();
          ticks(100);
          const state = read();
          check(
            state.character === character &&
              state.progress.completed.includes(id),
            `${character}/${id} not completed`,
          );
          const tree = state.visuals.trees.find((t) => t.id === id);
          check(
            tree.blooming && tree.amount > 0.95 && !tree.sleeping,
            `${id} did not bloom`,
          );
          check(
            state.visuals.wonders.some((w) => w.id === id && w.motes === 18),
            `${id} missing permanent reward`,
          );
          check(
            state.bursts.filter((b) => b.id === id).length === 1,
            `${id} should celebrate exactly once`,
          );
          const saved = JSON.parse(localStorage.getItem('gravi.progress.v1'));
          check(
            saved.character === character &&
              saved.awakenings.completed.includes(id),
            `${id} not saved`,
          );
          if (id === 'flowers')
            check(
              state.visuals.meadow && state.visuals.butterflies === 7,
              'meadow reward missing',
            );
          if (id === 'jupiter')
            check(state.visuals.jupiter, 'golden garden missing');
          if (id === 'lanterns')
            check(
              state.visuals.lanterns.every(Boolean) &&
                state.visuals.fireflies === 42,
              'lantern reward missing',
            );
          if (id === 'river')
            check(state.visuals.river, 'river reward missing');
          cases.push({
            id,
            title: a.AWAKENINGS.find((item) => item.id === id).title,
            completed: true,
            reward: true,
            persisted: true,
          });
          console.log('CASE', character, id);
        };

        start(world.offsetDirection(a.AWAKENINGS[0].direction, 0, 4));
        walk(a.AWAKENINGS[0].direction);
        ticks(120);
        check(
          !read().progress.completed.includes('flowers'),
          'wrong gravity awarded flowers',
        );
        qa.handle.setGravity(1.62);
        until(
          () => read().progress.completed.includes('flowers'),
          240,
          'flower dwell',
        );
        award('flowers');

        start(world.offsetDirection(a.PETAL_STOPS[0], 0, 3));
        for (let i = 0; i < a.PETAL_STOPS.length; i++)
          walk(a.PETAL_STOPS[i], () => read().progress.petalStep > i);
        award('petals');

        start(world.offsetDirection(a.SKY_STEPS[0].direction, 0, 3.5));
        for (const target of a.SKY_STEPS.slice(0, 2))
          jumpTo(target, 1.62, 1.1, 2.1);
        task(world.offsetDirection(a.SKY_STEPS[1].direction, 8, 0));
        until(
          () => read().landings.at(-1)?.kind === 'planet',
          1800,
          'fall from sky steps',
        );
        brake();
        check(
          read().progress.skyStep === 0,
          'sky fall did not reset the sequence',
        );
        check(
          read().progress.completed.includes('flowers') &&
            read().progress.completed.includes('petals'),
          'fall cleared other rewards',
        );
        start(world.offsetDirection(a.SKY_STEPS[0].direction, 0, 3.5));
        for (const target of a.SKY_STEPS) jumpTo(target, 1.62, 1.1, 2.1);
        award('sky');

        start(world.offsetDirection(a.RESONANCE_STONES[0], 0, 3));
        qa.handle.setGravity(24.79);
        for (let i = 0; i < a.RESONANCE_STONES.length; i++)
          walk(a.RESONANCE_STONES[i], () => read().progress.stones.includes(i));
        walk(a.AWAKENINGS.find((item) => item.id === 'jupiter').direction, () =>
          read().progress.completed.includes('jupiter'),
        );
        award('jupiter');

        start(world.offsetDirection(a.LANTERN_STOPS[0], 0, 3));
        for (let i = 0; i < a.LANTERN_STOPS.length; i++)
          walk(a.LANTERN_STOPS[i], () => read().progress.lanternStep > i);
        award('lanterns');

        start(world.offsetDirection(a.RIDGE_STEPS[0].direction, 0, 3));
        for (const target of a.RIDGE_STEPS) jumpTo(target, 3.71);
        award('ridge');

        start(world.offsetDirection(a.REFLECTION_POINTS[0], 0, 3));
        for (let i = 0; i < a.REFLECTION_POINTS.length; i++) {
          qa.handle.setGravity([1.62, 9.81, 24.79][i]);
          walk(
            a.REFLECTION_POINTS[i],
            () => read().progress.reflectionStep > i,
          );
        }
        award('reflection');

        start(world.offsetDirection(a.RIVER_STOPS[0].direction, 0, 3));
        qa.handle.setGravity(1.62);
        for (let i = 0; i < a.RIVER_STOPS.length; i++) {
          const stop = a.RIVER_STOPS[i];
          if (stop.height > 0) jumpTo(stop);
          else walk(stop.direction, () => read().progress.riverStep > i);
          check(
            read().progress.riverStep > i,
            `river stop ${i + 1} not collected`,
          );
        }
        award('river');

        start(world.offsetDirection(a.WIND_STEPS[0].direction, 0, 3));
        for (const target of a.WIND_STEPS.slice(0, 3)) jumpTo(target);
        task(world.offsetDirection(a.WIND_STEPS[2].direction, 8, 0));
        until(
          () => read().landings.at(-1)?.kind === 'planet',
          1800,
          'fall from wind terrace',
        );
        brake();
        check(
          read().progress.windStep === 3,
          'wind fall lost the third-step checkpoint',
        );
        for (const target of a.WIND_STEPS.slice(3)) jumpTo(target);
        award('wind');
        check(
          read().progress.completed.length === 9,
          'finale should follow nine ordinary challenges',
        );

        start(world.offsetDirection(f.FINALE_FLOWERS[0].direction, 0, 3));
        for (let i = 0; i < f.FINALE_FLOWERS.length; i++) {
          qa.handle.setGravity(f.FINALE_FLOWERS[i].gravity);
          walk(
            f.FINALE_FLOWERS[i].direction,
            () => read().progress.finale.flower > i,
          );
        }
        check(
          read().progress.finale.stage === 1,
          'finale discover stage failed',
        );
        qa.handle.setGravity(1.62);
        for (let i = 0; i < f.FINALE_PATH.length; i++) {
          const stop = f.FINALE_PATH[i];
          if (stop.height > 0) jumpTo(stop);
          else walk(stop.direction, () => read().progress.finale.path > i);
        }
        check(read().progress.finale.stage === 2, 'finale path stage failed');
        for (const target of f.FINALE_STEPS) jumpTo(target);
        award('journey');
        check(
          read().progress.completed.length === 10,
          'not all ten challenges completed',
        );
        check(
          !read().visuals.beacon,
          'final beacon should disappear after completion',
        );
        check(
          read().visuals.trees.find((t) => t.id === 'journey').gold,
          'final sakura should be gold',
        );

        window.__qaDraw = true;
        ticks();
        window.__qaDraw = false;
        return {
          character,
          cases,
          saved: JSON.parse(localStorage.getItem('gravi.progress.v1')),
          landings: read().landings.length,
          visuals: read().visuals,
        };
      },
      { character },
    );
    results.push(outcome);
    await page.screenshot({
      path: path.join(output, `${character}-final.png`),
    });
    // Let React paint the final report, then inspect all ten map memories.
    await page.getByRole('button', { name: '◎ Mapa', exact: true }).click();
    assert.equal(await page.locator('.reward-vignette').count(), 10);
    await page
      .getByRole('button', { name: 'Cerrar mapa', exact: true })
      .click();
    await page.reload();
    await page.waitForFunction(() => !!window.__graviQA);
    await page.evaluate(() => {
      window.__graviManual = true;
    });
    await page.waitForFunction(() => window.__qaPending() > 0, null, {
      polling: 20,
    });
    const reloaded = await page.evaluate(() => {
      window.__qaTicks(3);
      return window.__graviQA.read();
    });
    assert.equal(reloaded.progress.completed.length, 10);
    assert.equal(reloaded.character, character);
    assert.ok(reloaded.visuals.trees.every((t) => t.blooming && !t.sleeping));
    assert.equal(reloaded.bursts.length, 0, 'reload must not award again');
    outcome.physics = await page.evaluate(async () => {
      const { runPhysicsChecks } =
        await import('/tests/browser/planet-physics-checks.mjs');
      return runPhysicsChecks();
    });
    console.log(
      'PASS physics',
      character,
      outcome.physics.jumps.length,
      'gravities',
      outcome.physics.collisions.length,
      'collision checks',
    );
    console.log(
      'PASS',
      character,
      outcome.cases.length,
      'challenges, map and reload',
    );
    await writeFile(
      path.join(output, 'results.json'),
      JSON.stringify({ results, errors }, null, 2),
    );
    await context.close();
  }
  assert.deepEqual(errors, []);
  assert.equal(
    results.reduce((n, r) => n + r.cases.length, 0),
    30,
  );
  console.log('PASS 30/30 challenge-character combinations');
} catch (error) {
  await writeFile(path.join(output, 'failure.txt'), String(error.stack));
  throw error;
} finally {
  await browser.close();
}
