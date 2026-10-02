import { Icono } from '../ui/Icono';
import { Spinner } from '../ui/Spinner';

export function OfertaCard({ postulacion, tiempoRestante, cargandoRespuesta, tema, onRespuesta }) {
  return (
    <div className="space-y-3">
      <div className={`rounded-xl p-3 border ${tema.isDark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'}`}>
        <p className={`text-xs font-semibold ${tema.isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
          ¡Felicidades! Has sido seleccionado para formar parte de este club.
        </p>
        {postulacion.fecha_expiracion && (
          <p className={`text-xs mt-1.5 ${tiempoRestante === 'Expirada' ? 'text-red-400' : tema.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            ⏳ Tienes hasta el {new Date(postulacion.fecha_expiracion).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })} a las {new Date(postulacion.fecha_expiracion).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} hrs para responder
            {tiempoRestante && tiempoRestante !== 'Expirada' && (
              <span className="block mt-0.5 font-bold text-emerald-400">({tiempoRestante} restantes)</span>
            )}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onRespuesta(postulacion.id_formulario, 'aceptar')}
          disabled={cargandoRespuesta}
          className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider rounded-xl px-4 py-3 transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {cargandoRespuesta === 'aceptar' ? (
            <Spinner size="sm" color="border-black" className="!py-0" />
          ) : (
            <>
              <Icono nombre="check" strokeWidth={2.5} className="h-4 w-4" />
              Aceptar oferta
            </>
          )}
        </button>
        <button
          onClick={() => onRespuesta(postulacion.id_formulario, 'rechazar')}
          disabled={cargandoRespuesta}
          className={`flex-1 border rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${
            tema.isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
          }`}
        >
          {cargandoRespuesta === 'rechazar' ? (
            <Spinner size="sm" color="border-current" className="!py-0" />
          ) : (
            'Rechazar'
          )}
        </button>
      </div>
    </div>
  );
}
