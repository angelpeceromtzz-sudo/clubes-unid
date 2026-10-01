export const ROL_ALUMNO = 1;
export const ROL_PRESIDENTE = 2;
export const ROL_ADMIN = 3;
export const ROL_RECTORIA = 4;

// No lo usa nada del frente todavía, pero está en `cat_roles` (schema.sql) y el
// backend lo trata como líder de club junto al presidente en
// `middleware/auth.js` (`requireClubLeader`). Declararlo aquí evita que el
// número 5 aparezca suelto en el código el día que haga falta.
export const ROL_VICEPRESIDENTE = 5;
