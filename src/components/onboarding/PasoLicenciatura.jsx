import { useTheme } from '../../contexts/ThemeContext';
import { useLicenciaturas } from '../../hooks/useLicenciaturas';

export function PasoLicenciatura({ valor, onCambiar }) {
  const { modoOscuro } = useTheme();
  const { licenciaturas, loading, error } = useLicenciaturas();
  const textoSecundario = modoOscuro ? 'text-slate-400' : 'text-slate-600';

  const escolarizadas = licenciaturas.filter((l) => l.modalidad === 'escolarizada');
  const ejecutivas = licenciaturas.filter((l) => l.modalidad === 'ejecutiva');
  const duales = licenciaturas.filter((l) => l.modalidad === 'dual');
  const maestrias = licenciaturas.filter((l) => l.modalidad === 'maestria');

  return (
    <div>
      <h2 className={`text-2xl font-black tracking-tight sm:text-3xl ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
        ¿Cuál es tu licenciatura?
      </h2>
      <p className={`mt-2 text-sm ${textoSecundario}`}>
        Selecciona el programa en el que estás inscrito. Se usará para auto-rellenar tus postulaciones.
      </p>

      {loading && <p className={`mt-6 text-sm ${textoSecundario}`}>Cargando licenciaturas…</p>}
      {error && <p className="mt-6 text-sm text-red-400">No se pudieron cargar las licenciaturas.</p>}

      {!loading && !error && (
        <div className="mt-6">
          <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${textoSecundario}`}>
            Licenciatura
          </label>
          <select
            value={valor ?? ''}
            onChange={(e) => onCambiar(e.target.value ? Number(e.target.value) : null)}
            className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 ${
              modoOscuro ? 'bg-[#18223f] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <option value="">Selecciona tu licenciatura</option>
            <optgroup label="Escolarizadas">
              {escolarizadas.map((l) => (
                <option key={l.id_licenciatura} value={l.id_licenciatura}>{l.nombre}</option>
              ))}
            </optgroup>
            <optgroup label="Ejecutivas">
              {ejecutivas.map((l) => (
                <option key={l.id_licenciatura} value={l.id_licenciatura}>{l.nombre}</option>
              ))}
            </optgroup>
            <optgroup label="Duales">
              {duales.map((l) => (
                <option key={l.id_licenciatura} value={l.id_licenciatura}>{l.nombre}</option>
              ))}
            </optgroup>
            <optgroup label="Maestrías">
              {maestrias.map((l) => (
                <option key={l.id_licenciatura} value={l.id_licenciatura}>{l.nombre}</option>
              ))}
            </optgroup>
          </select>
        </div>
      )}
    </div>
  );
}