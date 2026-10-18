import { readFileSync } from 'node:fs';

// pg 8.21.0 + pg-connection-string 2.13.0: si la connectionString contiene
// alguno de estos parámetros, el objeto `ssl` devuelto por parse() SOBRESCRIBE
// el objeto ssl explícito de la configuración (connection-parameters.js hace
// Object.assign({}, config, parse(connectionString))). Por eso se rechazan:
// la validación TLS debe quedar bajo el control de este módulo.
// Documentación oficial: node-postgres.com/features/ssl ("Usage with
// connectionString").
const PARAMS_TLS_EN_URL = ['ssl', 'sslmode', 'sslrootcert', 'sslcert', 'sslkey'];

const MARCA_PEM = '-----BEGIN';

export function construirConfigPg(env = process.env, opciones = {}) {
  const leerArchivo = opciones.leerArchivo ?? ((ruta) => readFileSync(ruta, 'utf8'));
  const databaseUrl = env.DATABASE_URL;

  if (databaseUrl) {
    return {
      connectionString: databaseUrl,
      ssl: construirSslRemoto(databaseUrl, env, leerArchivo),
    };
  }

  return construirConfigLocal(env);
}

function construirSslRemoto(databaseUrl, env, leerArchivo) {
  validarUrlRemota(databaseUrl);

  const ssl = { rejectUnauthorized: true };

  const rutaCa = typeof env.DB_SSL_CA_FILE === 'string' ? env.DB_SSL_CA_FILE.trim() : '';
  // CA inline: para entornos efímeros (p. ej. Render) donde no existe un
  // archivo establecible fuera del repositorio; el contenido PEM completo
  // se declara en la variable de entorno (texto multilinea soportado).
  // Solo se recorta para detectar vacío; el valor conserva sus saltos.
  const crudoCa = env.DB_SSL_CA_PEM;
  const pemEnVariable = typeof crudoCa === 'string' && crudoCa.trim() !== '' ? crudoCa : '';

  if (rutaCa !== '' && pemEnVariable !== '') {
    throw new Error(
      'DB_SSL_CA_FILE y DB_SSL_CA_PEM están definidas a la vez. ' +
        'Declara solo una fuente de CA: la ruta del archivo (DB_SSL_CA_FILE) o el contenido PEM inline (DB_SSL_CA_PEM).',
    );
  }

  if (rutaCa !== '') {
    let pem;
    try {
      pem = leerArchivo(rutaCa);
    } catch {
      throw new Error(
        `DB_SSL_CA_FILE apunta a "${rutaCa}" pero el archivo no se pudo leer. ` +
          'Corrige la ruta o retira la variable para usar el almacén de confianza del sistema. ' +
          'La conexión no se intenta sin la CA solicitada.',
      );
    }
    if (typeof pem !== 'string' || !pem.includes(MARCA_PEM)) {
      throw new Error(
        `DB_SSL_CA_FILE apunta a "${rutaCa}" pero el contenido no es un certificado PEM. ` +
          'Declara en esa variable la ruta de un archivo PEM de CA (p. ej. la CA del proveedor).',
      );
    }
    ssl.ca = pem;
  } else if (pemEnVariable !== '') {
    if (!pemEnVariable.includes(MARCA_PEM)) {
      throw new Error(
        'DB_SSL_CA_PEM no contiene un certificado PEM (se espera el bloque completo ' +
          '-----BEGIN CERTIFICATE----- … -----END CERTIFICATE-----). ' +
          'Pega el contenido de la CA del proveedor o retira la variable para usar el almacén de confianza del sistema.',
      );
    }
    ssl.ca = pemEnVariable;
  }

  return ssl;
}

function validarUrlRemota(databaseUrl) {
  let url;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error(
      'DATABASE_URL no es una URL válida (debe ser postgres://... o postgresql://...). ' +
        'Revisa la variable de entorno; esta salida no incluye la cadena por contener credenciales.',
    );
  }

  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
    throw new Error(
      `DATABASE_URL usa el esquema "${url.protocol}" pero se espera postgres:// o postgresql://. ` +
        'No se modifica el host ni el puerto; corrige la variable de entorno.',
    );
  }

  const encontrados = [];
  for (const clave of url.searchParams.keys()) {
    const normalizada = clave.toLowerCase();
    if (PARAMS_TLS_EN_URL.includes(normalizada) && !encontrados.includes(normalizada)) {
      encontrados.push(normalizada);
    }
  }

  if (encontrados.length > 0) {
    throw new Error(
      `DATABASE_URL contiene parámetros TLS (${encontrados.join(', ')}). ` +
        'En modo remoto la validación TLS la controla el backend ' +
        '(verificación de cadena e identidad del servidor, equivalente a sslmode=verify-full): ' +
        'elimina esos parámetros de la cadena y, si el proveedor necesita una CA propia, ' +
        'declara su archivo PEM en DB_SSL_CA_FILE. ' +
        'No se permite que la URL sobrescriba la configuración segura.',
    );
  }
}

function construirConfigLocal(env) {
  const password = env.DB_PASSWORD;
  if (!password) {
    throw new Error('falta la variable de entorno DB_PASSWORD. Revisa backend/.env (ver backend/.env.example).');
  }

  return {
    host: env.DB_HOST || 'localhost',
    port: parseInt(env.DB_PORT || '5432', 10),
    database: env.DB_NAME || 'clubs_bd',
    user: env.DB_USER || 'postgres',
    password,
  };
}
