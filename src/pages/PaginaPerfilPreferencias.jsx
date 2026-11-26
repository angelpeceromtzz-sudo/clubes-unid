/* Editor compacto de categorías y actividades del perfil. */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../services/api';
import { useCatalogoIntereses } from '../hooks/useCatalogoIntereses';
import { Alerta } from '../components/ui/Alerta';
import { BotonAccion } from '../components/ui/BotonAccion';
import { Icono } from '../components/ui/Icono';
import { TarjetaSeleccion } from '../components/onboarding/TarjetaSeleccion';
import { alternarCategoria, alternarElemento, construirPayload, respuestasIniciales } from '../utils/onboardingReglas';
import { adaptarPreferenciasServidor } from '../utils/preferenciasPerfil';

const MENSAJE_GUARDADO = 'No se pudieron guardar tus intereses. Tus cambios siguen aquí; inténtalo de nuevo.';

export default function PaginaPerfilPreferencias() {
  const { modoOscuro } = useTheme();
  const { estado, catalogo, reintentar } = useCatalogoIntereses();
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [respuestas, setRespuestas] = useState(respuestasIniciales);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState('success');
  const [aviso, setAviso] = useState('');
  const [intentoPreferencias, setIntentoPreferencias] = useState(0);

  useEffect(() => {
    let vigente = true;
    api.getPreferenciasOnboarding()
      .then((datos) => {
        if (vigente) setRespuestas(adaptarPreferenciasServidor(datos));
      })
      .catch((err) => {
        if (vigente) setErrorCarga(err.message || 'No se pudieron cargar tus intereses.');
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => { vigente = false; };
  }, [intentoPreferencias]);

  function reintentarPreferencias() {
    setCargando(true);
    setErrorCarga('');
    setIntentoPreferencias((n) => n + 1);
  }

  const categorias = catalogo?.categorias ?? [];
  const actividades = catalogo?.actividades ?? [];
  const categoriasSeleccionadas = categorias.filter((categoria) => respuestas.categorias.includes(categoria.id));
  const superficie = modoOscuro ? 'border-slate-800 bg-[#0e1627]' : 'border-slate-200 bg-white';
  const textoPrincipal = modoOscuro ? 'text-white' : 'text-slate-900';
  const textoSecundario = modoOscuro ? 'text-slate-400' : 'text-slate-600';

  function alternarCategoriaUI(id) {
    const siguiente = alternarCategoria(respuestas, id, actividades);
    setRespuestas((actual) => ({ ...actual, categorias: siguiente.categorias, actividades: siguiente.actividades }));
    setAviso(siguiente.quitadas > 0
      ? `También se quitaron ${siguiente.quitadas} ${siguiente.quitadas === 1 ? 'actividad relacionada' : 'actividades relacionadas'}.`
      : '');
    setMensaje('');
  }

  function alternarActividad(id) {
    setRespuestas((actual) => ({ ...actual, actividades: alternarElemento(actual.actividades, id) }));
    setMensaje('');
  }

  async function guardar() {
    if (ocupado) return;
    setOcupado(true);
    setMensaje('');
    try {
      const datos = await api.guardarPreferenciasOnboarding(construirPayload(respuestas, 'perfil'));
      setRespuestas(adaptarPreferenciasServidor(datos, actividades));
      setTipoMensaje('success');
      setMensaje('Tus intereses se guardaron correctamente.');
    } catch (err) {
      setTipoMensaje('error');
      setMensaje(err.message || MENSAJE_GUARDADO);
    } finally {
      setOcupado(false);
    }
  }

  const regresar = (
    <Link to="/perfil" className={`inline-flex items-center gap-2 text-sm font-bold ${modoOscuro ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>
      <Icono nombre="arrow-left" className="h-4 w-4" />
      Volver al perfil
    </Link>
  );

  if (cargando || estado === 'cargando') {
    return (
      <main className={`min-h-[60vh] px-4 py-8 ${modoOscuro ? 'bg-[#0b111e] text-white' : 'bg-slate-50 text-slate-900'}`}>
        <div className="mx-auto max-w-3xl">{regresar}<div role="status" className="flex justify-center py-16"><Icono nombre="loader" className="h-7 w-7 animate-spin text-amber-500" /><span className="sr-only">Cargando tus intereses…</span></div></div>
      </main>
    );
  }

  if (errorCarga || estado === 'error') {
    return (
      <main className={`min-h-[60vh] px-4 py-8 ${modoOscuro ? 'bg-[#0b111e] text-white' : 'bg-slate-50 text-slate-900'}`}>
        <div className="mx-auto max-w-3xl space-y-5">{regresar}<Alerta tipo="error" mensaje={errorCarga || 'No se pudieron cargar las opciones de intereses.'} /><BotonAccion variant="outline" onClick={errorCarga ? reintentarPreferencias : reintentar}><Icono nombre="refresh-cw" className="h-4 w-4" />Reintentar</BotonAccion></div>
      </main>
    );
  }

  return (
    <main className={`min-h-[60vh] overflow-x-hidden px-4 py-6 sm:px-6 sm:py-10 ${modoOscuro ? 'bg-[#0b111e] text-white' : 'bg-slate-50 text-slate-900'}`}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">{regresar}</div>
        <header className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-500">Perfil</p>
          <h1 className={`mt-1 text-2xl font-black sm:text-3xl ${textoPrincipal}`}>Editar mis intereses</h1>
          <p className={`mt-2 text-sm ${textoSecundario}`}>Elige las categorías y actividades que te gustan. Puedes cambiarlas cuando quieras.</p>
        </header>

        {mensaje && <div role="status" className="mb-5"><Alerta tipo={tipoMensaje} mensaje={mensaje} /></div>}

        <section className={`rounded-2xl border p-4 sm:p-6 ${superficie}`} aria-labelledby="categorias-intereses">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 id="categorias-intereses" className={`font-extrabold ${textoPrincipal}`}>Categorías</h2>
              <p className={`mt-1 text-sm ${textoSecundario}`}>Selecciona una o varias.</p>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${modoOscuro ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
              {respuestas.categorias.length} seleccionadas
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {categorias.map((categoria) => (
              <TarjetaSeleccion
                key={categoria.id}
                id={`categoria-${categoria.id}`}
                variante="chip"
                seleccionada={respuestas.categorias.includes(categoria.id)}
                onAlternar={() => alternarCategoriaUI(categoria.id)}
                titulo={categoria.nombre}
              />
            ))}
          </div>
          {aviso && <p role="status" className="mt-3 text-sm text-amber-500">{aviso}</p>}
        </section>

        <section className={`mt-4 rounded-2xl border p-4 sm:p-6 ${superficie}`} aria-labelledby="actividades-intereses">
          <div className="mb-4">
            <h2 id="actividades-intereses" className={`font-extrabold ${textoPrincipal}`}>Actividades</h2>
            <p className={`mt-1 text-sm ${textoSecundario}`}>Marca las que te gustaría realizar.</p>
          </div>
          {categoriasSeleccionadas.length === 0 ? (
            <p className={`rounded-xl px-4 py-3 text-sm ${modoOscuro ? 'bg-slate-900/70 text-slate-400' : 'bg-slate-50 text-slate-600'}`}>Primero selecciona una categoría para ver sus actividades.</p>
          ) : (
            <div className="space-y-5">
              {categoriasSeleccionadas.map((categoria) => {
                const deCategoria = actividades.filter((actividad) => actividad.id_categoria === categoria.id);
                if (!deCategoria.length) return null;
                return (
                  <fieldset key={categoria.id}>
                    <legend className={`mb-2 text-sm font-bold ${textoSecundario}`}>{categoria.nombre}</legend>
                    <div className="flex flex-wrap gap-2">
                      {deCategoria.map((actividad) => (
                        <TarjetaSeleccion
                          key={actividad.id}
                          id={`actividad-${actividad.id}`}
                          variante="chip"
                          seleccionada={respuestas.actividades.includes(actividad.id)}
                          onAlternar={() => alternarActividad(actividad.id)}
                          titulo={actividad.nombre}
                        />
                      ))}
                    </div>
                  </fieldset>
                );
              })}
            </div>
          )}
        </section>

        <footer className={`mt-6 flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between ${modoOscuro ? 'border-slate-800' : 'border-slate-200'}`}>
          {regresar}
          <BotonAccion onClick={guardar} disabled={ocupado} aria-busy={ocupado} className="w-full sm:w-auto">
            {ocupado ? <><Icono nombre="loader" className="h-4 w-4 animate-spin" />Guardando…</> : <><Icono nombre="save" className="h-4 w-4" />Guardar intereses</>}
          </BotonAccion>
        </footer>
      </div>
    </main>
  );
}
