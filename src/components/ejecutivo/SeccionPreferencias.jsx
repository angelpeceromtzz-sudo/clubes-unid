import { useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { api } from '../../services/api';
import { Spinner } from '../ui/Spinner';

function Barra({ etiqueta, valor, maximo, color }) {
  const { modoOscuro } = useTheme();
  const pct = maximo > 0 ? Math.round((valor / maximo) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className={`text-xs font-bold w-40 truncate ${modoOscuro ? 'text-slate-300' : 'text-slate-700'}`}>{etiqueta}</span>
      <div className={`flex-1 h-3 rounded-full overflow-hidden ${modoOscuro ? 'bg-slate-700' : 'bg-slate-200'}`}>
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold w-10 text-right ${modoOscuro ? 'text-slate-400' : 'text-slate-600'}`}>{valor}</span>
    </div>
  );
}

export function SeccionPreferencias({ d }) {
  const { modoOscuro, cardCls } = useTheme();
  const [responsables, setResponsables] = useState([]);
  const [cargandoResp, setCargandoResp] = useState(true);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const data = await api.get('/me/responsables');
        if (!cancelado) setResponsables(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelado) setResponsables([]);
      } finally {
        if (!cancelado) setCargandoResp(false);
      }
    })();
    return () => { cancelado = true; };
  }, []);

  if (d.cargando) return <Spinner className="py-32" />;
  if (d.error) return <p className="text-red-400 text-sm">{d.error}</p>;

  const pref = d.preferencias || {};
  const total = pref.total_con_onboarding || 0;

  const maxCat = Math.max(...(pref.por_categoria || []).map((x) => x.total), 1);
  const maxAct = Math.max(...(pref.por_actividad || []).map((x) => x.total), 1);
  const maxMot = Math.max(...(pref.por_motivacion || []).map((x) => x.total), 1);
  const maxDisp = Math.max(...(pref.por_disposicion || []).map((x) => x.total), 1);

  return (
    <div className="space-y-6">
      <div className={`${cardCls} border rounded-2xl p-4`}>
        <h3 className={`text-lg font-black ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>Preferencias de alumnos</h3>
        <p className={`text-xs mt-1 ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
          Alumnos con onboarding completado: <strong>{total}</strong>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${cardCls} border rounded-2xl p-4 space-y-3`}>
          <h4 className={`text-sm font-black uppercase tracking-wider ${modoOscuro ? 'text-slate-300' : 'text-slate-700'}`}>Categorías de interés</h4>
          {(pref.por_categoria || []).map((c) => (
            <Barra key={c.categoria} etiqueta={c.categoria} valor={c.total} maximo={maxCat} color="bg-amber-500" />
          ))}
        </div>
        <div className={`${cardCls} border rounded-2xl p-4 space-y-3`}>
          <h4 className={`text-sm font-black uppercase tracking-wider ${modoOscuro ? 'text-slate-300' : 'text-slate-700'}`}>Actividades de interés</h4>
          {(pref.por_actividad || []).slice(0, 10).map((a) => (
            <Barra key={a.actividad} etiqueta={`${a.actividad} (${a.categoria})`} valor={a.total} maximo={maxAct} color="bg-blue-500" />
          ))}
        </div>
        <div className={`${cardCls} border rounded-2xl p-4 space-y-3`}>
          <h4 className={`text-sm font-black uppercase tracking-wider ${modoOscuro ? 'text-slate-300' : 'text-slate-700'}`}>Motivaciones</h4>
          {(pref.por_motivacion || []).map((m) => (
            <Barra key={m.motivacion} etiqueta={m.motivacion} valor={m.total} maximo={maxMot} color="bg-emerald-500" />
          ))}
        </div>
        <div className={`${cardCls} border rounded-2xl p-4 space-y-3`}>
          <h4 className={`text-sm font-black uppercase tracking-wider ${modoOscuro ? 'text-slate-300' : 'text-slate-700'}`}>Disposición para ser responsable</h4>
          {(pref.por_disposicion || []).map((d) => (
            <Barra key={d.disposicion} etiqueta={d.disposicion} valor={d.total} maximo={maxDisp} color="bg-purple-500" />
          ))}
        </div>
      </div>

      <div className={`${cardCls} border rounded-2xl p-4`}>
        <h4 className={`text-sm font-black uppercase tracking-wider mb-3 ${modoOscuro ? 'text-slate-300' : 'text-slate-700'}`}>
          Alumnos interesados en ser responsables de club
        </h4>
        {cargandoResp ? (
          <Spinner className="py-10" />
        ) : responsables.length === 0 ? (
          <p className={`text-sm ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>Ningún alumno marcó interés en ser responsable.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b ${modoOscuro ? 'border-slate-700/50' : 'border-slate-200'}`}>
                  <th className={`px-3 py-2 text-left text-[10px] uppercase tracking-wider font-bold ${modoOscuro ? 'text-slate-400' : 'text-slate-600'}`}>Nombre</th>
                  <th className={`px-3 py-2 text-left text-[10px] uppercase tracking-wider font-bold ${modoOscuro ? 'text-slate-400' : 'text-slate-600'}`}>Correo</th>
                  <th className={`px-3 py-2 text-left text-[10px] uppercase tracking-wider font-bold ${modoOscuro ? 'text-slate-400' : 'text-slate-600'}`}>Licenciatura</th>
                  <th className={`px-3 py-2 text-left text-[10px] uppercase tracking-wider font-bold ${modoOscuro ? 'text-slate-400' : 'text-slate-600'}`}>Cuatrimestre</th>
                  <th className={`px-3 py-2 text-left text-[10px] uppercase tracking-wider font-bold ${modoOscuro ? 'text-slate-400' : 'text-slate-600'}`}>Teléfono</th>
                  <th className={`px-3 py-2 text-left text-[10px] uppercase tracking-wider font-bold ${modoOscuro ? 'text-slate-400' : 'text-slate-600'}`}>Categorías</th>
                  <th className={`px-3 py-2 text-left text-[10px] uppercase tracking-wider font-bold ${modoOscuro ? 'text-slate-400' : 'text-slate-600'}`}>Actividades</th>
                  <th className={`px-3 py-2 text-left text-[10px] uppercase tracking-wider font-bold ${modoOscuro ? 'text-slate-400' : 'text-slate-600'}`}>Motivaciones</th>
                </tr>
              </thead>
              <tbody>
                {responsables.map((r) => (
                  <tr key={r.id_usuario} className={`border-b ${modoOscuro ? 'border-slate-800/50' : 'border-slate-100'}`}>
                    <td className={`px-3 py-2 text-sm ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>{r.nombre_completo}</td>
                    <td className={`px-3 py-2 text-xs ${modoOscuro ? 'text-slate-400' : 'text-slate-600'}`}>{r.correo_institucional}</td>
                    <td className={`px-3 py-2 text-xs ${modoOscuro ? 'text-slate-300' : 'text-slate-700'}`}>{r.licenciatura || '—'}</td>
                    <td className={`px-3 py-2 text-xs ${modoOscuro ? 'text-slate-300' : 'text-slate-700'}`}>{r.cuatrimestre ? `${r.cuatrimestre}°` : '—'}</td>
                    <td className={`px-3 py-2 text-xs ${modoOscuro ? 'text-slate-300' : 'text-slate-700'}`}>{r.telefono_contacto || '—'}</td>
                    <td className={`px-3 py-2 text-xs ${modoOscuro ? 'text-slate-400' : 'text-slate-600'}`}>{r.categorias || '—'}</td>
                    <td className={`px-3 py-2 text-xs ${modoOscuro ? 'text-slate-400' : 'text-slate-600'}`}>{r.actividades || '—'}</td>
                    <td className={`px-3 py-2 text-xs ${modoOscuro ? 'text-slate-400' : 'text-slate-600'}`}>{r.motivaciones || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}