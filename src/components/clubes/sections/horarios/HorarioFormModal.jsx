import { Icono } from '../../../ui/Icono';
import { BotonAccion } from '../../../ui/BotonAccion';
import { SelectorMapa } from '../../../ui/SelectorMapa';
import { DIAS, DIAS_CORTO } from '../../../../constants/horario';

export function HorarioFormModal({
  show, editando, form, enviando, error, modoOscuro,
  onClose, onSubmit, onFormChange, onToggleDia,
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div className={`relative w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden
        ${modoOscuro ? 'bg-[#0e162c] border-slate-700' : 'bg-white border-slate-200'}`}
        onClick={e => e.stopPropagation()}>
        <div className={`px-5 py-4 border-b flex items-center justify-between
          ${modoOscuro ? 'border-slate-700/50' : 'border-slate-200'}`}>
          <h3 className={`text-sm font-bold ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
            {editando ? 'Editar horario' : 'Nuevo horario'}
          </h3>
          <button onClick={onClose}
            className={`p-1 rounded-lg transition-colors cursor-pointer
              ${modoOscuro ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
            <Icono nombre="close" className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-4">
          {error && (
            <div className="px-3 py-2 rounded-lg text-sm font-medium bg-red-500/10 border border-red-500/30 text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className={`text-xs font-bold uppercase tracking-wider block mb-2 ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
              Días de la semana
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {DIAS.map((dia, i) => (
                <button key={i} type="button" onClick={() => onToggleDia(i)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border
                    ${form.dias_semana.includes(i)
                      ? 'bg-amber-400 text-[#0e162c] border-amber-400'
                      : modoOscuro
                        ? 'bg-slate-800 text-slate-400 border-slate-700 hover:border-amber-400/50 hover:text-amber-400'
                        : 'bg-slate-100 text-slate-500 border-slate-200 hover:border-amber-400 hover:text-amber-600'
                    }`}>
                  {DIAS_CORTO[i]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>Hora inicio</label>
              <input type="time" value={form.hora_inicio} onChange={e => onFormChange({ ...form, hora_inicio: e.target.value })} required
                className={`w-full px-3 py-2 rounded-lg border text-sm font-medium outline-none focus:ring-2 focus:ring-amber-400/50
                  ${modoOscuro ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
            </div>
            <div>
              <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>Hora fin</label>
              <input type="time" value={form.hora_fin} onChange={e => onFormChange({ ...form, hora_fin: e.target.value })} required
                className={`w-full px-3 py-2 rounded-lg border text-sm font-medium outline-none focus:ring-2 focus:ring-amber-400/50
                  ${modoOscuro ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
            </div>
          </div>

          <div>
            <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>Lugar</label>
            <input type="text" value={form.lugar} onChange={e => onFormChange({ ...form, lugar: e.target.value })} required
              placeholder="Ej: Cancha 1, Gimnasio..."
              className={`w-full px-3 py-2 rounded-lg border text-sm font-medium outline-none focus:ring-2 focus:ring-amber-400/50
                ${modoOscuro ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'}`} />
          </div>

          <div className="space-y-2">
            <label className={`text-xs font-bold uppercase tracking-wider block ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
              Ubicación Maps <span className="font-normal">(opcional)</span>
            </label>
            <SelectorMapa
              valorLugar={form.lugar}
              valorUbicacion={form.ubicacion_maps}
              modoOscuro={modoOscuro}
              onCambio={({ lugar, ubicacion_maps }) => onFormChange({
                ...form,
                lugar: form.lugar || lugar,
                ubicacion_maps,
              })}
            />
            <input type="url" value={form.ubicacion_maps} onChange={e => onFormChange({ ...form, ubicacion_maps: e.target.value })}
              placeholder="O pega un link manual: https://maps.google.com/?q=..."
              className={`w-full px-3 py-2 rounded-lg border text-sm font-medium outline-none focus:ring-2 focus:ring-amber-400/50
                ${modoOscuro ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'}`} />
          </div>

          <div>
            <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
              Notas <span className="font-normal">(opcional)</span>
            </label>
            <textarea value={form.descripcion} onChange={e => onFormChange({ ...form, descripcion: e.target.value })}
              rows={2} maxLength={100} placeholder="Instrucciones, material, etc."
              className={`w-full px-3 py-2 rounded-lg border text-sm font-medium outline-none focus:ring-2 focus:ring-amber-400/50 resize-none
                ${modoOscuro ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'}`} />
            <p className={`text-[10px] mt-1 text-right ${modoOscuro ? 'text-slate-600' : 'text-slate-400'}`}>
              {form.descripcion.length}/100
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <BotonAccion type="submit" disabled={enviando} variant="primary" size="sm">
              {enviando ? 'Guardando...' : editando ? 'Actualizar' : 'Agregar'}
            </BotonAccion>
            <BotonAccion onClick={onClose} variant="outline" size="sm">Cancelar</BotonAccion>
          </div>
        </form>
      </div>
    </div>
  );
}
