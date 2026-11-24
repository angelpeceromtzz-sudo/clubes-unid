import { useEffect, useState } from 'react';
import { listarReportesAdmin, actualizarReporteAdmin } from '../../../services/reportes';

const ESTADOS = ['Pendiente', 'En revisión', 'Resuelto', 'Cerrado'];

export function SeccionReportesAdmin() {
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [savingId, setSavingId] = useState(null);

  async function cargar() {
    setLoading(true);
    setError('');
    try {
      const data = await listarReportesAdmin(filtroEstado ? { estado: filtroEstado } : {});
      setReportes(data?.reportes || []);
    } catch (e) {
      setError(e?.message || 'No se pudieron cargar los reportes.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroEstado]);

  async function cambiarEstado(idReporte, nuevoEstado) {
    setSavingId(idReporte);
    try {
      await actualizarReporteAdmin(idReporte, { estado: nuevoEstado });
      await cargar();
    } catch (e) {
      alert(e?.message || 'No se pudo actualizar el estado.');
    } finally {
      setSavingId(null);
    }
  }

  async function guardarNotas(idReporte, notas) {
    setSavingId(idReporte);
    try {
      await actualizarReporteAdmin(idReporte, { notas_admin: notas });
      await cargar();
    } catch (e) {
      alert(e?.message || 'No se pudieron guardar las notas.');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black">Reportes / Incidencias</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Reportes enviados por usuarios. Solo visible para administración.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Estado</label>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="rounded-xl border border-slate-700 bg-[#0e162c] text-white px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

      {loading ? (
        <p className="text-sm text-slate-400">Cargando reportes...</p>
      ) : reportes.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-[#0e162c]/40 p-8 text-center text-slate-400 text-sm">
          No hay reportes para mostrar.
        </div>
      ) : (
        <div className="space-y-4">
          {reportes.map((r) => (
            <div key={r.id_reporte} className="rounded-2xl border border-slate-800 bg-[#0e162c]/40 p-5 space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                <div>
                  <p className="text-xs text-amber-500 font-black tracking-wider">{r.folio}</p>
                  <h3 className="font-bold text-lg mt-1">{r.tipo}</h3>
                  <p className="text-sm text-slate-400 mt-1">Módulo: {r.modulo} · Importancia: {r.importancia}</p>
                  <p className="text-xs text-slate-500 mt-1">Contacto: {r.correo_contacto} · {new Date(r.creado_en).toLocaleString('es-MX')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={r.estado}
                    disabled={savingId === r.id_reporte}
                    onChange={(e) => cambiarEstado(r.id_reporte, e.target.value)}
                    className="rounded-xl border border-slate-700 bg-[#0b111e] text-white px-3 py-2 text-sm"
                  >
                    {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="text-sm space-y-2">
                <p><span className="font-bold text-slate-300">Descripción:</span> {r.descripcion}</p>
                {r.pasos && <p><span className="font-bold text-slate-300">Pasos:</span> {r.pasos}</p>}
                {r.captura_url && (
                  <p>
                    <span className="font-bold text-slate-300">Captura:</span>{' '}
                    <a href={r.captura_url} target="_blank" rel="noreferrer" className="text-amber-500 hover:underline">Ver imagen</a>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Notas admin</label>
                <textarea
                  defaultValue={r.notas_admin || ''}
                  onBlur={(e) => {
                    const val = e.target.value;
                    if (val !== (r.notas_admin || '')) guardarNotas(r.id_reporte, val);
                  }}
                  rows={2}
                  className="w-full rounded-xl border border-slate-700 bg-[#0b111e] text-white px-3 py-2 text-sm"
                  placeholder="Notas internas..."
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
