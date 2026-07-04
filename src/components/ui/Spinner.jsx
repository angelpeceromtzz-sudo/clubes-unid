/* Indicador de carga animado (spinner circular). Soporta tamaños sm, md, lg y color personalizado. */
const TAMANOS = {
  sm: { wrap: 'py-4', icon: 'w-4 h-4 border-2' },
  md: { wrap: 'py-8', icon: 'w-6 h-6 border-[3px]' },
  lg: { wrap: 'py-16', icon: 'w-8 h-8 border-4' },
};

export function Spinner({ size = 'lg', className, color = 'border-amber-400' }) {
  const t = TAMANOS[size] || TAMANOS.lg;
  return (
    <div className={`flex justify-center ${className || t.wrap}`}>
      <div className={`animate-spin rounded-full ${t.icon} ${color} border-t-transparent`} />
    </div>
  );
}
