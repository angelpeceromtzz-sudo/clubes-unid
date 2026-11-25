/* Flujo completo del onboarding: conserva un borrador local por usuario para
   recuperar respuestas y paso si se cierra la página o se pierde internet. */
import { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';
import { useAutenticacion } from '../../contexts/AuthContext';
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
import { PasoLicenciatura } from './PasoLicenciatura';
import { PasoFechaNacimiento } from './PasoFechaNacimiento';
import { PasoTelefono } from './PasoTelefono';
import { PasoDisposicion } from './PasoDisposicion';
import { PasoActividadResponsable } from './PasoActividadResponsable';
import { PasoCorreo } from './PasoCorreo';
import { PasoConfirmacion } from './PasoConfirmacion';
import { TOTAL_PASOS_ONBOARDING } from '../../constants/onboarding';
import {
  alternarCategoria,
  alternarElemento,
  construirPayload,
  errorPropuesta,
  pasoEsValido,
  respuestasIniciales,
} from '../../utils/onboardingReglas';

const MENSAJE_GUARDADO = 'No se pudieron guardar tus preferencias. Tus respuestas se conservan; puedes intentarlo de nuevo.';
const MENSAJE_CATALOGO = 'No pudimos cargar las opciones del onboarding.';
const VERSION_BORRADOR_ONBOARDING = 1;

function leerBorrador(clave) {
  if (!clave) return null;
  try {
    const guardado = JSON.parse(window.localStorage.getItem(clave) || 'null');
    if (guardado?.version !== VERSION_BORRADOR_ONBOARDING || !Number.isInteger(guardado.paso) || guardado.paso < 1 || guardado.paso > TOTAL_PASOS_ONBOARDING || !guardado.respuestas) return null;

    const iniciales = respuestasIniciales();
    return {
      paso: guardado.paso,
      respuestas: {
        ...iniciales,
        ...guardado.respuestas,
        correo: {
          ...iniciales.correo,
          ...guardado.respuestas.correo,
          tipos: { ...iniciales.correo.tipos, ...guardado.respuestas.correo?.tipos },
        },
      },
    };
  } catch {
    return null;
  }
}

export function FlujoOnboarding({ onCompletar }) {
  const { estado, catalogo, reintentar } = useCatalogoIntereses();
  const { usuario } = useAutenticacion();
  const idUsuario = usuario?.id_usuario ?? usuario?.id;
  const claveBorrador = idUsuario ? `clubs-unid:onboarding:borrador:${idUsuario}` : null;
  const [borradorInicial] = useState(() => leerBorrador(claveBorrador));
  const [paso, setPaso] = useState(() => borradorInicial?.paso ?? 'bienvenida');
  const [respuestas, setRespuestas] = useState(() => borradorInicial?.respuestas ?? respuestasIniciales());
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [errorPropuestaTexto, setErrorPropuestaTexto] = useState('');
  const [haComenzado, setHaComenzado] = useState(() => Boolean(borradorInicial));
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

  useEffect(() => {
    if (!claveBorrador) return;
    if (paso === 'confirmacion') {
      try {
        window.localStorage.removeItem(claveBorrador);
      } catch {
        // No interrumpe la confirmación si el navegador bloquea el almacenamiento local.
      }
      return;
    }
    if (!haComenzado || typeof paso !== 'number') return;

    try {
      window.localStorage.setItem(claveBorrador, JSON.stringify({
        version: VERSION_BORRADOR_ONBOARDING,
        paso,
        respuestas,
        actualizadoEn: new Date().toISOString(),
      }));
    } catch {
      // El formulario sigue funcionando aunque el navegador no permita guardar localmente.
    }
  }, [claveBorrador, haComenzado, paso, respuestas]);

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
    if (!pasoEsValido(paso, respuestas)) {
      if (paso === 1) setAviso('Selecciona al menos una categoría para continuar.');
      else if (paso === 2) setAviso('Selecciona al menos una actividad o propón una nueva.');
      else if (paso === 3) setAviso('Selecciona al menos una motivación para continuar.');
      else if (paso === 4) setAviso('Selecciona una opción para continuar.');
      else if (paso === 5) setAviso('Selecciona tu licenciatura para continuar.');
      else if (paso === 6) setAviso('Indica tu fecha de nacimiento para continuar.');
      else if (paso === 7) setAviso('Indica tu disposición para continuar.');
      else if (paso === 8) setAviso('Escribe un número de teléfono de 10 dígitos.');
      else if (paso === 9) setAviso('Selecciona al menos una actividad que te gustaría coordinar.');
      else if (paso === 10) setAviso('Indica si quieres recibir correos opcionales.');
      return;
    }
    if (paso === 7) {
      irA(8);
      return;
    }
    if (paso === 8) {
      irA(respuestas.disposicion === 'responsable' ? 9 : 10);
      return;
    }
    if (paso === 9) {
      irA(10);
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
    if (paso === 10) {
      irA(respuestas.disposicion === 'responsable' ? 9 : 8);
      return;
    }
    if (paso === 9) {
      irA(8);
      return;
    }
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
      <PasoLicenciatura
        valor={respuestas.licenciatura}
        onCambiar={(valor) => setRespuestas((actual) => ({ ...actual, licenciatura: valor }))}
      />
    );
  } else if (paso === 6) {
    contenido = (
      <PasoFechaNacimiento
        valor={respuestas.fechaNacimiento}
        onCambiar={(valor) => setRespuestas((actual) => ({ ...actual, fechaNacimiento: valor }))}
      />
    );
  } else if (paso === 7) {
    contenido = (
      <PasoDisposicion
        valor={respuestas.disposicion}
        onCambiar={(valor) => setRespuestas((actual) => ({ ...actual, disposicion: valor, actividadesResponsable: valor === 'responsable' ? actual.actividadesResponsable : [] }))}
      />
    );
  } else if (paso === 8) {
    contenido = (
      <PasoTelefono
        valor={respuestas.telefono}
        onCambiar={(valor) => setRespuestas((actual) => ({ ...actual, telefono: valor }))}
      />
    );
  } else if (paso === 9) {
    const actividadesSeleccionadas = actividades.filter((a) => respuestas.actividades.includes(a.id));
    contenido = (
      <PasoActividadResponsable
        actividades={actividadesSeleccionadas}
        seleccion={respuestas.actividadesResponsable}
        onAlternar={(id) => setRespuestas((actual) => ({ ...actual, actividadesResponsable: alternarElemento(actual.actividadesResponsable, id) }))}
      />
    );
  } else if (paso === 10) {
    contenido = (
      <PasoCorreo
        correo={respuestas.correo}
        onCambiarDecision={(decision) =>
          setRespuestas((actual) => ({
            ...actual,
            correo: { ...actual.correo, decision, activo: decision === 'aceptar' },
          }))
        }
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
      {haComenzado && paso !== 'confirmacion' && (
        <p className="mb-3 text-center text-[11px] text-slate-500">
          Tus respuestas se guardan automáticamente en este dispositivo.
        </p>
      )}
      {error && (
        <div role="alert" className="mb-4">
          <Alerta tipo="error" mensaje={error} />
        </div>
      )}
      <div className={`flex flex-col-reverse gap-3 sm:flex-row sm:items-center ${paso === 1 ? 'items-end sm:justify-end' : 'sm:justify-between'}`}>
        {paso !== 1 && (
          <BotonAccion variant="outline" onClick={atras} disabled={ocupado} className="w-full sm:w-auto">
            <Icono nombre="arrow-left" className="h-4 w-4" />
            Atrás
          </BotonAccion>
        )}
        <BotonAccion onClick={continuar} disabled={ocupado || !pasoEsValido(paso, respuestas) || (paso === 2 && Boolean(errorPropuesta(respuestas.propuesta)))} aria-busy={ocupado} className={paso === 1 ? 'w-auto min-w-[9rem]' : 'w-full sm:w-auto'}>
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
