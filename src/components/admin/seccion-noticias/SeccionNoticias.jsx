/* Sección de gestión de noticias y eventos para admin, rectoría y el
   responsable del mural.

   Recibe el objeto que devuelve `useAdminNoticias` (llamado `gestion`) porque
   el flujo de aprobación (PBI-17) movió la cantidad de estado que la sección
   necesita: pestañas por estado, botones de revisión, modal de rechazo… */
import { useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Icono } from '../../ui/Icono';
import { TablaNoticiasDesktop } from './TablaNoticiasDesktop';
import { TarjetasNoticiasMobile } from './TarjetasNoticiasMobile';
import { ModalFormularioNoticia } from './ModalFormularioNoticia';
import { ModalRechazoNoticia } from './ModalRechazoNoticia';
import { FILTROS_ESTADO, ETIQUETAS_ESTADO } from '../../../constants/noticias';

export function SeccionNoticias({ gestion }) {
  const { modoOscuro, tableBg, thCls, tdCls, tdTitle, labelCls, tema } = useTheme();
  const [tipoSeccion, setTipoSeccion] = useState('noticia');
  const esEvento = tipoSeccion === 'evento';

  const {
    noticias,
    noticiasFiltradas,
    contadores,
    filtroEstado,
    setFiltroEstado,
    cargando,
    busqueda,
    setBusqueda,
    showModal,
    editando,
    form,
    enviando,
    errorModal,
    esAprobador,
    idRol,
    abrirModalCrear,
    abrirModalEditar,
    cerrarModal,
    enviarRevision,
    aprobar,
    ocultar,
    rechazo,
    abrirRechazo,
    cerrarRechazo,
    setMotivoRechazo,
    confirmarRechazo,
    eliminar,
    guardar,
    handleFormChange,
    subirImagen,
  } = gestion;

  const publicaciones = noticias.filter((n) => (n.categoria === 'evento') === esEvento);
  const publicacionesFiltradas = noticiasFiltradas.filter((n) => (n.categoria === 'evento') === esEvento);
  const etiquetaFiltro = FILTROS_ESTADO.find((f) => f.valor === filtroEstado)?.etiqueta;
  const puedeRevisar = esAprobador && contadores.pending > 0;
  const tieneRechazadas = !esAprobador && contadores.rejected > 0;

  const acciones = {
    onEnviarRevision: enviarRevision,
    onAprobar: aprobar,
    onRechazar: abrirRechazo,
    onOcultar: ocultar,
    onEditar: abrirModalEditar,
    onEliminar: eliminar,
  };

  return (
    <div>
      <div className={`mb-5 inline-flex rounded-xl border p-1 ${modoOscuro ? 'border-slate-700 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`} role="tablist" aria-label="Tipo de publicación">
        {[{ value: 'noticia', label: 'Noticias' }, { value: 'evento', label: 'Eventos' }].map((opcion) => (
          <button
            key={opcion.value}
            type="button"
            role="tab"
            aria-selected={tipoSeccion === opcion.value}
            onClick={() => setTipoSeccion(opcion.value)}
            className={`rounded-lg px-4 py-2 text-xs font-black transition-colors cursor-pointer ${tipoSeccion === opcion.value
              ? 'bg-amber-400 text-slate-950 shadow-sm'
              : modoOscuro ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-950'}`}
          >{opcion.label}</button>
        ))}
      </div>

      {/* Pestañas por estado del flujo de aprobación (PBI-17). */}
      <div className="flex flex-wrap gap-2 mb-4" role="tablist" aria-label="Estado de publicación">
        {FILTROS_ESTADO.map((opcion) => {
          const activa = filtroEstado === opcion.valor;
          const total = contadores[opcion.valor] ?? 0;
          const resaltada = opcion.valor === 'pending' && esAprobador && total > 0;
          return (
            <button
              key={opcion.valor}
              type="button"
              role="tab"
              aria-selected={activa}
              onClick={() => setFiltroEstado(opcion.valor)}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                activa
                  ? 'border-amber-400 bg-amber-400 text-slate-950 shadow-sm'
                  : resaltada
                    ? 'border-amber-400/50 bg-amber-400/10 text-amber-400 hover:bg-amber-400/20'
                    : modoOscuro ? 'border-slate-700 bg-[#18223f] text-slate-400 hover:text-slate-200' : 'border-slate-200 bg-white text-slate-500 hover:text-slate-800'
              }`}
            >
              {opcion.etiqueta}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none ${
                activa ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-500/20 text-slate-400'
              }`}>{total}</span>
            </button>
          );
        })}
      </div>

      {/* Rectoría: aviso de lo que está esperando aprobación. */}
      {puedeRevisar && filtroEstado !== 'pending' && (
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3">
          <p className="text-xs font-bold text-amber-400 flex items-center gap-2">
            <Icono nombre="clock" strokeWidth={2} className="h-4 w-4 shrink-0" />
            {contadores.pending === 1 ? '1 noticia espera' : `${contadores.pending} noticias esperan`} tu aprobación antes de publicarse.
          </p>
          <button
            type="button"
            onClick={() => setFiltroEstado('pending')}
            className="self-start sm:self-auto shrink-0 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-amber-400 hover:bg-amber-400/20 transition-colors cursor-pointer active:scale-95"
          >
            Ver pendientes
          </button>
        </div>
      )}

      {/* Redactores (admin / responsable): aviso de lo que rectoría devolvió. */}
      {tieneRechazadas && filtroEstado !== 'rejected' && (
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3">
          <p className="text-xs font-bold text-red-400 flex items-center gap-2">
            <Icono nombre="alert-triangle" strokeWidth={2} className="h-4 w-4 shrink-0" />
            {contadores.rejected === 1 ? '1 publicación fue rechazada' : `${contadores.rejected} publicaciones fueron rechazadas`}. Revisa el motivo, corrige y vuelve a enviarlas.
          </p>
          <button
            type="button"
            onClick={() => setFiltroEstado('rejected')}
            className="self-start sm:self-auto shrink-0 rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-red-400 hover:bg-red-400/20 transition-colors cursor-pointer active:scale-95"
          >
            Ver rechazadas
          </button>
        </div>
      )}

      <p className={`text-sm mb-3 ${tema.subtitle}`}>
        {publicacionesFiltradas.length} de {publicaciones.length}{' '}
        {publicaciones.length === 1 ? (esEvento ? 'evento registrado' : 'noticia registrada') : (esEvento ? 'eventos registrados' : 'noticias registradas')}
        {filtroEstado !== 'todos' && ` · ${etiquetaFiltro}`}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Icono nombre="search" strokeWidth={2} className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`} />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por título o contenido..."
            className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-amber-400/50 ${
              modoOscuro
                ? 'bg-[#0e162c] border-slate-700 text-slate-200 placeholder-slate-500'
                : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
            }`}
          />
        </div>
        <button
          onClick={() => abrirModalCrear(esEvento ? 'evento' : 'informativo')}
          className="flex-1 sm:flex-none font-black text-xs uppercase tracking-widest rounded-xl px-5 py-3 transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-center gap-2 shrink-0 bg-amber-400 hover:bg-amber-500 text-[#0e162c]"
        >
          <Icono nombre="plus" strokeWidth={2} className="h-4 w-4" />
          {esAprobador ? (esEvento ? 'Agregar Evento' : 'Publicar Noticia') : (esEvento ? 'Nuevo Evento' : 'Nueva Noticia')}
        </button>
      </div>

      {cargando ? (
        <p className={`text-sm py-8 text-center ${tema.subtitle}`}>Cargando {esEvento ? 'eventos' : 'noticias'}...</p>
      ) : publicacionesFiltradas.length === 0 ? (
        <p className={`text-sm py-8 text-center ${tema.subtitle}`}>
          {busqueda
            ? 'No hay publicaciones que coincidan con la búsqueda.'
            : filtroEstado !== 'todos'
              ? `No hay ${esEvento ? 'eventos' : 'noticias'} en «${ETIQUETAS_ESTADO[filtroEstado] || etiquetaFiltro}».`
              : esEvento ? 'Aún no has agregado eventos.' : 'Aún no has publicado noticias.'}
        </p>
      ) : (
        <>
          <TablaNoticiasDesktop
            noticias={publicacionesFiltradas}
            modoOscuro={modoOscuro}
            tableBg={tableBg}
            thCls={thCls}
            tdCls={tdCls}
            tdTitle={tdTitle}
            idRol={idRol}
            {...acciones}
          />

          <TarjetasNoticiasMobile
            noticias={publicacionesFiltradas}
            modoOscuro={modoOscuro}
            tdTitle={tdTitle}
            tdCls={tdCls}
            idRol={idRol}
            {...acciones}
          />
        </>
      )}

      <ModalFormularioNoticia
        show={showModal}
        editando={editando}
        form={form}
        enviando={enviando}
        errorModal={errorModal}
        modoOscuro={modoOscuro}
        tema={tema}
        labelCls={labelCls}
        esAprobador={esAprobador}
        onClose={cerrarModal}
        onGuardar={guardar}
        onFormChange={handleFormChange}
        onSubirImagen={subirImagen}
        tipoSeccion={tipoSeccion}
      />

      <ModalRechazoNoticia
        show={!!rechazo}
        noticia={rechazo?.noticia}
        motivo={rechazo?.motivo ?? ''}
        enviando={rechazo?.enviando ?? false}
        error={rechazo?.error ?? ''}
        modoOscuro={modoOscuro}
        tema={tema}
        onMotivoChange={setMotivoRechazo}
        onConfirmar={confirmarRechazo}
        onCerrar={cerrarRechazo}
      />
    </div>
  );
}
