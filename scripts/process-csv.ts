import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';

// Interfaz para definir la estructura de nuestro producto final
interface Producto {
  Modelo: string;
  Precio?: string;
  ReferenciaPrecio?: string; 
  Stock?: string; 
  Tipo?: string;
  [key: string]: string | undefined; 
}

// --- Lógica Principal ---

(async function procesarCSV() {
  console.log('Iniciando el procesamiento del CSV...');
  const modelosSinPrecio: string[] = []; 
  const keysMismatchLog: string[] = [];
  const processedKeys = new Set<string>(); // Para evitar duplicados en la lista final
  
  const csvPath = path.join(process.cwd(), 'data', 'tabula-Video_ESCatalog.csv');
  const outputPath = path.join(process.cwd(), 'data', 'productos_corregidos.json');
  const mismatchLogPath = path.join(process.cwd(), 'data', 'keys_mismatch_debug.log');

  if (!fs.existsSync(csvPath)) {
      console.error(`ERROR: Archivo no encontrado en la ruta: ${csvPath}`);
      return;
  }
  
  const fileContent = fs.readFileSync(csvPath, { encoding: 'utf-8' });

  // --- 1. Función de Normalización de Claves para Unir Datos ---
  const normalizeKey = (key: string): string => {
    return key
      .toUpperCase()
      .trim()
      .replace(/\s/g, '') // Elimina todos los espacios
      .replace(/\(|\)/g, '') // Elimina paréntesis
      .replace(/-/g, '') // Elimina guiones
      .replace(/\./g, '') // Elimina puntos
      .replace(/,/g, ''); // Elimina comas
  };

  // --- 2. Separar Datos de Productos y Precios ---
  const priceSectionIdentifier = 'Referencia,Stock,PVP,Página';
  const sections = fileContent.split(priceSectionIdentifier);
  
  if (sections.length < 2) {
    console.error("ERROR: No se pudo encontrar el separador de la sección de precios:", priceSectionIdentifier);
    return;
  }
  
  const productDataRaw = sections[0];
  const allPriceSectionsRaw = sections.slice(1).join('\n');
  const cleanedPriceLines = allPriceSectionsRaw.split('\n').filter((line: string) => line.trim() !== '').join('\n');
  const priceDataRaw = priceSectionIdentifier + '\n' + cleanedPriceLines;

  // --- 3. Parsear la Lista de Precios y Crear el Mapa de Unión ---
  
  const priceRecords: any[] = parse(priceDataRaw, {
    columns: true,
    skip_empty_lines: true,
  });

  const priceMap = new Map<string, { pvp: string, referencia: string, stock: string }>();

  for (const record of priceRecords) {
    const ref = record['Referencia']?.trim();
    const pvp = record['PVP']?.trim();
    const stock = record['Stock']?.trim() || 'N/A';

    if (ref && pvp) {
      // Limpieza de precio: quitar €, puntos de miles, y reemplazar coma decimal por punto.
      const cleanPvp = pvp.replace('€', '').replace(/\./g, '').replace(',', '.').trim();
      
      if (ref.length > 2) {
        const normalizedRef = normalizeKey(ref);
        priceMap.set(normalizedRef, { pvp: cleanPvp, referencia: ref, stock: stock });
      }
    }
  }

  console.log(`✅ Se encontraron y mapearon ${priceMap.size} precios.`);

  // --- 4. Parsear los Datos de Productos (Lógica de Transposición y Unión) ---

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
    
    // --- HEURÍSTICA 1: DETECCIÓN DE BLOQUE COMPLEJO TRANSPUESTO (Una sola línea de encabezado - Típico de Stream) ---
    // Detecta una línea que: 
    // a) La primera parte (parts[0]) es vacía o muy corta (la esquina superior izquierda).
    // b) Contiene prefijos de modelo conocidos en las siguientes columnas.
    const isStreamHeader = 
        (parts[0] === '' || parts[0].length < 3) && 
        parts.slice(1).some(p => p.startsWith('DS-') || p.startsWith('TC-') || p.startsWith('HCO-') || p.startsWith('IDS-'));

    if (isStreamHeader) {
      
      // Los encabezados son todos los elementos de la línea excepto el primero.
      const headers = parts.slice(1).filter(h => h && h.length > 6);
      const offset = 1; // Los valores de los atributos comienzan en la columna 1 (parts[1])

      if (headers.length === 0) {
        i++;
        continue;
      }
      
      const blockProducts: Producto[] = headers.map(header => ({ Modelo: header, Tipo: 'Cámara compleja' }));
      
      i += 1; // Avanzar solo 1 línea (el encabezado)
      
      // Bucle INTERNO para procesar solo los atributos de ESTE bloque
      while (i < productLines.length) {
        const attrLine = productLines[i];
        if (!attrLine || !attrLine.trim()) { i++; continue; }

        const attrParts = attrLine.split(',').map(p => p.trim().replace(/"/g, ''));
        const attrName = attrParts[0].trim();

        // Condición de parada: si la línea es un nuevo encabezado (comienza vacío y contiene modelos)
        const esNuevoBloque = 
            (attrParts[0] === '' || attrParts[0].length < 3) && 
            attrParts.slice(1).some(p => p.startsWith('DS-') || p.startsWith('TC-') || p.startsWith('HCO-') || p.startsWith('IDS-'));
        
        if (esNuevoBloque) {
          break; // Salir del bucle de atributos para empezar un nuevo bloque de productos
        }

        if (attrName && attrName.length > 1) { 
          for (let j = 0; j < blockProducts.length; j++) {
            const product = blockProducts[j];
            const attrValue = attrParts[j + offset]; 
            
            // Asignación de atributo
            if (attrValue && attrValue !== ';') {
                const existingValue = product[attrName];
                if (existingValue && !existingValue.includes(attrValue)) {
                    product[attrName] = `${existingValue}, ${attrValue}`;
                } else if (!existingValue) {
                    product[attrName] = attrValue;
                }
            }

            // LÓGICA: EXTRAER ACCESORIOS (SOPORTES) Y AÑADIRLOS COMO PRODUCTOS INDEPENDIENTES
            if (attrName.toLowerCase().includes('soporte') && attrValue && attrValue !== 'No' && attrValue !== ';') {
                const accessoryModel = attrValue.trim();
                const normalizedAccKey = normalizeKey(accessoryModel);
                
                if (priceMap.has(normalizedAccKey) && !processedKeys.has(normalizedAccKey)) {
                     const priceData = priceMap.get(normalizedAccKey)!;
                     
                     todosLosProductos.push({
                        Modelo: accessoryModel,
                        Precio: priceData.pvp,
                        ReferenciaPrecio: priceData.referencia,
                        Stock: priceData.stock,
                        Tipo: 'Accesorio / Soporte' 
                    });
                    processedKeys.add(normalizedAccKey);
                }
            }
          }
        }
        i++;
      }

      // --- Paso de UNIÓN de Cámaras con la lista de precios ---
      for (const product of blockProducts) {
        const normalizedProductKey = normalizeKey(product.Modelo);
        
        if (processedKeys.has(normalizedProductKey)) continue;

        const priceData = priceMap.get(normalizedProductKey);

        if (priceData) {
          product.Precio = priceData.pvp;
          product.ReferenciaPrecio = priceData.referencia;
          product.Stock = priceData.stock;
          processedKeys.add(normalizedProductKey);
        } else {
          modelosSinPrecio.push(product.Modelo);
          
          if (keysMismatchLog.length < 50) {
            keysMismatchLog.push(`--- FALLA ---`);
            keysMismatchLog.push(`Producto: "${product.Modelo}" -> Normalizada: "${normalizedProductKey}"`);
            keysMismatchLog.push(`-----------------`);
          }
        }
        todosLosProductos.push(product);
      }
      
    } else {
      // --- HEURÍSTICA 2: DETECCIÓN DE PRODUCTO SIMPLE / ACCESORIO EN UNA SOLA LÍNEA ---
      const firstPart = parts[0].trim();
      const normalizedKey = normalizeKey(firstPart);

      // Si la primera columna tiene un precio en el mapa Y no es un nombre de atributo conocido (que ya debería haber sido procesado arriba)
      if (priceMap.has(normalizedKey) && firstPart.length > 2 && !processedKeys.has(normalizedKey)) {
          const priceData = priceMap.get(normalizedKey)!;
          
          // Capturamos el modelo simple (grabador, accesorio, etc.)
          todosLosProductos.push({
              Modelo: firstPart,
              Precio: priceData.pvp,
              ReferenciaPrecio: priceData.referencia,
              Stock: priceData.stock,
              Tipo: 'Producto simple/Grabador',
          });
          processedKeys.add(normalizedKey);
      }

      i++; 
    }
  }

  
  if (modelosSinPrecio.length > 0) {
    console.warn(`\n⚠️  ${modelosSinPrecio.length} modelos de CÁMARA no encontraron precio. La unión falló para estas claves.`);
    fs.writeFileSync(path.join(process.cwd(), 'data', 'modelos_sin_precio.log'), modelosSinPrecio.join('\n'));
    fs.writeFileSync(mismatchLogPath, keysMismatchLog.join('\n'));
    console.warn('Se han creado dos archivos de log: "modelos_sin_precio.log" y "keys_mismatch_debug.log" para analizar las fallas.');
  }
  
  console.log(`\n✅ Se procesaron ${todosLosProductos.length} productos (Cámaras + Accesorios).`);
  
  // --- 5. Guardar el resultado en un archivo JSON ---
  fs.writeFileSync(outputPath, JSON.stringify(todosLosProductos, null, 2));
  console.log(`🚀 ¡Éxito! Los datos procesados se han guardado en: ${outputPath}`);

})().catch(error => {
    console.error('Ha ocurrido un error durante el procesamiento:', error);
    process.exit(1);
  });