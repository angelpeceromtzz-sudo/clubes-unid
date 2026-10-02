import { useState } from 'react';
import { useNotificaciones } from '../../contexts/NotificationContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Alerta } from '../ui/Alerta';
import { CampoTexto } from '../ui/CampoTexto';
import { SelectorClubNotificacion } from './notificacion/SelectorClubNotificacion';

const AUDIENCIAS = [
  { value: 'global', label: 'Global (Todos los usuarios)' },
  { value: 'presidentes', label: 'Solo Presidentes' },
  { value: 'alumnos', label: 'Solo Alumnos' },
  { value: 'club', label: 'Club en Específico' },
];

export function FormularioNotificacion({ audienciaFija, clubId, clubNombre, clubes, onSuccess }) {
  const { modoOscuro } = useTheme();
  const { crearNotificacion } = useNotificaciones();
  const [titulo, setTitulo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [audiencia, setAudiencia] = useState(audienciaFija || 'global');
  const [clubSeleccionado, setClubSeleccionado] = useState(clubId || '');
  const [enviando, setEnviando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');
  const [mensajeError, setMensajeError] = useState('');

  async function manejarEnvio(e) {
    e.preventDefault();
    if (!titulo.trim() || !mensaje.trim()) return;
    if (audiencia === 'club' && !audienciaFija && !clubSeleccionado) return;
    setEnviando(true);
    setMensajeExito('');
    setMensajeError('');
    try {
      const audienciaFinal = audienciaFija || audiencia;
      const clubIdFinal = audienciaFinal === 'club'
        ? (audienciaFija ? clubId : Number(clubSeleccionado))
        : undefined;
      await crearNotificacion(titulo.trim(), mensaje.trim(), audienciaFinal, clubIdFinal);
      const tituloEnviado = titulo.trim();
      const mensajeEnviado = mensaje.trim();
      setMensajeExito('Anuncio publicado correctamente');
      if (onSuccess) onSuccess(tituloEnviado, mensajeEnviado);
      setTitulo('');
      setMensaje('');
    } catch (err) {
      setMensajeError(err?.message || 'Error al publicar el anuncio');
    } finally {
      setEnviando(false);
    }
  }

  const inputClass = `w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-amber-400/50 ${modoOscuro ? 'bg-[#0e162c] border-slate-700 text-slate-200 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'}`;
  const labelClass = `text-xs font-bold uppercase tracking-wider ${modoOscuro ? 'text-slate-300' : 'text-slate-500'}`;

  return (
    <form onSubmit={manejarEnvio} className="space-y-4">
      <CampoTexto label="Título del anuncio" name="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Horario de entrenamiento" required />
      <CampoTexto label="Mensaje" name="mensaje" value={mensaje} onChange={(e) => setMensaje(e.target.value)} placeholder="Escribe el contenido del anuncio..." type="textarea" required />

      {!audienciaFija && (
        <div>
          <label className={labelClass}>Audiencia destino</label>
          <select value={audiencia} onChange={(e) => { setAudiencia(e.target.value); setClubSeleccionado(''); }} className={inputClass}>
            {AUDIENCIAS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>
      )}

      {audiencia === 'club' && !audienciaFija && (
        <div className="space-y-3">
          <label className={labelClass}>Seleccionar Club</label>
          <SelectorClubNotificacion clubSeleccionado={clubSeleccionado} setClubSeleccionado={setClubSeleccionado} clubes={clubes} modoOscuro={modoOscuro} inputClass={inputClass} />
        </div>
      )}

      {audienciaFija === 'club' && clubNombre && (
        <div className={`text-xs font-medium ${modoOscuro ? 'text-amber-400' : 'text-amber-600'}`}>
          Este anuncio se enviará automáticamente a todos los miembros de: {clubNombre}
        </div>
      )}

      {mensajeError && <Alerta tipo="error" mensaje={mensajeError} />}
      {mensajeExito && <Alerta tipo="success" mensaje={mensajeExito} />}

      <button type="submit"
        disabled={enviando || !titulo.trim() || !mensaje.trim() || (audiencia === 'club' && !audienciaFija && !clubSeleccionado)}
        className="w-full bg-amber-400 hover:bg-amber-500 text-[#0e162c] font-black text-sm uppercase tracking-widest rounded-xl px-8 py-3.5 transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {enviando ? 'Enviando...' : 'Publicar Anuncio'}
      </button>
    </form>
  );
}
