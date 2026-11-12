import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';
import { BotonAccion } from '../ui/BotonAccion';
import { Alerta } from '../ui/Alerta';

export function PasoBienvenida({ onComenzar, ocupado = false, error = '' }) {
  const { modoOscuro } = useTheme();
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <img
          src="/branding/lobounid.png"
          alt=""
          aria-hidden="true"
          className="h-[120px] w-[120px] object-contain sm:h-[130px] sm:w-[130px]"
          draggable={false}
        />
        <h2 id="titulo-paso" tabIndex={-1} className={`mt-6 text-2xl font-black tracking-tight outline-none sm:text-3xl ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
          ¡Bienvenido a Clubs UNID!
        </h2>
        <p className={`mx-auto mt-4 max-w-md text-sm leading-relaxed sm:text-base ${modoOscuro ? 'text-slate-300' : 'text-slate-600'}`}>
          Queremos ayudarte a descubrir clubes, conocer personas y vivir nuevas experiencias en tu universidad.
        </p>
        <p className={`mt-3 text-sm font-bold ${modoOscuro ? 'text-slate-200' : 'text-slate-700'}`}>
          Personaliza tu experiencia en menos de 2 minutos.
        </p>

        {error && (
          <div role="alert" className="mt-6 w-full text-left">
            <Alerta tipo="error" mensaje={error} />
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col items-center gap-3">
        <BotonAccion size="lg" onClick={onComenzar} disabled={ocupado} className="w-full sm:w-auto sm:min-w-64">
          Comenzar
          <Icono nombre="arrow-right" className="h-4 w-4" />
        </BotonAccion>
        <p className={`text-xs ${modoOscuro ? 'text-slate-500' : 'text-slate-500'}`}>
          Tu experiencia universitaria empieza aquí.
        </p>
      </div>
    </div>
  );
}
