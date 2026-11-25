import { useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { LARGO_CODIGO_OTP, normalizarCodigoOtp } from '../../utils/otpAcceso';

function obtenerDigitos(valor, length) {
  const normalizado = normalizarCodigoOtp(valor).slice(0, length);
  return Array.from({ length }, (_, indice) => normalizado[indice] ?? '');
}

export function EntradaCodigoOtp({
  label,
  name,
  value,
  onChange,
  length = LARGO_CODIGO_OTP,
  disabled = false,
  error = '',
  autoFocus = false,
  required = false,
}) {
  const { modoOscuro, labelCls } = useTheme();
  const inputsRef = useRef([]);
  const digitos = obtenerDigitos(value, length);
  const errorId = `${name}-error`;
  const esOscuro = modoOscuro;

  function enfocar(indice) {
    const input = inputsRef.current[indice];
    if (input) {
      input.focus();
      input.select();
    }
  }

  function emitirCambio(siguientesDigitos) {
    onChange(siguientesDigitos.join('').slice(0, length));
  }

  function manejarCambio(indice, evento) {
    const entrada = normalizarCodigoOtp(evento.target.value);
    if (!entrada) {
      const siguientes = [...digitos];
      siguientes[indice] = '';
      emitirCambio(siguientes);
      return;
    }

    const siguientes = [...digitos];
    if (entrada.length === 1) {
      siguientes[indice] = entrada;
      emitirCambio(siguientes);
      if (indice < length - 1) {
        enfocar(indice + 1);
      }
      return;
    }

    const caracteres = entrada.split('');
    let cursor = caracteres.length >= length ? 0 : indice;
    for (const caracter of caracteres) {
      if (cursor >= length) break;
      siguientes[cursor] = caracter;
      cursor += 1;
    }

    emitirCambio(siguientes);
    enfocar(Math.min(cursor, length - 1));
  }

  function manejarTecla(indice, evento) {
    if (evento.key === 'Backspace') {
      if (digitos[indice]) {
        evento.preventDefault();
        const siguientes = [...digitos];
        siguientes[indice] = '';
        emitirCambio(siguientes);
        return;
      }

      if (indice > 0) {
        evento.preventDefault();
        const siguientes = [...digitos];
        siguientes[indice - 1] = '';
        emitirCambio(siguientes);
        enfocar(indice - 1);
      }
      return;
    }

    if (evento.key === 'Delete') {
      if (digitos[indice]) {
        evento.preventDefault();
        const siguientes = [...digitos];
        siguientes[indice] = '';
        emitirCambio(siguientes);
      }
      return;
    }

    if (evento.key === 'ArrowLeft' && indice > 0) {
      evento.preventDefault();
      enfocar(indice - 1);
      return;
    }

    if (evento.key === 'ArrowRight' && indice < length - 1) {
      evento.preventDefault();
      enfocar(indice + 1);
      return;
    }

    if (evento.key === 'Home') {
      evento.preventDefault();
      enfocar(0);
      return;
    }

    if (evento.key === 'End') {
      evento.preventDefault();
      enfocar(length - 1);
    }
  }

  function manejarPegado(indice, evento) {
    const texto = evento.clipboardData?.getData('text') ?? '';
    const pegado = normalizarCodigoOtp(texto);
    if (!pegado) return;

    evento.preventDefault();
    const siguientes = [...digitos];
    let cursor = pegado.length >= length ? 0 : indice;
    for (const caracter of pegado.split('')) {
      if (cursor >= length) break;
      siguientes[cursor] = caracter;
      cursor += 1;
    }

    emitirCambio(siguientes);
    enfocar(Math.min(cursor, length - 1));
  }

  function manejarFoco(evento) {
    evento.target.select();
  }

  return (
    <div>
      {label && (
        <label id={`${name}-label`} className={labelCls}>
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      <div
        role="group"
        aria-labelledby={label ? `${name}-label` : undefined}
        aria-describedby={error ? errorId : undefined}
        className="grid grid-cols-6 gap-2 sm:gap-3"
      >
        {digitos.map((digito, indice) => {
          const tieneValor = digito !== '';
          const estadoCls = error
            ? esOscuro
              ? 'border-red-500/80 bg-red-500/5 text-white focus:border-red-400 focus:ring-red-400/30'
              : 'border-red-400 bg-red-50 text-slate-900 focus:border-red-500 focus:ring-red-400/30'
            : tieneValor
              ? esOscuro
                ? 'border-amber-400/60 bg-[#18223f] text-white focus:border-amber-400 focus:ring-amber-400/40'
                : 'border-amber-500/60 bg-amber-50/40 text-slate-900 focus:border-amber-500 focus:ring-amber-400/30'
              : esOscuro
                ? 'border-slate-700 bg-[#18223f] text-white focus:border-amber-400 focus:ring-amber-400/40'
                : 'border-slate-300 bg-slate-100 text-slate-900 focus:border-amber-500 focus:ring-amber-400/30';

          return (
            <input
              key={indice}
              ref={(el) => {
                inputsRef.current[indice] = el;
              }}
              id={indice === 0 ? name : `${name}-${indice}`}
              name={indice === 0 ? name : undefined}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              autoComplete={indice === 0 ? 'one-time-code' : 'off'}
              autoFocus={autoFocus && indice === 0}
              disabled={disabled}
              required={required && indice === 0}
              value={digito}
              aria-label={`Dígito ${indice + 1} de ${length}`}
              aria-invalid={error ? 'true' : undefined}
              aria-describedby={error ? errorId : undefined}
              onChange={(evento) => manejarCambio(indice, evento)}
              onKeyDown={(evento) => manejarTecla(indice, evento)}
              onPaste={(evento) => manejarPegado(indice, evento)}
              onFocus={manejarFoco}
              className={`h-12 w-full rounded-xl border text-center text-lg font-black tabular-nums transition-all duration-200 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 sm:text-xl ${estadoCls}`}
            />
          );
        })}
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-red-400 text-xs mt-2 font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
