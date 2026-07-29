export function validarFormularioInscripcion(formulario, datosPrecargados) {
  const errs = {};
  if (!formulario.nombre_completo.trim()) errs.nombre_completo = 'El nombre es obligatorio';
  if (!datosPrecargados) {
    if (!formulario.matricula) {
      errs.matricula = 'La matrícula es obligatoria';
    } else if (!/^\d+$/.test(formulario.matricula)) {
      errs.matricula = 'La matrícula debe contener solo números';
    }
  }
  if (!formulario.carrera) errs.carrera = 'Selecciona una carrera';
  if (!formulario.cuatrimestre) {
    errs.cuatrimestre = 'El cuatrimestre es obligatorio';
  } else if (parseInt(formulario.cuatrimestre) < 1) {
    errs.cuatrimestre = 'El cuatrimestre debe ser mayor a 0';
  }

  if (!formulario.telefono_contacto) {
    errs.telefono_contacto = 'El teléfono de contacto es obligatorio';
  } else if (!/^\d{10}$/.test(formulario.telefono_contacto)) {
    errs.telefono_contacto = 'El teléfono debe ser de 10 dígitos numéricos';
  }
  if (!formulario.motivo_ingreso.trim()) errs.motivo_ingreso = 'Indica por qué quieres unirte';
  return errs;
}
