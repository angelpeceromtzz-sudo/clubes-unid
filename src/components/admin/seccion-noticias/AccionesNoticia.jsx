/* Botones de acción de una noticia según su estado y el rol de quien la ve
   (PBI-17). Sólo decide QUÉ se pinta: el backend vuelve a validar cada
   transición en `backend/routes/noticias.js`.

   `compacto` deja sólo iconos (móvil); sin él muestra etiqueta (escritorio). */
import { Icono } from '../../ui/Icono';
import { accionesNoticia } from '../../../constants/noticias';

const CLASE_BASE =
  'font-bold rounded-lg border cursor-pointer active:scale-95 transition-colors flex items-center justify-center gap-1.5';

const CLASES = {
  enviar: 'text-amber-400 border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20',
  aprobar: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10 hover:bg-emerald-400/20',
  rechazar: 'text-red-400 border-red-400/30 bg-red-400/10 hover:bg-red-400/20',
  ocultar: 'text-slate-400 border-slate-400/30 bg-slate-400/10 hover:bg-slate-400/20',
  editar: 'text-indigo-400 border-indigo-400/30 bg-indigo-400/10 hover:bg-indigo-400/20',
  eliminar: 'text-red-400 border-red-400/30 bg-red-400/10 hover:bg-red-400/20',
};

export function AccionesNoticia({
  noticia,
  idRol,
  onEnviarRevision,
  onAprobar,
  onRechazar,
  onOcultar,
  onEditar,
  onEliminar,
  compacto = false,
}) {
  const acc = accionesNoticia(noticia.status, idRol);

  const botones = [];
  if (acc.enviarRevision) {
    botones.push({ clave: 'enviar', icono: 'send', texto: 'Enviar a Revisión', titulo: 'Enviar a revisión (rectoría lo validará)', clase: CLASES.enviar, accion: () => onEnviarRevision(noticia) });
  }
  if (acc.aprobar) {
    botones.push({ clave: 'aprobar', icono: 'check-circle', texto: 'Aprobar', titulo: 'Aprobar y publicar en el mural', clase: CLASES.aprobar, accion: () => onAprobar(noticia) });
  }
  if (acc.rechazar) {
    botones.push({ clave: 'rechazar', icono: 'x-circle', texto: 'Rechazar', titulo: 'Rechazar y devolver a su autor', clase: CLASES.rechazar, accion: () => onRechazar(noticia) });
  }
  if (acc.ocultar) {
    botones.push({ clave: 'ocultar', icono: 'eye-off', texto: 'Ocultar', titulo: 'Sacar del mural sin eliminarla', clase: CLASES.ocultar, accion: () => onOcultar(noticia) });
  }
  if (acc.editar || acc.editarCualquiera) {
    botones.push({ clave: 'editar', icono: 'edit', texto: 'Editar', titulo: 'Editar', clase: CLASES.editar, accion: () => onEditar(noticia) });
  }
  if (acc.eliminar) {
    botones.push({ clave: 'eliminar', icono: 'trash', texto: 'Eliminar', titulo: 'Eliminar', clase: CLASES.eliminar, accion: () => onEliminar(noticia) });
  }

  if (botones.length === 0) {
    return <span className="text-xs text-slate-500">—</span>;
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {botones.map((b) => (
        <button
          key={b.clave}
          type="button"
          onClick={b.accion}
          title={b.titulo}
          aria-label={b.titulo}
          className={`${CLASE_BASE} ${b.clase} ${compacto ? 'px-2 py-1.5' : 'text-xs px-2.5 py-1.5'}`}
        >
          <Icono nombre={b.icono} strokeWidth={2} className="h-4 w-4 shrink-0" />
          {!compacto && b.texto}
        </button>
      ))}
    </div>
  );
}
