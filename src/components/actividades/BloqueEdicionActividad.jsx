import { useId } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

export function BloqueEdicionActividad({ titulo, descripcion, children }) {
  const id = useId();
  const { tema, cardCls } = useTheme();
  return <section aria-labelledby={id} className={'rounded-2xl border p-4 sm:p-5 space-y-5 ' + cardCls}>
    <header className="space-y-1 border-b border-slate-400/20 pb-3">
      <h4 id={id} className={'text-base font-bold ' + tema.title}>{titulo}</h4>
      {descripcion && <p className={'text-sm ' + tema.subtitle}>{descripcion}</p>}
    </header>
    {children}
  </section>;
}
