import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [modoOscuro, setModoOscuro] = useState(() => {
    const guardado = localStorage.getItem('theme');
    return guardado !== null ? guardado === 'dark' : true;
  });

  useEffect(() => {
    localStorage.setItem('theme', modoOscuro ? 'dark' : 'light');
  }, [modoOscuro]);

  const esOscuro = modoOscuro;

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

  const sbBg = modoOscuro ? 'bg-[#0a1128] border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const sbItemBase = 'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer';
  const sbItemActive = 'bg-amber-400/20 text-amber-400 border border-amber-400/30';
  const sbItemInactive = modoOscuro ? 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/50' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100';
  const cardCls = modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm';
  const tableBg = modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm';
  const thCls = modoOscuro ? 'text-slate-500' : 'text-slate-600';
  const tdCls = modoOscuro ? 'text-slate-400' : 'text-slate-600';
  const tdTitle = modoOscuro ? 'text-white' : 'text-slate-900';
  const selectCls = `text-xs font-bold rounded-lg px-3 py-1.5 border cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400/50 disabled:opacity-40 disabled:cursor-not-allowed ${
    modoOscuro ? 'bg-[#18223f] border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-700'
  }`;
  const inputCls = `w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 ${
    modoOscuro ? 'bg-[#18223f] border-slate-700 text-white placeholder-slate-500' : 'bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400'
  }`;
  const labelCls = 'block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5';

  return (
    <ThemeContext.Provider value={{
      modoOscuro, setModoOscuro, tema, esOscuro,
      sbBg, sbItemBase, sbItemActive, sbItemInactive,
      cardCls, tableBg, thCls, tdCls, tdTitle,
      selectCls, inputCls, labelCls,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider');
  return ctx;
}
