export const ROL_ALUMNO = 1;
export const ROL_PRESIDENTE = 2;
export const ROL_RESPONSABLE_CLUB = ROL_PRESIDENTE;
export const ROL_ADMIN = 3;
export const ROL_RECTORIA = 4;

// No lo usa nada del frente todav��a, pero estǭ en `cat_roles` (schema.sql) y el
// backend lo trata como l��der de club junto al presidente en
// `middleware/auth.js` (`requireClubLeader`). Declararlo aqu�� evita que el
// nǧmero 5 aparezca suelto en el c��digo el d��a que haga falta.
export const ROL_VICEPRESIDENTE = 5;
export const ROL_RESPONSABLE_MURAL = 6;
export const ROL_COORDINACION = 7;
