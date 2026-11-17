/* Página pública del perfil de preferencias del estudiante.
   Reutiliza los componentes de la fase C y el PUT de la fase B. */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../services/api';
import { useCatalogoIntereses } from '../hooks/useCatalogoIntereses';
import { Alerta } from '../components/ui/Alerta';
import { BotonAccion } from '../components/ui/BotonAccion';
import { Icono } from '../components/ui/Icono';
import { ContenedorOnboarding } from '../components/onboarding/ContenedorOnboarding';
import { PasoCategorias } from '../components/onboarding/PasoCategorias';
import { PasoActividades } from '../components/onboarding/PasoActividades';
import { PasoMotivaciones } from '../components/onboarding/PasoMotivaciones';
import { PasoGenero } from '../components/onboarding/PasoGenero';
import { PasoCorreo } from '../components/onboarding/PasoCorreo';
import { alternarCategoria, alternarElemento, construirPayload, errorPropuesta, respuestasIniciales } from '../utils/onboardingReglas';
import { adaptarPreferenciasServidor } from '../utils/preferenciasPerfil';

const MENSAJE_GUARDADO = 'No se pudieron guardar tus preferencias. Tus respuestas se conservan; puedes intentarlo de nuevo.';

// Los datos del backend (preferencias_usuario) se adaptan al formato de respuestas
// del flujo. El correo se reconstruye tal cual viene del servidor.
// aRespuestas se reemplazó por adaptarPreferenciasServidor en src/utils/preferenciasPerfil.js

export default function PaginaPerfilPreferencias() {
  const { modoOscuro } = useTheme();
  const { estado, catalogo, reintentar } = useCatalogoIntereses();
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [respuestas, setRespuestas] = useState(respuestasIniciales);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState('success');
  const [errorPropuestaTexto, setErrorPropuestaTexto] = useState('');
  const [aviso, setAviso] = useState('');
  const [intentoPreferencias, setIntentoPreferencias] = useState(0);

  useEffect(() => {
    let vigente = true;
    api.getPreferenciasOnboarding()
      .then((datos) => {
        if (!vigente) return;
        setRespuestas(adaptarPreferenciasServidor(datos));
      })
      .catch((err) => {
        if (vigente) setErrorCarga(err.message || 'No se pudieron cargar tus preferencias.');
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
  const motivaciones = catalogo?.motivaciones ?? [];
  const categoriasSeleccionadas = categorias.filter((categoria) => respuestas.categorias.includes(categoria.id));

  function alternarCategoriaUI(id) {
    const nombre = categorias.find((categoria) => categoria.id === id)?.nombre ?? 'la categoría';
    const siguiente = alternarCategoria(respuestas, id, actividades);
    setRespuestas((actual) => ({ ...actual, categorias: siguiente.categorias, actividades: siguiente.actividades }));
    setAviso(
      siguiente.quitadas > 0
        ? `Se quitaron ${siguiente.quitadas} ${siguiente.quitadas === 1 ? 'actividad' : 'actividades'} de ${nombre}.`
        : '',
    );
  }

  async function guardar() {
    if (ocupado) return;
    const mensajePropuesta = errorPropuesta(respuestas.propuesta);
    if (mensajePropuesta) {
      setErrorPropuestaTexto(mensajePropuesta);
      return;
    }
    setOcupado(true);
    setMensaje('');
    try {
      const datos = await api.guardarPreferenciasOnboarding(construirPayload(respuestas, 'perfil'));
      setRespuestas(adaptarPreferenciasServidor(datos, actividades));
      setTipoMensaje('success');
      setMensaje('Tus preferencias se guardaron correctamente.');
    } catch (err) {
      setTipoMensaje('error');
      setMensaje(err.message || MENSAJE_GUARDADO);
    } finally {
      setOcupado(false);
    }
  }

  if (cargando || estado === 'cargando') {
    return (
      <ContenedorOnboarding>
        <div role="status" className="flex justify-center py-8">
          <Icono nombre="loader" className="h-8 w-8 text-amber-500 motion-safe:animate-spin" />
          <p className="sr-only">Cargando opciones…</p>
        </div>
      </ContenedorOnboarding>
    );
  }

  if (errorCarga) {
    return (
      <ContenedorOnboarding>
        <div role="alert" className="space-y-4">
          <Alerta tipo="error" mensaje={errorCarga} />
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <BotonAccion variant="outline" onClick={reintentarPreferencias} className="w-full sm:w-auto">
              <Icono nombre="refresh-cw" className="h-4 w-4" />
              Reintentar
            </BotonAccion>
          </div>
        </div>
      </ContenedorOnboarding>
    );
  }

  if (estado === 'error') {
    return (
      <ContenedorOnboarding>
        <div role="alert" className="space-y-4">
          <Alerta tipo="error" mensaje="No se pudieron cargar las opciones del perfil." />
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <BotonAccion variant="outline" onClick={reintentar} className="w-full sm:w-auto">
              <Icono nombre="refresh-cw" className="h-4 w-4" />
              Reintentar
            </BotonAccion>
          </div>
        </div>
      </ContenedorOnboarding>
    );
  }

  return (
    <main className={modoOscuro ? 'bg-[#0b111e] text-white overflow-x-hidden' : 'bg-slate-50 text-slate-900 overflow-x-hidden'}>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-400">Perfil</p>
            <h1 className="text-2xl font-black sm:text-3xl">Mis intereses y preferencias</h1>
          </div>
          <Link to="/campus/campeche/portal" className={`text-sm font-bold underline-offset-4 hover:underline ${modoOscuro ? 'text-slate-300' : 'text-slate-700'}`}>
            Volver
          </Link>
        </div>

        {mensaje && (
          <div role="status" className="mb-4">
            <Alerta tipo={tipoMensaje === 'success' ? 'success' : 'error'} mensaje={mensaje} />
          </div>
        )}

        <ContenedorOnboarding>
          <section className="space-y-8">
            <PasoCategorias categorias={categorias} seleccion={respuestas.categorias} onAlternar={alternarCategoriaUI} aviso={aviso} />
            <PasoActividades
              categoriasSeleccionadas={categoriasSeleccionadas}
              actividades={actividades}
              seleccion={respuestas.actividades}
              onAlternar={(id) => setRespuestas((actual) => ({ ...actual, actividades: alternarElemento(actual.actividades, id) }))}
              propuesta={respuestas.propuesta}
              onCambiarPropuesta={(texto) => {
                setRespuestas((actual) => ({ ...actual, propuesta: texto }));
                setErrorPropuestaTexto('');
              }}
              errorPropuesta={errorPropuestaTexto}
            />
            <PasoMotivaciones motivaciones={motivaciones} seleccion={respuestas.motivaciones} onAlternar={(id) => setRespuestas((actual) => ({ ...actual, motivaciones: alternarElemento(actual.motivaciones, id) }))} />
            <PasoGenero valor={respuestas.genero} onCambiar={(valor) => setRespuestas((actual) => ({ ...actual, genero: valor }))} />
            <PasoCorreo
              correo={respuestas.correo}
              onCambiarDecision={(decision) => setRespuestas((actual) => ({ ...actual, correo: { ...actual.correo, decision, activo: decision === 'aceptar' } }))}
              onAlternarTipo={(tipo) => setRespuestas((actual) => ({ ...actual, correo: { ...actual.correo, tipos: { ...actual.correo.tipos, [tipo]: !actual.correo.tipos[tipo] } } }))}
              onCambiarFrecuencia={(frecuencia) => setRespuestas((actual) => ({ ...actual, correo: { ...actual.correo, frecuencia } }))}
            />
          </section>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link to="/campus/campeche/portal" className={`inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 ${modoOscuro ? 'border border-slate-700 text-slate-300 hover:bg-slate-800' : 'border border-slate-300 text-slate-700 hover:bg-slate-100'}`}>
              Volver al portal
            </Link>
            <BotonAccion onClick={guardar} disabled={ocupado} aria-busy={ocupado} className="w-full sm:w-auto">
              {ocupado ? (
                <>
                  <Icono nombre="loader" className="h-4 w-4 motion-safe:animate-spin" />
                  Guardando…
                </>
              ) : (
                <>
                  <Icono nombre="save" className="h-4 w-4" />
                  Guardar cambios
                </>
              )}
            </BotonAccion>
          </div>
        </ContenedorOnboarding>
      </div>
    </main>
  );
}
