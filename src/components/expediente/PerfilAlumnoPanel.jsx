import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAutenticacion } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { Spinner } from '../ui/Spinner';
import { Alerta } from '../ui/Alerta';
import { Icono } from '../ui/Icono';
import { ListaReconocimientos } from './ListaReconocimientos';

export function PerfilAlumnoPanel() {
  const { usuario } = useAutenticacion();
  const esAlumno = Number(usuario?.id_rol) === 1;
  const idUsuario = usuario?.id_usuario ?? usuario?.id;

  // La clave reinicia el componente al cambiar de cuenta (o de elegibilidad de
  // las secciones de alumno), sin mezclar respuestas ni estado de la anterior.
  return (
    <PerfilAlumnoPanelContenido
      key={`${idUsuario ?? 'sin-usuario'}:${esAlumno ? 'alumno' : 'otro'}`}
      esAlumno={esAlumno}
      idUsuario={idUsuario}
    />
  );
}

function PerfilAlumnoPanelContenido({ esAlumno, idUsuario }) {
  const { modoOscuro, tema } = useTheme();
  const [perfil, setPerfil] = useState(null);
  const [reconocimientos, setReconocimientos] = useState([]);
  const [intereses, setIntereses] = useState([]);
  const [interesesCargados, setInteresesCargados] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [idPerfilCargado, setIdPerfilCargado] = useState(null);
  const [error, setError] = useState('');
  const [errorReconocimientos, setErrorReconocimientos] = useState(false);

  useEffect(() => {
    let vigente = true;
    // El perfil básico se carga por separado: ni preferencias ni catálogo son
    // requisito para mostrarlo. La clave del componente ya aisló la cuenta nueva.
    api.getMe()
      .then((datos) => {
        if (!vigente) return;
        setPerfil(datos);
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

    // Las secciones de alumno son opcionales y no comparten la espera del perfil.
    // Para otros roles no se consultan endpoints que les darían 403.
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
      }).catch(() => {
        // Una respuesta opcional malformada no debe afectar el perfil básico.
      });
    }

    return () => { vigente = false; };
  }, [esAlumno, idUsuario]);

  if (cargando || idPerfilCargado !== idUsuario) return <Spinner className="py-16" />;
  if (error) return <Alerta tipo="error" mensaje={error} />;

  const tarjeta = `rounded-2xl border p-5 sm:p-6 ${modoOscuro ? 'border-slate-700/60 bg-[#111a2e]' : 'border-slate-200 bg-white'}`;
  const etiqueta = `text-xs font-bold uppercase tracking-wider ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`;
  const valor = `mt-1 text-sm font-semibold ${modoOscuro ? 'text-slate-100' : 'text-slate-800'}`;
  const iconoDato = `h-5 w-5 shrink-0 ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`;

  return (
    <section className="space-y-5" data-tutorial="perfil-alumno">
      <header className="text-center">
        <h2 className={`text-2xl font-black ${tema.title}`}>Mi perfil</h2>
        <p className={`mt-1 text-sm ${tema.subtitle}`}>Consulta la información de tu cuenta.</p>
      </header>

      <div className={`${tarjeta} flex flex-col items-center text-center`}>
        <div className="relative mb-5 mt-3 flex h-36 w-36 items-center justify-center rounded-full bg-[linear-gradient(to_bottom,#fbbf24,#1e3a8a,#7c3aed)] p-[5px]">
          <div className={`flex h-full w-full items-center justify-center rounded-full ${modoOscuro ? 'bg-[#0b111e]' : 'bg-slate-50'}`}>
            <svg aria-label={`Avatar de ${perfil?.nombre_completo || 'usuario'}`} role="img" viewBox="0 0 100 100" className={`h-[5.75rem] w-[5.75rem] ${modoOscuro ? 'text-white' : 'text-slate-700'}`}>
              <circle cx="50" cy="31" r="18" fill="currentColor" />
              <path d="M13 91c1-20 16-34 37-34s36 14 37 34v3H13z" fill="currentColor" />
            </svg>
          </div>
          <img src="/branding/lobounid.png" alt="Emblema UNID" className="absolute -top-4 left-1/2 h-10 w-10 -translate-x-1/2 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]" />
        </div>
        <h3 className={`text-xl font-black sm:text-2xl ${tema.title}`}>{perfil?.nombre_completo || (esAlumno ? 'Alumno' : 'Usuario')}</h3>
        <div className={`mt-4 flex flex-col items-center gap-2 text-sm ${tema.subtitle}`}>
          {perfil?.institutional_id && <p className="inline-flex items-center gap-2"><Icono nombre="clipboard" className={iconoDato} />Matrícula: <span className={tema.title}>{perfil.institutional_id}</span></p>}
          <p className="inline-flex max-w-full items-center gap-2 break-all"><Icono nombre="mail" className={iconoDato} /><span>{perfil?.correo_institucional || 'Sin correo registrado'}</span></p>
        </div>
      </div>

      <div className={`${tarjeta} grid gap-5 sm:grid-cols-2`}>
        <div>
          <p className={etiqueta}>Tipo de cuenta</p>
          <p className={valor}>{perfil?.rol || 'Usuario'}</p>
        </div>
        {perfil?.licenciatura && <div>
          <p className={etiqueta}>Licenciatura</p>
          <p className={valor}>{perfil.licenciatura}</p>
        </div>}
        {perfil?.nombre_club && <div>
          <p className={etiqueta}>Club</p>
          <p className={valor}>{perfil.nombre_club}</p>
        </div>}
      </div>

      {esAlumno && <div className={tarjeta}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className={`text-lg font-black ${tema.title}`}>Mis intereses</h3>
            <p className={`mt-1 text-sm ${tema.subtitle}`}>Lo que elegiste durante el onboarding.</p>
          </div>
          <Link to="/perfil/preferencias" className="inline-flex items-center gap-1 font-bold text-amber-600 underline underline-offset-4 dark:text-amber-400">
            Editar <Icono nombre="pencil" className="h-4 w-4" />
          </Link>
        </div>
        {intereses.length ? (
          <div className="flex flex-wrap gap-2">
            {intereses.map((interes) => <span key={interes} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${modoOscuro ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>{interes}</span>)}
          </div>
        ) : interesesCargados ? (
          <p className={`text-sm ${tema.subtitle}`}>Aún no has elegido intereses.</p>
        ) : (
          <p className={`text-sm ${tema.subtitle}`}>No pudimos cargar tus intereses en este momento.</p>
        )}
      </div>}

      {esAlumno && <div className={tarjeta}>
        <h3 className={`text-lg font-black ${tema.title}`}>Reconocimientos</h3>
        <p className={`mb-4 mt-1 text-sm ${tema.subtitle}`}>Insignias de las ediciones a las que asististe.</p>
        {errorReconocimientos
          ? <p role="status" className={`text-sm ${tema.subtitle}`}>No se pudieron cargar tus reconocimientos por ahora.</p>
          : <ListaReconocimientos items={reconocimientos} mensajeVacio="Cuando asistas a una edición, tu insignia aparecerá aquí." />}
      </div>}
    </section>
  );
}
