import { useTheme } from '../../contexts/ThemeContext';

export function PasoTelefono({ valor, onCambiar }) {
  const { modoOscuro } = useTheme();
  const textoSecundario = modoOscuro ? 'text-slate-400' : 'text-slate-600';

  return (
    <div>
      <h2 className={`text-2xl font-black tracking-tight sm:text-3xl ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
        ¿Cuál es tu número de teléfono?
      </h2>
      <p className={`mt-2 text-sm ${textoSecundario}`}>
        Escribe un número de contacto de 10 dígitos para completar tu registro.
      </p>

      <div className="mt-6">
        <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${textoSecundario}`}>
          Teléfono (10 dígitos) <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={valor ?? ''}
          onChange={(e) => onCambiar(e.target.value.replace(/\D/g, '').slice(0, 10) || null)}
          required
          minLength={10}
          maxLength={10}
          placeholder="Ej: 9811234567"
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 ${
            modoOscuro ? 'bg-[#18223f] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}
        />
      </div>
    </div>
  );
}
