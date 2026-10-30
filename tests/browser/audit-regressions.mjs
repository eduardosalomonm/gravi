import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';
import { instrumentPlanet } from './planet-instrumentation.mjs';

const base = process.env.GRAVI_QA_URL ?? 'http://localhost:3107';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({
  executablePath:
    process.env.GRAVI_CHROME_PATH ?? (existsSync(chrome) ? chrome : undefined),
});
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await instrumentPlanet(context);
  const errors = [];
  context.on('page', (p) => {
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('console', (m) => {
      if (m.text().includes('Too many active WebGL contexts'))
        errors.push(m.text());
    });
  });
  const page = await context.newPage();
  const read = () => page.evaluate(() => window.__graviQA.read());
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

  await page.keyboard.down('KeyW');
  await page.waitForFunction(
    () => window.__graviQA.read().state.distanceTravelled > 0.4,
  );
  await page.getByRole('button', { name: 'Menú', exact: true }).click();
  await page.waitForFunction(() => !window.__graviQA.read().inputEnabled);
  const menuStart = (await read()).state.distanceTravelled;
  await page.waitForTimeout(1200);
  assert.ok(
    (await read()).state.distanceTravelled - menuStart < 0.9,
    'held W kept moving behind menu',
  );
  await page.getByRole('button', { name: 'Cerrar menú', exact: true }).click();
  await page.waitForTimeout(300);
  const stopped = (await read()).state.distanceTravelled;
  await page.waitForTimeout(300);
  assert.ok(
    (await read()).state.distanceTravelled - stopped < 0.02,
    'closing menu resumed old W',
  );
  await page.keyboard.up('KeyW');
  console.log('PASS held keyboard clears on menu and stays released');

  await page.keyboard.press('KeyP');
  await page.waitForFunction(() => window.__graviQA.read().paused);
  await page.waitForTimeout(150);
  const frame = (await read()).renderFrames;
  await page.waitForTimeout(350);
  assert.equal((await read()).renderFrames, frame, 'pause kept rendering');
  await page.evaluate(() => window.__graviQA.handle.setCharacter('mimo'));
  await page.waitForFunction(
    (before) => window.__graviQA.read().renderFrames > before,
    frame,
  );
  await page.waitForTimeout(150);
  const changed = (await read()).renderFrames;
  await page.waitForTimeout(250);
  assert.equal(
    (await read()).renderFrames,
    changed,
    'paused redraw was not bounded',
  );
  await page.keyboard.press('KeyP');
  await page.waitForFunction(() => !window.__graviQA.read().paused);
  console.log('PASS pause stops rendering, redraws changes once, P resumes');

  for (const id of ['gravi', 'mimo', 'pipo']) {
    await page.evaluate((id) => {
      const qa = window.__graviQA;
      qa.handle.setCharacter(id);
      qa.place({ x: 0, y: 1, z: 0 });
    }, id);
    await page.locator('.jump-button').tap();
    await page.waitForFunction(() => window.__graviQA.read().stretch > 1.02);
    assert.equal((await read()).character, id);
    await page.waitForFunction(() => window.__graviQA.read().state.grounded);
  }
  console.log('PASS actual jump pose for all three characters');

  await page.evaluate(() => {
    window.__auditCanvas = document.querySelector('.world canvas');
    window.__auditLost = 0;
    window.__auditCanvas.addEventListener(
      'webglcontextlost',
      () => window.__auditLost++,
    );
  });
  for (let i = 0; i < 25; i++) {
    await page.getByRole('button', { name: '◎ Mapa', exact: true }).click();
    await page
      .getByRole('button', { name: 'Cerrar mapa', exact: true })
      .click();
  }
  assert.deepEqual(
    await page.evaluate(() => ({
      lost: window.__auditLost,
      inactive: window.__auditCanvas.getContext('webgl2').isContextLost(),
    })),
    { lost: 0, inactive: false },
  );
  console.log('PASS 25 map openings keep the main graphics context alive');

  await page.evaluate(async () => {
    const { AWAKENINGS } = await import('/lib/awakening.mjs');
    window.__graviQA.place(AWAKENINGS[0].direction);
    window.__graviQA.handle.setGravity(1.62);
  });
  await page.waitForFunction(() =>
    window.__graviQA.read().progress.completed.includes('flowers'),
  );
  const other = await context.newPage();
  await other.goto(base);
  await other.waitForFunction(() => !!window.__graviQA);
  assert.ok(
    (
      await other.evaluate(() => window.__graviQA.read())
    ).progress.completed.includes('flowers'),
  );
  await page.evaluate(() => window.__graviQA.handle.setGravity(3.71));
  await other
    .getByRole('heading', {
      name: 'Tu partida cambió en otra pestaña',
      exact: true,
    })
    .waitFor();
  const current = await page.evaluate(() =>
    localStorage.getItem('gravi.progress.v1'),
  );
  await other.evaluate(() => window.__graviQA.handle.setGravity(9.81));
  assert.equal(
    await other.evaluate(() => localStorage.getItem('gravi.progress.v1')),
    current,
    'stale tab overwrote newer save',
  );
  await other
    .getByRole('button', { name: 'Cargar la partida actualizada', exact: true })
    .click();
  await other.waitForFunction(() => !!window.__graviQA);
  const reloaded = await other.evaluate(() => window.__graviQA.read());
  assert.ok(reloaded.progress.completed.includes('flowers'));
  assert.equal(reloaded.gravity, 3.71);
  assert.equal(reloaded.character, 'pipo');
  console.log(
    'PASS real two-tab conflict, blocked stale write and preserved reload',
  );
  const tutorialContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const tutorial = await tutorialContext.newPage();
  tutorial.on('pageerror', (e) => errors.push(e.message));
  await tutorial.goto(base);
  await tutorial
    .getByRole('button', {
      name: 'Aprender a jugar 3 pasos · puedes saltarlo',
      exact: true,
    })
    .click();
  const stick = await tutorial.locator('.joystick').boundingBox();
  const cdp = await tutorialContext.newCDPSession(tutorial);
  const x = stick.x + stick.width / 2,
    y = stick.y + stick.height / 2;
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ id: 1, x, y }],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ id: 1, x: x + 45, y }],
  });
  await tutorial.getByLabel('Paso 2 de 3', { exact: true }).waitFor();
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await tutorial.locator('.jump-button').tap();
  await tutorial.getByLabel('Paso 3 de 3', { exact: true }).waitFor();
  await tutorial.locator('.gravity-button').tap();
  await tutorial
    .getByRole('button', { name: 'Luna Muy ligero', exact: true })
    .tap();
  await tutorial
    .locator('.tutorial-card')
    .getByRole('button', { name: 'Explorar el planeta', exact: true })
    .click();
  await tutorial
    .getByRole('button', { name: 'Explorar por mi cuenta', exact: true })
    .click();
  const save = await tutorial.evaluate(() =>
    JSON.parse(localStorage.getItem('gravi.progress.v1')),
  );
  assert.equal(save.tutorialDone, true);
  assert.equal(save.hasChosenWorld, true);
  console.log(
    'PASS real-time touch tutorial, world transition and saved completion',
  );
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
