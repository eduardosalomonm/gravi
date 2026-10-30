import assert from 'node:assert/strict';

function replaceOnce(source, before, after) {
  assert.equal(
    source.split(before).length,
    2,
    `QA instrumentation must match once: ${before.slice(0, 80)}`,
  );
  return source.replace(before, after);
}

/** Browser-local interception only. No test bridge is added to shipped modules. */
export async function instrumentPlanet(context) {
  await context.addInitScript(() => {
    const nativeRAF = window.requestAnimationFrame.bind(window);
    const nativeCancel = window.cancelAnimationFrame.bind(window);
    const pending = new Map();
    let id = 1_000_000_000;
    let clock = 0;
    window.__graviManual = false;
    window.__qaDraw = false;
    window.__qaTask = null;
    window.__qaLandings = [];
    window.__qaBursts = [];
    window.requestAnimationFrame = (callback) => {
      if (!window.__graviManual) return nativeRAF(callback);
      pending.set(++id, callback);
      return id;
    };
    window.cancelAnimationFrame = (key) => {
      if (!pending.delete(key)) nativeCancel(key);
    };
    window.__qaTicks = (count = 1) => {
      for (let n = 0; n < count; n++) {
        clock = Math.max(clock + 1000 / 60, performance.now());
        const callbacks = [...pending.values()];
        pending.clear();
        for (const callback of callbacks) callback(clock);
      }
    };
    window.__qaPending = () => pending.size;
  });

  await context.route(/\/lib\/forest-scene\.ts(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    let body = (await response.text()).replaceAll('\t', '  ');
    body = replaceOnce(
      body,
      '  return {\n    update(',
      `  return {
    readQA: () => ({
      trees: sakuras.map(t => ({id:t.id, amount:t.amount, blooming:t.blooming.visible, sleeping:t.sleeping.visible, gold:t.gold})),
      wonders: wonders.filter(w=>w.g.visible).map(w=>({id:w.item.id,motes:w.motes.count,line:w.line.visible})),
      meadow: awakenedMeadow.visible,
      butterflies: butterflies.filter(b=>b.g.visible).length,
      jupiter: embraceFlowers.visible,
      lanterns: lanternMarkers.map(m=>m.bulb.material===litRing),
      fireflies: lanternFireflies.filter(f=>f.light.visible).length,
      river: riverLight.visible,
      beacon: finalBeacon.visible,
      burst: burstMesh.visible,
      burstGold: burstMesh.material===burstGold,
      rings: stepRings.map(r=>({challenge:r.challenge,index:r.index,color:r.ring.material.color.getHexString()}))
    }),
    update(`,
    );
    body = replaceOnce(
      body,
      '    burst(id, reduced) {',
      `    burst(id, reduced) {
      globalThis.__qaBursts.push({id,reduced});`,
    );
    await route.fulfill({
      response,
      body,
      contentType: 'application/javascript',
    });
  });

  await context.route(/\/lib\/planet-game\.ts(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    let body = (await response.text()).replaceAll('\t', '  ');
    body = replaceOnce(
      body,
      '      const keyX =',
      `      if (globalThis.__qaTask) {
        const t=globalThis.__qaTask;
        const radius=Math.hypot(state.position.x,state.position.y,state.position.z);
        const radial=state.velocity.x*up.x+state.velocity.y*up.y+state.velocity.z*up.z;
        const desired=new THREE.Vector3(
          (t.direction.x*radius-state.position.x)*t.kp-(state.velocity.x-up.x*radial)*t.kd,
          (t.direction.y*radius-state.position.y)*t.kp-(state.velocity.y-up.y*radial)*t.kd,
          (t.direction.z*radius-state.position.z)*t.kp-(state.velocity.z-up.z*radial)*t.kd
        ).projectOnPlane(up).multiplyScalar(1/5);
        handle.setMove(desired.dot(right),desired.dot(forward));
        if (t.jump && !t.started) { handle.requestJump(); t.started=true; }
      }
      const keyX =`,
    );
    body = replaceOnce(
      body,
      '        const before =',
      `        if (state.justLanded) globalThis.__qaLandings.push({id:state.supportId,kind:state.supportKind,position:{...state.position},character});
        const before =`,
    );
    body = replaceOnce(
      body,
      '    renderer.render(scene, camera);',
      '    if (!globalThis.__graviManual || globalThis.__qaDraw) renderer.render(scene, camera);',
    );
    body = replaceOnce(
      body,
      '  return {\n    setGravity:',
      '  const handle = {\n    setGravity:',
    );
    const end = '  };\n}';
    body = replaceOnce(
      body,
      end,
      `  };
  globalThis.__graviQA = {
    handle,
    read: () => ({state:structuredClone(state),progress:structuredClone(awakenings),gravity,character,paused,
      inputEnabled,stretch:body.scale.y,renderFrames:renderer.info.render.frame,
      input:{...touch},camera:{back:cameraBack.toArray(),position:camera.position.toArray(),pitch:cameraPitch,zoom:cameraZoom},
      visuals:forest.readQA(),landings:globalThis.__qaLandings.slice(),bursts:globalThis.__qaBursts.slice(),
      }),
    solids: () => structuredClone(solids),
    // Fixture setup only: never modifies challenge progress or grants a landing.
    place: (direction,height=0,radialVelocity=0) => {
      Object.assign(state,createPlanetState());
      const d=new THREE.Vector3().copy(direction).normalize();
      state.position={x:d.x*(PLANET_RADIUS+height),y:d.y*(PLANET_RADIUS+height),z:d.z*(PLANET_RADIUS+height)};
      state.velocity={x:d.x*radialVelocity,y:d.y*radialVelocity,z:d.z*radialVelocity};
      state.grounded=height===0;
      state.supportRadius=PLANET_RADIUS;
      state.supportId=null;state.supportKind='planet';
      cameraBack.set(0,0,1).projectOnPlane(d);
      if(cameraBack.lengthSq()<0.01)cameraBack.set(1,0,0).projectOnPlane(d);
      cameraBack.normalize(); up.copy(d);
      pet.quaternion.setFromUnitVectors(localUp,d);
      pet.position.copy(state.position);
      globalThis.__qaTask=null;handle.setMove(0,0);accumulator=0;
      report(makeSnapshot());
    },
    footGap: () => {
      scene.updateMatrixWorld(true);
      const solid=solids.find(s=>s.id===state.supportId);
      const normal=new THREE.Vector3().copy(solid && solid.kind==='platform' ? solid.direction : state.position).normalize();
      const floor=solid && solid.kind==='platform' ? PLANET_RADIUS+solid.height : Math.hypot(state.position.x,state.position.y,state.position.z);
      let min=Infinity,max=-Infinity;
      for(const foot of feet) {
        const positions=foot.geometry.getAttribute('position');
        for(let i=0;i<positions.count;i++) {
          const p=new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(foot.matrixWorld);
          const gap=p.dot(normal)-floor;min=Math.min(min,gap);max=Math.max(max,gap);
        }
      }
      return {min,max};
    },
  };
  return handle;
}`,
    );
    await route.fulfill({
      response,
      body,
      contentType: 'application/javascript',
    });
  });
}
