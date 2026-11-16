/* Otorgamiento manual de reconocimientos a alumnos. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { api } from '../../../services/api';
import { request } from '../../../services/api-core';
import { BotonAccion } from '../../ui/BotonAccion';
import { Alerta } from '../../ui/Alerta';

const FORM_VACIO = { id_usuario: '', id_noticia: '', codigo: '', descripcion: '' };

export function SeccionOtorgarReconocimientos() {
  const { modoOscuro, cardCls } = useTheme();
  const [noticias, setNoticias] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm] = useState(FORM_VACIO);
  const [ocupado, setOcupado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [errorNoticias, setErrorNoticias] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const cargaId = useRef(0);
  const envioEnCurso = useRef(false);

  const cargar = useCallback(async () => {
    const id = ++cargaId.current;
    setCargando(true);
    setErrorCarga('');
    setErrorNoticias('');
    const [alumnos, publicaciones] = await Promise.allSettled([api.getUsuarios(), api.getNoticias()]);
    if (id !== cargaId.current) return;
    if (alumnos.status === 'fulfilled' && Array.isArray(alumnos.value)) {
      setUsuarios(alumnos.value.filter((u) => u.id_rol === 1));
    } else {
      setUsuarios([]);
      setErrorCarga('No se pudo cargar la lista de alumnos.');
    }
    if (publicaciones.status === 'fulfilled' && Array.isArray(publicaciones.value)) {
      setNoticias(publicaciones.value);
    } else {
      setNoticias([]);
      setErrorNoticias('No se pudieron cargar las noticias. Puedes otorgar el reconocimiento sin vincular una noticia.');
      setForm((anterior) => ({ ...anterior, id_noticia: '' }));
    }
    setCargando(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
    return () => { cargaId.current += 1; };
  }, [cargar]);

  async function enviar(e) {
    e.preventDefault();
    if (envioEnCurso.current || cargando || errorCarga) return;
    envioEnCurso.current = true;
    setOcupado(true);
    setMensaje('');
    setError('');
    try {
      await request('/reconocimientos', { method: 'POST', body: JSON.stringify({
        id_usuario: Number(form.id_usuario), id_noticia: form.id_noticia ? Number(form.id_noticia) : null,
        codigo: form.codigo.trim(), descripcion: form.descripcion,
      }) });
      setMensaje('Reconocimiento otorgado correctamente.');
      setForm(FORM_VACIO);
    } catch (err) {
      setError(err?.message || 'No se pudo otorgar el reconocimiento.');
    } finally {
      envioEnCurso.current = false;
      setOcupado(false);
    }
  }

  const inputCls = `w-full rounded-xl border px-3 py-2 text-sm ${modoOscuro ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`;
  const labelCls = `block text-sm font-semibold mb-1 ${modoOscuro ? 'text-slate-300' : 'text-slate-700'}`;
  return <section className={`${cardCls} rounded-2xl border p-4 sm:p-6 space-y-4`}>
    <h2 className={`text-lg font-bold ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>Otorgar reconocimiento</h2>
    <div aria-live="polite">{mensaje && <Alerta tipo="success" mensaje={mensaje} />}</div>
    {error && <div role="alert"><Alerta tipo="error" mensaje={error} /></div>}
    {cargando && <p role="status">Cargando alumnos y noticias…</p>}
    {(errorCarga || errorNoticias) && <div role="alert" className="space-y-2">
      {errorCarga && <Alerta tipo="error" mensaje={errorCarga} />}
      {errorNoticias && <Alerta tipo="info" mensaje={errorNoticias} />}
      <BotonAccion variant="outline" onClick={cargar} disabled={cargando || ocupado}>Reintentar carga</BotonAccion>
    </div>}
    {!cargando && !errorCarga && usuarios.length === 0 && <p>No hay alumnos disponibles para seleccionar.</p>}
    <form onSubmit={enviar} className="space-y-4">
      <div><label htmlFor="reconocimiento-alumno" className={labelCls}>Alumno</label>
        <select id="reconocimiento-alumno" value={form.id_usuario} onChange={(e) => setForm((f) => ({ ...f, id_usuario: e.target.value }))} className={inputCls} required disabled={cargando || ocupado || Boolean(errorCarga)}>
          <option value="">Selecciona un alumno</option>{usuarios.map((u) => <option key={u.id_usuario} value={u.id_usuario}>{u.nombre_completo}{u.correo_institucional ? ` — ${u.correo_institucional}` : ''}</option>)}
        </select></div>
      <div><label htmlFor="reconocimiento-noticia" className={labelCls}>Noticia vinculada (opcional)</label>
        <select id="reconocimiento-noticia" value={form.id_noticia} onChange={(e) => setForm((f) => ({ ...f, id_noticia: e.target.value }))} className={inputCls} disabled={cargando || ocupado || Boolean(errorNoticias)}>
          <option value="">Sin noticia</option>{noticias.map((n) => <option key={n.id_noticia} value={n.id_noticia}>{n.titulo}</option>)}
        </select></div>
      <div><label htmlFor="reconocimiento-codigo" className={labelCls}>Código de insignia</label><input id="reconocimiento-codigo" value={form.codigo} onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))} className={inputCls} maxLength={40} required disabled={ocupado} /></div>
      <div><label htmlFor="reconocimiento-descripcion" className={labelCls}>Descripción (opcional)</label><textarea id="reconocimiento-descripcion" value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} className={inputCls} maxLength={200} rows={3} disabled={ocupado} /></div>
      <BotonAccion type="submit" disabled={ocupado || cargando || Boolean(errorCarga) || !form.id_usuario || !form.codigo.trim()}>{ocupado ? 'Otorgando…' : 'Otorgar'}</BotonAccion>
    </form>
  </section>;
}
