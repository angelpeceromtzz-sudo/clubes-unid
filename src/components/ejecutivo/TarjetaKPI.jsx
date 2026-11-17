import { useTheme } from '../../contexts/ThemeContext';

export function TarjetaKPI({ titulo, valor, descripcion, contexto }) {
  const { cardCls, modoOscuro } = useTheme();
  return (
    <div className={`${cardCls} border rounded-2xl p-4`}>
      <p className={`text-xs uppercase tracking-wider font-bold ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>{titulo}</p>
      <p className={`text-3xl font-black mt-1 ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>{valor}</p>
      <p className={`text-xs mt-1 ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>{descripcion}</p>
      {contexto && <p className={`text-[10px] mt-2 ${modoOscuro ? 'text-slate-600' : 'text-slate-400'}`}>{contexto}</p>}
    </div>
  );
}
