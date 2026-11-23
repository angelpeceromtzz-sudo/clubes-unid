import { useTheme } from '../../contexts/ThemeContext';

const OPCIONES = [
  { valor: 'responsable', etiqueta: 'Responsable de club', descripcion: 'Me interesa coordinar y liderar un club.' },
  { valor: 'miembro', etiqueta: 'Miembro', descripcion: 'Quiero participar como integrante.' },
  { valor: 'indeciso', etiqueta: 'Aún no lo sé', descripcion: 'Decidiré más adelante.' },
];

export function PasoDisposicion({ valor, onCambiar }) {
  const { modoOscuro } = useTheme();
  const textoSecundario = modoOscuro ? 'text-slate-400' : 'text-slate-600';

  return (
    <div>
      <h2 className={`text-2xl font-black tracking-tight sm:text-3xl ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
        ¿Te gustaría ser responsable de un club?
      </h2>
      <p className={`mt-2 text-sm ${textoSecundario}`}>
        Esto nos ayuda a identificar alumnos con disposición para liderar clubes.
      </p>

      <div className="mt-6 space-y-2">
        {OPCIONES.map((op) => (
          <button
            key={op.valor}
            type="button"
            onClick={() => onCambiar(op.valor)}
            className={`w-full text-left rounded-xl border px-4 py-3 transition-all cursor-pointer ${
              valor === op.valor
                ? 'border-amber-500 ring-1 ring-amber-500/40 bg-amber-500/10'
                : modoOscuro
                  ? 'border-slate-700/70 hover:border-slate-500 bg-[#0e162c]/60'
                  : 'border-slate-200 hover:border-slate-400 bg-white'
            }`}
          >
            <p className={`font-bold ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>{op.etiqueta}</p>
            <p className={`text-xs mt-0.5 ${textoSecundario}`}>{op.descripcion}</p>
          </button>
        ))}
      </div>
    </div>
  );
}