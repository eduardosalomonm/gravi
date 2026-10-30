'use client';
import {
  useEffect,
  useRef,
  useState,
  type RefObject,
  type PointerEvent,
} from 'react';
import type { GameHandle } from '../lib/game';
import { joystickVector } from '../lib/touch-input.mjs';
import {
  WHEEL_OPTIONS,
  presetName,
  GRAVITY_ICONS,
} from '../lib/gravity-wheel.mjs';

export function TouchControls({
  game,
  disabled,
  gravity,
  onGravity,
  showHint = false,
}: {
  game: RefObject<GameHandle | null>;
  disabled: boolean;
  gravity: number;
  onGravity: (value: number) => void;
  showHint?: boolean;
}) {
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const jumpPointer = useRef<number | null>(null);
  const stick = useRef<HTMLButtonElement>(null);
  const jumpButton = useRef<HTMLButtonElement>(null);
  const thumb = useRef<HTMLSpanElement>(null);
  const wheel = useRef<HTMLDivElement>(null);
  const wheelButton = useRef<HTMLButtonElement>(null);
  const [wheelOpen, setWheelOpen] = useState(false);
  const closeWheel = () => setWheelOpen(false);
  useEffect(() => {
    const stop = () => {
      pointer.current = null;
      jumpPointer.current = null;
      game.current?.setMove(0, 0);
      if (thumb.current) thumb.current.style.transform = '';
      stick.current?.removeAttribute('data-held');
      jumpButton.current?.removeAttribute('data-held');
    };
    if (disabled) {
      stop();
      queueMicrotask(() => setWheelOpen(false));
    }
    const hidden = () => {
      if (document.hidden) stop();
    };
    window.addEventListener('blur', stop);
    window.addEventListener('resize', stop);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      stop();
      window.removeEventListener('blur', stop);
      window.removeEventListener('resize', stop);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [disabled, game]);
  useEffect(() => {
    if (!wheelOpen) return;
    wheel.current
      ?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')
      ?.focus({ preventScroll: true });
    const outside = (event: globalThis.PointerEvent) => {
      if (
        event.target instanceof Node &&
        !wheel.current?.contains(event.target)
      )
        closeWheel();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeWheel();
        wheelButton.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [wheelOpen]);
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    if (pointer.current?.id !== event.pointerId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - pointer.current.x;
    const dy = event.clientY - pointer.current.y;
    const radius = bounds.width * 0.3;
    const vector = joystickVector(dx, dy, radius, {
      deadZone: 0.1,
      response: 1.25,
    });
    game.current?.setMove(vector.x, vector.z);
    if (thumb.current) {
      const visual = joystickVector(dx, dy, radius);
      const travel = Math.max(0, bounds.width / 2 - 29);
      thumb.current.style.transform = `translate(${visual.x * travel}px, ${-visual.z * travel}px)`;
    }
  };
  const release = (event: PointerEvent<HTMLButtonElement>) => {
    if (pointer.current?.id !== event.pointerId) return;
    pointer.current = null;
    game.current?.setMove(0, 0);
    if (thumb.current) thumb.current.style.transform = '';
    event.currentTarget.removeAttribute('data-held');
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const releaseJump = (event: PointerEvent<HTMLButtonElement>) => {
    if (jumpPointer.current !== event.pointerId) return;
    jumpPointer.current = null;
    event.currentTarget.removeAttribute('data-held');
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const current = presetName(gravity);
  return (
    <section className="touch-controls" aria-label="Controles táctiles">
      <div className="stick-wrap">
        <button
          ref={stick}
          className="joystick"
          disabled={disabled}
          aria-label="Mover a Gravi: mantén pulsado y arrastra"
          onPointerDown={(event) => {
            if (disabled || event.button !== 0 || pointer.current !== null)
              return;
            event.preventDefault();
            pointer.current = {
              id: event.pointerId,
              x: event.clientX,
              y: event.clientY,
            };
            event.currentTarget.dataset.held = 'true';
            game.current?.setMove(0, 0);
            try {
              event.currentTarget.setPointerCapture(event.pointerId);
            } catch {
              // The stick keeps following this pointer without capture.
            }
            move(event);
          }}
          onPointerMove={move}
          onPointerUp={release}
          onPointerCancel={release}
          onLostPointerCapture={release}
        >
          <span className="stick-arrows" aria-hidden="true">
            ✥
          </span>
          <span ref={thumb} className="stick-thumb" aria-hidden="true" />
        </button>
      </div>
      <div className="action-cluster">
        <div
          ref={wheel}
          className="gravity-wheel"
          data-open={wheelOpen}
          data-hint={showHint}
        >
          {showHint && !wheelOpen && (
            <span className="gravity-coach" aria-hidden="true">
              <b>Gravedad</b>
              Toca, elige una gravedad y sigue explorando
            </span>
          )}
          {wheelOpen && (
            <fieldset
              className="gravity-choices"
              id="gravity-choices"
              aria-label="Elegir gravedad"
            >
              <legend>¿Cuánto quieres pesar?</legend>
              {WHEEL_OPTIONS.map((option) => (
                <button
                  key={option.name}
                  className="gravity-choice"
                  aria-pressed={current === option.name}
                  onClick={() => {
                    onGravity(option.value);
                    closeWheel();
                    wheelButton.current?.focus({ preventScroll: true });
                  }}
                >
                  <span aria-hidden="true">{GRAVITY_ICONS[option.name]}</span>
                  <b>{option.name}</b>
                  <small>
                    {
                      (
                        {
                          Cero: 'Flotar',
                          Luna: 'Muy ligero',
                          Marte: 'Ligero',
                          Tierra: 'Normal',
                          Júpiter: 'Muy pesado',
                        } as Record<string, string>
                      )[option.name]
                    }
                  </small>
                </button>
              ))}
              <button
                className="gravity-dismiss"
                onClick={() => {
                  closeWheel();
                  wheelButton.current?.focus({ preventScroll: true });
                }}
              >
                Cerrar
              </button>
            </fieldset>
          )}
          <button
            ref={wheelButton}
            className="gravity-button"
            disabled={disabled}
            data-gravity={current ?? 'Libre'}
            aria-label={`Elegir gravedad. Actual: ${current ?? `${gravity.toFixed(2)} m/s²`}`}
            aria-expanded={wheelOpen}
            aria-controls={wheelOpen ? 'gravity-choices' : undefined}
            onClick={() => setWheelOpen((open) => !open)}
          >
            <span aria-hidden="true">
              {current ? GRAVITY_ICONS[current] : '≈'}
            </span>
            <small>{current ?? gravity.toFixed(1)}</small>
          </button>
        </div>
        <button
          ref={jumpButton}
          className="jump-button"
          disabled={disabled}
          onPointerDown={(event) => {
            if (disabled || event.button !== 0 || jumpPointer.current !== null)
              return;
            event.preventDefault();
            jumpPointer.current = event.pointerId;
            event.currentTarget.dataset.held = 'true';
            event.currentTarget.setPointerCapture(event.pointerId);
            game.current?.requestJump();
          }}
          onPointerUp={releaseJump}
          onPointerCancel={releaseJump}
          onLostPointerCapture={releaseJump}
          onClick={(event) => {
            if (event.detail === 0) game.current?.requestJump();
          }}
        >
          <span aria-hidden="true">↑</span>Saltar
        </button>
      </div>
    </section>
  );
}
