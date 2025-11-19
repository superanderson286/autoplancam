// c:\Users\super\Documents\autoplancam\scripts\process-csv.ts

import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';

// Interfaz para definir la estructura de nuestro producto final
interface Producto {
  Modelo: string;
  Precio?: string;
  [key: string]: string | undefined; // Permite otros atributos dinámicos
}

// --- Lógica Principal ---
(async function procesarCSV() {
  console.log('Iniciando el procesamiento del CSV...');

  const modelosSinPrecio: string[] = []; // Para registrar modelos sin precio

  // --- 1. Leer el archivo CSV ---
  const csvPath = path.join(process.cwd(), 'data', 'tabula-Video_ESCatalog.csv');
  const outputPath = path.join(process.cwd(), 'data', 'productos_corregidos.json');
  const fileContent = fs.readFileSync(csvPath, { encoding: 'utf-8' });

  // --- 2. Separar Datos de Productos y Precios (Lógica MEJORADA) ---
  const priceSectionIdentifier = 'Referencia,Stock,PVP,Página';
  const sections = fileContent.split(priceSectionIdentifier);
  const productDataRaw = sections[0];

  const allPriceSectionsRaw = sections.slice(1).join('\n');
  const cleanedPriceLines = allPriceSectionsRaw.split('\n').filter(line => line.trim() !== '').join('\n');
  const priceDataRaw = priceSectionIdentifier + '\n' + cleanedPriceLines;

  // --- 3. Parsear la Lista de Precios ---
  const priceRecords: any[] = parse(priceDataRaw, {
    columns: true,
    skip_empty_lines: true,
  });

  const priceMap = new Map<string, string>();
  for (const record of priceRecords) {
    const ref = record['Referencia']?.trim();
    const pvp = record['PVP']?.trim();
    if (ref && pvp) {
      const cleanPvp = pvp.replace('€', '').replace(/\./g, '').replace(',', '.').trim();
      const precioNumerico = parseFloat(cleanPvp);
      if (!isNaN(precioNumerico)) {
        priceMap.set(ref, cleanPvp);
      }
    }
  }
  console.log(`✅ Se encontraron y mapearon ${priceMap.size} precios.`);

  // --- 4. Parsear los Datos de Productos (Lógica REESCRITA) ---
  const productLines = productDataRaw.split('\n');
  const todosLosProductos: Producto[] = [];
  
  let i = 0;
  while (i < productLines.length) {
    const line = productLines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const parts = line.split(',').map(p => p.trim().replace(/"/g, ''));

    // --- Heurística de detección de bloques de productos (más estricta y fiable) ---
    // Un bloque válido empieza con una línea que contiene prefijos de modelo y no es un atributo.
    const esPosibleInicioDeBloque = 
        parts.length > 1 &&
        parts.some(p => p.startsWith('DS-') || p.startsWith('TC-') || p.startsWith('HCO-') || p.startsWith('IDS-')) &&
        !parts[0].toLowerCase().includes('cámara') &&
        !parts[0].toLowerCase().includes('resolución') &&
        !parts[0].toLowerCase().includes('tecnología');

    if (esPosibleInicioDeBloque) {
      let line1_parts = parts;
      
      // Si la primera columna está vacía, la ignoramos para los encabezados.
      const offset = line1_parts[0] === '' ? 1 : 0;
      line1_parts = line1_parts.slice(offset);

      const line2_parts = (productLines[i + 1] || '').split(',').map(p => p.trim().replace(/"/g, ''));
      const line2_parts_offset = line2_parts.slice(offset);

      const headers = line1_parts.map((part, index) => {
        const suffix = (line2_parts_offset[index] || '');
        // Evitar concatenar si la segunda línea es claramente un atributo
        if (suffix.toLowerCase().includes('cámara') || suffix.toLowerCase().includes('resolución')) {
          return part.trim();
        }
        return (part + suffix).trim();
      }).filter(h => h && h.length > 2);

      if (headers.length === 0) {
        i++;
        continue;
      }

      const blockProducts: Producto[] = headers.map(header => ({ Modelo: header }));
      
      i += 2; // Avanzar más allá de las dos líneas de encabezado

      // Bucle INTERNO para procesar solo los atributos de ESTE bloque
      while (i < productLines.length) {
        const attrLine = productLines[i];
        if (!attrLine || !attrLine.trim()) { i++; continue; }

        const attrParts = attrLine.split(',').map(p => p.trim().replace(/"/g, ''));
        const attrName = attrParts[0];

        // Condición de parada: si la línea parece el inicio de un nuevo bloque, terminamos este.
        const esNuevoBloque = 
            attrParts.length > 1 &&
            attrParts.some(p => p.startsWith('DS-') || p.startsWith('TC-')) &&
            !attrName.toLowerCase().includes('cámara') &&
            !attrName.toLowerCase().includes('resolución');

        if (esNuevoBloque) {
          break; // Salir del bucle de atributos para empezar un nuevo bloque de productos
        }

        if (attrName) {
          for (let j = 0; j < blockProducts.length; j++) {
            const product = blockProducts[j];
            const attrValue = attrParts[j + offset]; // Usar el mismo offset

            if (attrValue && attrValue !== ';') {
              if (product[attrName]) {
                if (!product[attrName]?.includes(attrValue)) {
                    product[attrName] += `, ${attrValue}`;
                }
              } else {
                product[attrName] = attrValue;
              }
            }
          }
        }
        i++;
      }

      // Añadir precios y agregar a la lista final
      for (const product of blockProducts) {
        const precio = priceMap.get(product.Modelo);
        if (precio) {
          product.Precio = precio;
        } else {
          modelosSinPrecio.push(product.Modelo);
        }
        todosLosProductos.push(product);
      }
    } else {
      i++; // Si no es una cabecera, simplemente avanza a la siguiente línea
    }
  }
  
  if (modelosSinPrecio.length > 0) {
    console.warn(`\n⚠️  ${modelosSinPrecio.length} modelos no encontraron precio. Revisando posibles causas...`);
    // Opcional: guardar los modelos sin precio en un archivo de log para un análisis más fácil
    fs.writeFileSync(path.join(process.cwd(), 'data', 'modelos_sin_precio.log'), modelosSinPrecio.join('\n'));
    console.warn('Se ha creado un archivo "modelos_sin_precio.log" con la lista completa.');
  }
  
  console.log(`\n✅ Se procesaron ${todosLosProductos.length} productos.`);

  // --- 5. Guardar el resultado en un archivo JSON ---
  fs.writeFileSync(outputPath, JSON.stringify(todosLosProductos, null, 2));
  console.log(`🚀 ¡Éxito! Los datos procesados se han guardado en: ${outputPath}`);
})().catch(error => {
    console.error('Ha ocurrido un error durante el procesamiento:', error);
    process.exit(1); // Termina el proceso con un código de error
  });
