import { useTheme } from '../../contexts/ThemeContext';
import './RegistroActividad.css';

export function CampoRegistroActividad({ id, etiqueta, ayuda, className = '', children }) {
  const { tema } = useTheme();

  return <div className={'min-w-0 space-y-2 ' + className}>
    <label htmlFor={id} className={'block text-sm font-semibold leading-5 ' + tema.title}>{etiqueta}</label>
    {children}
    {ayuda && <p id={id + '-ayuda'} className={'text-xs font-normal leading-relaxed ' + tema.subtitle}>{ayuda}</p>}
  </div>;
}
