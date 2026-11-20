export function quitarPreguntaMisiones(campos, clave) {
  const quitadas = new Set([clave]);
  for (let anterior = -1; anterior !== quitadas.size;) {
    anterior = quitadas.size;
    for (const campo of campos) {
      if (campo.visible_si && quitadas.has(campo.visible_si.campo)) quitadas.add(campo.clave);
    }
  }
  return campos.filter((campo) => !quitadas.has(campo.clave));
}

export function recuperarPreguntaMisiones(campos, clave, plantilla) {
  const resultado = [...campos];
  function agregar(claveCampo) {
    if (resultado.some((campo) => campo.clave === claveCampo)) return;
    const base = plantilla.find((campo) => campo.clave === claveCampo);
    if (!base) throw new Error('Selecciona una pregunta del formato');
    if (base.visible_si) agregar(base.visible_si.campo);
    resultado.push(structuredClone(base));
  }
  agregar(clave);
  if (resultado.length > 25) throw new Error('El formulario admite hasta 25 preguntas. Quita otra antes de recuperar esta.');
  return resultado;
}
