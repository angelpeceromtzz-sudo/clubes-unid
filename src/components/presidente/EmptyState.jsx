import { RutaProtegida } from '../RutaProtegida';

export function EstadoVacio({ tema }) {
  return (
    <RutaProtegida>
      <div className="max-w-lg mx-auto px-6 py-20 text-center">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-10">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
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
