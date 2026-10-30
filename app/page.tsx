'use client';
import { CharacterPicker } from './character-picker';
import { CHARACTERS } from '../lib/characters.mjs';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { useGameViewport } from './use-game-viewport';
import { PlanetMap } from './planet-map';
import {
  AWAKENINGS,
  awakeningTarget,
  finaleUnlocked,
  journeyHint,
} from '../lib/awakening.mjs';
import { navigation } from '../lib/navigation.mjs';
import { TouchControls } from './touch-controls';
import { GraviMascot } from './gravi-mascot';
import { registerControls } from '../lib/webmcp';
import { CHALLENGES } from '../lib/challenges.mjs';
import {
  GRAVITY_ICONS,
  WHEEL_OPTIONS,
  nextPreset,
} from '../lib/gravity-wheel.mjs';
import { ADVENTURE_KINDS, nearestOpenAdventure } from '../lib/mission.mjs';
import { challengeGuide } from '../lib/challenge-guide.mjs';
import { isMuted, onMutedChange, setMuted, unlockSound } from '../lib/sound';
import { PERSONALITIES } from '../lib/personality.mjs';
import {
  defaultProgress,
  createProgressSession,
  SAVE_KEY,
} from '../lib/progress.mjs';
import { MAX_GRAVITY, PRESETS } from '../lib/physics.mjs';
import { createGame, type GameHandle, type Snapshot } from '../lib/game';
import { createPlanetGame } from '../lib/planet-game';

// The garden is only used by the tutorial; the planet is the game.
type Mode = 'tutorial' | 'planet';
type Panel = 'gravity' | 'menu' | null;

const emptySnapshot = (): Snapshot => ({
  height: 0,
  speed: 0,
  completed: CHALLENGES.map(() => false),
  planetSecrets: [],
  rideTime: 0,
  returnArmed: false,
  nearby: null,
  grounded: true,
  distanceTravelled: 0,
  jumps: 0,
});

const tutorialCopy = [
  {
    kicker: 'PASO 1 DE 3',
    title: 'Mueve a Gravi',
    body: 'Arrastra el joystick izquierdo o usa WASD. La tarjeta avanzará cuando Gravi camine.',
  },
  {
    kicker: 'PASO 2 DE 3',
    title: 'Da un salto',
    body: 'Pulsa Saltar o la barra espaciadora. Gravi despega con el mismo impulso en cualquier gravedad.',
  },
  {
    kicker: 'PASO 3 DE 3',
    title: 'Cambia la gravedad',
    body: 'Toca el botón redondo junto a Saltar y elige otra gravedad. En ordenador, usa las teclas 1 a 5.',
  },
];

// One-time hints live apart from the save file so they never affect progress.
const MISSION_SEEN = 'gravi.hint.mission';
const GRAVITY_TRIED = 'gravi.hint.gravity';
const readFlag = (key: string) => {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
};
const writeFlag = (key: string) => {
  try {
    localStorage.setItem(key, '1');
  } catch {
    // Without storage the hint simply appears again next visit.
  }
};

const GRAVITY_EFFECT: Record<string, string> = {
  Cero: 'flotas',
  Luna: 'muy alto',
  Marte: 'alto',
  Tierra: 'normal',
  Júpiter: 'corto',
};

export default function Home() {
  useGameViewport();
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<GameHandle | null>(null);
  const storage = useRef<Storage | null>(null);
  const progress = useRef(defaultProgress());
  const saveSession = useRef<ReturnType<typeof createProgressSession> | null>(
    null,
  );
  const [saveConflict, setSaveConflict] = useState(false);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Mode | 'welcome'>('welcome');
  const [tutorialStep, setTutorialStep] = useState(0);
  const [gravity, setGravity] = useState(9.81);
  const gravityRef = useRef(gravity);
  useEffect(() => {
    gravityRef.current = gravity;
  }, [gravity]);
  const [paused, setPaused] = useState(false);
  const [personality, setPersonality] = useState('curious');
  const [character, setCharacter] = useState('gravi');
  const [canSave, setCanSave] = useState(true);
  const [help, setHelp] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [missionOpen, setMissionOpen] = useState(false);
  const [gravityHint, setGravityHint] = useState(false);
  const [discoveryHelp, setDiscoveryHelp] = useState<Record<string, number>>(
    {},
  );
  const [destination, setDestination] = useState<string | null>(null);
  const closeMap = useCallback(() => {
    setMapOpen(false);
    game.current?.setMapOpen?.(false);
  }, []);
  const openMap = () => {
    setPanel(null);
    setHelp(false);
    game.current?.setMapOpen?.(true);
    setMapOpen(true);
  };
  const muted = useSyncExternalStore(onMutedChange, isMuted, () => false);
  const [error, setError] = useState('');
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [notice, setNotice] = useState(
    'El planeta está lleno de rincones por explorar.',
  );

  const storeProgress = (next: ReturnType<typeof defaultProgress>) => {
    const merged = { ...progress.current, ...next };
    const result = saveSession.current?.save(merged) ?? 'unavailable';
    if (result === 'conflict') {
      setSaveConflict(true);
      game.current?.setPaused?.(true);
      return false;
    }
    progress.current = merged;
    setCanSave(result === 'saved');
    return true;
  };

  useEffect(() => {
    let saved = defaultProgress();
    try {
      storage.current = window.localStorage;
      saveSession.current = createProgressSession(storage.current);
      const loaded = saveSession.current.progress;
      saved = { ...loaded, preferredMode: 'planet' };
    } catch {
      storage.current = null;
    }
    progress.current = saved;
    setGravity(saved.gravity);
    setPersonality(saved.personality);
    setCharacter(saved.character);
    setCanSave(storage.current !== null);
    setMode(saved.hasChosenWorld ? 'planet' : 'welcome');
    setReady(true);
  }, []);

  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (
        event.storageArea !== storage.current ||
        (event.key !== null && event.key !== SAVE_KEY)
      )
        return;
      if (saveSession.current?.isStale()) {
        setSaveConflict(true);
        game.current?.setPaused?.(true);
      }
    };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, []);

  useEffect(() => {
    if (!ready || mode === 'welcome' || !host.current) return;
    setError('');
    setPaused(false);
    setSnapshot(emptySnapshot());
    try {
      game.current =
        mode === 'planet'
          ? createPlanetGame(
              host.current,
              setSnapshot,
              setNotice,
              setPaused,
              progress.current,
              storeProgress,
            )
          : createGame(
              host.current,
              setSnapshot,
              setNotice,
              setPaused,
              progress.current,
              storeProgress,
            );
    } catch (cause) {
      queueMicrotask(() =>
        setError(
          'No se pudo iniciar el mundo 3D. Activa la aceleración gráfica del navegador y recarga la página.',
        ),
      );
      console.error(cause);
    }
    const unregister = registerControls(
      (value) => {
        game.current?.setGravity(value);
        setGravity(value);
      },
      () => game.current?.reset(),
    );
    return () => {
      unregister();
      game.current?.dispose();
      game.current = null;
    };
  }, [mode, ready]);

  const inputBlocked =
    paused || panel !== null || help || mapOpen || missionOpen || saveConflict;
  useEffect(() => {
    game.current?.setInputEnabled(
      !(panel !== null || help || mapOpen || missionOpen || saveConflict),
    );
  }, [panel, help, mapOpen, missionOpen, saveConflict, mode, ready]);

  useEffect(() => {
    if (mode !== 'tutorial') return;
    if (tutorialStep === 0 && snapshot.distanceTravelled >= 0.8) {
      queueMicrotask(() => {
        setTutorialStep(1);
        setNotice('¡Eso es! Ahora prueba a saltar.');
      });
    } else if (tutorialStep === 1 && snapshot.jumps >= 1) {
      queueMicrotask(() => {
        setTutorialStep(2);
        setNotice('¡Buen salto! Solo falta cambiar la gravedad.');
      });
    }
  }, [mode, snapshot.distanceTravelled, snapshot.jumps, tutorialStep]);

  useEffect(() => {
    if (!ready || mode === 'welcome') return;
    queueMicrotask(() => {
      setGravityHint(!readFlag(GRAVITY_TRIED));
      if (mode === 'planet' && !readFlag(MISSION_SEEN)) setMissionOpen(true);
    });
  }, [mode, ready]);
  const closeMission = (guideTo: string | null) => {
    writeFlag(MISSION_SEEN);
    setMissionOpen(false);
    if (guideTo) setDestination(guideTo);
  };
  const switchMode = (
    next: Mode,
    options: { finishTutorial?: boolean } = {},
  ) => {
    if (
      !storeProgress({
        ...progress.current,
        hasChosenWorld: true,
        tutorialDone:
          progress.current.tutorialDone || options.finishTutorial === true,
        preferredMode: 'planet',
      })
    )
      return;
    setPanel(null);
    setMapOpen(false);
    game.current?.setMapOpen?.(false);
    setHelp(false);
    setPaused(false);
    setTutorialStep(0);
    setMode(next);
    setNotice(
      next === 'planet'
        ? 'Explora en cualquier dirección. El planeta gira contigo.'
        : 'Primero, mueve a Gravi.',
    );
  };

  const changeGravity = (value: number) => {
    game.current?.setGravity(value);
    setGravity(value);
    if (gravityHint) {
      writeFlag(GRAVITY_TRIED);
      setGravityHint(false);
    }
    if (mode === 'tutorial' && tutorialStep === 2) {
      setTutorialStep(3);
      setNotice('¡Tutorial completado! Ya puedes explorar el planeta.');
    }
  };
  const changeGravityRef = useRef(changeGravity);
  useEffect(() => {
    changeGravityRef.current = changeGravity;
  });
  // Keyboard shortcuts for the gravity presets: 1–5 choose, G cycles.
  useEffect(() => {
    if (mode === 'welcome' || inputBlocked) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        event.repeat ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        target?.matches?.('input, textarea, select')
      )
        return;
      const index = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].indexOf(
        event.code,
      );
      if (index >= 0) changeGravityRef.current(WHEEL_OPTIONS[index].value);
      else if (event.code === 'KeyG')
        changeGravityRef.current(nextPreset(gravityRef.current));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, inputBlocked]);

  const finalAnnounced = useRef(false);
  useEffect(() => {
    if (mode !== 'planet' || !snapshot.forest) return;
    const unlocked = finaleUnlocked(snapshot.forest);
    if (!unlocked) {
      finalAnnounced.current = false;
      return;
    }
    if (
      !finalAnnounced.current &&
      !snapshot.forest.completed.includes('journey')
    ) {
      finalAnnounced.current = true;
      setDestination('journey');
      setNotice(
        '¡El último florecer está desbloqueado! Sigue la guía hacia el reto final.',
      );
    }
  }, [mode, snapshot.forest]);
  const chooseCharacter = (id: string) => {
    const config = CHARACTERS[id as keyof typeof CHARACTERS];
    if (!config) return;
    setCharacter(id);
    setPersonality(config.personality);
    if (game.current) game.current.setCharacter(id);
    else
      storeProgress({
        ...progress.current,
        character: id,
        personality: config.personality,
      });
  };
  const secretCount = snapshot.forest?.completed.length ?? 0;
  const target =
    snapshot.forest && destination
      ? awakeningTarget(destination, snapshot.forest)
      : null;
  const guide = snapshot.forest
    ? navigation(snapshot.forest.position, snapshot.forest.forward, target)
    : null;
  const preset = Object.entries(PRESETS).find(
    ([, value]) => value === gravity,
  )?.[0];
  const nearest = nearestOpenAdventure(snapshot.forest);
  const playing = mode !== 'welcome';
  const isPlanet = mode === 'planet';
  const challenge = isPlanet
    ? challengeGuide(snapshot.forest, gravity, discoveryHelp)
    : null;
  const moving = snapshot.speed > 0.8 || !snapshot.grounded;
  const showFlightHint =
    isPlanet &&
    !snapshot.grounded &&
    gravity < 6 &&
    snapshot.height > 4 &&
    !paused &&
    !panel &&
    !help &&
    !mapOpen &&
    !missionOpen;
  const openPanel = (next: Panel) => {
    setPanel(panel === next ? null : next);
    setHelp(false);
    game.current?.setMove(0, 0);
  };

  return (
    <main
      data-panel-open={panel !== null || help || mapOpen}
      data-mode={mode}
      onPointerDownCapture={unlockSound}
      onKeyDownCapture={unlockSound}
    >
      <div
        ref={host}
        className="world"
        aria-label={
          isPlanet
            ? 'Planeta 3D de Gravi. Usa el joystick y Saltar, o WASD y espacio.'
            : 'Jardín 3D de Gravi. Usa el joystick y Saltar, o WASD y espacio.'
        }
      />
      <header className="topbar">
        <div className="brand">
          <div>
            <h1>
              gravi<span aria-hidden="true">✿</span>
            </h1>
            <p>UN BOSQUE POR DESPERTAR</p>
          </div>
        </div>
        <div className="top-actions">
          {isPlanet && (
            <button className="map-open-button" onClick={openMap}>
              ◎ Mapa
            </button>
          )}
          {playing && (
            <button
              className="mode-menu-button"
              aria-expanded={panel === 'menu'}
              aria-controls="menu-panel"
              onClick={() => openPanel('menu')}
            >
              Menú
            </button>
          )}
          <button
            className="round-button"
            aria-label={muted ? 'Activar sonido' : 'Silenciar'}
            aria-pressed={!muted}
            onClick={() => setMuted(!muted)}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <button
            className="round-button pause-button"
            disabled={!playing}
            aria-label={paused ? 'Continuar' : 'Pausa'}
            onClick={() => game.current?.togglePause()}
          >
            {paused ? '▶' : 'Ⅱ'}
          </button>
        </div>
      </header>

      {ready && mode === 'welcome' && (
        <section className="welcome-overlay" aria-labelledby="welcome-title">
          <div className="welcome-card">
            <GraviMascot className="welcome-mascot" character={character} />
            <p className="eyebrow">GRAVI · UN BOSQUE POR DESPERTAR</p>
            <h2 id="welcome-title">¿Por dónde empezamos?</h2>
            <p>
              Diez sakuras duermen en su pequeño planeta. Juega con la gravedad
              para despertarlos.
            </p>
            <CharacterPicker selected={character} onSelect={chooseCharacter} />
            <div className="welcome-actions">
              <button
                className="primary"
                onClick={() => switchMode('tutorial')}
              >
                Aprender a jugar <small>3 pasos · puedes saltarlo</small>
              </button>
              <button
                onClick={() => switchMode('planet', { finishTutorial: true })}
              >
                Explorar el planeta <small>Entrar ahora</small>
              </button>
            </div>
          </div>
        </section>
      )}

      {mode === 'tutorial' && (
        <section className="tutorial-card" aria-live="polite">
          {tutorialStep < 3 ? (
            <>
              <span>{tutorialCopy[tutorialStep].kicker}</span>
              <h2>{tutorialCopy[tutorialStep].title}</h2>
              <p>{tutorialCopy[tutorialStep].body}</p>
              <div
                className="tutorial-progress"
                aria-label={`Paso ${tutorialStep + 1} de 3`}
              >
                {[0, 1, 2].map((step) => (
                  <i key={step} data-done={step <= tutorialStep} />
                ))}
              </div>
              <button
                className="text-button"
                onClick={() => switchMode('planet', { finishTutorial: true })}
              >
                Saltar tutorial
              </button>
            </>
          ) : (
            <>
              <span>¡LISTO PARA DESPEGAR!</span>
              <h2>Ya sabes cuidar de Gravi</h2>
              <p>El planeta es libre. Diez sakuras esperan despertar.</p>
              <div className="tutorial-finish">
                <button
                  className="primary"
                  onClick={() => switchMode('planet', { finishTutorial: true })}
                >
                  Explorar el planeta
                </button>
              </div>
            </>
          )}
        </section>
      )}

      <aside
        id="menu-panel"
        className="world-menu"
        data-open={panel === 'menu'}
        inert={panel !== 'menu'}
        aria-label="Menú"
      >
        <button
          className="sheet-close"
          aria-label="Cerrar menú"
          onClick={() => setPanel(null)}
        >
          ×
        </button>
        <span className="eyebrow">MENÚ</span>
        <h2>¿Qué hacemos?</h2>
        <CharacterPicker selected={character} onSelect={chooseCharacter} />
        {isPlanet ? (
          <button
            onClick={() => {
              game.current?.reset();
              setPanel(null);
            }}
          >
            <b>↺ Volver al planeta</b>
            <small>Gravi aparece a salvo en el suelo · tecla R</small>
          </button>
        ) : (
          <button
            onClick={() => switchMode('planet', { finishTutorial: true })}
          >
            <b>Ir al planeta</b>
            <small>Saltar el resto del tutorial</small>
          </button>
        )}
        {isPlanet && (
          <button
            onClick={() => {
              setPanel(null);
              setMissionOpen(true);
            }}
          >
            <b>Tu misión y cómo se juega</b>
            <small>Qué son los sakuras y los tipos de aventura</small>
          </button>
        )}
        <button onClick={() => openPanel('gravity')}>
          <b>Gravedad a medida</b>
          <small>
            Ahora {preset ?? 'libre'} · {gravity.toFixed(2)} m/s² · barra de 0 a
            25
          </small>
        </button>
        <button
          onClick={() => {
            setPanel(null);
            setHelp(true);
          }}
        >
          <b>Controles y personalidad</b>
          <small>Cómo se juega y cómo es Gravi</small>
        </button>
        <button onClick={() => switchMode('tutorial')}>
          <b>Repetir tutorial</b>
          <small>Moverse, saltar y cambiar gravedad</small>
        </button>
        {isPlanet && (
          <section className="secret-board" aria-label="Cuaderno de sakuras">
            <div>
              <span>UN BOSQUE POR DESPERTAR</span>
              <b>
                {secretCount} / {AWAKENINGS.length}
              </b>
            </div>
            <p>
              Descubre, recorre, salta. Cada aventura hace florecer un sakura en
              su rincón del bosque.
            </p>
            <ul>
              {AWAKENINGS.map((secret) => {
                const discovered = snapshot.forest?.completed.includes(
                  secret.id,
                );
                return (
                  <li key={secret.id} data-found={discovered}>
                    <span aria-hidden="true">{discovered ? '✦' : '?'}</span>
                    <div>
                      <b>{secret.title}</b>
                      <small>
                        {discovered
                          ? `✓ ${secret.reward}`
                          : `Pista: ${secret.hint}`}
                      </small>
                      <button
                        className="journal-guide"
                        onClick={() => {
                          setDestination(secret.id);
                          setPanel(null);
                        }}
                      >
                        {' '}
                        {discovered ? 'Visitar sakura' : 'Guiarme'} ↗
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <small>
              {canSave
                ? '✓ Guardado en este navegador'
                : 'No se puede guardar en este navegador.'}
            </small>
          </section>
        )}
        {isPlanet && (
          <section className="danger-zone" aria-label="Empezar de nuevo">
            <button
              onClick={() => {
                if (
                  !window.confirm(
                    '¿Reiniciar los 10 retos y apagar sus sakuras? Conservarás el mapa explorado y tus ajustes.',
                  )
                )
                  return;
                game.current?.restart();
                setDiscoveryHelp({});
                setDestination(null);
                setPanel(null);
              }}
            >
              <b>Reiniciar retos del planeta</b>
              <small>Apaga los 10 sakuras. Pide confirmación.</small>
            </button>
          </section>
        )}
      </aside>

      {playing && !snapshot.grounded && (
        <div className="telemetry">
          <span className="live-dot" />
          <span>
            {snapshot.grounded
              ? 'Patitas en la superficie'
              : gravity === 0
                ? 'Flotando libremente'
                : 'En pleno salto'}
          </span>
          <b>
            {snapshot.height.toFixed(1)} <small>m de altura</small>
          </b>
        </div>
      )}
      {isPlanet && guide && (
        <aside
          className="explorer-hud"
          data-near={guide.near && !!target}
          data-compact={moving && !(guide.near && target && !challenge)}
          data-challenge={!!challenge}
          aria-label="Guía de exploración"
        >
          <button
            className="compass"
            onClick={openMap}
            aria-label="Abrir brújula y mapa"
          >
            <span style={{ transform: `rotate(${-(guide.heading ?? 0)}deg)` }}>
              {guide.heading === null ? '◎' : 'N ↑'}
            </span>
          </button>
          {challenge ? (
            <div className="challenge-panel" aria-live="polite">
              <small>
                {challenge.level
                  ? `${challenge.category} · Nivel ${challenge.level}`
                  : 'Gran final'}{' '}
                · Estás en la prueba
              </small>
              <strong>{challenge.title}</strong>
              <p>{challenge.goal}</p>
              {challenge.hintLevel !== null && challenge.hintLevel < 2 && (
                <button
                  className="discovery-hint"
                  onClick={() =>
                    setDiscoveryHelp((levels) => ({
                      ...levels,
                      [challenge.id]: Math.min(
                        2,
                        (levels[challenge.id] ?? 0) + 1,
                      ),
                    }))
                  }
                >
                  {challenge.hintLevel === 0
                    ? 'Una pista'
                    : 'Mostrar cómo hacerlo'}
                </button>
              )}
              <ol className="challenge-steps">
                {challenge.steps.map((step) => (
                  <li
                    key={step.text}
                    data-done={step.done}
                    data-current={step.current}
                  >
                    {step.text}
                  </li>
                ))}
              </ol>
              {challenge.gravity && challenge.gravityValue !== null && (
                <button
                  className="gravity-chip"
                  data-ok={challenge.gravityOk}
                  onClick={() => changeGravity(challenge.gravityValue!)}
                >
                  {challenge.gravityOk
                    ? `✓ Ya tienes ${challenge.gravity}`
                    : `Usar ${challenge.gravity} ${GRAVITY_ICONS[challenge.gravity] ?? ''}`}
                </button>
              )}
              {challenge.status && (
                <small className="challenge-status">{challenge.status}</small>
              )}
            </div>
          ) : (
            <div>
              <small>
                {target
                  ? target.level
                    ? `${target.category} · Nivel ${target.level}`
                    : 'Gran final'
                  : 'EXPLORACIÓN'}{' '}
                · {secretCount}/{AWAKENINGS.length} ✿
              </small>
              <strong>{target?.title ?? 'Un bosque por despertar'}</strong>
              <span>
                {target
                  ? guide.near
                    ? 'Estás en la zona · mira a tu alrededor'
                    : `${Math.round(guide.distance)} m por la superficie`
                  : nearest
                    ? `Aventura más cercana: ${nearest.title} · ${Math.round(nearest.distance)} m`
                    : '¡Los diez sakuras están despiertos!'}
                {guide.vertical && target ? ` · ${guide.vertical}` : ''}
              </span>
              {!target && nearest && (
                <button
                  className="hud-guide"
                  onClick={() => setDestination(nearest.id)}
                >
                  Guiarme ↗
                </button>
              )}
              {target && target.id !== 'journey' && (
                <p>
                  {!guide.near &&
                  !snapshot.forest?.completed.includes(target.id)
                    ? 'Al llegar: '
                    : ''}
                  {target.hint}
                </p>
              )}
              {target &&
                snapshot.forest &&
                !snapshot.forest.completed.includes(target.id) && (
                  <small>
                    {target.id === 'journey'
                      ? journeyHint(snapshot.forest)
                      : target.id === 'wind'
                        ? `${snapshot.forest.windStep} / 5 peldaños · descanso en el tercero`
                        : target.id === 'river'
                          ? `${snapshot.forest.riverStep} / 5 remolinos`
                          : target.id === 'reflection'
                            ? `${snapshot.forest.reflectionStep} / 3 reflejos · Luna → Tierra → Júpiter`
                            : target.id === 'jupiter'
                              ? `${snapshot.forest.stones.length} / 3 semillas · después vuelve al centro`
                              : target.id === 'sky'
                                ? `${snapshot.forest.skyStep} / 4 peldaños · si caes al suelo, vuelve al primero`
                                : target.id === 'ridge'
                                  ? `${snapshot.forest.ridgeStep} / 3 cornisas · si caes al suelo, vuelve a la primera`
                                  : target.id === 'lanterns'
                                    ? `${snapshot.forest.lanternStep} / 4 faroles encendidos`
                                    : target.id === 'jupiter' &&
                                        snapshot.forest.stoneTime > 0
                                      ? 'El círculo está despertando…'
                                      : target.id === 'petals'
                                        ? `${snapshot.forest.petalStep} / 4 grupos de pétalos`
                                        : snapshot.forest.flowerTime > 0
                                          ? 'Las flores están despertando…'
                                          : ''}
                  </small>
                )}
            </div>
          )}
          {target && !guide.near && !guide.antipodal && (
            <span
              className="guide-arrow"
              style={{ transform: `rotate(${guide.angle}deg)` }}
            >
              ↑
            </span>
          )}
          {target && (
            <button
              className="stop-guide"
              aria-label="Quitar destino"
              onClick={() => setDestination(null)}
            >
              ×
            </button>
          )}
        </aside>
      )}
      {playing && (
        <output
          key={notice}
          className="toast"
          aria-live="polite"
          data-flight={showFlightHint}
          aria-hidden={showFlightHint}
        >
          {notice}
        </output>
      )}
      {showFlightHint && (
        <output className="flight-hint" aria-live="polite">
          Para bajar más rápido, cambia la gravedad a <b>Tierra o Júpiter</b>.
        </output>
      )}

      <section
        id="gravity-panel"
        className="gravity-panel"
        data-open={panel === 'gravity'}
        aria-label="Control de gravedad"
      >
        <button
          className="sheet-close"
          aria-label="Cerrar gravedad"
          onClick={() => setPanel(null)}
        >
          ×
        </button>
        <div className="gravity-title">
          <div>
            <span className="eyebrow">TÚ ELIGES CÓMO SALTA GRAVI</span>
            <h2>Cambia la gravedad</h2>
          </div>
          <div className="gravity-value">
            <b>{gravity.toFixed(2)}</b>
            <span>m/s² · {preset || 'A tu medida'}</span>
          </div>
        </div>
        <p className="gravity-explainer">
          Mueve la barra o pulsa una referencia. Ambas opciones cambian la misma
          gravedad.
        </p>
        <div className="reference-scale">
          <span>− Menos gravedad</span>
          <span>Más gravedad +</span>
        </div>
        <div className="presets">
          {Object.entries(PRESETS).map(([name, value]) => (
            <button
              key={name}
              aria-pressed={value === gravity}
              className={value === gravity ? 'selected' : ''}
              onClick={() => changeGravity(value)}
            >
              <span aria-hidden="true">
                {name === 'Tierra'
                  ? '◉'
                  : name === 'Júpiter'
                    ? '♃'
                    : name === 'Luna'
                      ? '☾'
                      : name === 'Marte'
                        ? '●'
                        : '∞'}
              </span>
              {name}
              <span className="preset-value">{value.toFixed(2)} m/s²</span>
              <small>
                {name === 'Tierra'
                  ? 'Salto normal'
                  : name === 'Júpiter'
                    ? 'Salto corto'
                    : name === 'Luna'
                      ? 'Salto muy alto'
                      : name === 'Marte'
                        ? 'Salto alto'
                        : 'Flotas'}
              </small>
            </button>
          ))}
        </div>
        <label className="slider-label" htmlFor="gravity">
          Desliza para cambiarla <span>0 — {MAX_GRAVITY} m/s²</span>
        </label>
        <input
          id="gravity"
          type="range"
          min="0"
          max={MAX_GRAVITY}
          step="0.01"
          value={gravity}
          onChange={(event) => changeGravity(Number(event.target.value))}
          aria-valuetext={`${gravity.toFixed(2)} metros por segundo al cuadrado`}
          style={
            {
              '--fill': `${(gravity / MAX_GRAVITY) * 100}%`,
            } as React.CSSProperties
          }
        />
        <div className="gravity-scale">
          <span>− Menos gravedad</span>
          <span>Más gravedad +</span>
        </div>
        <p className="gravity-hint">
          {gravity === 0
            ? 'Sin gravedad, el salto continúa. Cambia a Tierra o Júpiter para bajar más rápido.'
            : gravity < 3
              ? 'Ahora: saltos muy altos y lentos.'
              : gravity < 6
                ? 'Ahora: saltos altos.'
                : gravity <= 12
                  ? 'Ahora: vuelves a la superficie más rápido.'
                  : 'Gravedad intensa: saltos cortos y aterrizajes rápidos.'}
        </p>
      </section>

      {playing && (
        <section className="controls" aria-label="Controles de juego">
          <div>
            <kbd>W A S D</kbd>
            <span>o flechas · moverte</span>
          </div>
          <div>
            <kbd>espacio</kbd>
            <span>saltar</span>
          </div>
          <div>
            <span className="mouse-glyph">↔</span>
            <span>
              arrastra · girar la cámara
              <br />
              rueda · acercar
            </span>
          </div>
          <button onClick={() => game.current?.reset()}>
            <span>↺</span> {isPlanet ? 'Volver al planeta' : 'Volver al inicio'}{' '}
            <kbd>R</kbd>
          </button>
        </section>
      )}
      {playing && (
        <TouchControls
          game={game}
          disabled={inputBlocked}
          gravity={gravity}
          onGravity={changeGravity}
          showHint={gravityHint && !missionOpen && mode !== 'tutorial'}
        />
      )}
      {(panel !== null || help) && (
        <button
          className="sheet-dismiss"
          aria-label="Cerrar panel"
          onClick={() => {
            setPanel(null);
            setHelp(false);
          }}
        />
      )}

      {playing && (
        <nav className="quick-gravity" aria-label="Gravedad rápida">
          <span>
            GRAVEDAD <small>pulsa 1 a 5 o haz clic</small>
          </span>
          <div>
            {Object.entries(PRESETS).map(([name, value], index) => (
              <button
                key={name}
                aria-pressed={gravity === value}
                aria-keyshortcuts={String(index + 1)}
                onClick={() => changeGravity(value)}
              >
                <kbd aria-hidden="true">{index + 1}</kbd>
                <b>
                  <span aria-hidden="true">{GRAVITY_ICONS[name]}</span> {name}
                </b>
                <small>salto {GRAVITY_EFFECT[name]}</small>
              </button>
            ))}
            <button
              aria-label="Ajustar gravedad con barra"
              onClick={() => openPanel('gravity')}
            >
              ☷
            </button>
          </div>
        </nav>
      )}
      {help && (
        <div className="help-panel">
          <button aria-label="Cerrar ayuda" onClick={() => setHelp(false)}>
            ×
          </button>
          <h2>Hazlo a tu ritmo</h2>
          <p>
            En el móvil, apoya el dedo en el <b>joystick izquierdo</b> y
            arrastra desde ahí: un poco para ir despacio, más para correr. Toca{' '}
            <b>Saltar</b>. El botón redondo junto a Saltar cambia la gravedad:
            toca para abrir las cinco opciones y elige una. En ordenador, usa{' '}
            <b>WASD o flechas</b>, <b>espacio</b> y las teclas <b>1 a 5</b> para
            la gravedad.
          </p>
          <p>
            Arrastra el escenario para elegir el ángulo de cámara y usa dos
            dedos para acercar o alejar. Puedes moverte, saltar y girar a la
            vez. Las direcciones del movimiento siguen a la cámara. En saltos
            largos, cambia a Tierra o Júpiter para bajar más rápido sin volver
            al inicio.
          </p>
          <p>
            El mapa completo se revela al visitar sus zonas. Elige entre nueve
            aventuras independientes y un reto final de tres etapas al completar
            los otros nueve sakuras. La sombra marca el suelo bajo tus pies;
            suelta el joystick para frenar en el aire. Los aros de cada peldaño
            se encienden al aterrizar. Flores y hierba son decorativas.
          </p>
          <fieldset className="personality-settings">
            <legend>
              Así es {CHARACTERS[character as keyof typeof CHARACTERS].name}
            </legend>
            <label htmlFor="personality">Personalidad</label>
            <select
              id="personality"
              value={personality}
              onChange={(event) => {
                const value = event.target.value;
                game.current?.setPersonality(value);
                setPersonality(value);
              }}
            >
              {Object.entries(PERSONALITIES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <p>Tu compañero se expresa con sus ojos, patitas y movimientos.</p>
          </fieldset>
        </div>
      )}
      {missionOpen && isPlanet && (
        <div className="mission-backdrop">
          <dialog open className="mission-card" aria-labelledby="mission-title">
            <span className="eyebrow">TU MISIÓN</span>
            <h2 id="mission-title">Despierta los 10 sakuras</h2>
            <p>
              Los sakuras del planeta de Gravi están dormidos. Cada uno
              despierta al completar una pequeña aventura en su rincón del
              bosque. Hazlas en el orden que quieras: no hay reloj y nunca
              pierdes lo conseguido.
            </p>
            <ul className="mission-kinds">
              {ADVENTURE_KINDS.map((kind) => (
                <li key={kind.category}>
                  <span aria-hidden="true">{kind.icon}</span>
                  <div>
                    <b>{kind.category}</b>
                    <small>{kind.summary}</small>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mission-tips">
              <p>
                <b>La gravedad es tu herramienta.</b> Cámbiala con el botón
                redondo junto a Saltar (teclas 1 a 5 en ordenador). Poca
                gravedad: saltos altos y lentos. Mucha: saltos cortos y firmes.
              </p>
              <p>
                <b>Para encontrarlas</b>, toca «Guiarme» y sigue la flecha, o
                abre el Mapa. Al despertar nueve, se abre El último florecer.
              </p>
            </div>
            <div className="mission-actions">
              {nearest && (
                <button
                  className="primary"
                  onClick={() => closeMission(nearest.id)}
                >
                  Guíame a la más cercana
                  <small>{nearest.title}</small>
                </button>
              )}
              <button onClick={() => closeMission(null)}>
                Explorar por mi cuenta
              </button>
            </div>
          </dialog>
        </div>
      )}
      {mapOpen && snapshot.forest && (
        <PlanetMap
          forest={snapshot.forest}
          selected={destination}
          onClose={closeMap}
          onSelect={(id) => {
            setDestination(id);
            closeMap();
          }}
        />
      )}
      {saveConflict && (
        <div className="pause-overlay">
          <div role="alert">
            <h2>Tu partida cambió en otra pestaña</h2>
            <p>
              Hemos detenido esta sesión para proteger lo que ya has conseguido.
              Recarga para continuar desde el guardado más reciente.
            </p>
            <button onClick={() => location.reload()}>
              Cargar la partida actualizada
            </button>
          </div>
        </div>
      )}
      {paused && !mapOpen && !error && !saveConflict && (
        <div className="pause-overlay">
          <div>
            <span>☁</span>
            <h2>Un pequeño descanso</h2>
            <p>Gravi te espera aquí.</p>
            <button onClick={() => game.current?.togglePause()}>
              Seguir explorando
            </button>
          </div>
        </div>
      )}
      {error && (
        <div className="pause-overlay">
          <div role="alert">
            <h2>El mundo necesita 3D</h2>
            <p>{error}</p>
            <button onClick={() => location.reload()}>Volver a intentar</button>
          </div>
        </div>
      )}
    </main>
  );
}
