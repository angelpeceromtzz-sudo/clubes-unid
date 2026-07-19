/* Sección de gestión de diapositivas del hero: tabla con CRUD y modal de creación/edición. */
import { useRef, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';
import { Badge } from '../ui/Badge';
import { ModalBase } from '../ui/ModalBase';
import { CampoTexto } from '../ui/CampoTexto';
import { BotonAccion } from '../ui/BotonAccion';
import { Spinner } from '../ui/Spinner';
import { obtenerUrlImagen } from '../../utils/imagen';

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
}) {
  const { modoOscuro, tableBg, thCls, tdCls, tdTitle, inputCls, labelCls, tema } = useTheme();
  const fileInputRef = useRef(null);
  const [subiendoImg, setSubiendoImg] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendoImg(true);
    try {
      await subirImagen(file);
    } finally {
      setSubiendoImg(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className={`text-sm ${tema.subtitle}`}>{diapositivas.length} diapositivas registradas</p>
        <button
          onClick={abrirModalCrear}
          className="bg-amber-400 hover:bg-amber-500 text-[#0e162c] font-black text-xs uppercase tracking-widest rounded-xl px-5 py-2.5 transition-all duration-200 cursor-pointer active:scale-95 flex items-center gap-2"
        >
          <Icono nombre="plus" strokeWidth={2} className="h-4 w-4" />
          Agregar Diapositiva
        </button>
      </div>

      <div className="mb-4">
        <div className="relative">
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
      </div>

      {/* Desktop - tabla */}
      <div className={`${tableBg} rounded-2xl overflow-hidden hidden md:block`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b text-left ${modoOscuro ? 'border-slate-700/50' : 'border-slate-200'}`}>
                <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>ID</th>
                <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Imagen</th>
                <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Título</th>
                <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Orden</th>
                <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Alineación</th>
                <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Estado</th>
                <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {diapositivasFiltradas.map((d) => (
                <tr key={d.id_diapositiva} className={`border-b transition-colors ${modoOscuro ? 'border-slate-800/50 hover:bg-slate-800/30' : 'border-slate-100 hover:bg-slate-50'}`}>
                  <td className={`px-5 py-4 font-mono text-xs ${tdCls}`}>{d.id_diapositiva}</td>
                  <td className="px-5 py-4">
                    <div className="w-16 h-10 rounded-lg overflow-hidden bg-slate-800/30">
                      <img
                        src={obtenerUrlImagen(d.url_imagen)}
                        alt={d.titulo}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </td>
                  <td className={`px-5 py-4 font-medium ${tdTitle}`}>{d.titulo}</td>
                  <td className={`px-5 py-4 ${tdCls}`}>{d.orden}</td>
                  <td className={`px-5 py-4 ${tdCls}`}>{d.alineacion}</td>
                  <td className="px-5 py-4">
                    <Badge texto={d.activa ? 'Activa' : 'Inactiva'} color={d.activa ? 'emerald' : 'slate'} size="md" />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleActiva(d)}
                        className={`text-xs font-bold px-2 py-1.5 rounded-lg border cursor-pointer active:scale-95 transition-colors ${
                          d.activa
                            ? 'text-amber-400 border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20'
                            : 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10 hover:bg-emerald-400/20'
                        }`}
                        title={d.activa ? 'Desactivar' : 'Activar'}
                      >
                        {d.activa ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        onClick={() => abrirModalEditar(d)}
                        className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors px-2 py-1.5 rounded-lg border border-indigo-400/30 bg-indigo-400/10 cursor-pointer active:scale-95 flex items-center gap-1"
                        title="Editar"
                      >
                        <Icono nombre="edit" strokeWidth={2} className="h-4 w-4" />
                        Editar
                      </button>
                      <button
                        onClick={() => eliminar(d)}
                        className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors px-2 py-1.5 rounded-lg border border-red-400/30 bg-red-400/10 cursor-pointer active:scale-95"
                        title="Eliminar"
                      >
                        <Icono nombre="trash" strokeWidth={2} className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile - tarjetas */}
      <div className="space-y-2 md:hidden">
        {diapositivasFiltradas.map((d) => (
          <div key={d.id_diapositiva} className={`rounded-xl border p-3 ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-14 h-10 rounded-lg overflow-hidden bg-slate-800/30 shrink-0">
                <img src={obtenerUrlImagen(d.url_imagen)} alt={d.titulo} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${tdTitle}`}>{d.titulo}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] ${tdCls}`}>Orden: {d.orden}</span>
                  <span className={`text-[10px] ${tdCls}`}>{d.alineacion}</span>
                </div>
              </div>
              <Badge texto={d.activa ? 'Activa' : 'Inactiva'} color={d.activa ? 'emerald' : 'slate'} size="sm" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => toggleActiva(d)}
                className={`text-xs font-bold px-2 py-1.5 rounded-lg border cursor-pointer active:scale-95 transition-colors ${
                  d.activa
                    ? 'text-amber-400 border-amber-400/30 bg-amber-400/10'
                    : 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10'
                }`}
              >
                {d.activa ? 'Desactivar' : 'Activar'}
              </button>
              <button
                onClick={() => abrirModalEditar(d)}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors px-2 py-1.5 rounded-lg border border-indigo-400/30 bg-indigo-400/10 cursor-pointer active:scale-95 flex items-center gap-1"
              >
                <Icono nombre="edit" strokeWidth={2} className="h-4 w-4" />
                Editar
              </button>
              <button
                onClick={() => eliminar(d)}
                className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors px-2 py-1.5 rounded-lg border border-red-400/30 bg-red-400/10 cursor-pointer active:scale-95"
              >
                <Icono nombre="trash" strokeWidth={2} className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal crear/editar */}
      <ModalBase show={showModal} onClose={cerrarModal} maxWidth="max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-lg font-black uppercase tracking-wider ${tema.title}`}>
            {editando ? 'Editar Diapositiva' : 'Nueva Diapositiva'}
          </h2>
          <button
            onClick={cerrarModal}
            className={`transition-colors cursor-pointer ${modoOscuro ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
          >
            <Icono nombre="close" strokeWidth={2} className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={guardar} className="space-y-4">
          <CampoTexto label="Título" name="titulo" value={form.titulo} onChange={handleFormChange} placeholder="Ej: Bienvenidos a la manada" required />

          <CampoTexto label="Subtítulo" name="subtitulo" value={form.subtitulo} onChange={handleFormChange} placeholder="Texto secundario (opcional)" />

          <div>
            <label className={labelCls}>Alineación del texto</label>
            <select name="alineacion" value={form.alineacion} onChange={handleFormChange} className={inputCls}>
              <option value="izquierda">Izquierda</option>
              <option value="centro">Centro</option>
              <option value="derecha">Derecha</option>
            </select>
          </div>

          <CampoTexto label="Orden" name="orden" value={form.orden} onChange={handleFormChange} type="number" placeholder="0" />

          <div>
            <label className={labelCls}>Imagen <span className="text-red-400">*</span></label>
            <div className="flex items-center gap-3 mt-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="hidden"
                id="hero-image-upload"
              />
              <label
                htmlFor="hero-image-upload"
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer text-sm font-semibold transition-colors ${modoOscuro ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
              >
                <Icono nombre="upload" className="h-4 w-4" strokeWidth={2} />
                Seleccionar archivo
              </label>
              {subiendoImg && <Spinner size="sm" color="border-amber-400" className="!py-0" />}
              {!subiendoImg && form.url_imagen && (
                <span className="text-xs text-emerald-400 font-semibold">Imagen seleccionada</span>
              )}
              {!subiendoImg && !form.url_imagen && (
                <span className="text-xs text-slate-500">Ningún archivo seleccionado</span>
              )}
            </div>
            {!form.url_imagen && !subiendoImg && !editando && (
              <p className="text-red-400 text-xs mt-1 font-medium">La imagen es obligatoria</p>
            )}
          </div>

          {form.url_imagen && (
            <div className="relative w-full h-32 rounded-lg overflow-hidden">
              <img
                src={obtenerUrlImagen(form.url_imagen)}
                alt="Vista previa"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {errorModal && <p className="text-red-400 text-xs font-medium">{errorModal}</p>}

          <div className="flex gap-3 pt-2">
            <BotonAccion onClick={cerrarModal} variant="outline" size="md" className="flex-1">
              Cancelar
            </BotonAccion>
            <BotonAccion type="submit" disabled={enviando} variant="primary" size="md" className="flex-1">
              {enviando ? (
                <>
                  <Spinner size="sm" color="border-[#0e162c]" className="!py-0" />
                  {editando ? 'Guardando...' : 'Creando...'}
                </>
              ) : (
                editando ? 'Guardar Cambios' : 'Crear Diapositiva'
              )}
            </BotonAccion>
          </div>
        </form>
      </ModalBase>
    </div>
  );
}
