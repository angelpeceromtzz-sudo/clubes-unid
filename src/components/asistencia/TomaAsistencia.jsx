/* Pase de lista mobile-first (PBI-05 §10–15, §31).
   Autoguardado backend-first: cada marca se persiste de inmediato vía PUT /registros;
   localStorage se usa solo como indicador visual del último guardado. */
import { useState } from 'react';
import { api } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';
import { Badge } from '../ui/Badge';
import { Alerta } from '../ui/Alerta';
import { BotonAccion } from '../ui/BotonAccion';
import { ModalConfirmacion } from '../ui/ModalConfirmacion';
import { Spinner } from '../ui/Spinner';
import { fechaLarga, rangoHoras } from '../../utils/fechas';
import {
  ESTADOS_SESION,
  ESTADOS_ASISTENCIA,
  claveLocalAsistencia,
} from './constantesAsistencia';

function leerMarcaLocal(idSesion) {
  try {
    const raw = localStorage.getItem(claveLocalAsistencia(idSesion));
    if (raw) return JSON.parse(raw)?.savedAt || null;
  } catch {
    /* almacenamiento no disponible */
  }
  return null;
}

export function TomaAsistencia({ sesion, onVolver, onActualizarSesion }) {
  const { modoOscuro, tema } = useTheme();
  const [integrantes, setIntegrantes] = useState(sesion.integrantes);
  const [estadoAlmacenado, setEstadoAlmacenado] = useState(sesion.estado_almacenado);
  const [modoCorreccion, setModoCorreccion] = useState(false);
  const [guardando, setGuardando] = useState(false);
  // Indicador visual del último guardado (localStorage solo presenta; el backend persiste)
  const [ultimoGuardadoAt, setUltimoGuardadoAt] = useState(() => leerMarcaLocal(sesion.id_sesion));
  const [error, setError] = useState('');
  const [modalJustificado, setModalJustificado] = useState(null);
  const [modalFinalizar, setModalFinalizar] = useState(false);
  const [modalIniciar, setModalIniciar] = useState(false);
  const [cargandoAccion, setCargandoAccion] = useState(null);
  const [resumenFinal, setResumenFinal] = useState(null);

  const total = integrantes.length;
  const registrados = integrantes.filter((i) => i.estado_asistencia !== null).length;
  const todosRegistrados = registrados === total;
  const cancelada = estadoAlmacenado === 'cancelada';
  const pendiente = estadoAlmacenado === 'pendiente';
  const completada = estadoAlmacenado === 'completada';
  const editable = !cancelada && !pendiente && (estadoAlmacenado === 'en_progreso' || (completada && modoCorreccion));

  function registrarLocal() {
    try {
      const d = new Date();
      const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      localStorage.setItem(claveLocalAsistencia(sesion.id_sesion), JSON.stringify({ savedAt: hhmm }));
      setUltimoGuardadoAt(hhmm);
    } catch {
      /* sin localStorage seguimos igual */
    }
  }

  async function guardarRegistros(registros) {
    setGuardando(true);
    setError('');
    try {
      await api.guardarRegistrosAsistencia(sesion.id_sesion, registros);
      setIntegrantes((prev) =>
        prev.map((i) => {
          const r = registros.find((x) => x.id_usuario === i.id_usuario);
          return r
            ? {
                ...i,
                estado_asistencia: r.estado,
                motivo_justificacion:
                  r.motivo_justificacion !== undefined ? r.motivo_justificacion : i.motivo_justificacion,
              }
            : i;
        })
      );
      registrarLocal();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setGuardando(false);
    }
  }

  function marcar(integrante, valor) {
    if (!editable || guardando) return;
    if (integrante.estado_asistencia === valor && valor !== 'justificado') return;

    if (valor === 'justificado') {
      setModalJustificado({
        integrante,
        motivo: integrante.motivo_justificacion || '',
      });
      return;
    }

    guardarRegistros([
      { id_usuario: integrante.id_usuario, estado: valor, motivo_justificacion: null },
    ]);
  }

  async function confirmarJustificado(motivo) {
    const { integrante } = modalJustificado;
    const ok = await guardarRegistros([
      { id_usuario: integrante.id_usuario, estado: 'justificado', motivo_justificacion: motivo },
    ]);
    if (ok) setModalJustificado(null);
  }

  async function confirmarIniciar() {
    setCargandoAccion('iniciar');
    setError('');
    try {
      await api.iniciarAsistencia(sesion.id_sesion);
      setEstadoAlmacenado('en_progreso');
      setModalIniciar(false);
    } catch (err) {
      setError(err.message);
      setModalIniciar(false);
    } finally {
      setCargandoAccion(null);
    }
  }

  async function confirmarFinalizar() {
    setCargandoAccion('finalizar');
    setError('');
    try {
      const r = await api.finalizarAsistencia(sesion.id_sesion);
      setEstadoAlmacenado('completada');
      setModoCorreccion(false);
      setResumenFinal(r.resumen || null);
      setModalFinalizar(false);
      onActualizarSesion?.({ estado: 'completada', estado_almacenado: 'completada' });
    } catch (err) {
      setError(err.message);
      setModalFinalizar(false);
    } finally {
      setCargandoAccion(null);
    }
  }

  const estadoInfo = ESTADOS_SESION[estadoAlmacenado] || ESTADOS_SESION.pendiente;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Encabezado de sesión */}
      <div className={`rounded-2xl border p-5 mb-4 ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="flex items-start gap-3">
          <button
            onClick={onVolver}
            className={`mt-0.5 p-2 -ml-2 rounded-xl cursor-pointer transition-colors ${modoOscuro ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
            aria-label="Volver a sesiones de hoy"
          >
            <Icono nombre="arrow-left" className="h-5 w-5" strokeWidth={2} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className={`text-lg font-black ${tema.title}`}>Pase de lista</h2>
              <Badge texto={estadoInfo.label} color={estadoInfo.color} />
            </div>
            <p className={`text-sm mt-1 ${tema.subtitle}`}>
              {fechaLarga(sesion.fecha)} · {rangoHoras(sesion.hora_inicio, sesion.hora_fin)}
            </p>
            <p className={`text-xs mt-0.5 ${tema.subtitle}`}>{sesion.lugar}</p>
          </div>
        </div>

        {/* Progreso */}
        {!cancelada && !pendiente && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-xs font-bold uppercase tracking-wider ${tema.subtitle}`}>
                {registrados}/{total} registrados
              </span>
              <span className="text-xs font-medium">
                {guardando ? (
                  <span className="text-amber-400 flex items-center gap-1">
                    <Spinner size="sm" className="!py-0" /> Guardando…
                  </span>
                ) : ultimoGuardadoAt ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Icono nombre="check" className="h-3.5 w-3.5" strokeWidth={2.5} /> Guardado {ultimoGuardadoAt}
                  </span>
                ) : null}
              </span>
            </div>
            <div className={`h-2 rounded-full overflow-hidden ${modoOscuro ? 'bg-slate-800' : 'bg-slate-200'}`}>
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${total > 0 ? (registrados / total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {error && <Alerta tipo="error" mensaje={error} className="mb-4" />}

      {cancelada && (
        <Alerta tipo="info" className="mb-4">
          Sesión cancelada
          {sesion.motivo_cancelacion ? ` · Motivo: ${sesion.motivo_cancelacion}` : ''}.
          No se genera asistencia ni afecta los porcentajes.
        </Alerta>
      )}

      {completada && !modoCorreccion && resumenFinal && (
        <Alerta tipo="success" className="mb-4">
          <p className="font-bold mb-1">Asistencia completada</p>
          <p>
            {resumenFinal.presentes} presente(s) · {resumenFinal.ausentes} ausente(s) ·{' '}
            {resumenFinal.justificadas} justificado(s)
          </p>
        </Alerta>
      )}

      {completada && !modoCorreccion && (
        <Alerta tipo="info" className="mb-4">
          Esta sesión ya fue finalizada{ultimoGuardadoAt ? ` (último guardado ${ultimoGuardadoAt})` : ''}.
          Puedes corregir los registros si todavía corresponde al día de la sesión.
        </Alerta>
      )}

      {/* Lista de integrantes */}
      <div className="space-y-3">
        {integrantes.map((integrante) => {
          const estado = integrante.estado_asistencia;
          return (
            <div
              key={integrante.id_usuario}
              className={`rounded-2xl border p-4 ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${tema.title}`}>{integrante.nombre_completo}</p>
                  <p className={`text-xs mt-0.5 ${tema.subtitle}`}>
                    {integrante.matricula}
                    {integrante.licenciatura ? ` · ${integrante.licenciatura}` : ''}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3">
                {ESTADOS_ASISTENCIA.map((op) => {
                  const seleccionado = estado === op.valor;
                  return (
                    <button
                      key={op.valor}
                      onClick={() => marcar(integrante, op.valor)}
                      disabled={!editable || guardando}
                      className={`py-2.5 px-1 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed ${
                        seleccionado ? op.colorSeleccion : op.colorBase
                      } ${modoOscuro && !seleccionado ? 'border-slate-600' : !seleccionado && !modoOscuro ? 'border-slate-300' : ''}`}
                    >
                      {op.label}
                    </button>
                  );
                })}
              </div>

              {estado === 'justificado' && integrante.motivo_justificacion && (
                <div className="mt-2.5 flex items-start gap-1.5 text-xs text-amber-400">
                  <Icono nombre="pencil" className="h-3.5 w-3.5 mt-0.5 shrink-0" strokeWidth={2} />
                  <span>{integrante.motivo_justificacion}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Acciones principales */}
      <div className="mt-6 space-y-3">
        {pendiente && (
          <BotonAccion
            size="lg"
            className="w-full"
            onClick={() => setModalIniciar(true)}
            disabled={cargandoAccion === 'iniciar'}
          >
            {cargandoAccion === 'iniciar' ? <Spinner size="sm" className="!py-0" /> : <Icono nombre="clipboard" className="h-4 w-4" strokeWidth={2} />}
            Tomar asistencia
          </BotonAccion>
        )}

        {completada && !modoCorreccion && (
          <BotonAccion
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => setModoCorreccion(true)}
          >
            <Icono nombre="pencil" className="h-4 w-4" strokeWidth={2} />
            Corregir asistencia
          </BotonAccion>
        )}

        {(estadoAlmacenado === 'en_progreso' || (completada && modoCorreccion)) && (
          <>
            {completada && modoCorreccion && (
              <BotonAccion
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => setModoCorreccion(false)}
              >
                Ocultar corrección
              </BotonAccion>
            )}
            <BotonAccion
              variant="success"
              size="lg"
              className="w-full"
              disabled={!todosRegistrados || guardando || cargandoAccion === 'finalizar'}
              onClick={() => setModalFinalizar(true)}
            >
              {cargandoAccion === 'finalizar' ? (
                <Spinner size="sm" color="border-black" className="!py-0" />
              ) : (
                <Icono nombre="check-circle" className="h-4 w-4" strokeWidth={2} />
              )}
              Finalizar asistencia ({registrados}/{total})
            </BotonAccion>
            {!todosRegistrados && (
              <p className={`text-xs text-center ${tema.subtitle}`}>
                Quedan {total - registrados} integrante(s) sin estado asignado.
              </p>
            )}
          </>
        )}
      </div>

      {/* Modal: confirmar inicio (§10) */}
      <ModalConfirmacion
        show={modalIniciar}
        titulo="¿Iniciar toma de asistencia?"
        mensaje="Se registrará que comenzaste la toma de asistencia correspondiente a esta sesión."
        textoConfirmar="Iniciar"
        onConfirmar={confirmarIniciar}
        onCancelar={() => setModalIniciar(false)}
        cargando={cargandoAccion === 'iniciar'}
      />

      {/* Modal: confirmar finalización (§14) */}
      <ModalConfirmacion
        show={modalFinalizar}
        titulo="¿Finalizar asistencia?"
        mensaje={`Se cerrará la toma de asistencia con ${registrados}/${total} integrantes registrados. Podrás corregir los registros durante el día de la sesión.`}
        textoConfirmar="Finalizar"
        onConfirmar={confirmarFinalizar}
        onCancelar={() => setModalFinalizar(false)}
        cargando={cargandoAccion === 'finalizar'}
      />

      {/* Modal: motivo de justificación (§12) */}
      {modalJustificado && (
        <ModalJustificado
          integrante={modalJustificado.integrante}
          motivoInicial={modalJustificado.motivo}
          onConfirmar={confirmarJustificado}
          onCancelar={() => setModalJustificado(null)}
          cargando={guardando}
        />
      )}
    </div>
  );
}

/* Modal para capturar el motivo obligatorio de un justificado. */
function ModalJustificado({ integrante, motivoInicial, onConfirmar, onCancelar, cargando }) {
  const { modoOscuro, tema } = useTheme();
  const [motivo, setMotivo] = useState(motivoInicial);
  const valido = motivo.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
      <div
        className={`rounded-2xl w-full max-w-sm p-6 border ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}
      >
        <h3 className={`text-base font-black uppercase tracking-wider mb-1 ${tema.title}`}>
          Justificación
        </h3>
        <p className={`text-sm mb-4 ${tema.subtitle}`}>
          {integrante.nombre_completo} — el motivo es obligatorio.
        </p>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
          placeholder="Ej. Cita médica, compromiso familiar…"
          className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 resize-none ${
            modoOscuro
              ? 'bg-[#18223f] border-slate-700 text-white placeholder-slate-500'
              : 'bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400'
          }`}
        />
        <div className="flex gap-3 mt-4">
          <BotonAccion variant="outline" className="flex-1" onClick={onCancelar} disabled={cargando}>
            Cancelar
          </BotonAccion>
          <BotonAccion
            className="flex-1"
            onClick={() => onConfirmar(motivo.trim())}
            disabled={!valido || cargando}
          >
            {cargando ? <Spinner size="sm" className="!py-0" /> : 'Guardar'}
          </BotonAccion>
        </div>
      </div>
    </div>
  );
}
