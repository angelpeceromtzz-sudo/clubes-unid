/* Hook para alternar entre modo oscuro y claro. Persiste la preferencia en localStorage. */
import { useState, useEffect } from 'react';

export function useTema() {
  const [modoOscuro, setModoOscuro] = useState(() => {
    const guardado = localStorage.getItem('theme');
    return guardado !== null ? guardado === 'dark' : true;
  });

  useEffect(() => {
    localStorage.setItem('theme', modoOscuro ? 'dark' : 'light');
  }, [modoOscuro]);

  const tema = modoOscuro
    ? {
        isDark: true,
        bg: 'bg-[#0b111e]',
        text: 'text-slate-200',
        headerBg: 'bg-[#0b111e]/80',
        headerBorder: 'border-slate-800/60',
        title: 'text-white',
        subtitle: 'text-slate-400',
        navPill: 'bg-[#18223f]/60 border border-slate-800 rounded-full p-1',
        btnActive: 'bg-amber-400 text-[#0e162c] font-black rounded-full',
        btnInactive: 'bg-transparent text-slate-400 hover:text-white rounded-full',
        dropdownBg: 'bg-[#0e162c]',
        dropdownBorder: 'border-slate-700',
        dropdownItem: 'hover:bg-slate-700/50',
        profileText: 'text-slate-200',
        iconColor: 'text-slate-400',
        logoText: 'text-white',
      }
    : {
        isDark: false,
        bg: 'bg-slate-50',
        text: 'text-slate-800',
        headerBg: 'bg-white/80',
        headerBorder: 'border-slate-200',
        title: 'text-slate-900',
        subtitle: 'text-slate-500',
        navPill: 'bg-slate-100 border border-slate-200 rounded-full p-1',
        btnActive: 'bg-[#0e162c] text-white shadow-sm rounded-full',
        btnInactive: 'bg-transparent text-slate-600 hover:text-slate-900 rounded-full',
        dropdownBg: 'bg-white',
        dropdownBorder: 'border-slate-200',
        dropdownItem: 'hover:bg-slate-100',
        profileText: 'text-slate-700',
        iconColor: 'text-slate-500',
        logoText: 'text-slate-900',
      };

  return { modoOscuro, setModoOscuro, tema };
}
