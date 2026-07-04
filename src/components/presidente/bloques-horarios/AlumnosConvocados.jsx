import { useState } from 'react';
import { Icono } from '../../ui/Icono';
import { PanelBloqueMejorado } from '../BloquePanelMejorado';
import { ModalConfirmarSeleccion } from '../ModalConfirmarSeleccion';
import { useTheme } from '../../../contexts/ThemeContext';

export function AlumnosConvocados({ bloqueA, bloqueB, onConfirmarSeleccion, completado }) {
  const { modoOscuro } = useTheme();
  const [seleccionados, setSeleccionados] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const convocados = [...bloqueA, ...bloqueB];
  if (convocados.length === 0) return null;

  const todosLosIds = convocados.map((a) => a.id_formulario);
  const todosSeleccionados = seleccionados.length === todosLosIds.length && todosLosIds.length > 0;

  function toggleSeleccion(id) {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleTodos() {
    if (todosSeleccionados) {
      setSeleccionados([]);
    } else {
      setSeleccionados(todosLosIds);
    }
  }

  const noSeleccionados = convocados.filter(
    (a) => !seleccionados.includes(a.id_formulario)
  );

  async function confirmar() {
    setConfirmando(true);
    try {
      await onConfirmarSeleccion(seleccionados);
      setMostrarModal(false);
    } catch {
      // error handled by parent
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <div
            onClick={toggleTodos}
            className={`w-5 h-5 rounded border-2 cursor-pointer transition-colors ${
              todosSeleccionados
                ? 'bg-emerald-500 border-emerald-500'
                : modoOscuro ? 'border-slate-600' : 'border-slate-400'
            }`}
          >
            {todosSeleccionados && (
              <Icono nombre="check" className="h-full w-full text-white" strokeWidth={3} />
            )}
          </div>
          <span className={`text-xs uppercase font-bold tracking-wider ${modoOscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            {todosSeleccionados ? 'Deseleccionar todos' : 'Seleccionar todos'}
          </span>
        </label>
        <span className={`text-xs font-medium ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>
          ({seleccionados.length} de {convocados.length} seleccionados)
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PanelBloqueMejorado
          titulo="Bloque A"
          alumnos={bloqueA}
          seleccionados={seleccionados}
          onToggleSeleccion={toggleSeleccion}
        />
        <PanelBloqueMejorado
          titulo="Bloque B"
          alumnos={bloqueB}
          seleccionados={seleccionados}
          onToggleSeleccion={toggleSeleccion}
        />
      </div>

      {!completado && (
        <button
          onClick={() => setMostrarModal(true)}
          disabled={seleccionados.length === 0}
          className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black text-sm uppercase tracking-widest rounded-xl px-6 py-4 transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Icono nombre="check-circle" className="h-5 w-5" strokeWidth={2.5} />
          Confirmar selección
        </button>
      )}

      {mostrarModal && (
        <ModalConfirmarSeleccion
          aceptados={convocados.filter((a) => seleccionados.includes(a.id_formulario))}
          noSeleccionados={noSeleccionados}
          onConfirmar={confirmar}
          onCancelar={() => setMostrarModal(false)}
          cargando={confirmando}
        />
      )}
    </>
  );
}
