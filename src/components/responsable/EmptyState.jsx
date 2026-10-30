import { RutaProtegida } from '../layout/RutaProtegida';
import { Icono } from '../ui/Icono';
import { useTheme } from '../../contexts/ThemeContext';

export function EstadoVacio() {
  const { tema } = useTheme();
  return (
    <RutaProtegida>
      <div className="max-w-lg mx-auto px-6 py-20 text-center">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-10">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <Icono nombre="lock" className="h-8 w-8 text-amber-400" strokeWidth={1.5} />
          </div>
          <h2 className={`text-xl font-black mb-3 ${tema.title}`}>
            Acceso Restringido
          </h2>
          <p className="text-amber-400 font-semibold text-sm mb-2">
            Aún no tienes un club asignado por el Administrador.
          </p>
          <p className={`text-sm ${tema.subtitle}`}>
            Por favor, contacta al administrador del sistema.
          </p>
        </div>
      </div>
    </RutaProtegida>
  );
}
