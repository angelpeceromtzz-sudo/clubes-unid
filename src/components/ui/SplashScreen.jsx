/* Splash screen estilo Netflix: logo grande centrado que se anima hacia su posición final en el navbar. Solo se muestra en carga inicial. */
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import logoLobo from '../../assets/logo-lobo.svg';

const SPLASH_KEY = 'splash-visto';

// ── Timing ──────────────────────────────────────────────
// Ajustar estos valores si se necesita cambiar el splash
const TIEMPO_MINIMO_MS = 1400;    // Exhibición mínima antes de animar
const DURACION_ANIMACION_MS = 900; // Duración del FLIP (logo → navbar)
const TIMEOUT_MAXIMO_MS = 4500;   // Límite máximo de espera

export function SplashScreen({ authReady, clubesLoading, onFinish }) {
  const [phase, setPhase] = useState(() => {
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('skip-splash')) return 'done';
    if (sessionStorage.getItem(SPLASH_KEY) === 'true') return 'done';
    return 'show';
  });

  const logoRef = useRef(null);
  const bgRef = useRef(null);
  const startTime = useRef(Date.now());
  const dismissed = useRef(false);
  const authReadyRef = useRef(authReady);
  const clubesLoadingRef = useRef(clubesLoading);

  authReadyRef.current = authReady;
  clubesLoadingRef.current = clubesLoading;

  useEffect(() => {
    if (phase === 'done' && !dismissed.current) {
      onFinish?.();
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = () => {
    if (dismissed.current) return;
    dismissed.current = true;

    const logoEl = logoRef.current;
    const navbarLogo = document.getElementById('navbar-logo');

    if (!logoEl || !navbarLogo) {
      sessionStorage.setItem(SPLASH_KEY, 'true');
      setPhase('done');
      return;
    }

    setPhase('animating');

    const splashRect = logoEl.getBoundingClientRect();
    const navRect = navbarLogo.getBoundingClientRect();
    const dx = navRect.left - splashRect.left;
    const dy = navRect.top - splashRect.top;
    const sw = navRect.width / splashRect.width;
    const sh = navRect.height / splashRect.height;

    logoEl.style.transformOrigin = '0 0';

    const logoAnim = logoEl.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) scale(${sw}, ${sh})`, opacity: 1 }
    ], { duration: DURACION_ANIMACION_MS, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' });

    if (bgRef.current) {
      bgRef.current.animate([
        { opacity: 1 },
        { opacity: 0 }
      ], { duration: DURACION_ANIMACION_MS, easing: 'ease-out', fill: 'forwards' });
    }

    logoAnim.onfinish = () => {
      sessionStorage.setItem(SPLASH_KEY, 'true');
      onFinish?.();
      setPhase('done');
    };
  };

  useEffect(() => {
    if (phase !== 'show') return;
    const elapsed = Date.now() - startTime.current;
    const remaining = Math.max(0, TIEMPO_MINIMO_MS - elapsed);
    const id = setTimeout(() => {
      if (authReadyRef.current && !clubesLoadingRef.current && !dismissed.current) dismiss();
    }, remaining);
    return () => clearTimeout(id);
  }, [phase, authReady, clubesLoading]);

  useEffect(() => {
    if (phase !== 'show') return;
    const id = setTimeout(() => {
      if (authReadyRef.current && !dismissed.current) dismiss();
    }, TIMEOUT_MAXIMO_MS);
    return () => clearTimeout(id);
  }, [phase]);

  if (phase === 'done') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      <div ref={bgRef} className="absolute inset-0 bg-[#0b111e]" />
      <div className="relative flex items-center justify-center h-full">
        <img
          ref={logoRef}
          src={logoLobo}
          alt="Logo"
          className="w-40 h-40"
          style={{ animation: 'splashIn 0.5s ease-out' }}
        />
      </div>
      <style>{`
        @keyframes splashIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>,
    document.body
  );
}
