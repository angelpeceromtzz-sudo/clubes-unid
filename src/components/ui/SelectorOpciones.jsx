import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from './Icono';

// Selector compartido con el filtro de Noticias.
export function SelectorOpciones({ id, valor, alCambiar, opciones, etiqueta, mostrarEtiqueta = false, icono, required = false, disabled = false, name, descripcionId, className = '', botonClassName = '' }) {
  const { modoOscuro } = useTheme();
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const [invalido, setInvalido] = useState(false);
  const contenedorRef = useRef(null);
  const botonRef = useRef(null);
  const opcionesRef = useRef([]);
  const seleccionada = opciones.find((opcion) => opcion.value === valor);
  const mostrarError = invalido && required && !valor;
  const descripcion = [descripcionId, mostrarError ? id + '-error' : null].filter(Boolean).join(' ') || undefined;

  useEffect(() => {
    if (!abierto) return;
    function cerrarAlPulsarFuera(evento) {
      if (!contenedorRef.current?.contains(evento.target)) setAbierto(false);
    }
    document.addEventListener('pointerdown', cerrarAlPulsarFuera);
    return () => document.removeEventListener('pointerdown', cerrarAlPulsarFuera);
  }, [abierto]);

  useEffect(() => {
    if (abierto && !disabled) opcionesRef.current[activo]?.focus();
  }, [abierto, activo, disabled]);

  function abrir() {
    if (disabled || !opciones.length) return;
    const indice = opciones.findIndex((opcion) => opcion.value === valor && !opcion.disabled);
    setActivo(indice >= 0 ? indice : Math.max(0, opciones.findIndex((opcion) => !opcion.disabled)));
    setAbierto(true);
  }

  function cerrar(devolverFoco = false) {
    setAbierto(false);
    if (devolverFoco) botonRef.current?.focus();
  }

  function elegir(opcion) {
    if (disabled || opcion.disabled) return;
    alCambiar(opcion.value);
    setInvalido(false);
    cerrar(true);
  }

  function mover(paso) {
    setActivo((indice) => {
      for (let intento = 1; intento <= opciones.length; intento++) {
        const siguiente = (indice + paso * intento + opciones.length) % opciones.length;
        if (!opciones[siguiente].disabled) return siguiente;
      }
      return indice;
    });
  }

  function manejarTeclaLista(evento) {
    switch (evento.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        evento.preventDefault();
        mover(evento.key === 'ArrowDown' ? 1 : -1);
        break;
      case 'Home':
      case 'End': {
        evento.preventDefault();
        const indices = opciones.map((_opcion, indice) => indice).filter((indice) => !opciones[indice].disabled);
        setActivo((evento.key === 'Home' ? indices[0] : indices.at(-1)) ?? 0);
        break;
      }
      case 'Escape':
        evento.preventDefault();
        evento.stopPropagation();
        cerrar(true);
        break;
      case 'Enter':
      case ' ':
        evento.preventDefault();
        if (opciones[activo]) elegir(opciones[activo]);
        break;
      case 'Tab':
        cerrar(true);
        break;
      default:
        break;
    }
  }

  return <div ref={contenedorRef} className={'relative min-w-0 ' + className}>
    {mostrarEtiqueta && <label htmlFor={id} className={`mb-2 block text-xs font-semibold ${modoOscuro ? 'text-slate-300' : 'text-slate-600'}`}>{etiqueta}</label>}
    <select
      name={name}
      value={valor}
      onChange={(evento) => elegir({ value: evento.target.value })}
      required={required}
      disabled={disabled}
      tabIndex={-1}
      aria-hidden="true"
      className="pointer-events-none sr-only"
      onInvalid={(evento) => {
        evento.preventDefault();
        setInvalido(true);
        botonRef.current?.focus();
      }}
    >
      {opciones.map((opcion) => <option key={opcion.value} value={opcion.value} disabled={opcion.disabled}>{opcion.label}</option>)}
    </select>
    <button
      ref={botonRef}
      id={id}
      type="button"
      disabled={disabled}
      aria-label={etiqueta + ': ' + (seleccionada?.label || 'Selecciona una opción')}
      aria-haspopup="listbox"
      aria-expanded={abierto && !disabled}
      aria-controls={id + '-opciones'}
      aria-invalid={mostrarError || undefined}
      aria-describedby={descripcion}
      onClick={() => (abierto ? cerrar() : abrir())}
      onKeyDown={(evento) => {
        if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
          evento.preventDefault();
          abrir();
        }
      }}
       className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 disabled:cursor-not-allowed disabled:opacity-50 ${
        modoOscuro ? 'bg-[#172238] text-white' : 'bg-white text-slate-900'
      } ${
        mostrarError ? 'border-red-400' : abierto
           ? modoOscuro ? 'border-sky-300' : 'border-sky-500'
           : modoOscuro ? 'border-slate-600 hover:border-sky-300/70' : 'border-slate-300 hover:border-sky-500'
      } ${botonClassName}`}
    >
       {icono && <Icono nombre={icono} className={`h-4 w-4 shrink-0 ${modoOscuro ? 'text-sky-300' : 'text-sky-600'}`} strokeWidth={2} />}
      <span className="min-w-0 flex-1 truncate">{seleccionada?.label || 'Selecciona una opción'}</span>
       <Icono nombre="chevron-down" className={`h-4 w-4 shrink-0 transition-transform ${modoOscuro ? 'text-sky-300' : 'text-sky-600'} ${abierto ? 'rotate-180' : ''}`} strokeWidth={2.5} />
    </button>
    {abierto && !disabled && <div
      id={id + '-opciones'}
      role="listbox"
      aria-label={etiqueta}
      onKeyDown={manejarTeclaLista}
      className={`absolute top-full right-0 left-0 z-50 mt-2 max-h-64 overflow-y-auto overscroll-contain rounded-xl border p-1.5 ${
        modoOscuro
          ? 'border-slate-600 bg-[#121d30] shadow-[0_14px_32px_rgba(2,6,23,0.45)]'
          : 'border-slate-200 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.16)]'
      }`}
    >
      {opciones.map((opcion, indice) => {
        const elegida = valor === opcion.value;
        return <button
          key={opcion.value}
          ref={(elemento) => { opcionesRef.current[indice] = elemento; }}
          type="button"
          role="option"
          tabIndex={-1}
          aria-selected={elegida}
          disabled={opcion.disabled}
          onFocus={() => setActivo(indice)}
          onClick={() => elegir(opcion)}
           className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400/70 disabled:cursor-not-allowed disabled:opacity-40 ${
            elegida
               ? modoOscuro ? 'bg-sky-300/15 font-semibold text-sky-200' : 'bg-sky-50 font-semibold text-sky-800'
              : modoOscuro ? 'text-slate-200 hover:bg-slate-700/70' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <span className="min-w-0 flex-1 break-words">{opcion.label}</span>
           {elegida && <Icono nombre="check" className={`h-4 w-4 shrink-0 ${modoOscuro ? 'text-sky-300' : 'text-sky-600'}`} strokeWidth={2.5} />}
        </button>;
      })}
    </div>}
    {mostrarError && <p id={id + '-error'} role="alert" className="mt-2 text-xs text-red-500 dark:text-red-400">Selecciona una opción para continuar.</p>}
  </div>;
}
