import { useState } from 'react';
import { useNotificaciones } from '../../contexts/NotificationContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';
import { Alerta } from '../ui/Alerta';
import { CampoTexto } from '../ui/CampoTexto';

export function FormularioNotificacion({ audienciaFija, clubId, clubNombre, clubes, onSuccess }) {
  const { modoOscuro } = useTheme();
  const { crearNotificacion } = useNotificaciones();
  const [titulo, setTitulo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [audiencia, setAudiencia] = useState(audienciaFija || 'global');
  const [clubSeleccionado, setClubSeleccionado] = useState(clubId || '');
  const [enviando, setEnviando] = useState(false);
  const [busquedaClub, setBusquedaClub] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');
  const [mensajeError, setMensajeError] = useState('');

  const AUDIENCIAS = [
    { value: 'global', label: 'Global (Todos los usuarios)' },
    { value: 'presidentes', label: 'Solo Presidentes' },
    { value: 'alumnos', label: 'Solo Alumnos' },
    { value: 'club', label: 'Club en Específico' },
  ];

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
      setTitulo('');
      setMensaje('');
      setMensajeExito('Anuncio publicado correctamente');
      if (onSuccess) onSuccess();
    } catch (err) {
      setMensajeError(err?.message || 'Error al publicar el anuncio');
    } finally {
      setEnviando(false);
    }
  }

  const inputClass = `w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-amber-400/50 ${
    modoOscuro
      ? 'bg-[#0e162c] border-slate-700 text-slate-200 placeholder-slate-500'
      : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
  }`;

  const labelClass = 'text-xs font-bold uppercase tracking-wider text-slate-500';

  const clubesActivos = (clubes || []).filter((c) => c.id_estatus_club === 1);
  const clubesFiltrados = busquedaClub.trim()
    ? clubesActivos.filter((c) =>
        c.nombre_club.toLowerCase().includes(busquedaClub.toLowerCase().trim())
      )
    : clubesActivos;

  return (
    <form onSubmit={manejarEnvio} className="space-y-4">
      <CampoTexto label="Título del anuncio" name="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Horario de entrenamiento" required />

      <CampoTexto label="Mensaje" name="mensaje" value={mensaje} onChange={(e) => setMensaje(e.target.value)} placeholder="Escribe el contenido del anuncio..." type="textarea" required />

      {!audienciaFija && (
        <div>
          <label className={labelClass}>Audiencia destino</label>
          <select
            value={audiencia}
            onChange={(e) => { setAudiencia(e.target.value); setClubSeleccionado(''); }}
            className={inputClass}
          >
            {AUDIENCIAS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>
      )}

      {audiencia === 'club' && !audienciaFija && (
        <div className="space-y-3">
          <label className={labelClass}>Seleccionar Club</label>

          <div className="relative">
            <Icono nombre="search" strokeWidth={2} className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              value={busquedaClub}
              onChange={(e) => setBusquedaClub(e.target.value)}
              placeholder="Buscar club..."
              className={`${inputClass} pl-10`}
            />
          </div>

          <select
            value={clubSeleccionado}
            onChange={(e) => setClubSeleccionado(e.target.value)}
            className={inputClass}
          >
            <option value="">— Selecciona un club —</option>
            {clubesFiltrados.length > 0 ? (
              clubesFiltrados.map((c) => (
                <option key={c.id_club} value={c.id_club}>{c.nombre_club}</option>
              ))
            ) : (
              <option disabled>— Sin resultados —</option>
            )}
          </select>
        </div>
      )}

      {audienciaFija === 'club' && clubNombre && (
        <div className={`text-xs font-medium ${modoOscuro ? 'text-amber-400' : 'text-amber-600'}`}>
          Este anuncio se enviará automáticamente a todos los miembros de: {clubNombre}
        </div>
      )}

      {mensajeError && <Alerta tipo="error" mensaje={mensajeError} />}

      {mensajeExito && <Alerta tipo="success" mensaje={mensajeExito} />}

      <button
        type="submit"
        disabled={enviando || !titulo.trim() || !mensaje.trim() || (audiencia === 'club' && !audienciaFija && !clubSeleccionado)}
        className="w-full bg-amber-400 hover:bg-amber-500 text-[#0e162c] font-black text-sm uppercase tracking-widest rounded-xl px-8 py-3.5 transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {enviando ? 'Enviando...' : 'Publicar Anuncio'}
      </button>
    </form>
  );
}
