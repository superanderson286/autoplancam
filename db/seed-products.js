import 'dotenv/config';

import { google } from 'googleapis';
import { db } from '../db/index.js';
import { products } from '../db/schema.js';
import fs from 'fs';
import path from 'path';

function getCategoryFromModel(modelName) {
  if (!modelName) return 'Desconocido';
  modelName = modelName.toUpperCase(); // Normalizar para facilitar la coincidencia
  if (modelName.startsWith('HWD') || modelName.startsWith('HWT')) return 'DVR';
  if (modelName.startsWith('HWN')) return 'NVR';
  if (modelName.startsWith('HWI') || modelName.startsWith('HWP') || modelName.startsWith('HWC')) return 'Cámara';
  if (modelName.startsWith('HWK-')) return 'Kit';
  if (modelName.startsWith('DS-K2')) return 'Control de Acceso';
  if (modelName.startsWith('DS-K1T') || modelName.startsWith('DS-K18')) return 'Terminal de Acceso';
  if (modelName.startsWith('DS-K7')) return 'Accesorio de Acceso';
  if (modelName.startsWith('DS-1005KI') || modelName.startsWith('DS-1200KI') || modelName.startsWith('DS-1100KI')) return 'Teclado';
  if (modelName.startsWith('DS-1LN')) return 'Cable de Red'; // Específico para cables
  if (modelName.startsWith('DS-3E')) return 'Switch';
  if (modelName.startsWith('DS-D50')) return 'Monitor';
  if (modelName.startsWith('DS-3WF')) return 'Inalámbrico';
  if (modelName.startsWith('DS-1H18S') || modelName.startsWith('DS-2FP') || modelName.startsWith('DSA-12PFG') || modelName.startsWith('HKA-A24250')) return 'Accesorio'; // Accesorios específicos
  if (modelName.startsWith('IC S50') || modelName.startsWith('DS-KEM')) return 'Tarjeta de Acceso'; // Tarjetas de acceso
  return 'Otro'; // Por defecto para cualquier cosa no coincidente
}

/**
 * Busca un precio sugerido para un modelo de producto usando la Búsqueda de Google.
 * @param {string} modelName - El nombre del modelo a buscar.
 * @returns {Promise<number|null>} El precio encontrado o null si no se encuentra.
 */
async function getSuggestedPrice(modelName) {
  try {
    const customsearch = google.customsearch('v1');
    const res = await customsearch.cse.list({
      cx: process.env.GOOGLE_CSE_ID,
      q: `${modelName} price`,
      auth: process.env.GOOGLE_API_KEY,
    });

    const firstResult = res.data.items?.[0];
    if (!firstResult) {
      console.log(`-> No se encontraron resultados para "${modelName}".`);
      return null;
    }

    const priceMatch = firstResult?.snippet?.match(/\$(\d+(\.\d{1,2})?)/);
    if (!priceMatch) {
      console.log(`-> No se encontró precio en el snippet para "${modelName}": "${firstResult.snippet}"`);
    }
    return priceMatch ? parseFloat(priceMatch[1]) : null; // Si no hay match, devuelve null
  } catch (error) {
    console.error(`Error buscando precio para ${modelName}:`, error.message);
    return null;
  }
}

async function seedProducts() {
  console.log('Iniciando el proceso de seeding de productos...');

  try {
    // 1. Limpiar la tabla de productos existente para evitar duplicados
    console.log('Limpiando la tabla de productos...');
    await db.delete(products);

    // 2. Leer y parsear el archivo CSV con la codificación correcta
    const csvPath = path.resolve(process.cwd(), 'tabula-Hiwatch-2022-Iberia2.csv');
    const fileContent = fs.readFileSync(csvPath, 'latin1');
    const lines = fileContent.split('\n').map(line => line.trim().replace(/"/g, ''));

    const allModelBlocks = [];
    let currentBlock = [];

    // Agrupamos las líneas en bloques de productos, cada bloque empieza con "Modelo"
    for (const line of lines) {
      const columns = line.split(';').map(col => col.trim());
      // Iniciar un nuevo bloque si se encuentra "Modelo" y currentBlock no está vacío
      // También, ignorar bloques que claramente no son especificaciones de productos (como texto "ONTROL DE ACCESOS")
      if (columns[0].toLowerCase() === 'modelo' && currentBlock.length > 0 && !columns[1].includes(' ')) {
        allModelBlocks.push(currentBlock);
        currentBlock = [];
      }
      if (line) {
        currentBlock.push(line);
      }
    }
    if (currentBlock.length > 0) {
      allModelBlocks.push(currentBlock);
    }

    const recordsToInsert = [];

    // Procesamos cada bloque de productos
    for (const block of allModelBlocks) {
      const headerLine = block[0];
      const modelNames = headerLine.split(';').slice(1).map(name => name.trim()).filter(Boolean);
      if (modelNames.length === 0) continue; // Saltar bloques sin nombres de modelo

      const productsInBlock = modelNames.map(name => ({
        name,
        category: getCategoryFromModel(name),
        specs: {} // Esto contendrá todas las especificaciones clave-valor para este producto
      }));

      let lastSpecName = '';

      for (let i = 1; i < block.length; i++) {
        const line = block[i];
        const columns = line.split(';').map(col => col.trim());
        const currentSpecName = columns[0];

        // Heurística para detener el procesamiento si encontramos una línea que no es una especificación
        // (como "Solución Rendim" o "VRs" que son texto descriptivo y no specs)
        if (currentSpecName && (currentSpecName.includes('Solución') || currentSpecName.includes('VRs') || currentSpecName.includes('ONTROL DE ACCESOS'))) {
            break;
        }

        if (currentSpecName) {
          lastSpecName = currentSpecName;
          productsInBlock.forEach((product, index) => {
            const specValue = columns[index + 1];
            if (specValue) {
              product.specs[lastSpecName] = specValue;
            }
          });
        } else if (lastSpecName) { // Continuación de la especificación anterior
          productsInBlock.forEach((product, index) => {
            const specValue = columns[index + 1];
            if (specValue && product.specs[lastSpecName]) {
              product.specs[lastSpecName] += ` ${specValue}`;
            }
          });
        }
      }

      // Ahora, para cada producto en este bloque, agrégalo a recordsToInsert
      for (const product of productsInBlock) {
        // Solo insertar si el producto tiene un nombre y al menos una especificación
        if (product.name && Object.keys(product.specs).length > 0) {
          recordsToInsert.push({
            name: product.name,
            category: product.category,
            price: await getSuggestedPrice(product.name), // Buscamos el precio
            specs: product.specs, // Almacenar el objeto completo de especificaciones
            description: '', // La descripción se puede añadir más tarde o dejar vacía
          });
        }
      }
    }

    if (recordsToInsert.length > 0) {
      console.log(`Insertando ${recordsToInsert.length} registros en la base de datos...`);
      await db.insert(products).values(recordsToInsert);
      console.log('¡Seeding de productos completado exitosamente!');
    } else {
      console.log('No se encontraron productos para insertar.');
    }

  } catch (error) {
    console.error('Error durante el seeding de productos:', error);
    process.exit(1);
  }
}

seedProducts();