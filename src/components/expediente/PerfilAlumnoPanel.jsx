import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAutenticacion } from '../../contexts/AuthContext';
import { api, request } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { Spinner } from '../ui/Spinner';
import { Alerta } from '../ui/Alerta';
import { Icono } from '../ui/Icono';
import { PerfilPublicoVista } from './PerfilPublicoVista';

export function PerfilAlumnoPanel() {
  const { usuario } = useAutenticacion();
  const [modoEdicion, setModoEdicion] = useState(false);
  const params = useParams();
  const idRuta = params?.id;
  const idPropio = usuario?.id_usuario ?? usuario?.id;
  const idUsuario = idRuta ? Number(idRuta) : idPropio;
  const esPropio = !idRuta || Number(idRuta) === Number(idPropio);
  const esAlumno = Number(usuario?.id_rol) === 1 && esPropio;

  if (!esPropio) return <PerfilPublicoVista key={idUsuario} idUsuario={idUsuario} />;
  if (!modoEdicion) {
    return <PerfilPublicoVista key={idUsuario} idUsuario={idUsuario} alEditar={() => setModoEdicion(true)} />;
  }

  return (
    <PerfilAlumnoPanelContenido
      key={`${idUsuario ?? 'sin-usuario'}:${esAlumno ? 'alumno' : 'otro'}`}
      esAlumno={esAlumno}
      idUsuario={idUsuario}
      esPropio={esPropio}
      editandoInicial
      alVolver={() => setModoEdicion(false)}
    />
  );
}

function PerfilAlumnoPanelContenido({ esAlumno, idUsuario, esPropio, editandoInicial = false, alVolver }) {
  const { modoOscuro, tema } = useTheme();
  const [perfil, setPerfil] = useState(null);
  const [reconocimientos, setReconocimientos] = useState([]);
  const [intereses, setIntereses] = useState([]);
  const [interesesCargados, setInteresesCargados] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [idPerfilCargado, setIdPerfilCargado] = useState(null);
  const [error, setError] = useState('');
  const [errorReconocimientos, setErrorReconocimientos] = useState(false);
  const [editando, setEditando] = useState(editandoInicial);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [mensajePerfil, setMensajePerfil] = useState('');
  const [errorPerfil, setErrorPerfil] = useState('');
  const [formularioPerfil, setFormularioPerfil] = useState({
    biografia: '', fecha_nacimiento_publica: false, telefono_celular: '', telefono_publico: false,
    facebook_url: '', x_url: '', instagram_url: '', sitio_web_url: '',
  });

  useEffect(() => {
    let vigente = true;
    const peticionPerfil = esPropio
      ? api.getMe()
      : api.get(`/usuarios/${idUsuario}/perfil`);
    peticionPerfil
      .then((datos) => {
        if (!vigente) return;
        setPerfil(datos);
        setFormularioPerfil({
          biografia: datos.biografia || '',
          fecha_nacimiento_publica: Boolean(datos.fecha_nacimiento_publica),
          telefono_celular: datos.telefono_celular || '',
          telefono_publico: Boolean(datos.telefono_publico),
          facebook_url: datos.facebook_url || '',
          x_url: datos.x_url || '',
          instagram_url: datos.instagram_url || '',
          sitio_web_url: datos.sitio_web_url || '',
        });
        setIdPerfilCargado(idUsuario);
      })
      .catch((err) => {
        if (!vigente) return;
        setError(err?.message || 'No se pudo cargar tu perfil.');
        setIdPerfilCargado(idUsuario);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    if (esAlumno) {
      Promise.allSettled([
        api.get('/expediente/mis-reconocimientos'),
        api.getPreferenciasOnboarding(),
        api.getCatalogoIntereses(),
      ]).then(([resultadoReconocimientos, resultadoPreferencias, resultadoCatalogo]) => {
        if (!vigente) return;

        if (resultadoReconocimientos.status === 'fulfilled') {
          setReconocimientos(Array.isArray(resultadoReconocimientos.value) ? resultadoReconocimientos.value : []);
        } else {
          setErrorReconocimientos(true);
        }

        if (resultadoPreferencias.status === 'fulfilled' && resultadoCatalogo.status === 'fulfilled') {
          const preferencias = resultadoPreferencias.value ?? {};
          const catalogo = resultadoCatalogo.value ?? {};
          const categoriasElegidas = Array.isArray(preferencias.categorias) ? preferencias.categorias : [];
          const actividadesElegidas = Array.isArray(preferencias.actividades) ? preferencias.actividades : [];
          const categorias = (Array.isArray(catalogo.categorias) ? catalogo.categorias : [])
            .filter((categoria) => categoriasElegidas.includes(categoria.id))
            .map((categoria) => categoria.nombre);
          const actividades = (Array.isArray(catalogo.actividades) ? catalogo.actividades : [])
            .filter((actividad) => actividadesElegidas.includes(actividad.id))
            .map((actividad) => actividad.nombre);
          setIntereses([...categorias, ...actividades]);
          setInteresesCargados(true);
        }
      }).catch(() => {});
    }

    return () => { vigente = false; };
  }, [esAlumno, idUsuario]);

  if (cargando || idPerfilCargado !== idUsuario) return <Spinner className="py-16" />;
  if (error) return <Alerta tipo="error" mensaje={error} />;

  const bordeSeparador = modoOscuro ? 'border-slate-700/70' : 'border-slate-200';
  const etiqueta = `block text-xs font-bold uppercase tracking-wider ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`;
  const valor = `mt-1 text-sm font-semibold ${modoOscuro ? 'text-slate-100' : 'text-slate-800'}`;
  const iconoDato = `h-5 w-5 shrink-0 ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`;
  const campo = `mt-1 w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/60 ${modoOscuro ? 'border-slate-700 bg-[#111a2e] text-slate-100 placeholder:text-slate-500' : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400'}`;
  const textoPerfil = modoOscuro ? 'text-slate-200' : 'text-slate-700';
  const fechaNacimiento = perfil?.fecha_nacimiento
    ? new Date(`${String(perfil.fecha_nacimiento).slice(0, 10)}T00:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Sin fecha registrada';

  const cambiarCampoPerfil = (nombre, valor) => {
    setFormularioPerfil((actual) => ({ ...actual, [nombre]: valor }));
    setMensajePerfil('');
    setErrorPerfil('');
  };

  const iniciarEdicion = () => {
    setFormularioPerfil({
      biografia: perfil?.biografia || '',
      fecha_nacimiento_publica: Boolean(perfil?.fecha_nacimiento_publica),
      telefono_celular: perfil?.telefono_celular || '',
      telefono_publico: Boolean(perfil?.telefono_publico),
      facebook_url: perfil?.facebook_url || '',
      x_url: perfil?.x_url || '',
      instagram_url: perfil?.instagram_url || '',
      sitio_web_url: perfil?.sitio_web_url || '',
    });
    setMensajePerfil('');
    setErrorPerfil('');
    setEditando(true);
  };

  const guardarPerfil = async (evento) => {
    evento.preventDefault();
    setGuardandoPerfil(true);
    setMensajePerfil('');
    setErrorPerfil('');
    try {
      const actualizado = await api.actualizarMiPerfil({
        ...formularioPerfil,
        telefono_celular: formularioPerfil.telefono_celular.trim() || null,
        facebook_url: formularioPerfil.facebook_url.trim() || null,
        x_url: formularioPerfil.x_url.trim() || null,
        instagram_url: formularioPerfil.instagram_url.trim() || null,
        sitio_web_url: formularioPerfil.sitio_web_url.trim() || null,
      });
      setPerfil((actual) => ({ ...actual, ...actualizado }));
      setFormularioPerfil((actual) => ({
        ...actual,
        biografia: actualizado.biografia || '',
        telefono_celular: actualizado.telefono_celular || '',
        facebook_url: actualizado.facebook_url || '',
        x_url: actualizado.x_url || '',
        instagram_url: actualizado.instagram_url || '',
        sitio_web_url: actualizado.sitio_web_url || '',
      }));
      setEditando(false);
      setMensajePerfil('Tus cambios se guardaron.');
    } catch (err) {
      setErrorPerfil(err?.message || 'No se pudo guardar tu perfil. Intenta de nuevo.');
    } finally {
      setGuardandoPerfil(false);
    }
  };

  const enlacesPerfil = [
    ['Facebook', 'facebook_url'], ['X', 'x_url'], ['Instagram', 'instagram_url'], ['Sitio web personal', 'sitio_web_url'],
  ];

  const IconoOjo = ({ abierto }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      {abierto
        ? <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.75-7.5 9.75-7.5S21.75 12 21.75 12s-3.75 7.5-9.75 7.5S2.25 12 2.25 12zM12 15a3 3 0 100-6 3 3 0 000 6z" />
        : <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l12.544 12.544" />}
    </svg>
  );

  return (
    <form onSubmit={guardarPerfil} data-tutorial="perfil-alumno">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-5">
        <div>
          <h2 className={`text-2xl font-black ${tema.title}`}>Mi perfil</h2>
          <p className={`mt-1 text-sm ${tema.subtitle}`}>Consulta y actualiza tu información.</p>
        </div>
        {esPropio && (!editando
          ? <div className="flex items-center gap-4">
              {alVolver && <button type="button" onClick={alVolver} className={`text-sm font-bold ${tema.subtitle} hover:text-amber-500`}>Ver perfil</button>}
              <button type="button" onClick={iniciarEdicion} className="inline-flex cursor-pointer items-center gap-1 font-bold text-amber-600 underline underline-offset-4 hover:text-amber-500 dark:text-amber-400">Editar <Icono nombre="pencil" className="h-4 w-4" /></button>
            </div>
          : <button type="button" onClick={() => { setErrorPerfil(''); if (alVolver) alVolver(); else setEditando(false); }} disabled={guardandoPerfil} className="cursor-pointer text-sm font-bold text-amber-600 underline underline-offset-4 hover:text-amber-500 disabled:opacity-50 dark:text-amber-400">Cancelar</button>)}
      </header>

      <div className={`flex flex-col items-center border-b py-6 text-center ${bordeSeparador}`}>
        <div className="relative mb-5 mt-3 flex h-36 w-36 items-center justify-center rounded-full bg-[linear-gradient(to_bottom,#fbbf24_0%,#fbbf24_20%,#1d4ed8_50%,#1d4ed8_85%,#7c3aed_100%)] p-[5px]">
          <div className={`flex h-full w-full items-center justify-center rounded-full ${modoOscuro ? 'bg-[#0b111e]' : 'bg-slate-50'}`}>
            <svg aria-label={`Avatar de ${perfil?.nombre_completo || 'usuario'}`} role="img" viewBox="0 0 100 100" className={`h-[5.75rem] w-[5.75rem] ${modoOscuro ? 'text-white' : 'text-slate-700'}`}>
              <circle cx="50" cy="31" r="18" fill="currentColor" />
              <path d="M13 91c1-20 16-34 37-34s36 14 37 34v3H13z" fill="currentColor" />
            </svg>
          </div>
          <img src="/branding/lobounid.png" alt="Emblema UNID" className="absolute -top-5 left-1/2 h-10 w-10 -translate-x-1/2 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]" />
        </div>
        <h3 className={`text-xl font-black sm:text-2xl ${tema.title}`}>{perfil?.nombre_completo || (esAlumno ? 'Alumno' : 'Usuario')}</h3>
        <div className={`mt-3 flex flex-col items-center gap-2 text-sm ${tema.subtitle}`}>
          {perfil?.institutional_id && <p className="inline-flex items-center gap-2"><Icono nombre="clipboard" className={iconoDato} />Matrícula: <span className={tema.title}>{perfil.institutional_id}</span></p>}
        </div>
      </div>

      <section className={`border-b py-6 ${bordeSeparador}`}>
        <h3 className={`mb-4 text-lg font-black ${tema.title}`}>Información Personal</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {editando && <label className={etiqueta}>Nombre<input value={perfil?.nombre_completo || ''} readOnly aria-readonly="true" className={`${campo} cursor-not-allowed opacity-75`} /></label>}
          <div className="sm:col-span-2">
            <p className={etiqueta}>Biografía</p>
            {editando
              ? <><textarea value={formularioPerfil.biografia} onChange={(evento) => cambiarCampoPerfil('biografia', evento.target.value)} maxLength={500} rows={4} placeholder="Cuéntanos un poco sobre ti" className={campo} /><p className={`mt-1 text-right text-xs ${tema.subtitle}`}>{formularioPerfil.biografia.length}/500</p></>
              : <p className={`${valor} whitespace-pre-wrap`}>{perfil?.biografia || 'Aún no agregas una biografía.'}</p>}
          </div>
          <div>
            <p className={etiqueta}>Fecha de nacimiento</p>
            <div className="mt-1 flex items-center gap-2">
              <p className={valor}>{fechaNacimiento}</p>
              {editando && (
                <button type="button" disabled={!perfil?.fecha_nacimiento} onClick={() => cambiarCampoPerfil('fecha_nacimiento_publica', !formularioPerfil.fecha_nacimiento_publica)} className={`inline-flex cursor-pointer items-center justify-center rounded-full border p-1 disabled:cursor-not-allowed disabled:opacity-50 ${formularioPerfil.fecha_nacimiento_publica ? 'border-amber-400 text-amber-500' : (modoOscuro ? 'border-slate-600 text-slate-400' : 'border-slate-300 text-slate-500')}`} title={formularioPerfil.fecha_nacimiento_publica ? 'Hacer privada' : 'Hacer pública'}>
                  <IconoOjo abierto={formularioPerfil.fecha_nacimiento_publica} />
                </button>
              )}
            </div>
            {!editando && <p className={`mt-1 text-xs ${tema.subtitle}`}>{perfil?.fecha_nacimiento_publica ? 'Visible en tu perfil' : 'Privada'}</p>}
          </div>
          {perfil?.licenciatura && <div><p className={etiqueta}>Licenciatura</p><p className={valor}>{perfil.licenciatura}</p></div>}
          {perfil?.nombre_club && <div><p className={etiqueta}>Club</p><p className={valor}>{perfil.nombre_club}</p></div>}
        </div>
      </section>

      <section className={`border-b py-6 ${bordeSeparador}`}>
        <h3 className={`mb-4 text-lg font-black ${tema.title}`}>Información de Contacto</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={etiqueta}>Correo electrónico<input value={perfil?.correo_institucional || ''} readOnly aria-readonly="true" className={`${campo} cursor-not-allowed opacity-75`} /></label>
          <div>
            <label className={etiqueta} htmlFor="perfil-telefono">Teléfono celular</label>
            {editando
              ? <>
                  <input id="perfil-telefono" type="tel" value={formularioPerfil.telefono_celular} onChange={(evento) => setFormularioPerfil((actual) => ({ ...actual, telefono_celular: evento.target.value, telefono_publico: evento.target.value.trim() ? actual.telefono_publico : false }))} maxLength={20} autoComplete="tel" placeholder="Ej. +52 981 123 4567" className={campo} />
                  <div className="mt-2 flex items-center gap-2">
                    <button type="button" disabled={!formularioPerfil.telefono_celular.trim()} onClick={() => cambiarCampoPerfil('telefono_publico', !formularioPerfil.telefono_publico)} className={`inline-flex cursor-pointer items-center justify-center rounded-full border p-1 disabled:cursor-not-allowed disabled:opacity-50 ${formularioPerfil.telefono_publico ? 'border-amber-400 text-amber-500' : (modoOscuro ? 'border-slate-600 text-slate-400' : 'border-slate-300 text-slate-500')}`} title={formularioPerfil.telefono_publico ? 'Hacer privado' : 'Hacer público'}>
                      <IconoOjo abierto={formularioPerfil.telefono_publico} />
                    </button>
                    <span className={`text-xs ${tema.subtitle}`}>{formularioPerfil.telefono_publico ? 'Visible en tu perfil' : 'Privado'}</span>
                  </div>
                </>
              : <>
                  <p className={valor}>{perfil?.telefono_celular || 'Sin teléfono registrado'}</p>
                  <p className={`mt-1 text-xs ${tema.subtitle}`}>{perfil?.telefono_publico ? 'Visible en tu perfil' : 'Privado'}</p>
                </>}
          </div>
        </div>
      </section>

      <section className={`border-b py-6 ${bordeSeparador}`}>
        <h3 className={`mb-4 text-lg font-black ${tema.title}`}>Enlaces a Perfiles</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {enlacesPerfil.map(([etiquetaEnlace, nombreCampo]) => (
            <div key={nombreCampo}>
              {editando
                ? <label className={etiqueta}>{etiquetaEnlace}<input type="url" value={formularioPerfil[nombreCampo]} onChange={(evento) => cambiarCampoPerfil(nombreCampo, evento.target.value)} maxLength={2048} placeholder="https://" className={campo} /></label>
                : <><p className={etiqueta}>{etiquetaEnlace}</p>{perfil?.[nombreCampo] ? <a href={perfil[nombreCampo]} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block break-all text-sm font-semibold text-amber-600 underline underline-offset-4 hover:text-amber-500 dark:text-amber-400">{perfil[nombreCampo]}</a> : <p className={valor}>Sin enlace</p>}</>}
            </div>
          ))}
        </div>
      </section>

      {esAlumno && (
        <div className={`border-b py-6 ${bordeSeparador}`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className={`text-lg font-black ${tema.title}`}>Mis intereses</h3>
              <p className={`mt-1 text-sm ${tema.subtitle}`}>Lo que elegiste durante el onboarding.</p>
            </div>
            {!editando && esPropio && <Link to="/perfil/preferencias" className="inline-flex items-center gap-1 font-bold text-amber-600 underline underline-offset-4 dark:text-amber-400">
              Editar <Icono nombre="pencil" className="h-4 w-4" />
            </Link>}
          </div>
          {intereses.length ? (
            <p className={`text-sm font-medium ${modoOscuro ? 'text-slate-200' : 'text-slate-700'}`}>{intereses.join(' · ')}</p>
          ) : interesesCargados ? (
            <p className={`text-sm ${tema.subtitle}`}>Aún no has elegido intereses.</p>
          ) : (
            <p className={`text-sm ${tema.subtitle}`}>No pudimos cargar tus intereses en este momento.</p>
          )}
        </div>
      )}

      {esAlumno && (
        <div className={`border-b py-6 ${bordeSeparador}`}>
          <h3 className={`text-lg font-black ${tema.title}`}>Insignias</h3>
          <p className={`mb-4 mt-1 text-sm ${tema.subtitle}`}>Insignias de las ediciones a las que asististe. Puedes ocultar las que no quieras mostrar en tu perfil.</p>
          {errorReconocimientos ? (
            <p role="status" className={`text-sm ${tema.subtitle}`}>No se pudieron cargar tus insignias por ahora.</p>
          ) : reconocimientos.length === 0 ? (
            <p className={`text-sm ${tema.subtitle}`}>Cuando asistas a una edición, tu insignia aparecerá aquí.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {reconocimientos.map((item) => {
                const oculta = Boolean(item.oculta);
                return (
                  <span
                    key={item.id_reconocimiento}
                    title={`${item.actividad} · ${item.edicion}`}
                    className={`inline-flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition ${oculta ? 'opacity-50' : ''} ${modoOscuro ? 'border-amber-400/40 bg-amber-400/10 text-amber-300' : 'border-amber-500/40 bg-amber-50 text-amber-800'}`}
                  >
                    <img
                      src={item.insignia_key && item.insignia_key.startsWith('http') ? item.insignia_key : (/\.[a-z0-9]+$/i.test(item.insignia_key || '') ? `/images/insignias/${item.insignia_key}` : `/images/insignias/${item.insignia_key}.png`)}
                      alt={`Insignia de ${item.actividad} ${item.anio}`}
                      className="h-8 w-8 shrink-0 object-contain"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    {item.actividad}{item.anio ? ` ${item.anio}` : ''}
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const actualizado = await request(`/expediente/mis-reconocimientos/${item.id_reconocimiento}/visibilidad`, { method: 'PATCH', body: JSON.stringify({ oculta: !oculta }) });
                          setReconocimientos((prev) => prev.map((r) => r.id_reconocimiento === item.id_reconocimiento ? { ...r, oculta: actualizado.oculta } : r));
                        } catch {
                          // noop
                        }
                      }}
                      className={`ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full ${modoOscuro ? 'text-slate-300 hover:text-amber-300' : 'text-slate-500 hover:text-amber-600'}`}
                      title={oculta ? 'Mostrar insignia' : 'Ocultar insignia'}
                      aria-label={oculta ? 'Mostrar insignia' : 'Ocultar insignia'}
                    >
                      <IconoOjo abierto={!oculta} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {editando && <div className="flex flex-wrap items-center gap-3 border-b py-6">
        <button type="submit" disabled={guardandoPerfil} className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-black text-slate-950 transition hover:bg-amber-300 disabled:cursor-wait disabled:opacity-60">{guardandoPerfil ? 'Guardando…' : 'Guardar cambios'}</button>
        {mensajePerfil && <p role="status" className="text-sm font-semibold text-emerald-500">{mensajePerfil}</p>}
        {errorPerfil && <p role="alert" className="text-sm font-semibold text-red-500">{errorPerfil}</p>}
      </div>}
      {!editando && mensajePerfil && <p role="status" className="pt-4 text-sm font-semibold text-emerald-500">{mensajePerfil}</p>}
    </form>
  );
}