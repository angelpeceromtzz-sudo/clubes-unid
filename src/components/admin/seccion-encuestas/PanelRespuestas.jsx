// Panel de respuestas individuales de una encuesta.
//
// Muestra el historial de respuestas (fecha y hora) y, al seleccionar una,
// despliega las respuestas individuales. La licenciatura es la primera
// respuesta registrada.
import { useEffect, useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { api } from '../../../services/api';
import { encuestaService } from '../../../services/encuesta.service';
import { Icono } from '../../ui/Icono';
import { Spinner } from '../../ui/Spinner';
import { Alerta } from '../../ui/Alerta';

function formatearFecha(iso) {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'medium' });
}

function valorRespuesta(resp) {
  if (resp.opcion) return resp.opcion;
  if (resp.texto_otro) return `${resp.opcion ? '' : ''}${resp.texto_otro}`.trim() || resp.texto_otro;
  if (resp.texto != null) return resp.texto;
  if (resp.numero != null) return String(resp.numero);
  return '—';
}

export function PanelRespuestas({ idEncuesta }) {
  const { tema, modoOscuro } = useTheme();
  const [respuestas, setRespuestas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [seleccionada, setSeleccionada] = useState(null);
  const [eliminando, setEliminando] = useState(null);
  const [filtroFecha, setFiltroFecha] = useState('');

  // Días con respuestas (para filtrar sin calendario completo).
  const diasConRespuestas = Array.from(
    new Set(
      respuestas
        .map((r) => (r.fecha_envio ? r.fecha_envio.slice(0, 10) : ''))
        .filter(Boolean)
    )
  ).sort().reverse();

  const respuestasFiltradas = filtroFecha
    ? respuestas.filter((r) => r.fecha_envio && r.fecha_envio.startsWith(filtroFecha))
    : respuestas;

  const eliminar = async (idRespuesta) => {
    const password = window.prompt('Ingresa la contraseña de administrador para eliminar la respuesta:');
    if (!password) return;
    setEliminando(idRespuesta);
    try {
      await encuestaService.eliminarRespuesta(idEncuesta, idRespuesta, password);
      setRespuestas((prev) => prev.filter((r) => r.id_respuesta !== idRespuesta));
      if (seleccionada === idRespuesta) setSeleccionada(null);
    } catch (err) {
      setError(err?.message || 'No se pudo eliminar la respuesta');
    } finally {
      setEliminando(null);
    }
  };

  useEffect(() => {
    if (!idEncuesta) return;
    let cancelado = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCargando(true);
    setError('');
    api.get(`/encuestas/admin/${idEncuesta}/respuestas`)
      .then((data) => {
        if (cancelado) return;
        setRespuestas(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (cancelado) return;
        setError(err?.message || 'No se pudieron cargar las respuestas');
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => { cancelado = true; };
  }, [idEncuesta]);

  if (cargando) return <Spinner size="md" />;
  if (error) return <Alerta tipo="error" mensaje={error} />;

  if (!respuestas.length) {
    return <p className={`text-sm py-8 text-center ${tema.subtitle}`}>Aún no hay respuestas registradas.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
        <p className={`text-sm ${tema.subtitle}`}>
          {respuestasFiltradas.length} {respuestasFiltradas.length === 1 ? 'respuesta' : 'respuestas'}
          {filtroFecha ? ` del ${filtroFecha}` : ''}
        </p>

        {diasConRespuestas.length > 1 && (
          <select
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
            className={`sm:ml-auto border rounded-lg px-3 py-1.5 text-sm font-semibold cursor-pointer ${
              modoOscuro
                ? 'border-slate-700 bg-[#18223f] text-white'
                : 'border-slate-300 bg-white text-slate-900'
            }`}
            aria-label="Filtrar por día"
          >
            <option value="">Todos los días</option>
            {diasConRespuestas.map((dia) => (
              <option key={dia} value={dia}>{dia}</option>
            ))}
          </select>
        )}
      </div>

      <ul className="space-y-2">
        {respuestasFiltradas.map((r) => {
          const abierta = seleccionada === r.id_respuesta;
          return (
            <li key={r.id_respuesta} className={`${tema.cardCls ?? ''} border rounded-2xl overflow-hidden`}>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setSeleccionada(abierta ? null : r.id_respuesta)}
                  className="flex-1 flex items-center justify-between gap-3 px-4 py-3 text-left min-w-0"
                >
                  <div className="min-w-0">
                    <p className={`text-sm font-bold ${tema.title}`}>
                      {r.licenciatura || 'Sin programa'}
                    </p>
                    <p className={`text-[11px] ${tema.subtitle}`}>{formatearFecha(r.fecha_envio)}</p>
                  </div>
                  <Icono nombre={abierta ? 'chevron-up' : 'chevron-down'} className="h-4 w-4 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => eliminar(r.id_respuesta)}
                  disabled={eliminando === r.id_respuesta}
                  className="shrink-0 p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                  aria-label="Eliminar respuesta"
                  title="Eliminar respuesta"
                >
                  <Icono nombre="trash" className="h-4 w-4" />
                </button>
              </div>

              {abierta && (
                <div className="px-4 pb-4 space-y-2 border-t border-slate-700/30">
                  {r.respuestas.map((resp) => (
                    <div key={resp.id_pregunta} className="pt-2">
                      <p className={`text-xs font-bold ${tema.subtitle}`}>{resp.pregunta}</p>
                      <p className={`text-sm ${tema.title}`}>{valorRespuesta(resp)}</p>
                    </div>
                  ))}
                  {r.respuestas.length === 0 && (
                    <p className={`text-sm ${tema.subtitle} py-2`}>Sin detalle de respuestas.</p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
