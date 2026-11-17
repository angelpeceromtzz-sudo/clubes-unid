import { useEffect, useRef } from 'react';
import { useBloqueoScroll } from './useBloqueoScroll';

export function useDialogoCalendario(onClose, bloqueado = false) {
  const dialogoRef = useRef(null);
  useBloqueoScroll(true);
  useEffect(() => {
    const anterior = document.activeElement;
    dialogoRef.current?.querySelector('input:not([type="file"]), button')?.focus();
    return () => { if (anterior?.isConnected) anterior.focus(); };
  }, []);
  useEffect(() => {
    function teclado(evento) {
      if (dialogoRef.current?.inert) return;
      if (evento.key === 'Escape' && !bloqueado) { evento.preventDefault(); onClose(); }
      if (evento.key !== 'Tab') return;
      const elementos = [...dialogoRef.current.querySelectorAll('a[href], input:not(:disabled):not([type="file"]), textarea:not(:disabled), select:not(:disabled), button:not(:disabled)')].filter((elemento) => elemento.getClientRects().length > 0);
      const primero = elementos[0];
      const ultimo = elementos.at(-1);
      if (!primero) { evento.preventDefault(); return; }
      if (evento.shiftKey && document.activeElement === primero) { evento.preventDefault(); ultimo.focus(); }
      else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primero.focus(); }
    }
    document.addEventListener('keydown', teclado);
    return () => document.removeEventListener('keydown', teclado);
  }, [onClose, bloqueado]);
  return dialogoRef;
}
