/* Sección de gestión de banners principales: tabla con CRUD y modal de creación/edición. */
import { useTheme } from '../../../contexts/ThemeContext';
import { Icono } from '../../ui/Icono';
import { TablaDiapositivasDesktop } from './TablaDiapositivasDesktop';
import { TarjetasDiapositivasMobile } from './TarjetasDiapositivasMobile';
import { ModalFormularioDiapositiva } from './ModalFormularioDiapositiva';

export function SeccionDiapositivas({
  diapositivas,
  diapositivasFiltradas,
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
  toggleActiva,
  eliminar,
  guardar,
  handleFormChange,
  subirImagen,
  posicionesDisponibles,
  maxBanners,
}) {
  const { modoOscuro, tableBg, thCls, tdCls, tdTitle, inputCls, labelCls, tema } = useTheme();

  const limiteAlcanzado = !editando && posicionesDisponibles.length === 0;

  return (
    <div>
      <p className={`text-sm mb-3 ${tema.subtitle}`}>{diapositivas.length} de {maxBanners} banners registrados</p>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Icono nombre="search" strokeWidth={2} className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`} />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por título..."
            className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-amber-400/50 ${
              modoOscuro
                ? 'bg-[#0e162c] border-slate-700 text-slate-200 placeholder-slate-500'
                : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
            }`}
          />
        </div>
        <button
          onClick={abrirModalCrear}
          disabled={limiteAlcanzado}
          className={`flex-1 sm:flex-none font-black text-xs uppercase tracking-widest rounded-xl px-5 py-3 transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-center gap-2 shrink-0 ${
            limiteAlcanzado
              ? 'bg-slate-600 text-slate-400 cursor-not-allowed active:scale-100'
              : 'bg-amber-400 hover:bg-amber-500 text-[#0e162c]'
          }`}
        >
          <Icono nombre="plus" strokeWidth={2} className="h-4 w-4" />
          Agregar Banner
        </button>
      </div>
      {limiteAlcanzado && (
        <p className={`text-xs mb-4 ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>
          Límite de {maxBanners} banners alcanzado. Elimina uno para agregar otro.
        </p>
      )}

      <TablaDiapositivasDesktop
        diapositivas={diapositivasFiltradas}
        modoOscuro={modoOscuro}
        tableBg={tableBg}
        thCls={thCls}
        tdCls={tdCls}
        tdTitle={tdTitle}
        onToggle={toggleActiva}
        onEditar={abrirModalEditar}
        onEliminar={eliminar}
      />

      <TarjetasDiapositivasMobile
        diapositivas={diapositivasFiltradas}
        modoOscuro={modoOscuro}
        tdTitle={tdTitle}
        tdCls={tdCls}
        onToggle={toggleActiva}
        onEditar={abrirModalEditar}
        onEliminar={eliminar}
      />

      <ModalFormularioDiapositiva
        show={showModal}
        editando={editando}
        form={form}
        enviando={enviando}
        errorModal={errorModal}
        modoOscuro={modoOscuro}
        tema={tema}
        labelCls={labelCls}
        inputCls={inputCls}
        posicionesDisponibles={posicionesDisponibles}
        onClose={cerrarModal}
        onGuardar={guardar}
        onFormChange={handleFormChange}
        onSubirImagen={subirImagen}
      />
    </div>
  );
}
