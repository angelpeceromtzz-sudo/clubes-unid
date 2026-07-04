import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Badge } from '../ui/Badge';
import { Spinner } from '../ui/Spinner';
import { BotonAccion } from '../ui/BotonAccion';
import { BloqueEditForm } from './bloques-horarios/BloqueEditForm';

function BloqueHeader({ bloque, totalAlumnos, enviada }) {
  const { modoOscuro } = useTheme();
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black shrink-0">
          {bloque}
        </div>
        <div>
          <h3 className={`text-base font-black uppercase tracking-wider ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
            Bloque {bloque}
          </h3>
          <p className="text-xs text-slate-500">{totalAlumnos} alumno{totalAlumnos !== 1 ? 's' : ''}</p>
        </div>
      </div>
      {enviada && <Badge texto="Enviada" color="emerald" />}
    </div>
  );
}

function BloqueInfoGrid({ fecha, hora, lugar }) {
  const { modoOscuro } = useTheme();
  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      <div className={`rounded-xl p-3 ${modoOscuro ? 'bg-[#18223f]' : 'bg-slate-100'}`}>
        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Fecha</p>
        <p className={`text-sm font-semibold ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
          {fecha ? new Date(fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : '—'}
        </p>
      </div>
      <div className={`rounded-xl p-3 ${modoOscuro ? 'bg-[#18223f]' : 'bg-slate-100'}`}>
        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Hora</p>
        <p className={`text-sm font-semibold ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
          {hora ? hora.slice(0, 5) : '—'}
        </p>
      </div>
      <div className={`rounded-xl p-3 ${modoOscuro ? 'bg-[#18223f]' : 'bg-slate-100'}`}>
        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Lugar</p>
        <p className={`text-sm font-semibold ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
          {lugar || '—'}
        </p>
      </div>
    </div>
  );
}

function BloqueActions({ editando, guardando, enviando, completo, onToggleEdit, onEnviar, onImprimir }) {
  const { modoOscuro } = useTheme();
  return (
    <div className="flex gap-2">
      <button
        onClick={onToggleEdit}
        className={`flex-1 border rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 ${
          modoOscuro ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
        }`}
      >
        {editando ? 'Cerrar' : 'Editar fecha/hora/lugar'}
      </button>
      <button
        onClick={onEnviar}
        disabled={enviando || !completo}
        className="flex-1 border border-indigo-500/40 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1"
      >
        {enviando ? (
          <Spinner size="sm" color="border-current" className="!py-0" />
        ) : 'Enviar convocatoria'}
      </button>
      <button
        onClick={onImprimir}
        className="flex-1 border border-emerald-500/40 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95"
      >
        Lista de asistencia
      </button>
    </div>
  );
}

function BloqueAlumnosList({ alumnos }) {
  const { modoOscuro } = useTheme();
  if (!alumnos || alumnos.length === 0) return null;
  return (
    <div className={`border-t px-5 py-3 ${modoOscuro ? 'border-slate-800' : 'border-slate-200'}`}>
      <p className={`text-[10px] uppercase tracking-wider font-bold mb-2 ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
        Alumnos
      </p>
      <div className="space-y-1.5">
        {alumnos.map((a) => (
          <div key={a.id_formulario} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-600/30 flex items-center justify-center text-slate-300 font-bold text-[9px] shrink-0">
              {a.nombre_completo.charAt(0)}
            </div>
            <p className={`text-xs truncate ${modoOscuro ? 'text-slate-300' : 'text-slate-700'}`}>{a.nombre_completo}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BloqueCard({ convocatoria, onActualizar, onEnviar, onImprimir }) {
  const { modoOscuro } = useTheme();
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({
    fecha: convocatoria.fecha ? convocatoria.fecha.split('T')[0] : '',
    hora: convocatoria.hora ? convocatoria.hora.slice(0, 5) : '',
    lugar: convocatoria.lugar || '',
  });
  const [guardando, setGuardando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function guardar() {
    setGuardando(true);
    try {
      await onActualizar(convocatoria.id_convocatoria, form);
      setEditando(false);
    } catch {
      setEditando(false);
    } finally {
      setGuardando(false);
    }
  }

  async function enviar() {
    setEnviando(true);
    try {
      await onEnviar(convocatoria.id_convocatoria);
    } catch { /* ignore */ } finally {
      setEnviando(false);
    }
  }

  const totalAlumnos = convocatoria.alumnos?.length || 0;
  const completo = convocatoria.fecha && convocatoria.hora && convocatoria.lugar;

  return (
    <div className={`rounded-2xl border overflow-hidden ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
      <div className="p-5">
        <BloqueHeader bloque={convocatoria.bloque} totalAlumnos={totalAlumnos} enviada={convocatoria.enviada} />
        {editando ? (
          <BloqueEditForm
            form={form}
            guardando={guardando}
            onFormChange={(campo, valor) => setForm((p) => ({ ...p, [campo]: valor }))}
            onGuardar={guardar}
            onCancelar={() => setEditando(false)}
          />
        ) : (
          <BloqueInfoGrid fecha={convocatoria.fecha} hora={convocatoria.hora} lugar={convocatoria.lugar} />
        )}
        <BloqueActions
          editando={editando}
          guardando={guardando}
          enviando={enviando}
          completo={completo}
          onToggleEdit={() => setEditando((p) => !p)}
          onEnviar={enviar}
          onImprimir={onImprimir}
        />
      </div>
      <BloqueAlumnosList alumnos={convocatoria.alumnos} />
    </div>
  );
}
