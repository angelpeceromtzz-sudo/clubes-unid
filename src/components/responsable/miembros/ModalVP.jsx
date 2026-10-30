export function ModalVP({ modalVP, modoOscuro, tema, onClose, onConfirm }) {
  if (!modalVP) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-md rounded-2xl p-6 shadow-xl ${modoOscuro ? 'bg-[#0e162c] border border-slate-700/50' : 'bg-white border border-slate-200'}`}>
        <div className="text-center">
          <div className={`mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center ${modalVP.accion === 'asignar' ? 'bg-emerald-500/10' : 'bg-blue-500/10'}`}>
            <span className={`text-2xl ${modalVP.accion === 'asignar' ? 'text-emerald-400' : 'text-blue-400'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
          </div>
          <h3 className={`text-lg font-bold ${tema.title}`}>
            {modalVP.accion === 'asignar' ? 'Designar Vicepresidente' : 'Quitar Vicepresidente'}
          </h3>
          <p className={`mt-2 text-sm ${modoOscuro ? 'text-slate-400' : 'text-slate-600'}`}>
            {modalVP.accion === 'asignar'
              ? `¿Seguro que quieres designar a ${modalVP.usuario.nombre_completo} como Vicepresidente del club?`
              : `¿Seguro que quieres quitar a ${modalVP.usuario.nombre_completo} como Vicepresidente?`}
          </p>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${modoOscuro ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
          >
            Cancelar
          </button>
          <button onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors cursor-pointer ${modalVP.accion === 'asignar' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {modalVP.accion === 'asignar' ? 'Designar' : 'Quitar'}
          </button>
        </div>
      </div>
    </div>
  );
}
