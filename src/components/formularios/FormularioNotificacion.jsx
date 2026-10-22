import { useState } from 'react';
import { useNotificaciones } from '../../contexts/NotificationContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAutenticacion } from '../../contexts/AuthContext';
import { useNoticias } from '../../contexts/NoticiasContext';
import { api } from '../../services/api';
import { SubirImagen } from '../ui/SubirImagen';
import { OpcionMural } from '../noticias/OpcionMural';
import { Alerta } from '../ui/Alerta';
import { CampoTexto } from '../ui/CampoTexto';
import { SelectorClubNotificacion } from './notificacion/SelectorClubNotificacion';

const AUDIENCIAS = [
  { value: 'global', label: 'Global (Todos los usuarios)' },
  { value: 'presidentes', label: 'Solo Presidentes' },
  { value: 'alumnos', label: 'Solo Alumnos' },
  { value: 'club', label: 'Club en Específico' },
];

export function FormularioNotificacion({ audienciaFija, clubId, clubNombre, clubes, onSuccess, permitirMural = false }) {
  const { modoOscuro, labelCls } = useTheme();
  const { esAdmin, esRectoria } = useAutenticacion();
  const { actualizarPublicacion } = useNoticias();
  const { crearNotificacion } = useNotificaciones();
  const [titulo, setTitulo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [audiencia, setAudiencia] = useState(audienciaFija || 'global');
  const [clubSeleccionado, setClubSeleccionado] = useState(clubId || '');
  const [enviando, setEnviando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');
  const [mensajeError, setMensajeError] = useState('');
  const [mostrarEnMural, setMostrarEnMural] = useState(false);
  const [imagen, setImagen] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const puedePublicarEnMural = permitirMural && (esAdmin || esRectoria) && (audienciaFija || audiencia) === 'global';

  async function subirImagen(archivo) {
    setSubiendo(true);
    setMensajeError('');
    try { const resultado = await api.uploadImagen(archivo); setImagen(resultado.url); }
    catch (err) { setMensajeError(err.message); }
    finally { setSubiendo(false); }
  }

  async function manejarEnvio(e) {
    e.preventDefault();
    if (enviando || subiendo) return;
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
      const resultado = await crearNotificacion(titulo.trim(), mensaje.trim(), audienciaFinal, clubIdFinal, undefined, {
        mostrar_en_mural: puedePublicarEnMural && mostrarEnMural,
        url_imagen: puedePublicarEnMural && mostrarEnMural ? imagen || null : null,
      });
      if (resultado.publicacion_mural) actualizarPublicacion(resultado.publicacion_mural);
      const tituloEnviado = titulo.trim();
      const mensajeEnviado = mensaje.trim();
      setMensajeExito(resultado.publicacion_mural ? 'Aviso publicado y agregado al mural.' : 'Anuncio publicado correctamente');
      if (onSuccess) onSuccess(tituloEnviado, mensajeEnviado, resultado.publicacion_mural);
      setTitulo('');
      setMensaje('');
      setMostrarEnMural(false);
      setImagen('');
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
      <CampoTexto label="Título del anuncio" name="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Horario de entrenamiento" maxLength={200} disabled={enviando || subiendo} required />
      <CampoTexto label="Mensaje" name="mensaje" value={mensaje} onChange={(e) => setMensaje(e.target.value)} placeholder="Escribe el contenido del anuncio..." type="textarea" disabled={enviando || subiendo} required />

      {!audienciaFija && (
        <div>
          <label className={labelClass}>Audiencia destino</label>
          <select aria-label="Audiencia destino" value={audiencia} onChange={(e) => { setAudiencia(e.target.value); setClubSeleccionado(''); setMostrarEnMural(false); setImagen(''); }} disabled={enviando || subiendo} className={inputClass}>
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

      {puedePublicarEnMural && <div className="space-y-3">
        <OpcionMural checked={mostrarEnMural} onChange={(evento) => setMostrarEnMural(evento.target.checked)} disabled={enviando || subiendo} />
        {mostrarEnMural && <SubirImagen label="Cartel o imagen (opcional)" urlImagen={imagen} onUpload={subirImagen} modoOscuro={modoOscuro} labelCls={labelCls} inputId="imagen-aviso-mural" />}
      </div>}

      {mensajeError && <Alerta tipo="error" mensaje={mensajeError} />}
      {mensajeExito && <Alerta tipo="success" mensaje={mensajeExito} />}

      <button type="submit"
        disabled={enviando || subiendo || !titulo.trim() || !mensaje.trim() || (audiencia === 'club' && !audienciaFija && !clubSeleccionado)}
        className="w-full bg-amber-400 hover:bg-amber-500 text-[#0e162c] font-black text-sm uppercase tracking-widest rounded-xl px-8 py-3.5 transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {subiendo ? 'Subiendo imagen…' : enviando ? 'Publicando…' : mostrarEnMural && puedePublicarEnMural ? 'Publicar aviso y agregar al mural' : 'Publicar Anuncio'}
      </button>
    </form>
  );
}
