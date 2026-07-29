import { useRef, useState } from 'react';
import { Icono } from './Icono';
import { Spinner } from './Spinner';
import { obtenerUrlImagen } from '../../utils/imagen';

export function SubirImagen({ label, urlImagen, onUpload, modoOscuro, labelCls, inputId = 'image-upload', editando = false, obligatorio = false }) {
  const fileInputRef = useRef(null);
  const [subiendo, setSubiendo] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;
    setSubiendo(true);
    try {
      await onUpload(file);
    } finally {
      setSubiendo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <label className={labelCls}>{label} {obligatorio && <span className="text-red-400">*</span>}</label>
      <div className="flex items-center gap-3 mt-1">
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" id={inputId} />
        <label htmlFor={inputId}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer text-sm font-semibold transition-colors ${modoOscuro ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
        >
          <Icono nombre="upload" className="h-4 w-4" strokeWidth={2} />
          Seleccionar archivo
        </label>
        {subiendo && <Spinner size="sm" color="border-amber-400" className="!py-0" />}
        {!subiendo && urlImagen && (
          <span className="text-xs text-emerald-400 font-semibold">Imagen seleccionada</span>
        )}
        {!subiendo && !urlImagen && (
          <span className="text-xs text-slate-500">Ningún archivo seleccionado</span>
        )}
      </div>
      {obligatorio && !urlImagen && !subiendo && !editando && (
        <p className="text-red-400 text-xs mt-1 font-medium">La imagen es obligatoria</p>
      )}
      {urlImagen && (
        <div className="relative w-full h-32 rounded-lg overflow-hidden mt-2">
          <img src={obtenerUrlImagen(urlImagen)} alt="Vista previa" className="w-full h-full object-cover" />
        </div>
      )}
    </div>
  );
}
