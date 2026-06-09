export function ClubCard({ nombre, descripcion, precio, categoria, cupoMaximo, cupoActual, imagen, onClick, modoOscuro = true }) {
  const lleno = cupoActual >= cupoMaximo;

  const c = modoOscuro
    ? {
        card: "bg-[#0e162c] border-slate-800/50 hover:border-slate-700 hover:shadow-amber-400/5",
        title: "text-white",
        desc: "text-slate-400",
        divider: "bg-slate-800",
        label: "text-slate-500",
        price: "text-white",
        lugares: "text-slate-400",
      }
    : {
        card: "bg-white border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-amber-500/10",
        title: "text-slate-900",
        desc: "text-slate-600",
        divider: "bg-slate-200",
        label: "text-slate-400",
        price: "text-slate-900",
        lugares: "text-slate-600",
      };

  return (
    <div
      onClick={onClick}
      className={`group rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col justify-between border cursor-pointer active:scale-[0.98] ${c.card}`}
    >
      <div>
        <div className="overflow-hidden rounded-xl h-40 mb-5">
          <img
            src={imagen}
            alt={nombre}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] uppercase tracking-widest font-bold text-amber-400/80 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
            {categoria}
          </span>
        </div>
        <h3 className={`text-lg font-bold group-hover:text-amber-400 transition-colors duration-200 ${c.title}`}>
          {nombre}
        </h3>
        <p className={`text-xs mt-2 font-medium leading-relaxed line-clamp-3 ${c.desc}`}>
          {descripcion}
        </p>
      </div>

      <div>
        <div className={`h-px my-5 ${c.divider}`} />
        <div className="flex items-center justify-between">
          <div>
            <span className={`text-[10px] uppercase tracking-wider font-bold block ${c.label}`}>
              Costo Mensual
            </span>
            <span className={`text-lg font-black ${c.price}`}>
              {precio === 0 ? (
                <span className="text-amber-400 uppercase text-sm tracking-wide">Gratis</span>
              ) : (
                `$${precio} MXN`
              )}
            </span>
          </div>

          <span className={`text-[10px] font-bold tracking-wide ${lleno ? 'text-red-400' : c.lugares}`}>
            Lugares: {cupoActual} / {cupoMaximo}
          </span>
        </div>
      </div>
    </div>
  );
}
