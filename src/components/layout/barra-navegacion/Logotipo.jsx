import { useTheme } from '../../../contexts/ThemeContext';

export function Logotipo({ splashActivo }) {
  const { modoOscuro } = useTheme();
  return (
    <div className="flex items-center shrink-0">
      <img draggable={false} src="/branding/lobounid.png" alt="Lobo UNID" id="navbar-logo" className={`h-8 sm:h-10 w-auto shrink-0 transition-opacity duration-200 ${splashActivo ? 'opacity-0' : 'opacity-100'}`} />
      <img draggable={false} src={modoOscuro ? '/branding/clubs-unid.png' : '/branding/clubs-unid-modoclaro.png'} alt="Clubs UNID" className="h-9 sm:h-12 w-auto object-contain self-center -ml-1 sm:ml-0" />
    </div>
  );
}