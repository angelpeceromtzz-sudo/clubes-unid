import { useTheme } from '../../contexts/ThemeContext';

export function PasoFechaNacimiento({ valor, onCambiar }) {
  const { modoOscuro } = useTheme();
  const textoSecundario = modoOscuro ? 'text-slate-400' : 'text-slate-600';

  return (
    <div>
      <h2 className={`text-2xl font-black tracking-tight sm:text-3xl ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
        ¿Cuál es tu fecha de nacimiento?
      </h2>
      <p className={`mt-2 text-sm ${textoSecundario}`}>
        La usamos para calcular tu edad y personalizar tu experiencia. Es obligatoria.
      </p>

      <div className="mt-6">
        <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${textoSecundario}`}>
          Fecha de nacimiento
        </label>
        <input
          type="date"
          value={valor ?? ''}
          onChange={(e) => onCambiar(e.target.value || null)}
          max={new Date().toISOString().slice(0, 10)}
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 [&::-webkit-calendar-picker-indicator]:cursor-pointer ${
            modoOscuro ? 'bg-[#18223f] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}
        />
      </div>
    </div>
  );
}
