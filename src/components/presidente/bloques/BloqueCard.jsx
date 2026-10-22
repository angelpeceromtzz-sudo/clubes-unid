import { useAutenticacion } from '../../../contexts/AuthContext';
import { useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { BloqueEditForm } from './BloqueEditForm';
import { BloqueHeader } from './BloqueHeader';
import { BloqueInfoGrid } from './BloqueInfoGrid';
import { BloqueActions } from './BloqueActions';
import { BloqueAlumnosList } from './BloqueAlumnosList';

export function BloqueCard({ convocatoria, onActualizar, onEnviar, onImprimir, onRechazar }) {
  const { modoOscuro, inputCls, tema } = useTheme();
  const { esAdmin } = useAutenticacion();
  const [observaciones, setObservaciones] = useState('');
  const estado = convocatoria.enviada ? 'aprobado' : convocatoria.estado_revision || 'preparacion';
  const estados = { preparacion: 'En preparación', pendiente: 'Pendiente de revisión de admin', aprobado: 'Aprobada y publicada', rechazado: 'Requiere correcciones' };
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({
    fecha: convocatoria.fecha ? convocatoria.fecha.split('T')[0] : '',
    hora: convocatoria.hora ? convocatoria.hora.slice(0, 5) : '',
    lugar: convocatoria.lugar || '',
  });
  const [guardando, setGuardando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  async function guardar() {
    setGuardando(true);
    setError('');
    try {
      await onActualizar(convocatoria.id_convocatoria, form);
      setEditando(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function enviar() {
    setEnviando(true);
    setError('');
    try {
      await onEnviar(convocatoria.id_convocatoria);
    } catch (err) { setError(err.message); } finally {
      setEnviando(false);
    }
  }

  async function rechazar() {
    setEnviando(true); setError('');
    try { await onRechazar(convocatoria.id_convocatoria, observaciones); setObservaciones(''); }
    catch (err) { setError(err.message); }
    finally { setEnviando(false); }
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
        <p className={tema.subtitle + ' my-3 text-xs'}>{estados[estado]}</p>
        {convocatoria.observaciones && <p className="mb-3 text-xs text-amber-600">Observaciones: {convocatoria.observaciones}</p>}
        {esAdmin && estado === 'pendiente' && <label className={tema.title + ' mb-3 block text-xs'}>Observaciones para el presidente<textarea value={observaciones} maxLength={2000} disabled={enviando} onChange={(e) => setObservaciones(e.target.value)} className={inputCls + ' mt-2'} placeholder="Obligatorias para devolver con correcciones" /></label>}
        <BloqueActions
          estado={estado}
          onRechazar={rechazar}
          puedeRechazar={Boolean(observaciones.trim())}
          enviada={convocatoria.enviada}
          editando={editando}
          guardando={guardando}
          enviando={enviando}
          completo={completo}
          onToggleEdit={() => setEditando((p) => !p)}
          onEnviar={enviar}
          onImprimir={() => onImprimir(convocatoria.id_convocatoria)}
        />
        {error && <p role="alert" className="mt-3 text-xs text-red-500">{error}</p>}
      </div>
      <BloqueAlumnosList alumnos={convocatoria.alumnos} />
    </div>
  );
}
