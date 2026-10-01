// La carrera ya no es una lista hardcodeada: es una FK a `cat_licenciaturas`
// y las opciones las trae `useLicenciaturas()` desde /catalogos/licenciaturas.
// Aquí sólo queda el texto con el que se etiqueta cada campo.
export const ETIQUETAS = {
  nombre_completo: 'Nombre Completo',
  matricula: 'Matrícula',
  id_licenciatura: 'Licenciatura',
  cuatrimestre: 'Cuatrimestre',
  telefono_contacto: 'Teléfono de Contacto',
  motivo_ingreso: 'Motivo de Ingreso',
  experiencia_previa: 'Experiencia Previa',
};
