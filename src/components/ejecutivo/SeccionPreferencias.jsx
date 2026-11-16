/* Sección de insights de preferencias del alumnado. */
import { useTheme } from '../../contexts/ThemeContext';
import { Alerta } from '../ui/Alerta';
import { BotonAccion } from '../ui/BotonAccion';

function BarraSimple({ filas, campoNombre = 'nombre', campoTotal = 'total', color = 'bg-amber-500' }) {
  const { modoOscuro } = useTheme();
  const lista = Array.isArray(filas) ? filas : [];
  const max = Math.max(1, ...lista.map((f) => Number(f[campoTotal]) || 0));
  if (lista.length === 0) {
    return <p className={`text-sm ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>Sin datos.</p>;
  }
  return (
    <ul className="space-y-2">
      {lista.map((f) => {
        const total = Number(f[campoTotal]) || 0;
        const pct = (total / max) * 100;
        return (
          <li key={f[campoNombre]} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className={modoOscuro ? 'text-slate-300' : 'text-slate-700'}>{f[campoNombre]}</span>
              <span className={modoOscuro ? 'text-slate-400' : 'text-slate-500'}>{total}</span>
            </div>
            <div className={`h-2 rounded-full ${modoOscuro ? 'bg-slate-800' : 'bg-slate-200'}`}>
              <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function SeccionPreferencias({ d }) {
  const { modoOscuro, cardCls } = useTheme();
  if (d.cargandoPreferencias) return <p role="status">Cargando preferencias registradas…</p>;
  if (d.errorPreferencias) return <div role="alert" className="space-y-3"><Alerta tipo="error" mensaje={d.errorPreferencias} /><BotonAccion variant="outline" onClick={d.recargarPreferencias}>Reintentar preferencias</BotonAccion></div>;
  const ins = d.preferenciasInsights || {};
  const estados = ins.estados || [];
  const categorias = ins.categorias || [];
  const motivaciones = ins.motivaciones || [];
  const licenciaturas = ins.licenciaturas || [];
  const propuestas = ins.propuestas || [];

  return (
    <div className="space-y-6">
      <p className={`text-xs ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
        Preferencias registradas en la plataforma. Los filtros de otras pestañas no modifican estas cifras.
      </p>
      <div className={`${cardCls} rounded-2xl border p-4 sm:p-6`}>
        <h3 className={`text-sm font-bold mb-3 ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>Estado del onboarding</h3>
        <BarraSimple filas={estados} campoNombre="estado_onboarding" color="bg-emerald-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${cardCls} rounded-2xl border p-4 sm:p-6`}>
          <h3 className={`text-sm font-bold mb-3 ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>Top categorías</h3>
          <BarraSimple filas={categorias} color="bg-amber-500" />
        </div>
        <div className={`${cardCls} rounded-2xl border p-4 sm:p-6`}>
          <h3 className={`text-sm font-bold mb-3 ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>Top motivaciones</h3>
          <BarraSimple filas={motivaciones} color="bg-sky-500" />
        </div>
      </div>

      <div className={`${cardCls} rounded-2xl border p-4 sm:p-6`}>
        <h3 className={`text-sm font-bold mb-3 ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>Licenciaturas</h3>
        <BarraSimple filas={licenciaturas} color="bg-violet-500" />
      </div>

      <div className={`${cardCls} rounded-2xl border p-4 sm:p-6`}>
        <h3 className={`text-sm font-bold mb-3 ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>Actividades propuestas</h3>
        {propuestas.length === 0 ? (
          <p className={`text-sm ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>Sin propuestas.</p>
        ) : (
          <ul className="space-y-1">
            {propuestas.map((p) => (
              <li key={p.texto} className="flex items-center justify-between text-sm">
                <span className={modoOscuro ? 'text-slate-300' : 'text-slate-700'}>{p.texto}</span>
                <span className={modoOscuro ? 'text-slate-400' : 'text-slate-500'}>{p.total}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}