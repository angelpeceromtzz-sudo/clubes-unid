import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

export function ModalConsentimientoLegal({ onAceptar }) {
  const { modoOscuro } = useTheme();
  const [terminos, setTerminos] = useState(false);
  const [privacidad, setPrivacidad] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  async function confirmar() {
    if (!terminos || !privacidad) return;
    setEnviando(true);
    setError('');
    try {
      await onAceptar();
    } catch (err) {
      setError(err?.message || 'No se pudo registrar la aceptación. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-50 dark:bg-[#0b111e] flex items-center justify-center px-4">
      <div className={`w-full max-w-md rounded-2xl p-8 border ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-lg'}`}>
        <h2 className={`text-xl font-black ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>Aceptación de documentos legales</h2>
        <p className={`text-sm mt-2 ${modoOscuro ? 'text-slate-300' : 'text-slate-600'}`}>
          Para continuar, acepta los siguientes documentos.
        </p>
        <div className="mt-6 space-y-3">
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={terminos} onChange={(e) => setTerminos(e.target.checked)} className="mt-1" />
            <span>
              Acepto los <a href="/terminos" target="_blank" rel="noopener noreferrer" className="text-amber-500 underline">Términos y condiciones</a>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={privacidad} onChange={(e) => setPrivacidad(e.target.checked)} className="mt-1" />
            <span>
              He leído y acepto la <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="text-amber-500 underline">Política de Privacidad</a>
            </span>
          </label>
        </div>
        {error && <p role="alert" className="mt-4 text-sm text-red-500">{error}</p>}
        <button
          onClick={confirmar}
          disabled={!terminos || !privacidad || enviando}
          className="mt-6 w-full bg-amber-400 text-[#0e162c] font-black text-xs uppercase tracking-wider rounded-xl px-4 py-3 disabled:opacity-40 cursor-pointer"
        >
          {enviando ? 'Guardando…' : 'Continuar'}
        </button>
      </div>
    </div>
  );
}