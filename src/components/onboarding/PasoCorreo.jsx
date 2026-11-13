import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';
import { TarjetaSeleccion } from './TarjetaSeleccion';
import { GrupoRadio } from './GrupoRadio';
import { DECISIONES_CORREO_ONBOARDING, FRECUENCIAS_ONBOARDING, TIPOS_CORREO_ONBOARDING } from '../../constants/onboarding';

// La decisión sobre los correos es explícita: null significa "sin responder".
// Aceptar activa el consentimiento; rechazar lo deja desactivado.
export function PasoCorreo({ correo, onCambiarDecision, onAlternarTipo, onCambiarFrecuencia }) {
  const { modoOscuro } = useTheme();
  const acepta = correo.decision === 'aceptar';
  const decidido = correo.decision === 'aceptar' || correo.decision === 'rechazar';
  const textoSecundario = modoOscuro ? 'text-slate-400' : 'text-slate-600';

  return (
    <div>
      <h2 id="titulo-paso" tabIndex={-1} className={`text-2xl font-black tracking-tight outline-none sm:text-3xl ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
        ¡Mantente al tanto de lo que te interesa!
      </h2>
      <p className={`mt-2 text-sm ${textoSecundario}`}>
        Elige qué novedades quieres recibir en tu correo institucional. Las notificaciones seguirán disponibles dentro de Clubs UNID.
      </p>

      <div className="mt-6">
        <p id="pregunta-correo" className={`text-sm font-black ${modoOscuro ? 'text-slate-200' : 'text-slate-800'}`}>
          ¿Quieres recibir novedades por correo?
        </p>
        <GrupoRadio
          nombre="decision-correo"
          opciones={DECISIONES_CORREO_ONBOARDING}
          valor={correo.decision}
          onCambiar={onCambiarDecision}
          labelledBy="pregunta-correo"
        />
      </div>

      {decidido && !acepta && (
        <p className={`mt-4 text-sm ${textoSecundario}`}>
          No recibirás correos opcionales. Las notificaciones internas y los mensajes de seguridad seguirán llegando.
        </p>
      )}

      {acepta && (
        <>
          <fieldset className="mt-6 space-y-2">
            <legend className="sr-only">Tipos de novedades por correo</legend>
            {TIPOS_CORREO_ONBOARDING.map((tipo) => (
              <TarjetaSeleccion
                key={tipo.id}
                id={`correo-${tipo.id}`}
                seleccionada={correo.tipos[tipo.id] === true}
                onAlternar={() => onAlternarTipo(tipo.id)}
                icono={tipo.icono}
                titulo={tipo.titulo}
                descripcion={tipo.descripcion}
                indicador="cuadro"
              />
            ))}
          </fieldset>

          <div className="mt-6">
            <p id="pregunta-frecuencia" className={`text-sm font-black ${modoOscuro ? 'text-slate-200' : 'text-slate-800'}`}>
              ¿Con qué frecuencia?
            </p>
            <fieldset className="mt-2">
              <legend className="sr-only">Frecuencia de los correos</legend>
              <GrupoRadio
                nombre="frecuencia"
                opciones={FRECUENCIAS_ONBOARDING}
                valor={correo.frecuencia}
                onCambiar={onCambiarFrecuencia}
                labelledBy="pregunta-frecuencia"
              />
            </fieldset>
          </div>
        </>
      )}

      <div className={`mt-6 flex items-start gap-3 rounded-2xl border px-4 py-3 ${modoOscuro ? 'border-slate-700/70' : 'border-slate-200 bg-slate-50'}`}>
        <Icono nombre="shield-check" className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <div>
          <p className={`text-sm font-bold ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>Seguridad de tu cuenta</p>
          <p className={`mt-0.5 text-xs leading-relaxed ${textoSecundario}`}>
            Los códigos OTP y mensajes esenciales de seguridad se enviarán independientemente de estas preferencias.
          </p>
        </div>
      </div>
    </div>
  );
}
