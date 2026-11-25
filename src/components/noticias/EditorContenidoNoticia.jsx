import { useRef } from 'react';
import { normalizarDocumentoNoticia } from '../../utils/contenidoNoticia';

const CLASE_CAMPO = 'w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400/50';

export function EditorContenidoNoticia({ value, onChange, modoOscuro, onSubirImagen, subiendoImagen }) {
  const documento = normalizarDocumentoNoticia(value);
  const limiteAlcanzado = documento.blocks.length >= 40;
  const inputsImagen = useRef({});
  const panel = modoOscuro ? 'border-slate-700 bg-[#18223f]' : 'border-slate-200 bg-slate-50';
  const campo = `${CLASE_CAMPO} ${modoOscuro ? 'border-slate-700 bg-[#111a30] text-slate-100' : 'border-slate-300 bg-white text-slate-800'}`;

  const actualizarBloque = (indice, cambios) => onChange({
    ...documento,
    blocks: documento.blocks.map((bloque, i) => i === indice ? { ...bloque, ...cambios } : bloque),
  });
  const agregar = (bloque) => onChange({ ...documento, blocks: [...documento.blocks, bloque] });
  const quitar = (indice) => onChange({ ...documento, blocks: documento.blocks.filter((_, i) => i !== indice) });

  const subir = async (indice, archivo) => {
    if (!archivo || !onSubirImagen) return;
    const url = await onSubirImagen(archivo);
    if (url) actualizarBloque(indice, { url });
  };

  return (
    <fieldset className="space-y-3">
      <legend className="mb-1 text-xs font-bold uppercase tracking-wider">Contenido de la noticia</legend>
      {documento.blocks.map((bloque, indice) => (
        <section key={`${bloque.type}-${indice}`} className={`space-y-2 rounded-xl border p-3 ${panel}`}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-wide">
              {bloque.type === 'paragraph' ? 'Párrafo' : bloque.type === 'heading' ? 'Título' : 'Imagen'}
            </span>
            <button type="button" onClick={() => quitar(indice)} className="text-xs font-semibold text-red-400 hover:text-red-300">Quitar bloque</button>
          </div>

          {bloque.type === 'paragraph' && <>
            <textarea className={`${campo} min-h-24 resize-y`} value={bloque.text}
              onChange={(e) => actualizarBloque(indice, { text: e.target.value })}
              maxLength={10000} aria-label={`Párrafo ${indice + 1}`} />
            <div className="flex gap-4 text-xs">
              {['bold', 'italic'].map((marca) => (
                <label key={marca} className="inline-flex items-center gap-1.5">
                  <input type="checkbox" checked={bloque.marks.includes(marca)} onChange={(e) => {
                    const marks = e.target.checked
                      ? [...bloque.marks, marca]
                      : bloque.marks.filter((actual) => actual !== marca);
                    actualizarBloque(indice, { marks });
                  }} />
                  {marca === 'bold' ? 'Negritas' : 'Cursivas'} en el párrafo
                </label>
              ))}
            </div>
          </>}

          {bloque.type === 'heading' && <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
            <input className={campo} value={bloque.text} maxLength={200} aria-label={`Título ${indice + 1}`}
              onChange={(e) => actualizarBloque(indice, { text: e.target.value })} />
            <select className={campo} value={bloque.level} aria-label={`Nivel del título ${indice + 1}`}
              onChange={(e) => actualizarBloque(indice, { level: Number(e.target.value) })}>
              <option value={2}>Grande</option><option value={3}>Mediano</option>
            </select>
          </div>}

          {bloque.type === 'image' && <>
            <input className={campo} value={bloque.url} maxLength={2048} aria-label={`URL de imagen ${indice + 1}`}
              placeholder="URL segura de Cloudinary"
              onChange={(e) => actualizarBloque(indice, { url: e.target.value })} />
            <input className={campo} value={bloque.alt} maxLength={200} aria-label={`Descripción de imagen ${indice + 1}`}
              placeholder="Descripción breve de la imagen"
              onChange={(e) => actualizarBloque(indice, { alt: e.target.value })} />
            {onSubirImagen && <>
              <input ref={(el) => { inputsImagen.current[indice] = el; }} type="file" accept="image/*" className="hidden"
                onChange={(e) => { void subir(indice, e.target.files?.[0]); e.target.value = ''; }} />
              <button type="button" disabled={subiendoImagen} onClick={() => inputsImagen.current[indice]?.click()}
                className="rounded-lg border border-amber-400/40 px-3 py-2 text-xs font-semibold text-amber-500 disabled:opacity-50">
                {subiendoImagen ? 'Subiendo…' : 'Subir imagen'}
              </button>
            </>}
            {bloque.url.startsWith('https://res.cloudinary.com/') && <img src={bloque.url} alt={bloque.alt} className="max-h-40 rounded-lg object-contain" />}
          </>}
        </section>
      ))}

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={limiteAlcanzado} onClick={() => agregar({ type: 'paragraph', text: '', marks: [] })} className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">Agregar párrafo</button>
        <button type="button" disabled={limiteAlcanzado} onClick={() => agregar({ type: 'heading', level: 2, text: '' })} className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">Agregar título</button>
        <button type="button" disabled={limiteAlcanzado} onClick={() => agregar({ type: 'image', url: '', alt: '' })} className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">Agregar imagen</button>
      </div>
      <p className="text-[11px] text-slate-500">Admite hasta 40 bloques; las imágenes se alojan en Cloudinary. HTML y otros formatos no se ejecutan.</p>
    </fieldset>
  );
}
