// El hijo recibe las propiedades (props) desde el padre
export function ClubCard({ nombre, descripcion, precio }) {
  return (
    <div className="group bg-[#0e162c] border border-slate-800/60 rounded-2xl p-5 shadow-lg hover:border-slate-700 hover:shadow-2xl hover:shadow-amber-400/5 transition-all duration-300 flex flex-col justify-between min-h-[180px]">
      <div>
        <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors duration-200">
          {nombre}
        </h3>
        <p className="text-slate-400 text-xs mt-2 font-medium leading-relaxed line-clamp-3">
          {descripcion}
        </p>
      </div>
      
      <div>
        <div className="h-px bg-slate-800 my-4" />
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block">
              Costo Mensual
            </span>
            <span className="text-lg font-black text-white">
              {precio === 0 ? (
                <span className="text-amber-400 uppercase text-sm tracking-wide">Gratis</span>
              ) : (
                `$${precio} MXN`
              )}
            </span>
          </div>
          
          <button 
            onClick={() => alert(`¡Inscripción para: ${nombre}!`)}
            className="bg-[#18223f] text-slate-200 hover:bg-amber-400 hover:text-[#0e162c] font-bold text-xs tracking-wide px-4 py-2 rounded-xl border border-slate-700 hover:border-amber-400 transition-all duration-200 cursor-pointer active:scale-95"
          >
            Inscribirse
          </button>
        </div>
      </div>
    </div>
  );
}