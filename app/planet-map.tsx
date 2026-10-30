'use client';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  AWAKENINGS,
  finaleUnlocked,
  FOREST_TREES,
  PETAL_STOPS,
  SKY_STEPS,
  RIDGE_STEPS,
  WIND_STEPS,
  WIND_PILLARS,
  RIVER_STOPS,
  inForest,
} from '../lib/awakening.mjs';
import { FINALE_SOLIDS } from '../lib/finale-course.mjs';
import { WORLD_REGIONS } from '../lib/world-layout.mjs';
import { RewardVignette } from './reward-vignette';
import { ADVENTURE_KINDS } from '../lib/mission.mjs';
import { coordinates } from '../lib/navigation.mjs';
import { isRevealed } from '../lib/exploration.mjs';
import {
  PLANET_RADIUS,
  PLANET_TREES,
  PLANET_PLATFORMS,
} from '../lib/planet-world.mjs';
import type { Snapshot } from '../lib/game';

type Props = {
  forest: NonNullable<Snapshot['forest']>;
  selected: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
};

export function PlanetMap({ forest, selected, onSelect, onClose }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [showCoordinates, setShowCoordinates] = useState(false);
  const [mapError, setMapError] = useState(false);
  const resetView = useRef<() => void>(() => {});
  const turn = useRef<(x: number, y: number) => void>(() => {});
  const coords = coordinates(forest.position);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const modal = dialog.current;
    modal?.showModal();
    dialog.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key === 'Tab') {
        const elements = dialog.current?.querySelectorAll<HTMLElement>(
          'button,input,summary',
        );
        if (!elements?.length) return;
        const first = elements[0],
          last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('keydown', key);
      modal?.close();
      previous?.focus();
    };
  }, [onClose]);
  useEffect(() => {
    if (!host.current) return;
    const container = host.current;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      queueMicrotask(() => setMapError(true));
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(35, 1, 0.1, 20);
    camera.position.set(0, 0, 4.4);
    scene.add(new THREE.HemisphereLight('#fff5de', '#5b766d', 2.7));
    const light = new THREE.DirectionalLight('#fff4d5', 2);
    light.position.set(-3, 4, 4);
    scene.add(light);
    const globe = new THREE.Group();
    scene.add(globe);
    const mats: THREE.Material[] = [];
    const mat = (color: string) => {
      const m = new THREE.MeshStandardMaterial({ color, roughness: 1 });
      mats.push(m);
      return m;
    };
    const landGeometry = new THREE.SphereGeometry(1, 96, 48),
      landMaterial = mat('#ffffff');
    landMaterial.vertexColors = true;
    const vertices = landGeometry.getAttribute('position'),
      colors = [];
    for (let i = 0; i < vertices.count; i++) {
      const point = new THREE.Vector3().fromBufferAttribute(vertices, i);
      const color = new THREE.Color(
        isRevealed(forest.explored, point) ? '#98aa79' : '#535f60',
      );
      colors.push(color.r, color.g, color.b);
    }
    landGeometry.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(colors, 3),
    );
    const land = new THREE.Mesh(landGeometry, landMaterial);
    globe.add(land);
    const y = new THREE.Vector3(0, 1, 0);
    const place = (
      direction: THREE.Vector3Like,
      height: number,
      geometry: THREE.BufferGeometry,
      material: THREE.Material,
      scale: number,
    ) => {
      const mesh = new THREE.Mesh(geometry, material),
        up = new THREE.Vector3().copy(direction).normalize();
      mesh.position.copy(up).multiplyScalar(height);
      mesh.quaternion.setFromUnitVectors(y, up);
      mesh.scale.setScalar(scale);
      globe.add(mesh);
      return mesh;
    };
    const leaf = mat('#4e735c'),
      stone = mat('#d6c795'),
      pink = mat('#e897a6'),
      dark = mat('#365c50');
    [
      ...FOREST_TREES,
      ...PLANET_TREES.filter((tree) => !inForest(tree.direction)),
    ]
      .filter((tree) => isRevealed(forest.explored, tree.direction))
      .forEach((tree) =>
        place(
          tree.direction,
          1.045,
          new THREE.IcosahedronGeometry(1, 0),
          leaf,
          0.038,
        ),
      );
    [
      ...SKY_STEPS,
      ...RIDGE_STEPS,
      ...FINALE_SOLIDS,
      ...WIND_STEPS,
      ...WIND_PILLARS,
      ...RIVER_STOPS.filter((s) => s.height > 0),
      ...PLANET_PLATFORMS.filter((step) => !inForest(step.direction)),
    ]
      .filter((step) => isRevealed(forest.explored, step.direction))
      .forEach((step) =>
        place(
          step.direction,
          1.015 + step.height / PLANET_RADIUS,
          new THREE.CylinderGeometry(1, 1, 1, 10),
          stone,
          0.04,
        ),
      );
    PETAL_STOPS.filter((point) => isRevealed(forest.explored, point)).forEach(
      (point) =>
        place(point, 1.01, new THREE.SphereGeometry(1, 8, 6), pink, 0.017),
    );
    // Fine latitude rings make the spherical geography readable without a flat-map seam.
    const lineMat = new THREE.LineBasicMaterial({
      color: '#d9dfbb',
      transparent: true,
      opacity: 0.35,
    });
    mats.push(lineMat);
    for (const latitude of [-60, -30, 0, 30, 60]) {
      const rad = (latitude * Math.PI) / 180,
        points = Array.from({ length: 97 }, (_, i) =>
          new THREE.Vector3(
            Math.cos((i * Math.PI) / 48) * Math.cos(rad),
            Math.sin(rad),
            Math.sin((i * Math.PI) / 48) * Math.cos(rad),
          ).multiplyScalar(1.002),
        );
      globe.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(points),
          lineMat,
        ),
      );
    }
    const coral = mat('#ef886c');
    place(
      forest.position,
      1.04,
      new THREE.SphereGeometry(1, 12, 8),
      coral,
      0.027,
    );
    const north = place(
      { x: 0, y: 1, z: 0 },
      1.02,
      new THREE.ConeGeometry(1, 2, 8),
      dark,
      0.015,
    );
    north.name = 'north';
    AWAKENINGS.forEach((item) => {
      const complete = forest.completed.includes(item.id);
      if (!complete && !isRevealed(forest.explored, item.direction)) return;
      const marker = place(
        complete ? item.tree : item.direction,
        1.04,
        new THREE.SphereGeometry(1, 12, 8),
        complete ? pink : stone,
        item.id === selected ? 0.045 : 0.027,
      );
      if (complete) {
        // A tiny flowering tree marks the actual site of the transformation.
        place(
          item.tree,
          1.065,
          new THREE.CylinderGeometry(0.009, 0.012, 0.1, 6),
          dark,
          1,
        );
        const crown = place(
          item.tree,
          1.13,
          new THREE.SphereGeometry(1, 10, 7),
          pink,
          0.045,
        );
        crown.scale.set(0.065, 0.035, 0.05);
        for (let n = 0; n < 4; n++) {
          const around = new THREE.Vector3()
            .copy(item.tree)
            .add(
              new THREE.Vector3(
                Math.sin(n * 2) * 0.05,
                0,
                Math.cos(n * 2) * 0.05,
              ),
            )
            .normalize();
          place(around, 1.015, new THREE.SphereGeometry(1, 6, 4), pink, 0.012);
        }
      }
      if (item.id === selected) {
        const halo = new THREE.Mesh(
          new THREE.TorusGeometry(0.07, 0.008, 6, 32),
          coral,
        );
        halo.position.copy(marker.position);
        halo.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          marker.position.clone().normalize(),
        );
        globe.add(halo);
      }
    });
    const draw = () => renderer.render(scene, camera);
    resetView.current = () => {
      globe.quaternion.setFromUnitVectors(
        new THREE.Vector3().copy(forest.position).normalize(),
        new THREE.Vector3(0, 0, 1),
      );
      draw();
    };
    turn.current = (x, z) => {
      globe.quaternion.premultiply(
        new THREE.Quaternion().setFromEuler(new THREE.Euler(z, x, 0)),
      );
      draw();
    };
    let pointer: { id: number; x: number; y: number } | null = null;
    const down = (event: PointerEvent) => {
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
      container.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (pointer?.id !== event.pointerId) return;
      turn.current(
        (event.clientX - pointer.x) * 0.009,
        (event.clientY - pointer.y) * 0.009,
      );
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    };
    const up = () => {
      pointer = null;
    };
    container.addEventListener('pointerdown', down);
    container.addEventListener('pointermove', move);
    container.addEventListener('pointerup', up);
    container.addEventListener('pointercancel', up);
    const resize = () => {
      const b = container.getBoundingClientRect();
      renderer.setSize(b.width, b.height);
      camera.aspect = b.width / Math.max(1, b.height);
      camera.updateProjectionMatrix();
      draw();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    resetView.current();
    return () => {
      observer.disconnect();
      container.removeEventListener('pointerdown', down);
      container.removeEventListener('pointermove', move);
      container.removeEventListener('pointerup', up);
      container.removeEventListener('pointercancel', up);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line)
          object.geometry.dispose();
      });
      mats.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [forest.position, selected, forest.completed, forest.explored]);
  return (
    <div className="explorer-backdrop">
      <dialog className="explorer-map" ref={dialog} aria-labelledby="map-title">
        <header>
          <div>
            <span className="eyebrow">CUADERNO DEL EXPLORADOR · EN PAUSA</span>
            <h2 id="map-title">Un bosque por despertar</h2>
          </div>
          <button onClick={onClose} aria-label="Cerrar mapa">
            ×
          </button>
        </header>
        <div className="map-layout">
          <section className="globe-section">
            <div ref={host} className="globe-canvas" />
            {mapError && (
              <p>
                El mapa 3D no está disponible. Puedes elegir tu destino abajo.
              </p>
            )}
            <div className="map-tools">
              <button onClick={() => resetView.current()}>Mi ubicación</button>
              <button
                aria-label="Girar mapa a la izquierda"
                onClick={() => turn.current(-0.3, 0)}
              >
                ←
              </button>
              <button
                aria-label="Girar mapa hacia arriba"
                onClick={() => turn.current(0, -0.3)}
              >
                ↑
              </button>
              <button
                aria-label="Girar mapa a la derecha"
                onClick={() => turn.current(0.3, 0)}
              >
                →
              </button>
              <button
                aria-label="Girar mapa hacia abajo"
                onClick={() => turn.current(0, 0.3)}
              >
                ↓
              </button>
            </div>
            <p className="map-legend">
              <i /> Tú <span>✿ Lugar transformado</span> Arrastra para girar
            </p>
            <label className="coordinate-toggle">
              <input
                type="checkbox"
                checked={showCoordinates}
                onChange={(e) => setShowCoordinates(e.target.checked)}
              />{' '}
              Mostrar coordenadas
            </label>
            {showCoordinates && (
              <output className="coordinates">
                {Math.abs(coords.latitude).toFixed(1)}°{' '}
                {coords.latitude >= 0 ? 'N' : 'S'} ·{' '}
                {Math.abs(coords.longitude).toFixed(1)}°{' '}
                {coords.longitude >= 0 ? 'E' : 'O'}
                <small>
                  Altura sobre el planeta:{' '}
                  {Math.max(
                    0,
                    Math.hypot(
                      forest.position.x,
                      forest.position.y,
                      forest.position.z,
                    ) - PLANET_RADIUS,
                  ).toFixed(1)}{' '}
                  m
                </small>
              </output>
            )}
          </section>
          <section className="map-journal">
            <div className="journal-heading">
              <b>Cuaderno de aventuras</b>
              <span>
                {forest.completed.length} / {AWAKENINGS.length} sakuras
              </span>
            </div>
            <p>
              {forest.visitedRegions.length} de 10 regiones visitadas. Cada
              aventura tiene su lugar en el planeta.
            </p>
            <ul className="journal-kinds">
              {ADVENTURE_KINDS.map((kind) => (
                <li key={kind.category}>
                  <b>
                    {kind.icon} {kind.category}
                  </b>{' '}
                  {kind.summary}
                </li>
              ))}
            </ul>
            {AWAKENINGS.map((item) => {
              const done = forest.completed.includes(item.id);
              return (
                <article key={item.id} data-selected={selected === item.id}>
                  <span className="eyebrow">
                    {item.level
                      ? `${item.category} · Nivel ${item.level}: ${item.difficulty}`
                      : 'Gran final · Viajar'}
                  </span>
                  <small className="journal-region">
                    {WORLD_REGIONS.find((r) => r.id === item.id)?.name}
                  </small>
                  <h3>
                    {done ? '✿ ' : ''}
                    {item.title}
                  </h3>
                  {done && (
                    <>
                      <span className="reward-caption">
                        Así cambiaste este lugar
                      </span>
                      <RewardVignette id={item.id} label={item.reward} />
                    </>
                  )}
                  <p>
                    {done
                      ? item.reward
                      : item.id === 'journey'
                        ? finaleUnlocked(forest)
                          ? 'Desbloqueado · tres etapas con descansos guardados.'
                          : 'Completa los otros nueve sakuras para desbloquearlo.'
                        : item.hint}
                  </p>
                  {!done && item.help && (
                    <details>
                      <summary>Una pista más</summary>
                      <p>{item.help}</p>
                    </details>
                  )}
                  <button onClick={() => onSelect(item.id)}>
                    {done
                      ? 'Visitar sakura'
                      : selected === item.id
                        ? 'Seguir explorando'
                        : 'Guiarme a esta zona'}{' '}
                    <span>↗</span>
                  </button>
                </article>
              );
            })}
            <small>
              La guía mide sobre la superficie. Cerca del destino, busca las
              señales del entorno.
            </small>
          </section>
        </div>
      </dialog>
    </div>
  );
}
