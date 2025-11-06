
import 'dotenv/config';
import { db } from './index.js';
import { sql } from 'drizzle-orm';

const migrationHash = '1CEDAE078FE78C2984D2BB7DC379B678A74E2DFC4EF1A2338CF9DD5B91F9EE95';

async function manualMigration() {
  console.log('Iniciando la inserción manual de la migración...');
  try {
    // Verificar si la migración ya existe
    const existingMigration = await db.execute(sql`SELECT 1 FROM drizzle.__drizzle_migrations WHERE "hash" = ${migrationHash}`);

    if (existingMigration.rowCount > 0) {
      console.log('La migración ya existe en la base de datos. Omitiendo.');
    } else {
      // Drizzle espera un valor bigint para created_at, que se puede representar como un string en JS
      const createdAt = BigInt(Date.now()).toString();
      await db.execute(sql`INSERT INTO drizzle.__drizzle_migrations ("hash", "created_at") VALUES (${migrationHash}, ${createdAt})`);
      console.log('Inserción manual de la migración completada exitosamente.');
    }
  } catch (err) {
    console.error('Error durante la inserción manual de la migración:', err);
    process.exit(1);
  } finally {
    // No cerramos el proceso aquí para permitir que el pool de pg se cierre correctamente
    console.log('Script finalizado.');
  }
}

manualMigration();
