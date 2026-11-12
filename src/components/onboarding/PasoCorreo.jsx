import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';
import { TarjetaSeleccion } from './TarjetaSeleccion';
import { GrupoRadio } from './GrupoRadio';
import { FRECUENCIAS_ONBOARDING, TIPOS_CORREO_ONBOARDING } from '../../constants/onboarding';

// El interruptor general solo deshabilita las opciones: las selecciones
// individuales y la frecuencia se conservan mientras esté apagado.
export function PasoCorreo({ correo, onCambiarActivo, onAlternarTipo, onCambiarFrecuencia }) {
  const { modoOscuro } = useTheme();
  const apagado = !correo.activo;
  const textoSecundario = modoOscuro ? 'text-slate-400' : 'text-slate-600';

  return (
    <div>
      <h2 id="titulo-paso" tabIndex={-1} className={`text-2xl font-black tracking-tight outline-none sm:text-3xl ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
        ¡Mantente al tanto de lo que te interesa!
      </h2>
      <p className={`mt-2 text-sm ${textoSecundario}`}>
        Elige qué novedades quieres recibir en tu correo institucional. Las notificaciones seguirán disponibles dentro de Clubs UNID.
      </p>

      <div className={`mt-6 flex items-center gap-4 rounded-2xl border px-4 py-4 ${modoOscuro ? 'border-slate-700/70 bg-[#0e162c]/60' : 'border-slate-200 bg-white'}`}>
        <Icono nombre="mail" className="h-5 w-5 shrink-0 text-amber-500" />
        <div className="min-w-0 flex-1">
          <p id="etiqueta-correo" className={`font-bold ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>Recibir novedades por correo</p>
          <p className={`text-sm ${textoSecundario}`}>Activa las preferencias de correo.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={correo.activo}
          aria-labelledby="etiqueta-correo"
          onClick={() => onCambiarActivo(!correo.activo)}
          className={`motion-safe:transition motion-reduce:transition-none relative inline-flex h-6 w-11 shrink-0 items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 ${
            correo.activo ? 'bg-amber-500' : modoOscuro ? 'bg-slate-700' : 'bg-slate-400'
          }`}
        >
          <span
            aria-hidden="true"
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow motion-safe:transition motion-reduce:transition-none ${
              correo.activo ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      <fieldset disabled={apagado} className="mt-4 space-y-2 disabled:opacity-60">
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
            disabled={apagado}
          />
        ))}
      </fieldset>

      <div className="mt-6">
        <p id="pregunta-frecuencia" className={`text-sm font-black ${modoOscuro ? 'text-slate-200' : 'text-slate-800'}`}>
          ¿Con qué frecuencia?
        </p>
        <fieldset disabled={apagado} className="disabled:opacity-60">
          <legend className="sr-only">Frecuencia de los correos</legend>
          <GrupoRadio
            nombre="frecuencia"
            opciones={FRECUENCIAS_ONBOARDING}
            valor={correo.frecuencia}
            onCambiar={onCambiarFrecuencia}
            labelledBy="pregunta-frecuencia"
            disabled={apagado}
          />
        </fieldset>
      </div>

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
