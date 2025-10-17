// db/migrate.js (¡Usando sintaxis ESM!)

// 1. Usar import para las dependencias
import 'dotenv/config'; 
import { migrate } from 'drizzle-orm/node-postgres/migrator';

// 2. Importación dinámica para db, ya que puede causar ciclos al cargarse
// Sin embargo, si './index' usa 'export const db', una importación estándar debería funcionar.
import { db } from './index.js'; 

async function runMigrations() {
  console.log('Iniciando migraciones de Drizzle...');
  
  // Asegúrate de que 'drizzle' sea la carpeta donde se guardan tus archivos de migración
  await migrate(db, { migrationsFolder: './drizzle' }); 
  
  console.log('Migraciones completadas exitosamente.');
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error('Error al ejecutar las migraciones:', err);
  process.exit(1);
});

// ¡Ya no necesitamos 'export {}' si usamos 'import' en todo el archivo!
// Puedes dejarlo si tu tsconfig.json lo requiere. Por ahora, lo mantenemos.
export {};