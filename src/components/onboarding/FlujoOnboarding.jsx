/* Flujo completo del onboarding de preferencias: bienvenida, cinco pasos y
   confirmación. Las respuestas viven solo en memoria mientras el componente
   está montado (no se guardan en el navegador) y se envían con un único PUT
   al terminar el paso 5. Lo montará la fase D tras el inicio de sesión. */
import { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';
import { useCatalogoIntereses } from '../../hooks/useCatalogoIntereses';
import { Alerta } from '../ui/Alerta';
import { BotonAccion } from '../ui/BotonAccion';
import { Icono } from '../ui/Icono';
import { ContenedorOnboarding } from './ContenedorOnboarding';
import { PasoBienvenida } from './PasoBienvenida';
import { PasoCategorias } from './PasoCategorias';
import { PasoActividades } from './PasoActividades';
import { PasoMotivaciones } from './PasoMotivaciones';
import { PasoGenero } from './PasoGenero';
import { PasoCorreo } from './PasoCorreo';
import { PasoConfirmacion } from './PasoConfirmacion';
import { TOTAL_PASOS_ONBOARDING } from '../../constants/onboarding';
import {
  alternarCategoria,
  alternarElemento,
  construirPayload,
  errorPropuesta,
  respuestasIniciales,
} from '../../utils/onboardingReglas';

const MENSAJE_GUARDADO = 'No se pudieron guardar tus preferencias. Tus respuestas se conservan; puedes intentarlo de nuevo.';
const MENSAJE_CATALOGO = 'No pudimos cargar las opciones del onboarding.';

export function FlujoOnboarding({ onCompletar }) {
  const { estado, catalogo, reintentar } = useCatalogoIntereses();
  const [paso, setPaso] = useState('bienvenida');
  const [respuestas, setRespuestas] = useState(respuestasIniciales);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [errorPropuestaTexto, setErrorPropuestaTexto] = useState('');
  const [haComenzado, setHaComenzado] = useState(false);
  const [resumen, setResumen] = useState(null);
  const enCurso = useRef(false);

  const categorias = catalogo?.categorias ?? [];
  const actividades = catalogo?.actividades ?? [];
  const motivaciones = catalogo?.motivaciones ?? [];
  const categoriasSeleccionadas = categorias.filter((categoria) => respuestas.categorias.includes(categoria.id));

  useEffect(() => {
    if (paso === 'bienvenida') return;
    document.getElementById('titulo-paso')?.focus();
  }, [paso, estado]);

  function irA(siguiente) {
    if (siguiente === 'bienvenida' && haComenzado) return;
    setAviso('');
    setError('');
    setErrorPropuestaTexto('');
    setPaso(siguiente);
  }

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

  function construirResumen(datos) {
    const respuesta = datos ?? {};
    const nombreCategoria = new Map(categorias.map((categoria) => [categoria.id, categoria.nombre]));
    const nombreActividad = new Map(actividades.map((actividad) => [actividad.id, actividad.nombre]));
    return {
      categorias: (respuesta.categorias ?? []).map((id) => nombreCategoria.get(id)).filter(Boolean),
      actividades: (respuesta.actividades ?? []).map((id) => nombreActividad.get(id)).filter(Boolean),
      duplicadas: respuesta.propuestas_duplicadas ?? [],
    };
  }

  async function guardar() {
    if (enCurso.current) return;
    enCurso.current = true;
    setOcupado(true);
    setError('');
    try {
      const datos = await api.guardarPreferenciasOnboarding(construirPayload(respuestas, 'onboarding'));
      setResumen(construirResumen(datos));
      setPaso('confirmacion');
    } catch (err) {
      setError(
        err.status === 409
          ? 'Ya tienes el máximo de propuestas pendientes de revisión. Quita la propuesta de este paso y vuelve a guardar.'
          : err.message || MENSAJE_GUARDADO,
      );
    } finally {
      enCurso.current = false;
      setOcupado(false);
    }
  }

  function continuar() {
    if (paso === 2) {
      const mensaje = errorPropuesta(respuestas.propuesta);
      if (mensaje) {
        setErrorPropuestaTexto(mensaje);
        return;
      }
    }
    if (paso === 1 && respuestas.categorias.length === 0) {
      setAviso('Selecciona al menos una categoría para continuar.');
      return;
    }
    if (paso === TOTAL_PASOS_ONBOARDING) {
      guardar();
      return;
    }
    irA(paso === 'bienvenida' ? 1 : paso + 1);
  }

  function atras() {
    if (paso === 1 && haComenzado) return;
    irA(paso === 1 ? 'bienvenida' : paso - 1);
  }

  if (paso === 'confirmacion' && resumen) {
    return (
      <ContenedorOnboarding>
        <PasoConfirmacion resumen={resumen} onEntrar={onCompletar} />
      </ContenedorOnboarding>
    );
  }

  if (paso === 'bienvenida') {
    return (
      <ContenedorOnboarding>
        <PasoBienvenida onComenzar={() => { setHaComenzado(true); irA(1); }} ocupado={ocupado} error={error} />
      </ContenedorOnboarding>
    );
  }

  if (estado === 'cargando') {
    return (
      <ContenedorOnboarding progreso={paso}>
        <div role="status" className="flex justify-center py-8">
          <Icono nombre="loader" className="h-8 w-8 text-amber-500 motion-safe:animate-spin" />
          <p className="sr-only">Cargando opciones…</p>
        </div>
      </ContenedorOnboarding>
    );
  }

  if (estado === 'error') {
    return (
      <ContenedorOnboarding progreso={paso}>
        <div role="alert">
          <Alerta tipo="error" mensaje={MENSAJE_CATALOGO} />
        </div>
        <div className="mt-6 flex justify-center">
          <BotonAccion variant="outline" onClick={reintentar} className="w-full sm:w-auto">
            <Icono nombre="refresh-cw" className="h-4 w-4" />
            Reintentar
          </BotonAccion>
        </div>
      </ContenedorOnboarding>
    );
  }

  let contenido = null;
  if (paso === 1) {
    contenido = <PasoCategorias categorias={categorias} seleccion={respuestas.categorias} onAlternar={alternarCategoriaUI} aviso={aviso} />;
  } else if (paso === 2) {
    contenido = (
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
    );
  } else if (paso === 3) {
    contenido = (
      <PasoMotivaciones
        motivaciones={motivaciones}
        seleccion={respuestas.motivaciones}
        onAlternar={(id) => setRespuestas((actual) => ({ ...actual, motivaciones: alternarElemento(actual.motivaciones, id) }))}
      />
    );
  } else if (paso === 4) {
    contenido = (
      <PasoGenero
        valor={respuestas.genero}
        onCambiar={(valor) => setRespuestas((actual) => ({ ...actual, genero: valor }))}
      />
    );
  } else if (paso === 5) {
    contenido = (
      <PasoCorreo
        correo={respuestas.correo}
        onCambiarActivo={(activo) => setRespuestas((actual) => ({ ...actual, correo: { ...actual.correo, activo } }))}
        onAlternarTipo={(tipo) =>
          setRespuestas((actual) => ({
            ...actual,
            correo: { ...actual.correo, tipos: { ...actual.correo.tipos, [tipo]: !actual.correo.tipos[tipo] } },
          }))
        }
        onCambiarFrecuencia={(frecuencia) => setRespuestas((actual) => ({ ...actual, correo: { ...actual.correo, frecuencia } }))}
      />
    );
  }

  const pie = (
    <div>
      {error && (
        <div role="alert" className="mb-4">
          <Alerta tipo="error" mensaje={error} />
        </div>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <BotonAccion variant="outline" onClick={atras} disabled={ocupado} className="w-full sm:w-auto">
          <Icono nombre="arrow-left" className="h-4 w-4" />
          Atrás
        </BotonAccion>
        <BotonAccion onClick={continuar} disabled={ocupado || (paso === 1 && respuestas.categorias.length === 0)} aria-busy={ocupado} className="w-full sm:w-auto">
          {paso === TOTAL_PASOS_ONBOARDING ? (
            ocupado ? (
              <>
                <Icono nombre="loader" className="h-4 w-4 motion-safe:animate-spin" />
                Guardando…
              </>
            ) : (
              <>
                Guardar mis preferencias
                <Icono nombre="check" className="h-4 w-4" />
              </>
            )
          ) : (
            <>
              Continuar
              <Icono nombre="arrow-right" className="h-4 w-4" />
            </>
          )}
        </BotonAccion>
      </div>
    </div>
  );

  return (
    <ContenedorOnboarding progreso={paso} pie={pie}>
      {contenido}
    </ContenedorOnboarding>
  );
}
