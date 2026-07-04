import { Icono } from './ui/Icono';

export function ModalExito({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-[#0e162c] border border-slate-700/50 rounded-2xl w-full max-w-md p-8 shadow-2xl text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-5">
          <Icono nombre="check" strokeWidth={2} className="h-6 w-6 text-emerald-400" />
        </div>

        <h2 className="text-xl font-black text-white mb-3">
          ¡Formulario enviado con éxito!
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          Tu postulación ha sido recibida. Puedes dar seguimiento desde la sección <strong className="text-amber-400">"Mis Postulaciones"</strong> en tu panel.
        </p>
        <p className="text-xs text-slate-500 mt-2">
          El presidente del club revisará tu solicitud y notificará cualquier cambio en tu estatus.
        </p>

        <button
          onClick={onClose}
          className="mt-6 bg-amber-400 hover:bg-amber-500 text-[#0e162c] font-black text-sm uppercase tracking-widest rounded-xl px-8 py-3.5 transition-all duration-200 cursor-pointer active:scale-[0.98]"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
