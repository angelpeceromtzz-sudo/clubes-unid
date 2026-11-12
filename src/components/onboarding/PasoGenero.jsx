import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';
import { GrupoRadio } from './GrupoRadio';
import { GENEROS_ONBOARDING } from '../../constants/onboarding';

// "Prefiero no responder" es una respuesta explícita; sin selección el campo
// queda sin responder (null). Por eso una opción marcada no se desmarca.
export function PasoGenero({ valor, onCambiar }) {
  const { modoOscuro } = useTheme();
  return (
    <div>
      <h2 id="titulo-paso" tabIndex={-1} className={`text-2xl font-black tracking-tight outline-none sm:text-3xl ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
        Queremos conocer mejor a nuestra comunidad
      </h2>
      <p className={`mt-2 text-sm ${modoOscuro ? 'text-slate-400' : 'text-slate-600'}`}>
        Esta pregunta es opcional y nos ayuda a comprender las preferencias de los distintos grupos de estudiantes.
      </p>

      <div className="mt-6">
        <p id="pregunta-genero" className={`text-sm font-black ${modoOscuro ? 'text-slate-200' : 'text-slate-800'}`}>
          ¿Con qué género te identificas?
        </p>
        <GrupoRadio
          nombre="genero"
          opciones={GENEROS_ONBOARDING}
          valor={valor}
          onCambiar={onCambiar}
          labelledBy="pregunta-genero"
        />
      </div>

      <p className={`mt-6 flex items-start gap-2 text-xs leading-relaxed ${modoOscuro ? 'text-slate-400' : 'text-slate-600'}`}>
        <Icono nombre="shield-check" className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <span>
          Tu respuesta se utilizará para estadísticas agrupadas y no limitará tus recomendaciones.{' '}
          <Link to="/privacidad" className={`font-bold underline-offset-4 hover:underline ${modoOscuro ? 'text-amber-400' : 'text-amber-700'}`}>
            Aviso de privacidad
          </Link>
        </span>
      </p>
    </div>
  );
}
