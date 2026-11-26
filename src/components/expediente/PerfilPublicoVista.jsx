import { useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { api } from '../../services/api';
import { Spinner } from '../ui/Spinner';
import { Alerta } from '../ui/Alerta';
import { Icono } from '../ui/Icono';

const ICONOS_REDES = {
  facebook_url: {
    etiqueta: 'Facebook',
    ruta: 'M14 8V6.5c0-.8.5-1.2 1.2-1.2H17V2h-2.7C11.6 2 10.5 3.6 10.5 6v2H8v3.3h2.5V22H14v-10.7h2.7l.4-3.3H14z',
  },
  x_url: {
    etiqueta: 'X',
    ruta: 'M18.2 2.3h3.4l-7.4 8.5L23 21.7h-6.8l-5.3-7-6.1 7H1.4l7.9-9L1 2.3h7l4.8 6.4zm-1.2 17.4h1.9L7.1 4.2H5.1z',
  },
  instagram_url: {
    etiqueta: 'Instagram',
    ruta: 'M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8C2.4 3.9 3.9 2.4 7.2 2.3 8.4 2.2 8.8 2.2 12 2.2zM12 0C8.7 0 8.3 0 7.1.1 2.7.3.3 2.7.1 7.1 0 8.3 0 8.7 0 12s0 3.7.1 4.9c.2 4.4 2.6 6.8 7 7 1.2.1 1.6.1 4.9.1s3.7 0 4.9-.1c4.4-.2 6.8-2.6 7-7 .1-1.2.1-1.6.1-4.9s0-3.7-.1-4.9c-.2-4.4-2.6-6.8-7-7C15.7 0 15.3 0 12 0zm0 5.8a6.2 6.2 0 100 12.4 6.2 6.2 0 000-12.4zM12 16a4 4 0 110-8 4 4 0 010 8zm6.4-11.8a1.4 1.4 0 100 2.9 1.4 1.4 0 000-2.9z',
  },
  sitio_web_url: {
    etiqueta: 'Sitio web',
    ruta: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 2c.8 0 2 1.7 2.6 5H9.4C10 5.7 11.2 4 12 4zM4.3 9h3.1a16 16 0 000 6H4.3a8 8 0 010-6zM5.3 15h2.5c.2 1 .5 2 .9 3a8 8 0 01-3.4-3zm2.5-8H5.3a8 8 0 013.4-3c-.4 1-.7 2-.9 3zM12 20c-.8 0-2-1.7-2.6-5h5.2c-.6 3.3-1.8 5-2.6 5zm3.1-7H8.9a14 14 0 010-2h6.2a14 14 0 010 2zm.2 5.9c.4-1 .7-2 .9-3h2.5a8 8 0 01-3.4 3zm1.1-4.9a16 16 0 000-6h3.1a8 8 0 010 6z',
  },
};

function urlInsignia(key) {
  if (!key) return null;
  if (key.startsWith('http')) return key;
  if (/\.[a-z0-9]+$/i.test(key)) return `/images/insignias/${key}`;
  return `/images/insignias/${key}.png`;
}

function ImagenInsignia({ item }) {
  const [error, setError] = useState(false);
  const src = urlInsignia(item.insignia_key);
  if (!src || error) {
    return <span aria-hidden="true" className="text-2xl">🏅</span>;
  }
  return (
    <img
      src={src}
      alt={`Insignia de ${item.actividad} ${item.anio}`}
      onError={() => setError(true)}
      className="h-14 w-14 object-contain"
    />
  );
}

export function PerfilPublicoVista({ idUsuario, alEditar }) {
  const { modoOscuro, tema } = useTheme();
  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [verMas, setVerMas] = useState(false);
  const [insigniaSeleccionada, setInsigniaSeleccionada] = useState(null);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError('');
    setVerMas(false);
    api.get(`/usuarios/${idUsuario}/perfil`)
      .then((datos) => {
        if (vigente) setPerfil(datos);
      })
      .catch((err) => {
        if (vigente) setError(err?.message || 'No se pudo cargar este perfil.');
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => { vigente = false; };
  }, [idUsuario]);

  if (cargando) return <Spinner className="py-32" />;
  if (error) return <Alerta tipo="error" mensaje={error} />;
  if (!perfil) return null;

  const textoSecundario = modoOscuro ? 'text-slate-400' : 'text-slate-500';
  const textoCuerpo = modoOscuro ? 'text-slate-200' : 'text-slate-700';
  const bordeSeparador = modoOscuro ? 'border-slate-800' : 'border-slate-200';
  const redes = Object.entries(ICONOS_REDES).filter(([campo]) => perfil[campo]);
  const reconocimientos = Array.isArray(perfil.reconocimientos) ? perfil.reconocimientos : [];
  const intereses = Array.isArray(perfil.intereses) ? perfil.intereses : [];
  const esPropio = Boolean(alEditar);

  const LIMITE = 6;
  const visibles = verMas ? reconocimientos : reconocimientos.slice(0, LIMITE);
  const hayMas = reconocimientos.length > LIMITE;

  return (
    <div data-tutorial="perfil-publico">
      <header className={`grid grid-cols-[1fr_auto_1fr] items-center border-b pb-5 ${bordeSeparador}`}>
        <div />
        <h2 className={`text-2xl font-black ${tema.title}`}>{esPropio ? 'Mi perfil' : 'Perfil'}</h2>
        <div className="flex justify-end">
          {esPropio && (
            <button
              type="button"
              onClick={alEditar}
              className="inline-flex cursor-pointer items-center gap-1 font-bold text-amber-600 underline underline-offset-4 hover:text-amber-500 dark:text-amber-400"
            >
              Editar <Icono nombre="pencil" className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      <div className={`flex flex-col items-center border-b py-8 text-center ${bordeSeparador}`}>
        <div className="relative mb-5 mt-3 flex h-36 w-36 items-center justify-center rounded-full bg-[linear-gradient(to_bottom,#fbbf24_0%,#fbbf24_20%,#1d4ed8_50%,#1d4ed8_85%,#7c3aed_100%)] p-[5px]">
          <div className={`flex h-full w-full items-center justify-center rounded-full ${modoOscuro ? 'bg-[#0b111e]' : 'bg-slate-50'}`}>
            <svg aria-label={`Avatar de ${perfil.nombre_completo}`} role="img" viewBox="0 0 100 100" className={`h-[5.75rem] w-[5.75rem] ${modoOscuro ? 'text-white' : 'text-slate-700'}`}>
              <circle cx="50" cy="31" r="18" fill="currentColor" />
              <path d="M13 91c1-20 16-34 37-34s36 14 37 34v3H13z" fill="currentColor" />
            </svg>
          </div>
          <img src="/branding/lobounid.png" alt="" aria-hidden="true" className="absolute -top-4 left-1/2 h-9 w-9 -translate-x-1/2 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]" />
        </div>

        <h3 className={`whitespace-nowrap text-xl font-black sm:text-2xl ${tema.title}`}>{perfil.nombre_completo}</h3>

        <div className={`mt-3 flex flex-col items-center gap-2 text-sm ${textoSecundario}`}>
          {perfil.institutional_id && (
            <p>Matrícula: <span className={`font-semibold ${tema.title}`}>{perfil.institutional_id}</span></p>
          )}
          {perfil.correo_institucional && (
            <p className="inline-flex items-center gap-2 break-all">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l9 6 9-6" />
              </svg>
              {perfil.correo_institucional}
            </p>
          )}
          {perfil.fecha_nacimiento && (
            <p>Fecha de nacimiento: <span className={`font-semibold ${tema.title}`}>{perfil.fecha_nacimiento}</span></p>
          )}
          {perfil.telefono_celular && (
            <p>Teléfono: <span className={`font-semibold ${tema.title}`}>{perfil.telefono_celular}</span></p>
          )}
        </div>

        {redes.length > 0 && (
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {redes.map(([campo, { etiqueta, ruta }]) => (
              <a
                key={campo}
                href={perfil[campo]}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={etiqueta}
                title={etiqueta}
                className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition ${
                  modoOscuro
                    ? 'border-slate-700 text-slate-200 hover:border-amber-400 hover:text-amber-300'
                    : 'border-slate-300 text-slate-700 hover:border-amber-500 hover:text-amber-600'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                  <path d={ruta} />
                </svg>
              </a>
            ))}
          </div>
        )}

        {reconocimientos.length > 0 && (
          <div className="mt-6 w-full">
            <div className="mx-auto flex max-w-md flex-wrap justify-center gap-4 sm:max-w-2xl">
              {visibles.map((item) => (
                <button
                  key={item.id_reconocimiento}
                  type="button"
                  onClick={() => setInsigniaSeleccionada(item)}
                  className="flex w-[calc((100%-2rem)/3)] cursor-pointer flex-col items-center gap-1 rounded-xl p-1 transition hover:scale-105 hover:shadow-md sm:w-[calc((100%-5rem)/6)]"
                  title={`Ver detalles de ${item.actividad}`}
                >
                  <ImagenInsignia item={item} />
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${textoSecundario}`}>
                    {item.anio}
                  </span>
                </button>
              ))}
            </div>
            {hayMas && !verMas && (
              <button
                type="button"
                onClick={() => setVerMas(true)}
                className="mt-4 text-sm font-bold text-amber-600 underline underline-offset-4 hover:text-amber-500 dark:text-amber-400"
              >
                Ver más…
              </button>
            )}
            {verMas && hayMas && (
              <button
                type="button"
                onClick={() => setVerMas(false)}
                className="mt-4 text-sm font-bold text-amber-600 underline underline-offset-4 hover:text-amber-500 dark:text-amber-400"
              >
                Ver menos
              </button>
            )}
          </div>
        )}

        {insigniaSeleccionada && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setInsigniaSeleccionada(null)}
          >
            <div
              className={`w-full max-w-sm rounded-2xl border p-6 shadow-xl ${modoOscuro ? 'border-slate-700 bg-[#0b111e] text-slate-100' : 'border-slate-200 bg-white text-slate-900'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex justify-center">
                <ImagenInsignia item={insigniaSeleccionada} />
              </div>
              <h4 className="text-center text-lg font-black">{insigniaSeleccionada.actividad}</h4>
              <p className={`mt-2 text-center text-sm ${textoSecundario}`}>
                {insigniaSeleccionada.edicion}
              </p>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className={`font-bold ${textoSecundario}`}>Año</dt>
                  <dd>{insigniaSeleccionada.anio}</dd>
                </div>
                {insigniaSeleccionada.otorgada_en && (
                  <div className="flex justify-between gap-3">
                    <dt className={`font-bold ${textoSecundario}`}>Otorgada</dt>
                    <dd>{new Date(insigniaSeleccionada.otorgada_en).toLocaleDateString('es-MX')}</dd>
                  </div>
                )}
                {insigniaSeleccionada.oculta && (
                  <div className="flex justify-between gap-3">
                    <dt className={`font-bold ${textoSecundario}`}>Visibilidad</dt>
                    <dd>Oculta</dd>
                  </div>
                )}
              </dl>
              <button
                type="button"
                onClick={() => setInsigniaSeleccionada(null)}
                className="mt-5 w-full rounded-xl bg-amber-400 py-2.5 text-sm font-black text-slate-950 transition hover:bg-amber-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>

      <section className={`border-b py-6 text-center ${bordeSeparador}`}>
        <h3 className={`mb-3 text-lg font-black ${tema.title}`}>Biografía</h3>
        {perfil.biografia
          ? <p className={`whitespace-pre-wrap text-sm ${textoCuerpo}`}>{perfil.biografia}</p>
          : <p className={`text-sm ${textoSecundario}`}>Sin biografía</p>}
      </section>

      <section className={`border-b py-6 text-center ${bordeSeparador}`}>
        <h3 className={`mb-3 text-lg font-black ${tema.title}`}>Listado de mis intereses</h3>
        {intereses.length
          ? <p className={`text-sm font-medium ${textoCuerpo}`}>{intereses.join(' · ')}</p>
          : <p className={`text-sm ${textoSecundario}`}>Sin intereses</p>}
      </section>
    </div>
  );
}
