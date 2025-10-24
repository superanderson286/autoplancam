import 'dotenv/config';

// db/seed.ts - Generado automáticamente desde input_products.csv
import { db } from './index.js'; 
import { products } from './schema.js';
import { eq } from 'drizzle-orm';

// Lista de productos extraídos del catálogo
const productData = [
  {
    name: "'HWD-5104(S)'",
    category: "'DVR'",
    spec_value: null,
    spec_unit: "'CH'",
    description: "'4-ch (HD-TVI 1080p, AHD 1080p, HDCVI 1080p, CVBS), 4-ch / 960p, H.264+/H.264, 1080p Lite/720p/WD1/4CIF@25fps, 1 HDMI, 1 VGA, 1080p, 1080p, 4-ch, 1 / 1, 1-ch, 1 SATA / 6TB máx., 1 Ethernet 10/100Mbps, 32 conexiones, 2 USB 2.0, 12VDC / 8W máx. (sin HDD), Plástico'"
  },
  {
    name: "'HWD-6104MH-G3(S)'",
    category: "'DVR'",
    spec_value: null,
    spec_unit: "'CH'",
    description: "'4-ch (HD-TVI 4MP, AHD 4MP, HDCVI 4MP, CVBS), 2-ch (ampliable hasta 6-ch) / 6MP, H.265 Pro+/H.265 Pro/H.265+/H.265/H.264+/H.264, 4 MP Lite@15fps, 1080p Lite/720p Lite/WD1/4CIF, CIF@25fps, 1 HDMI, 1 VGA, 1080p, 1080p, 4-ch, 1 / 1, -, 1-ch, 1 SATA / 10TB máx., 1 Ethernet 10/100Mbps, 32 conexiones, 2 USB 2.0, 12VDC / 8W máx. (sin HDD), Metal'"
  },
  {
    name: "'HWD-7104MH-G2(S)'",
    category: "'DVR'",
    spec_value: null,
    spec_unit: "'CH'",
    description: "'4-ch (HD-TVI 5MP, AHD 5MP, HDCVI 4MP, CVBS), 4-ch (ampliable hasta 8-ch) / 8MP, H.265 Pro+/H.265 Pro/H.265+/H.265/H.264+/H.264, 8MP@8fps, 5MP@12fps, 4MP@15fps, 3MP@18fps, 1080p/720p WD1/4CIF@25fps, 1 HDMI, 1 VGA, 1080p, 1080p, 4-ch, 1 / 1, 1-ch, 1 SATA / máx. 10TB, 1 Ethernet 10/100Mbps, 32 conexiones, 2 USB 2.0, 12VDC / 10W máx. (sin HDD), Metal'"
  },
  {
    name: "'HWN-2108MH-W*'",
    category: "'NVR'",
    spec_value: null,
    spec_unit: "'CH'",
    description: "'8-ch, H.265+/H.265/H.264+/H.264, Hasta 6MP, 1 HDMI, 1 VGA, 1080p, 1080p, 8-ch, - /1-ch, -, 1 SATA / 6TB máx., 1 Ethernet 10/100Mbps, 50 Mbps / 40 Mbps, 2 USB 2.0, 12VDC / 10W máx., Metal'"
  },
  {
    name: "'HWN-2104H*'",
    category: "'NVR'",
    spec_value: null,
    spec_unit: "'CH'",
    description: "'4-ch, H.265+/H.265/H.264+/H.264, Hasta 4MP, 1 HDMI, 1 VGA, 1080p, 1080p, 4-ch, - / -, -, 1 SATA / 6TB máx., 1 Ethernet 10/100Mbps, 40 Mbps / 60 Mbps, 2 USB 2.0, 12VDC / 10W máx., Plástico'"
  },
  {
    name: "'HWN-4104MH'",
    category: "'NVR'",
    spec_value: null,
    spec_unit: "'CH'",
    description: "'4-ch, H.265+/H.265/H.264+/H.264, Hasta 8MP, 1 HDMI, 1 VGA, 4K/30Hz, 1080p, 4-ch, 1 / 1, 1-ch, 1 SATA / 8TB máx., 1 Ethernet 10/100Mbps, 40 Mbps / 80 Mbps, 2 USB 2.0, 12VDC / 10W máx., Metal'"
  },
  {
    name: "'HWN-4208MH'",
    category: "'NVR'",
    spec_value: null,
    spec_unit: "'CH'",
    description: "'8-ch, H.265+/H.265/H.264+/H.264, Hasta 8MP, 1 HDMI, 1 VGA, 4K/30Hz, 1080p, 8-ch, 1 / 1, 1-ch, 2 SATA / 8TB máx. x HDD, 1 Ethernet 10/100Mbps, 80 Mbps / 80 Mbps, 2 USB 2.0, 12VDC / 15W máx., Metal'"
  },
  {
    name: "'HWT-B120-M'",
    category: "'CAMARA'",
    spec_value: null,
    spec_unit: "'MP'",
    description: "'2MP CMOS, 1920 x 1080, 1080p@25fps, 0.01 Lux @ F1.2, AGC ON, 0 Lux con IR, IR cut filter, 2.8mm (103°) / 3.6mm (80.7°), / 6mm (50.1o), DWDR, 1 (conmutable: TVI / AHD, CVI / CVBS), Hasta 20m, 12VDC / 4W máx., -40°C a +60°C, IP66'"
  },
  {
    name: "'HWI-B181H-M'",
    category: "'CAMARA'",
    spec_value: null,
    spec_unit: "'MP'",
    description: "'1/2.5'' Progressive Scan CMOS, 3840 x 2160, 12.5fps (3072 x 1728), 0.01 Lux @ F2.0, AGC ON, IR cut filter, 2.8mm (102°), 120dB, H.265+/H.265/H.264+/H.264, Hasta 30m, -, Open Network Video Interface (PROFILE S, PROFILE G), ISAPI, SDK, ISUP, 12 VDC, 6.5W máx., -30 °C a +60 °C, IP67, Metal'"
  }
];

async function seed() {
  console.log('Iniciando proceso de seeding...');
  
  // 1. Limpiar los productos existentes (opcional: borrar por nombre para evitar duplicados)
  for (const product of productData) {
      await db.delete(products).where(eq(products.name, product.name));
  }
  console.log(`Se eliminaron ${productData.length} productos coincidentes para limpieza antes de insertar.`);

  // 2. Insertar los nuevos datos
  await db.insert(products).values(productData);
  console.log(`Se insertaron ${productData.length} productos.`);

  console.log('Seeding completado con éxito.');
}

seed()
  .catch((e) => {
    console.error('Error durante el seeding:', e);
    process.exit(1);
  });