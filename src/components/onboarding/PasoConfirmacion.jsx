import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';
import { BotonAccion } from '../ui/BotonAccion';
import { Alerta } from '../ui/Alerta';

export function PasoConfirmacion({ resumen, onEntrar }) {
  const { modoOscuro } = useTheme();
  const { categorias, actividades, duplicadas } = resumen;
  const textoSecundario = modoOscuro ? 'text-slate-400' : 'text-slate-600';

  return (
    <div className="text-center">
      <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${modoOscuro ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
        <Icono nombre="circle-check" className="h-9 w-9" />
      </span>
      <h2 id="titulo-paso" tabIndex={-1} className={`mt-6 text-2xl font-black tracking-tight outline-none sm:text-3xl ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
        ¡Tu experiencia está lista!
      </h2>
      <p className={`mx-auto mt-3 max-w-md text-sm sm:text-base ${textoSecundario}`}>
        Ya podemos ayudarte a descubrir actividades que coincidan con tus intereses.
      </p>

      <div className={`mt-8 rounded-2xl border p-5 text-left ${modoOscuro ? 'border-slate-700/70 bg-[#0e162c]/60' : 'border-slate-200 bg-slate-50'}`}>
        <p className={`text-xs font-black uppercase tracking-widest ${textoSecundario}`}>Categorías</p>
        {categorias.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {categorias.map((nombre) => (
              <li key={nombre} className={`rounded-full px-3 py-1 text-sm font-bold ${modoOscuro ? 'bg-amber-400/15 text-amber-400' : 'bg-amber-100 text-amber-800'}`}>{nombre}</li>
            ))}
          </ul>
        ) : (
          <p className={`mt-2 text-sm ${textoSecundario}`}>Aún no elegiste categorías.</p>
        )}

        <p className={`mt-5 text-xs font-black uppercase tracking-widest ${textoSecundario}`}>Actividades</p>
        {actividades.length > 0 ? (
          <ul className={`mt-2 flex flex-wrap gap-2 text-sm ${modoOscuro ? 'text-slate-200' : 'text-slate-800'}`}>
            {actividades.map((nombre) => (
              <li key={nombre} className={`rounded-full border px-3 py-1 ${modoOscuro ? 'border-slate-700' : 'border-slate-300'}`}>{nombre}</li>
            ))}
          </ul>
        ) : (
          <p className={`mt-2 text-sm ${textoSecundario}`}>Aún no elegiste actividades.</p>
        )}
      </div>

      {duplicadas.length > 0 && (
        <div className="mt-4 text-left">
          <Alerta tipo="info" mensaje={`Ya habías enviado: ${duplicadas.join(', ')}.`} />
        </div>
      )}

      <div className="mt-8 flex justify-center">
        <BotonAccion size="lg" onClick={onEntrar} className="w-full sm:w-auto sm:min-w-64">
          Entrar a Clubs UNID
          <Icono nombre="arrow-right" className="h-4 w-4" />
        </BotonAccion>
      </div>
    </div>
  );
}
