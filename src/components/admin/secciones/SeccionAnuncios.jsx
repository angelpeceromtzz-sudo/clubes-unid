import { useTheme } from '../../../contexts/ThemeContext';
import { FormularioNotificacion } from '../../formularios/FormularioNotificacion';

export function SeccionAnuncios({ clubes, onSuccess }) {
  const { tema, cardCls } = useTheme();

  return (
    <div className="max-w-2xl">
      <div className={`rounded-2xl p-6 ${cardCls || 'bg-white border border-slate-200'}`}>
        <h2 className={`text-lg font-black uppercase tracking-wider mb-2 ${tema.title}`}>
          Crear Anuncio
        </h2>
        <p className={`text-sm mb-6 ${tema.subtitle}`}>
          Redacta un anuncio y selecciona la audiencia destino.
        </p>
        <FormularioNotificacion
          clubes={clubes}
          onSuccess={onSuccess}
        />
      </div>
    </div>
  );
}
