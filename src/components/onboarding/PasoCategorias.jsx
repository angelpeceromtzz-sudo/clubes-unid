import { useTheme } from '../../contexts/ThemeContext';
import { Alerta } from '../ui/Alerta';
import { Icono } from '../ui/Icono';
import { TarjetaSeleccion } from './TarjetaSeleccion';
import { DESCRIPCION_CATEGORIA, ICONO_CATEGORIA } from '../../constants/onboarding';

export function PasoCategorias({ categorias, seleccion, onAlternar, aviso = '' }) {
  const { modoOscuro } = useTheme();
  return (
    <div>
      <h2 id="titulo-paso" tabIndex={-1} className={`text-2xl font-black tracking-tight outline-none sm:text-3xl ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
        ¿Qué te apasiona?
      </h2>
      <p className={`mt-2 text-sm ${modoOscuro ? 'text-slate-400' : 'text-slate-600'}`}>
        Selecciona las categorías que más te interesan. Puedes elegir varias.
      </p>

      {categorias.length === 0 ? (
        <div className="mt-6">
          <Alerta tipo="info" mensaje="Por ahora no hay categorías disponibles." />
        </div>
      ) : (
        <fieldset className="mt-6 space-y-3">
          <legend className="sr-only">Categorías de interés</legend>
          {categorias.map((categoria) => (
            <TarjetaSeleccion
              key={categoria.id}
              id={`categoria-${categoria.id}`}
              seleccionada={seleccion.includes(categoria.id)}
              onAlternar={() => onAlternar(categoria.id)}
              icono={ICONO_CATEGORIA[categoria.nombre] ?? 'star'}
              titulo={categoria.nombre}
              descripcion={DESCRIPCION_CATEGORIA[categoria.nombre]}
              indicador="circulo"
            />
          ))}
        </fieldset>
      )}

      <p role="status" className={`mt-4 flex items-start gap-2 text-sm empty:hidden ${modoOscuro ? 'text-amber-300' : 'text-amber-800'}`}>
        {aviso && (
          <>
            <Icono nombre="info" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{aviso}</span>
          </>
        )}
      </p>
    </div>
  );
}
