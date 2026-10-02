export function BienvenidoCard({ tema, nombreClub }) {
  return (
    <div className={`rounded-xl p-4 border ${tema.isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'} text-center`}>
      <p className="text-2xl mb-1">🎉</p>
      <p className={`text-sm font-bold ${tema.isDark ? 'text-amber-300' : 'text-amber-700'}`}>
        Bienvenido al club
      </p>
      <p className={`text-xs mt-1 ${tema.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        Ya eres parte de {nombreClub}
      </p>
    </div>
  );
}
