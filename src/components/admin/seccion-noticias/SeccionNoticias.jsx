/* Sección de gestión de noticias: buscador, alta con modal y listado con publicador/eliminar. */
import { useTheme } from '../../../contexts/ThemeContext';
import { Icono } from '../../ui/Icono';
import { TablaNoticiasDesktop } from './TablaNoticiasDesktop';
import { TarjetasNoticiasMobile } from './TarjetasNoticiasMobile';
import { ModalFormularioNoticia } from './ModalFormularioNoticia';

export function SeccionNoticias({
  noticias,
  noticiasFiltradas,
  cargando,
  busqueda,
  setBusqueda,
  showModal,
  editando,
  form,
  enviando,
  errorModal,
  abrirModalCrear,
  abrirModalEditar,
  cerrarModal,
  togglePublicada,
  eliminar,
  guardar,
  handleFormChange,
  subirImagen,
}) {
  const { modoOscuro, tableBg, thCls, tdCls, tdTitle, labelCls, tema } = useTheme();

  return (
    <div>
      <p className={`text-sm mb-3 ${tema.subtitle}`}>
        {noticias.length} {noticias.length === 1 ? 'noticia registrada' : 'noticias registradas'}
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
          onClick={abrirModalCrear}
          className="flex-1 sm:flex-none font-black text-xs uppercase tracking-widest rounded-xl px-5 py-3 transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-center gap-2 shrink-0 bg-amber-400 hover:bg-amber-500 text-[#0e162c]"
        >
          <Icono nombre="plus" strokeWidth={2} className="h-4 w-4" />
          Publicar Noticia
        </button>
      </div>

      {cargando ? (
        <p className={`text-sm py-8 text-center ${tema.subtitle}`}>Cargando noticias...</p>
      ) : noticiasFiltradas.length === 0 ? (
        <p className={`text-sm py-8 text-center ${tema.subtitle}`}>
          {busqueda ? 'No hay noticias que coincidan con la búsqueda.' : 'Aún no has publicado noticias.'}
        </p>
      ) : (
        <>
          <TablaNoticiasDesktop
            noticias={noticiasFiltradas}
            modoOscuro={modoOscuro}
            tableBg={tableBg}
            thCls={thCls}
            tdCls={tdCls}
            tdTitle={tdTitle}
            onToggle={togglePublicada}
            onEditar={abrirModalEditar}
            onEliminar={eliminar}
          />

          <TarjetasNoticiasMobile
            noticias={noticiasFiltradas}
            modoOscuro={modoOscuro}
            tdTitle={tdTitle}
            tdCls={tdCls}
            onToggle={togglePublicada}
            onEditar={abrirModalEditar}
            onEliminar={eliminar}
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
        onClose={cerrarModal}
        onGuardar={guardar}
        onFormChange={handleFormChange}
        onSubirImagen={subirImagen}
      />
    </div>
  );
}
