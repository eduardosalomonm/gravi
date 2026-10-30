import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { instrumentPlanet } from './planet-instrumentation.mjs';

const base = process.env.GRAVI_QA_URL ?? 'http://localhost:3107';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const output =
  process.env.GRAVI_QA_OUTPUT ?? path.join(tmpdir(), 'gravi-mobile');
await mkdir(output, { recursive: true });
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({
  executablePath:
    process.env.GRAVI_CHROME_PATH ?? (existsSync(chrome) ? chrome : undefined),
});
const results = [];
const errors = [];
const difference = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
try {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    const context = await browser.newContext({
      viewport,
      isMobile: true,
      hasTouch: true,
    });
    await instrumentPlanet(context);
    await context.addInitScript(() => {
      window.__mobilePointers = [];
      document.addEventListener(
        'pointerdown',
        (e) => {
          window.__mobilePointers.push({
            type: e.type,
            button: e.button,
            id: e.pointerId,
            target:
              e.target instanceof Element
                ? e.target.getAttribute('class')
                : null,
          });
        },
        true,
      );
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base);
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
    const tick = (n = 1) =>
      page.evaluate((count) => {
        window.__qaTicks(count);
        return window.__graviQA.read();
      }, n);
    const read = () => page.evaluate(() => window.__graviQA.read());
    const setup = () =>
      page.evaluate(async () => {
        const w = await import('/lib/planet-world.mjs');
        const qa = window.__graviQA;
        const direction = Array.from({ length: 200 }, (_, i) =>
          w.normalizeDirection({
            x: Math.cos(i * 2.4),
            y: 1 - i / 100,
            z: Math.sin(i * 2.4),
          }),
        ).find((d) =>
          qa
            .solids()
            .every((s) => w.surfaceDistance(d, s.direction) > s.radius + 3),
        );
        if (!direction) throw new Error('No clear touch fixture');
        qa.place(direction);
        window.__qaTicks(90);
      });
    await setup();
    const rectangles = await page
      .locator('.joystick, .jump-button, .gravity-button')
      .evaluateAll((nodes) =>
        nodes.map((n) => {
          const r = n.getBoundingClientRect();
          return {
            className: n.getAttribute('class'),
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
          };
        }),
      );
    assert.equal(rectangles.length, 3);
    for (const r of rectangles) {
      assert.ok(r.width >= 44 && r.height >= 44);
      assert.ok(
        r.x >= 0 &&
          r.y >= 0 &&
          r.x + r.width <= viewport.width + 1 &&
          r.y + r.height <= viewport.height + 1,
        'touch target outside viewport',
      );
    }
    for (let i = 0; i < rectangles.length; i++)
      for (let j = i + 1; j < rectangles.length; j++) {
        const a = rectangles[i],
          b = rectangles[j];
        assert.ok(
          a.x + a.width <= b.x ||
            b.x + b.width <= a.x ||
            a.y + a.height <= b.y ||
            b.y + b.height <= a.y,
          'touch targets overlap',
        );
      }
    const center = (r) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
    const stick = center(rectangles.find((r) => r.className === 'joystick')),
      jump = center(rectangles.find((r) => r.className === 'jump-button'));
    const scene = { x: viewport.width * 0.55, y: viewport.height * 0.44 };
    const cdp = await context.newCDPSession(page);
    const contacts = new Map();
    const send = async (type) =>
      cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: [...contacts].map(([id, point]) => ({
          id,
          ...point,
          radiusX: 5,
          radiusY: 5,
        })),
      });
    const down = async (id, point) => {
      contacts.set(id, point);
      await send('touchStart');
    };
    const move = async (id, point) => {
      contacts.set(id, point);
      await send('touchMove');
    };
    const up = async (id) => {
      contacts.delete(id);
      await send('touchEnd');
    };
    const cancel = async () => {
      contacts.clear();
      await send('touchCancel');
    };

    // A comfortable off-centre press starts neutral rather than walking immediately.
    const origin = { x: stick.x + 14, y: stick.y - 10 };
    await down(1, origin);
    assert.deepEqual((await read()).input, { x: 0, z: 0 });
    await move(1, { x: origin.x + 2, y: origin.y + 1 });
    assert.deepEqual((await read()).input, { x: 0, z: 0 });
    await move(1, { x: origin.x + 10, y: origin.y });
    const slow = (await read()).input.x;
    assert.ok(
      slow > 0 && slow < 0.3,
      'small drag must allow a precise slow step',
    );
    await move(1, { x: origin.x + 40, y: origin.y });
    assert.ok((await read()).input.x > 0.99);
    const beforeWalk = (await read()).state.position;
    await tick(30);
    const afterWalk = await read();
    assert.ok(
      difference(
        Object.values(beforeWalk),
        Object.values(afterWalk.state.position),
      ) > 0.3,
      'real joystick must move the character',
    );

    // A second finger jumps; a third drags the camera. None replace the movement finger.
    const jumps = afterWalk.state.jumps;
    await down(2, jump);
    await tick(3);
    assert.equal(
      (await read()).state.jumps,
      jumps + 1,
      JSON.stringify({
        before: afterWalk.state,
        after: (await read()).state,
        pointers: await page.evaluate(() => window.__mobilePointers),
      }),
    );
    assert.equal((await read()).state.grounded, false);
    const beforeCamera = (await read()).camera;
    await down(3, scene);
    await move(3, { x: scene.x + 60, y: scene.y + 15 });
    await tick(20);
    const simultaneous = await read();
    assert.ok(simultaneous.input.x > 0.99, 'camera finger stole joystick');
    assert.equal(
      simultaneous.state.jumps,
      jumps + 1,
      'holding jump must not repeat',
    );
    assert.ok(
      difference(beforeCamera.back, simultaneous.camera.back) > 0.1,
      'camera did not orbit',
    );
    assert.equal(
      simultaneous.camera.zoom,
      beforeCamera.zoom,
      'joystick or jump was mistaken for pinch',
    );
    await cancel();
    assert.deepEqual((await read()).input, { x: 0, z: 0 });
    assert.equal(await page.locator('[data-held="true"]').count(), 0);
    const releasePosition = (await read()).state.position;
    await tick(40);
    const drift = await page.evaluate(async (before) => {
      const w = await import('/lib/planet-world.mjs');
      return w.surfaceDistance(
        w.normalizeDirection(before),
        w.normalizeDirection(window.__graviQA.read().state.position),
      );
    }, releasePosition);
    assert.ok(
      drift < 0.7,
      `releasing touch did not brake the jump: ${drift} m`,
    );

    await setup();
    const still = (await tick(40)).camera;
    await down(4, scene);
    await move(4, { x: scene.x + 2, y: scene.y + 1 });
    const jitter = await tick(5);
    assert.ok(
      difference(still.back, jitter.camera.back) < 1e-6,
      'tiny touch rotates camera',
    );
    await down(5, { x: scene.x + 65, y: scene.y });
    await move(5, { x: scene.x + 105, y: scene.y });
    await tick(10);
    const pinched = await read();
    assert.ok(pinched.camera.zoom < still.zoom - 0.8);
    assert.ok(
      difference(still.back, pinched.camera.back) < 1e-6,
      'pinch rotates camera',
    );
    await up(5);
    await move(4, { x: scene.x + 3, y: scene.y + 1 });
    assert.ok(
      difference(pinched.camera.back, (await tick(5)).camera.back) < 1e-6,
      'lifting a pinch finger jumps camera',
    );
    await up(4);
    const retained = (await tick(120)).camera;
    assert.ok(
      difference(pinched.camera.back, retained.back) < 1e-6,
      'camera angle not retained',
    );

    await down(6, stick);
    await move(6, { x: stick.x + 40, y: stick.y });
    await page.getByRole('button', { name: 'Menú', exact: true }).click();
    assert.deepEqual((await read()).input, { x: 0, z: 0 });
    await page
      .getByRole('button', { name: 'Cerrar menú', exact: true })
      .click();
    await move(6, { x: stick.x + 50, y: stick.y });
    assert.deepEqual(
      (await read()).input,
      { x: 0, z: 0 },
      'old finger resumes after closing menu',
    );
    await up(6);
    await down(7, stick);
    await move(7, { x: stick.x + 40, y: stick.y });
    await page.getByRole('button', { name: 'Pausa', exact: true }).click();
    assert.equal((await read()).paused, true);
    assert.deepEqual((await read()).input, { x: 0, z: 0 });
    await page
      .getByRole('button', { name: 'Seguir explorando', exact: true })
      .click();
    await up(7);

    await page.locator('.gravity-button').click();
    await page.getByRole('button', { name: /^Luna Muy ligero$/ }).click();
    await setup();
    await down(8, jump);
    await up(8);
    await tick(120);
    await page.locator('.flight-hint').waitFor({ state: 'visible' });
    assert.equal(await page.locator('.rescue-button').count(), 0);
    const airborne = await read();
    assert.ok(!airborne.state.grounded && airborne.gravity === 1.62);
    await page.evaluate(() => {
      window.__qaDraw = true;
      window.__qaTicks(1);
      window.__qaDraw = false;
    });
    await page.screenshot({
      path: path.join(output, `${viewport.width}x${viewport.height}-luna.png`),
    });
    await page.locator('.gravity-button').click();
    await page.getByRole('button', { name: /^Tierra Normal$/ }).click();
    const changed = await read();
    assert.ok(
      difference(
        Object.values(airborne.state.position),
        Object.values(changed.state.position),
      ) < 0.2,
      'gravity change teleported character',
    );
    await page.locator('.flight-hint').waitFor({ state: 'hidden' });
    await tick(180);
    assert.equal((await read()).state.grounded, true);
    const keyboardJumps = (await read()).state.jumps;
    await page.locator('.jump-button').focus();
    await page.keyboard.press('Space');
    await tick(2);
    assert.equal(
      (await read()).state.jumps,
      keyboardJumps + 1,
      'keyboard activation must jump exactly once',
    );
    await tick(180);

    // An actual viewport change interrupts a held control; the next fresh touch works.
    await down(9, stick);
    await move(9, { x: stick.x + 40, y: stick.y });
    await page.setViewportSize({
      width: viewport.height,
      height: viewport.width,
    });
    // The viewport hook updates its CSS height on requestAnimationFrame too.
    await tick(3);
    await page.waitForFunction(
      () => window.__graviQA.read().input.x === 0,
      null,
      { polling: 20 },
    );
    await cancel();
    const nextStick = await page.locator('.joystick').boundingBox();
    const next = center(nextStick);
    await down(10, next);
    await move(10, { x: next.x + 40, y: next.y });
    assert.ok(
      (await read()).input.x > 0.99,
      JSON.stringify({
        nextStick,
        state: await read(),
        pointers: await page.evaluate(() => window.__mobilePointers),
      }),
    );
    await up(10);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollHeight > innerHeight + 1,
      ),
      false,
    );
    results.push({
      viewport,
      analogueStrength: slow,
      multitouchJumpAndCamera: true,
      cancelMenuPauseResize: true,
      pinchAndRetainedAngle: true,
      lunarHintAndGravityDescent: true,
    });
    console.log('PASS mobile controls', viewport.width, viewport.height);
    await context.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    path.join(output, 'results.json'),
    JSON.stringify({ results, errors }, null, 2),
  );
} finally {
  await browser.close();
}
