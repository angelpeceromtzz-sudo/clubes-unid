import { useState, useRef, useEffect, useCallback } from 'react';

export function useScrollHeader(onScrollChange) {
  const [scrolled, setScrolled] = useState(() => window.scrollY > 5);
  const [mostrarHeader, setMostrarHeader] = useState(true);
  const ultimoScrollY = useRef(0);

  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    const isScrolled = currentScrollY > 5;
    setScrolled(isScrolled);
    if (onScrollChange) onScrollChange(isScrolled);
    if (currentScrollY > ultimoScrollY.current && currentScrollY > 80) {
      setMostrarHeader(false);
    } else {
      setMostrarHeader(true);
    }
    ultimoScrollY.current = currentScrollY;
  }, [onScrollChange]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return { scrolled, mostrarHeader, setMostrarHeader, setScrolled };
}
