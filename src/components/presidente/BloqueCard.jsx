import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { BloqueEditForm } from './bloques-horarios/BloqueEditForm';
import { BloqueHeader } from './bloques-horarios/BloqueHeader';
import { BloqueInfoGrid } from './bloques-horarios/BloqueInfoGrid';
import { BloqueActions } from './bloques-horarios/BloqueActions';
import { BloqueAlumnosList } from './bloques-horarios/BloqueAlumnosList';

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
