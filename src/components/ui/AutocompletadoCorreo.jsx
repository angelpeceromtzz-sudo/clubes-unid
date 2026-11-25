import { useRef, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { DOMINIOS_OTP } from '../../utils/otpAcceso';
import { obtenerSugerenciasCorreo } from '../../utils/autocompletadoCorreo';
import { CampoTexto } from './CampoTexto';
import { Icono } from './Icono';

/**
 * Campo de correo con sugerencias de dominios institucionales.
 * El valor solo cambia cuando el usuario elige explícitamente una opción.
 */
export function AutocompletadoCorreo({
  name,
  value,
  onChange,
  onBlur,
  onSeleccionar,
  dominios = DOMINIOS_OTP,
  ...propsCampo
}) {
  const { modoOscuro } = useTheme();
  const inputInternoRef = useRef(null);
  const [abierto, setAbierto] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(-1);
  const esOscuro = modoOscuro;

  const sugerencias = obtenerSugerenciasCorreo(value, dominios);
  const mostrar = abierto && sugerencias.length > 0;
  const idLista = `${name || 'correo'}-sugerencias`;
  const idEtiqueta = `${idLista}-etiqueta`;

  function seleccionar(sugerencia) {
    setAbierto(false);
    setIndiceActivo(-1);
    onSeleccionar?.(sugerencia);
    inputInternoRef.current?.focus();
  }

  function manejarCambio(e) {
    onChange?.(e);
    setAbierto(true);
    setIndiceActivo(-1);
  }

  function manejarBlur(e) {
    setAbierto(false);
    setIndiceActivo(-1);
    onBlur?.(e);
  }

  function manejarTeclado(e) {
    if (!mostrar) {
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndiceActivo((indice) => (indice + 1) % sugerencias.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceActivo((indice) => (indice <= 0 ? sugerencias.length - 1 : indice - 1));
    } else if (e.key === 'Enter' && indiceActivo >= 0) {
      e.preventDefault();
      seleccionar(sugerencias[indiceActivo]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setAbierto(false);
      setIndiceActivo(-1);
    } else if (e.key === 'Tab') {
      setAbierto(false);
      setIndiceActivo(-1);
    }
  }

  return (
    <div className="relative">
      <CampoTexto
        {...propsCampo}
        name={name}
        value={value}
        onChange={manejarCambio}
        onBlur={manejarBlur}
        inputRef={inputInternoRef}
        inputProps={{
          onKeyDown: manejarTeclado,
          role: 'combobox',
          'aria-autocomplete': 'list',
          'aria-expanded': mostrar,
          'aria-controls': idLista,
          'aria-activedescendant': indiceActivo >= 0 ? `${idLista}-opcion-${indiceActivo}` : undefined,
        }}
      />

      {mostrar && (
        <div
          className={`absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border shadow-xl ${
            esOscuro
              ? 'border-amber-400/30 bg-[#0e162c] shadow-black/50'
              : 'border-amber-500/30 bg-white shadow-slate-300/70'
          }`}
        >
          <p
            id={idEtiqueta}
            className={`border-b px-3 py-2 text-[10px] font-black uppercase tracking-widest ${
              esOscuro
                ? 'border-slate-700/60 text-amber-400/80'
                : 'border-slate-200 text-amber-700'
            }`}
          >
            Dominios institucionales
          </p>
          <div
            id={idLista}
            role="listbox"
            aria-labelledby={idEtiqueta}
            className="max-h-52 overflow-y-auto py-1 scrollbar-amber"
          >
            {sugerencias.map((sugerencia, indice) => {
              const activo = indice === indiceActivo;

              return (
                <button
                  key={sugerencia}
                  type="button"
                  id={`${idLista}-opcion-${indice}`}
                  role="option"
                  aria-selected={activo}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setIndiceActivo(indice)}
                  onClick={() => seleccionar(sugerencia)}
                  className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors ${
                    activo
                      ? esOscuro
                        ? 'bg-amber-400/15 text-amber-300'
                        : 'bg-amber-100 text-amber-800'
                      : esOscuro
                        ? 'text-slate-200 hover:bg-amber-400/10'
                        : 'text-slate-700 hover:bg-amber-50'
                  }`}
                >
                  <Icono nombre="mail" className="h-4 w-4 shrink-0 text-amber-400" />
                  <span className="break-all">{sugerencia}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
