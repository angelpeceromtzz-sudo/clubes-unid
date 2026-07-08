import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { Alerta } from '../ui/Alerta';
import { Badge } from '../ui/Badge';

function formatearFecha(fecha) {
  if (!fecha) return '-';
  return new Date(fecha).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function obtenerBadge(status, motivoRechazo) {
  if (status === 'Oferta enviada') return { texto: 'Pendiente', color: 'amber' };
  if (status === 'Miembro oficial') return { texto: 'Aceptada', color: 'emerald' };
  if (status === 'Rechazado' && motivoRechazo === 'Oferta rechazada por el alumno') return { texto: 'Rechazada', color: 'red' };
  if (status === 'Rechazado' && motivoRechazo === 'Oferta expirada (72h)') return { texto: 'Expirada', color: 'slate' };
  return { texto: status, color: 'slate' };
}

export function SeccionSeguimientoOfertas({ club }) {
  const { tema, modoOscuro } = useTheme();
  const [ofertas, setOfertas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let montado = true;
    async function cargar() {
      setError('');
      try {
        const data = await api.getHistorialOfertas(club.id_club);
        if (montado) setOfertas(data);
      } catch (err) {
        if (montado) setError(err.message);
      } finally {
        if (montado) setCargando(false);
      }
    }
    cargar();
    return () => { montado = false; };
  }, [club.id_club]);

  if (cargando) return <Spinner />;

  const pendientes = ofertas.filter((o) => o.status === 'Oferta enviada').length;
  const aceptadas = ofertas.filter((o) => o.status === 'Miembro oficial').length;
  const rechazadas = ofertas.filter((o) => o.status === 'Rechazado').length;

  return (
    <div className="space-y-6">
      <div>
        <h3 className={`text-xl font-black uppercase tracking-wider ${tema.title}`}>Seguimiento de Ofertas</h3>
        <p className={`text-sm mt-0.5 ${tema.subtitle}`}>Consulta el estado de las ofertas de ingreso enviadas a los postulantes.</p>
      </div>

      {error && <Alerta tipo="error" mensaje={error} />}

      {ofertas.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-amber-500/10 border-amber-500/30`}>
            <span className="text-amber-400 text-sm font-bold">{pendientes}</span>
            <span className="text-xs text-amber-400/70 uppercase tracking-wider">Pendientes</span>
          </div>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-emerald-500/10 border-emerald-500/30`}>
            <span className="text-emerald-400 text-sm font-bold">{aceptadas}</span>
            <span className="text-xs text-emerald-400/70 uppercase tracking-wider">Aceptadas</span>
          </div>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-red-500/10 border-red-500/30`}>
            <span className="text-red-400 text-sm font-bold">{rechazadas}</span>
            <span className="text-xs text-red-400/70 uppercase tracking-wider">Rechazadas</span>
          </div>
        </div>
      )}

      {ofertas.length === 0 ? (
        <EmptyState icono="clipboard" titulo="Sin ofertas enviadas" descripcion="Aún no se han enviado ofertas de ingreso. Completá el proceso de selección final para generar ofertas." />
      ) : (
        <div className={`rounded-2xl border overflow-hidden ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b text-left text-xs uppercase tracking-wider font-bold ${modoOscuro ? 'border-slate-700/50 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                  <th className="px-5 py-4">Postulante</th>
                  <th className="px-5 py-4">Matrícula</th>
                  <th className="px-5 py-4">Fecha de oferta</th>
                  <th className="px-5 py-4">Estado</th>
                  <th className="px-5 py-4">Fecha de respuesta</th>
                </tr>
              </thead>
              <tbody>
                {ofertas.map((oferta) => {
                  const badge = obtenerBadge(oferta.status, oferta.motivo_rechazo);
                  return (
                    <tr
                      key={oferta.id_formulario}
                      className={`border-b last:border-0 transition-colors ${
                        modoOscuro ? 'border-slate-800/50 hover:bg-slate-800/30' : 'border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-5 py-4">
                        <p className={`font-semibold ${tema.text}`}>{oferta.nombre_completo}</p>
                      </td>
                      <td className={`px-5 py-4 font-mono text-xs ${tema.subtitle}`}>
                        {oferta.matricula}
                      </td>
                      <td className={`px-5 py-4 text-xs ${tema.subtitle}`}>
                        {formatearFecha(oferta.fecha_oferta)}
                      </td>
                      <td className="px-5 py-4">
                        <Badge texto={badge.texto} color={badge.color} />
                      </td>
                      <td className={`px-5 py-4 text-xs ${tema.subtitle}`}>
                        {formatearFecha(oferta.fecha_respuesta)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
