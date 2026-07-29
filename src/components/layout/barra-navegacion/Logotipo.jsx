import logoLobo from '../../../assets/logo-lobo.svg';

export function Logotipo({ splashActivo }) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <img src={logoLobo} alt="Logo" id="navbar-logo" className={`w-10 h-10 lg:w-12 lg:h-12 shrink-0 transition-opacity duration-200 ${splashActivo ? 'opacity-0' : 'opacity-100'}`} />
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm sm:text-base lg:text-sm font-black tracking-tight transition-colors duration-300 text-white">
            UNID
          </span>
          <span className="text-[9px] sm:text-[10px] lg:text-[9px] uppercase tracking-widest text-white font-black leading-tight">
            Campeche
          </span>
        </div>
        <p className="text-[9px] sm:text-[10px] lg:text-[9px] uppercase tracking-widest text-amber-400 font-black leading-tight">
          Clubs Lobos Rojos
        </p>
      </div>
    </div>
  );
}
