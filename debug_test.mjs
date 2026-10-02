// Simulación exacta de la lógica de SeccionPostulaciones
// para verificar que el estado es independiente por ID

const postulaciones = [
  { id_formulario: 12, nombre_club: "Taller de Dibujo" },
  { id_formulario: 11, nombre_club: "Equipo de Voleibol" },
  { id_formulario: 9, nombre_club: "Equipo de Basketball" },
];

// Simula el estado como React lo manejaría
let abiertos = {};

function toggleDetalles(key) {
  abiertos = { ...abiertos, [key]: !abiertos[key] };
}

function renderizar() {
  console.log("\n=== RENDER ===");
  console.log("abiertos:", JSON.stringify(abiertos));
  
  postulaciones.forEach((p, i) => {
    const cardKey = p.id_formulario;
    const isOpen = !!abiertos[cardKey];
    console.log(`  Tarjeta ${i}: nombre="${p.nombre_club}", cardKey=${cardKey}, isOpen=${isOpen}`);
  });
}

// Prueba 1: Estado inicial
console.log("=== PRUEBA 1: Estado inicial ===");
renderizar();

// Prueba 2: Toggle Dibujo (id=12)
console.log("\n=== PRUEBA 2: Toggle Dibujo (key=12) ===");
toggleDetalles(12);
renderizar();

// Prueba 3: Toggle Voleibol (id=11)
console.log("\n=== PRUEBA 3: Toggle Voleibol (key=11) ===");
toggleDetalles(11);
renderizar();

// Prueba 4: Cerrar Dibujo (id=12)
console.log("\n=== PRUEBA 4: Cerrar Dibujo (key=12) ===");
toggleDetalles(12);
renderizar();

// Prueba 5: Toggle con IDs undefined
console.log("\n=== PRUEBA 5: IDs undefined ===");
const postulaciones2 = [
  { nombre_club: "Club A" },           // sin id_formulario
  { nombre_club: "Club B" },           // sin id_formulario
  { id_formulario: 5, nombre_club: "Club C" },
];

let abiertos2 = {};
function toggleDetalles2(key) {
  abiertos2 = { ...abiertos2, [key]: !abiertos2[key] };
}

postulaciones2.forEach((p, i) => {
  const cardKey = p.id_formulario ?? `idx-${i}`;
  const isOpen = !!abiertos2[cardKey];
  console.log(`  cardKey=${cardKey}, isOpen=${isOpen}`);
});

// Prueba 6: Toggle Club A (undefined) - verificar que no afecta Club B
console.log("\n=== PRUEBA 6: Toggle Club A (undefined) ===");
toggleDetalles2("idx-0");
Object.entries(abiertos2).forEach(([k, v]) => console.log(`  abiertos["${k}"] = ${v}`));

console.log("\n--- Verificación: Club A y Club B tienen estado independiente ---");
postulaciones2.forEach((p, i) => {
  const cardKey = p.id_formulario ?? `idx-${i}`;
  const isOpen = !!abiertos2[cardKey];
  console.log(`  Club ${String.fromCharCode(65 + i)}: cardKey=${cardKey}, isOpen=${isOpen} (${isOpen ? 'EXPANDIDA' : 'NO expandida'})`);
});

console.log("\n✅ Si Club A está expandida y Club B NO, la lógica es correcta.");
