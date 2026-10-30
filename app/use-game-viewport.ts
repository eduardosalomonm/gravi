'use client';
import { useEffect } from 'react';

export function useGameViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // Preserve browser magnification rather than counteracting pinch zoom.
        if (viewport && viewport.scale !== 1) return;
        document.documentElement.style.setProperty(
          '--game-height',
          `${viewport?.height ?? window.innerHeight}px`,
        );
        document.documentElement.style.setProperty(
          '--game-top',
          `${viewport?.offsetTop ?? 0}px`,
        );
      });
    };
    update();
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    window.addEventListener('pageshow', update);
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('pageshow', update);
      document.documentElement.style.removeProperty('--game-height');
      document.documentElement.style.removeProperty('--game-top');
    };
  }, []);
}
