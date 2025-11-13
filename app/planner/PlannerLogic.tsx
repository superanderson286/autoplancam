'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { generateSecureReport } from '../admin/actions'; // Importamos la nueva acción
import { toast } from 'sonner'; // Usaremos toast para los mensajes de error

// --- 1. Base de Datos de Equipos HikVision (Actualizado) ---
const HIKVISION_SPECS = {
    // --- DVRs de Base (Mantenidos) ---
    DVR_4CH: { modelo: "DS-7204HQHI-K1", costo: 150, capacidad_max_hdd: 6, max_canales: 4, slots_hdd: 1 },
    DVR_8CH: { modelo: "DS-7208HQHI-K1", costo: 220, capacidad_max_hdd: 10, max_canales: 8, slots_hdd: 1 },
    DVR_16CH: { modelo: "DS-7216HQHI-K2", costo: 350, capacidad_max_hdd: 20, max_canales: 16, slots_hdd: 2 },
    DVR_16CH_PRO: { modelo: "iDS-7216HQHI-M2/S", costo: 450, capacidad_max_hdd: 20, max_canales: 16, slots_hdd: 2, alarm_io: true },
    
    // --- Cámaras de Base y Especiales ---
    BITRATE_5MP: 4096, 
    BITRATE_2MP: 2048,
    CAMARA_DOMO: { modelo: "DS-2CE56H0T-ITPF(C)", costo: 40, resolucion: 5, tipo: "Interior" },
    CAMARA_BULLET: { modelo: "DS-2CE16H0T-ITF(C)", costo: 45, resolucion: 5, tipo: "Exterior" },
    CAMARA_PTZ_HIWATCH: { modelo: "HWT-T227-IZ", costo: 450, resolucion: 2, tipo: "PTZ" }, // Alto costo
    CAMARA_IR_LARGO_ALCANCE: { modelo: "DS-2CE16H0T-IT5F", costo: 65, resolucion: 5, tipo: "IR 80m+" }, // Mayor alcance IR
    
    // --- Almacenamiento ---
    HDD_1TB: { modelo: "WD Purple 1TB", costo: 60, capacidad_gb: 1000 },
    HDD_4TB: { modelo: "WD Purple 4TB", costo: 150, capacidad_gb: 4000 },

    // --- Periféricos ---
    FUENTE_CENTRALIZADA_8CH: { modelo: "Fuente Centralizada 12V 10A", costo: 70 },
    SWITCH_8_PUERTOS: { modelo: "Switch 8 Puertos Gigabit", costo: 40 },
    CANALETA_METRO: { costo: 2 },
    CABLE_ALARMA_METRO: { costo: 0.5 },
    
    // --- Factores de Cálculo de Cámaras y Mano de Obra (MEJORADO) ---
    FACTOR_SEGURIDAD: {
        baja: { area: 1.5, habitacion: 0.5 },
        normal: { area: 2.5, habitacion: 0.8 },
        alta: { area: 3.5, habitacion: 1.2 },
        extrema: { area: 4.5, habitacion: 1.5 }
    },
    
    // 💡 NUEVOS FACTORES POR TIPO DE EDIFICACIÓN
    FACTOR_EDIFICACION: {
        casa: { factor_camaras: 1.0, factor_mano_obra: 1.0, cableado_complejidad: 1.0 }, 
        oficina: { factor_camaras: 1.2, factor_mano_obra: 1.1, cableado_complejidad: 1.2 }, // Más detalle, más plenum
        edificio: { factor_camaras: 1.3, factor_mano_obra: 1.4, cableado_complejidad: 1.5 }, // Mayor complejidad vertical/tubería
        estacionamiento: { factor_camaras: 1.6, factor_mano_obra: 0.9, cableado_complejidad: 0.8 }, // Mayor área abierta, menos obstrucciones
        finca: { factor_camaras: 1.8, factor_mano_obra: 1.5, cableado_complejidad: 2.0 }, // Mayor distancia, zanjas/torres, etc.
        otro: { factor_camaras: 1.0, factor_mano_obra: 1.0, cableado_complejidad: 1.0 },
    }
};

// --- Tipos de Datos ACTUALIZADOS ---
interface ProyectoDatos {
    // Campos requeridos para el cálculo principal
    clientName: string; // A quién va dirigido el reporte
    issuingCompanyName: string; // Quién emite el reporte
    area_m2: number;
    num_habitaciones: number;
    nivel_seguridad: 'baja' | 'normal' | 'alta' | 'extrema';
    
    // 💡 CAMPOS NUEVOS
    tipo_edificacion: 'casa' | 'oficina' | 'edificio' | 'estacionamiento' | 'finca' | 'otro';
    num_pisos: number; // Número de pisos para complejidad vertical
    usa_ptz: boolean;
    usa_ir_largo_alcance: boolean; 

    // Periféricos y Puntos de Conexión
    fuente_centralizada: boolean;
    usa_switch: boolean;
    tipo_conector: 'bnc_jack' | 'balun_hd';

    // Definición Detallada del Entorno Exterior
    longitud_perimetro: number;
    conectividad_exterior: 'aereo' | 'subterraneo';
    exposicion_ambiental: 'normal' | 'corrosivo';

    // Complejidad de la Instalación Interior
    ruta_cableado: 'canaleta' | 'oculto';
    horario_instalacion: 'habil' | 'fuera_horario';

    // Almacenamiento Adicional y RAID
    raid: boolean;
    modelo_nvr_dvr: 'economico' | 'pro';

    // Integración con Alarmas
    integracion_alarma: boolean;
    
    // Campos opcionales (mantenidos)
    interior_camaras: number;
    exterior_camaras: number;
    resolucion_mp: '2' | '5' | '8';
    dias_grabacion: number;
    horas_grabacion: number;
    material_pared: 'ladrillo' | 'drywall' | 'hormigon';
    distancia_cable: number;
    ubicacion: string;
}

interface Recomendacion {
    total_camaras: number;
    camaras_sugeridas_area: number;
    modelo_dvr: string;
    canales_dvr: number;
    modelo_camara_int: string;
    modelo_camara_ext: string;
    almacenamiento_tb_min: number;
    modelo_hdd: string;
    num_hdds: number; // 💡 NUEVO CAMPO
    costo_hdd: number; // 💡 NUEVO CAMPO
    costo_dvr: number; // 💡 NUEVO CAMPO
    costo_total_equipos: number;
    costo_final_estimado: number;
    materiales: string[];
    factor_mano_obra: number;
    costo_instalacion: number;
    costo_consumibles: number;
    final_int_camaras: number;
    final_ext_camaras: number;
    
    // 💡 NUEVOS CAMPOS DE RECOMENDACIÓN
    num_camaras_especiales: number;
    modelo_camara_especial: string;
}

// --- 2. Función de Cálculo Principal (Lógica MEJORADA) ---
function calcularRecomendaciones(datos: ProyectoDatos): Recomendacion | null {
    const { 
        area_m2, num_habitaciones, nivel_seguridad, tipo_edificacion, num_pisos, usa_ptz, usa_ir_largo_alcance,
        fuente_centralizada, usa_switch, tipo_conector,
        longitud_perimetro, conectividad_exterior, exposicion_ambiental,
        ruta_cableado, horario_instalacion,
        raid, modelo_nvr_dvr,
        integracion_alarma,
        interior_camaras, exterior_camaras, resolucion_mp, 
        dias_grabacion, horas_grabacion, material_pared, distancia_cable 
    } = datos;

    if (area_m2 <= 0) return null;

    // --- FACTORES CONTEXTUALES ---
    const factor_seg = HIKVISION_SPECS.FACTOR_SEGURIDAD[nivel_seguridad];
    const factor_edif = HIKVISION_SPECS.FACTOR_EDIFICACION[tipo_edificacion];
    const factor_pisos = num_pisos > 1 ? (1 + num_pisos * 0.1) : 1; // 10% más de complejidad por piso adicional
    
    // --- 1. CÁLCULO DE CÁMARAS SUGERIDAS (Lógica HÍBRIDA) ---
    // A. Base de Cámaras por M² y Puntos de Interés
    const camaras_area = (area_m2 / 100) * factor_seg.area;
    const camaras_puntos_base = Math.ceil(num_habitaciones * factor_seg.habitacion + 1); // +1 para entrada principal

    // B. Aplicar Factor de Edificación
    const total_sugeridas_sin_redondeo = Math.max(camaras_area, camaras_puntos_base) * factor_edif.factor_camaras;
    let total_sugeridas = Math.ceil(total_sugeridas_sin_redondeo);
    
    // C. Ajuste por Cámaras Especiales (Si se requiere PTZ/IR, se asigna 1 o 2 de las cámaras sugeridas para eso)
    const num_camaras_especiales = usa_ptz ? 1 : 0;
    
    // Asegurarse de que el mínimo de cámaras cubra las especiales
    total_sugeridas = Math.max(total_sugeridas, num_camaras_especiales + 4); // Mínimo de 4 cámaras

    // D. Selección Final (Manual vs. Sugerido)
    const total_manual = interior_camaras + exterior_camaras;
    const total_camaras = Math.max(total_manual, total_sugeridas);
    
    // Asignación Interior/Exterior: La asignación debe asegurar que las cámaras especiales no superen el total
    const final_int_camaras_base = total_manual >= total_sugeridas ? interior_camaras : Math.ceil((total_camaras - num_camaras_especiales) * 0.6);
    const final_ext_camaras_base = total_manual >= total_sugeridas ? exterior_camaras : Math.floor((total_camaras - num_camaras_especiales) * 0.4);
    
    const final_int_camaras = Math.max(0, final_int_camaras_base);
    const final_ext_camaras = Math.max(0, final_ext_camaras_base);


    // --- 2. CÁLCULO DE DVR, HDD y COSTOS ---
    const bitrate = resolucion_mp === '8' ? HIKVISION_SPECS.BITRATE_5MP * 2 :
                    resolucion_mp === '5' ? HIKVISION_SPECS.BITRATE_5MP : 
                    HIKVISION_SPECS.BITRATE_2MP;

    const CH_necesarios = total_camaras;
    let modelo_dvr_data;

    // Selección de DVR basada en canales, modelo Pro y si se requiere integración de alarma
    if (integracion_alarma || modelo_nvr_dvr === 'pro' || raid) {
        modelo_dvr_data = HIKVISION_SPECS.DVR_16CH_PRO;
    } else {
        if (CH_necesarios <= 4) {
            modelo_dvr_data = HIKVISION_SPECS.DVR_4CH;
        } else if (CH_necesarios <= 8) {
            modelo_dvr_data = HIKVISION_SPECS.DVR_8CH;
        } else {
            modelo_dvr_data = HIKVISION_SPECS.DVR_16CH; 
        }
    }
    
    // Cálculo de Almacenamiento (HDD)
    const consumo_total_gb = (bitrate * 3600 * horas_grabacion * dias_grabacion * total_camaras) / (8 * 1024 * 1024);
    const consumo_total_tb = consumo_total_gb / 1024;
    
    let modelo_hdd_data;
    if (consumo_total_tb > 1) {
        modelo_hdd_data = HIKVISION_SPECS.HDD_4TB;
    } else {
        modelo_hdd_data = HIKVISION_SPECS.HDD_1TB;
    }
    let num_hdds = Math.ceil(consumo_total_tb / (modelo_hdd_data.capacidad_gb / 1024));

    // Si se necesita RAID, duplicar los discos y verificar si el DVR lo soporta
    if (raid) {
        if (modelo_dvr_data.slots_hdd < 2) {
            // Si el DVR no soporta 2 discos, se forza el modelo PRO
            modelo_dvr_data = HIKVISION_SPECS.DVR_16CH_PRO;
        }
        num_hdds = Math.max(2, num_hdds * 2); // RAID 1 necesita al menos 2 discos
    }


    // --- CÁLCULO DE COSTOS DE EQUIPOS ---
    let costo_perifericos = 0;
    const materiales = [];
    let costo_conectores = 0;

    if (fuente_centralizada) {
        costo_perifericos += HIKVISION_SPECS.FUENTE_CENTRALIZADA_8CH.costo;
        materiales.push(`1x ${HIKVISION_SPECS.FUENTE_CENTRALIZADA_8CH.modelo}`);
    } else {
        materiales.push(`${total_camaras}x Fuentes de poder 12V DC (Transformadores)`);
    }

    if (usa_switch) {
        costo_perifericos += HIKVISION_SPECS.SWITCH_8_PUERTOS.costo;
        materiales.push(`1x ${HIKVISION_SPECS.SWITCH_8_PUERTOS.modelo}`);
    }

    if (tipo_conector === 'balun_hd') {
        materiales.push(`${total_camaras * 2}x Baluns HD-TVI (Receptor y Transmisor)`);
        costo_conectores = total_camaras * 2 * 5; // Example cost: $5 per balun pair
    } else { // bnc_jack
        materiales.push(`${total_camaras * 2}x Conectores BNC y Jacks de corriente`);
        costo_conectores = total_camaras * 2 * 2; // Example cost: $2 per BNC/Jack pair
    }

    const costo_camaras_int = final_int_camaras * HIKVISION_SPECS.CAMARA_DOMO.costo;
    const costo_camaras_ext = final_ext_camaras * (usa_ir_largo_alcance ? HIKVISION_SPECS.CAMARA_IR_LARGO_ALCANCE.costo : HIKVISION_SPECS.CAMARA_BULLET.costo);
    
    const modelo_camara_especial = usa_ptz ? HIKVISION_SPECS.CAMARA_PTZ_HIWATCH.modelo : "N/A";
    const costo_camaras_especiales = num_camaras_especiales * (usa_ptz ? HIKVISION_SPECS.CAMARA_PTZ_HIWATCH.costo : 0);
    
    const costo_dvr = modelo_dvr_data.costo;
    const costo_hdd = num_hdds * modelo_hdd_data.costo;
    
    const costo_total_equipos = costo_camaras_int + costo_camaras_ext + costo_dvr + costo_hdd + costo_camaras_especiales + costo_perifericos;
    
    // --- LÓGICA DE MANO DE OBRA Y CONSUMIBLES (APLICANDO FACTORES) ---
    
    // Factor de Mano de Obra
    const factor_pared = material_pared === 'hormigon' ? 1.5 : material_pared === 'drywall' ? 0.8 : 1.0;
    const factor_ruta = ruta_cableado === 'oculto' ? 1.5 : 1.0;
    const factor_horario = horario_instalacion === 'fuera_horario' ? 1.4 : 1.0;
    const factor_conectividad_ext = conectividad_exterior === 'subterraneo' ? 3.0 : 1.0;

    const costo_mano_obra_base = costo_total_equipos * 0.3; // Costo base de mano de obra (30% del equipo)
    const costo_instalacion = costo_mano_obra_base * factor_pared * factor_edif.factor_mano_obra * factor_pisos * factor_ruta * factor_horario;
    const costo_instalacion_exterior = (costo_camaras_ext / costo_total_equipos) * costo_instalacion * factor_conectividad_ext;
    const costo_instalacion_final = costo_instalacion + costo_instalacion_exterior;

    // Costo de Consumibles
    let costo_consumibles_base = 100;
    if (exposicion_ambiental === 'corrosivo') {
        costo_consumibles_base += 50; // Cajas de paso IP67
    }
    if (integracion_alarma) {
        costo_consumibles_base += 50; // Cable de alarma
    }

    const costo_canaleta = ruta_cableado === 'canaleta' ? (total_camaras * distancia_cable * HIKVISION_SPECS.CANALETA_METRO.costo) : 0;
    const costo_consumibles_variable = total_camaras * 10 * factor_edif.cableado_complejidad;
    const costo_consumibles = costo_consumibles_base + costo_consumibles_variable + costo_canaleta + costo_conectores;

    // Cableado
    const cable_estimado_m = (total_camaras * distancia_cable * 1.1 * factor_edif.cableado_complejidad) + longitud_perimetro;
    const rollos_305m_estimados = Math.ceil(cable_estimado_m / 305);
    const tipo_cable = datos.distancia_cable > 80 ? "UTP Cat. 6 100% Cobre (Recomendado)" : "UTP Cat. 5e";
    
    const costo_final_estimado = costo_total_equipos + costo_consumibles + costo_instalacion_final;
    
    // --- 3. RETORNO DE RECOMENDACIONES ---
    return {
        total_camaras,
        camaras_sugeridas_area: total_sugeridas,
        canales_dvr: modelo_dvr_data.max_canales,
        modelo_dvr: modelo_dvr_data.modelo,
        modelo_camara_int: HIKVISION_SPECS.CAMARA_DOMO.modelo,
        modelo_camara_ext: usa_ir_largo_alcance ? HIKVISION_SPECS.CAMARA_IR_LARGO_ALCANCE.modelo : HIKVISION_SPECS.CAMARA_BULLET.modelo,
        almacenamiento_tb_min: parseFloat(consumo_total_tb.toFixed(1)),
        modelo_hdd: modelo_hdd_data.modelo,
        num_hdds: num_hdds,
        costo_hdd: costo_hdd,
        costo_dvr: costo_dvr,
        costo_total_equipos: Math.round(costo_total_equipos),
        costo_final_estimado: Math.round(costo_final_estimado),
        
        materiales: [
            ...materiales,
            `Cable: ${tipo_cable} (Est. ${rollos_305m_estimados} rollo(s) de 305m - ${Math.ceil(cable_estimado_m)}m totales).`,
            `Tornillería: (Mínimo ${total_camaras * 4} unidades).`,
            `Cajas de paso/Registro: ${total_camaras} unidades (para protección de Baluns)`,
            `Consumibles Varios: Bridas, cinta de aislar, silicona industrial. (Incremento por ${num_pisos} pisos)`
        ],
        
        factor_mano_obra: parseFloat((costo_instalacion_final / costo_total_equipos).toFixed(2)),
        costo_instalacion: Math.round(costo_instalacion_final),
        costo_consumibles: Math.round(costo_consumibles),
        final_int_camaras: final_int_camaras, 
        final_ext_camaras: final_ext_camaras, 
        
        // RESULTADOS DE CÁMARAS ESPECIALES
        num_camaras_especiales: num_camaras_especiales,
        modelo_camara_especial: modelo_camara_especial,
    };
}

// --- 3. Componente de Informe con Markdown (Actualizado) ---
function MarkdownReport({ recomendaciones, datosProyecto }: { recomendaciones: Recomendacion, datosProyecto: ProyectoDatos }) {
    const total_camaras_manual = datosProyecto.interior_camaras + datosProyecto.exterior_camaras;

    const generateReport = () => {
        let cameraCalcExplanation = `El sistema sugiere **${recomendaciones.camaras_sugeridas_area} cámaras** (factor ${HIKVISION_SPECS.FACTOR_EDIFICACION[datosProyecto.tipo_edificacion].factor_camaras.toFixed(1)} por ser ${datosProyecto.tipo_edificacion.toUpperCase()}) basadas en ${datosProyecto.area_m2}m² y el nivel de seguridad **${datosProyecto.nivel_seguridad.toUpperCase()}**.`;
        
        if (total_camaras_manual > 0 && total_camaras_manual > recomendaciones.camaras_sugeridas_area) {
            cameraCalcExplanation += ` Se usó su conteo manual de ${total_camaras_manual} (Int: ${datosProyecto.interior_camaras}, Ext: ${datosProyecto.exterior_camaras}) porque es mayor.`;
        } else if (total_camaras_manual > 0 && total_camaras_manual < recomendaciones.camaras_sugeridas_area) {
            cameraCalcExplanation += ` Su conteo manual (${total_camaras_manual}) fue ignorado por ser inferior al recomendado (${recomendaciones.camaras_sugeridas_area}).`;
        } else {
            cameraCalcExplanation += ` Se aplicó el cálculo sugerido de ${recomendaciones.total_camaras} cámaras.`;
        }

        let ptzReport = '';
        if (recomendaciones.num_camaras_especiales > 0) {
            ptzReport = `- **Cámara Especial (PTZ):** ${recomendaciones.num_camaras_especiales} unidad(es) - Modelo ${recomendaciones.modelo_camara_especial} (Costo incluido).\n`;
        }
        
        let extModelNote = datosProyecto.usa_ir_largo_alcance ? `(Modelo de Larga Distancia IR ${recomendaciones.modelo_camara_ext})` : '';

        let edificationContext = `Tipo de Edificación: **${datosProyecto.tipo_edificacion.toUpperCase()}** (${datosProyecto.num_pisos} piso(s)).`;
        let specialCameraContext = '';
        if (datosProyecto.usa_ptz) {
            specialCameraContext += ' Se incluyó una cámara PTZ (móvil) por su requerimiento. ';
        }
        if (datosProyecto.usa_ir_largo_alcance) {
            specialCameraContext += ' Se priorizaron cámaras exteriores con IR de largo alcance. ';
        }

        let peripheralContext = '';
        if (datosProyecto.fuente_centralizada) {
            peripheralContext += ' Se consideró una fuente de alimentación centralizada. ';
        } else {
            peripheralContext += ' Se estimaron fuentes individuales para cada cámara. ';
        }
        if (datosProyecto.usa_switch) {
            peripheralContext += ' Se incluyó un switch para la gestión de red. ';
        }
        peripheralContext += ` Se utilizarán conectores **${datosProyecto.tipo_conector.toUpperCase().replace('_', ' ')}**.`;

        let exteriorContext = '';
        if (datosProyecto.longitud_perimetro > 0) {
            exteriorContext += ` Se consideró una longitud de perímetro de **${datosProyecto.longitud_perimetro}m** con conectividad **${datosProyecto.conectividad_exterior.toUpperCase()}**.`;
        }
        if (datosProyecto.exposicion_ambiental === 'corrosivo') {
            exteriorContext += ' Se incluyeron consumibles especiales para ambientes corrosivos/polvo. ';
        }

        let installationComplexityContext = `Ruta de cableado: **${datosProyecto.ruta_cableado.toUpperCase()}**. Horario de instalación: **${datosProyecto.horario_instalacion.toUpperCase()}**.`;

        let storageRaidContext = `Modelo de DVR/NVR base: **${datosProyecto.modelo_nvr_dvr.toUpperCase()}**.`;
        if (datosProyecto.raid) {
            storageRaidContext += ' Se configuró redundancia de disco (RAID) para mayor seguridad de datos. ';
        }
        if (datosProyecto.integracion_alarma) {
            storageRaidContext += ' Se seleccionó un DVR compatible con integración de alarma. ';
        }

        const report = `
## ✅ Informe Detallado del Proyecto de ${datosProyecto.issuingCompanyName || 'Su Compañía'} para: ${datosProyecto.clientName || 'Cliente'}

> #### CÁLCULO DE CÁMARAS:
> ${cameraCalcExplanation}
> **Contexto de Edificación:** ${edificationContext}
> **Requerimientos Especiales:** ${specialCameraContext}

---

### EQUIPAMIENTO HIKVISION
- **Cámaras Totales (Final):** ${recomendaciones.total_camaras} (Int: ${recomendaciones.final_int_camaras} / Ext: ${recomendaciones.final_ext_camaras})
${ptzReport}
- **Grabador (DVR/NVR):** ${recomendaciones.modelo_dvr} (${recomendaciones.canales_dvr} Canales)
- **Modelo Interior:** ${recomendaciones.modelo_camara_int} (Domo)
- **Modelo Exterior:** ${recomendaciones.modelo_camara_ext} (Bullet) ${extModelNote}
- **Almacenamiento Mínimo:** ${recomendaciones.almacenamiento_tb_min} TB (Requerido)
- **Disco Duro Recomendado:** ${recomendaciones.num_hdds} x ${recomendaciones.modelo_hdd}
> **Costo de Equipos (Estimado): ${recomendaciones.costo_total_equipos} USD**

---

### DESGLOSE DE COSTOS DE EQUIPOS
- **Costo de Cámaras:** ${recomendaciones.costo_total_equipos - recomendaciones.costo_dvr - recomendaciones.costo_hdd} USD
- **Costo de DVR:** ${recomendaciones.costo_dvr} USD
- **Costo de HDD:** ${recomendaciones.costo_hdd} USD

---

### RESUMEN FINANCIERO (Ajustado por Logística)
- **Costo de Equipos:** ${recomendaciones.costo_total_equipos} USD
- **Costo de Consumibles:** ~${recomendaciones.costo_consumibles} USD
- **Mano de Obra (Factor ${Math.round(recomendaciones.factor_mano_obra * 100)}%):** ~${recomendaciones.costo_instalacion} USD
> **Total Proyecto Estimado: ${recomendaciones.costo_final_estimado} USD**

---

### 📋 NOTAS LOGÍSTICAS Y MATERIALES REQUERIDOS
${recomendaciones.materiales.map(m => `- ${m}`).join('\n')}

> **Consideraciones Adicionales:**
> - **Periféricos y Conectividad:** ${peripheralContext}
> - **Entorno Exterior:** ${exteriorContext}
> - **Complejidad de Instalación:** ${installationComplexityContext}
> - **Almacenamiento y Redundancia:** ${storageRaidContext}
> - **NOTA TÉCNICA DE INSTALACIÓN:** La complejidad y el costo de mano de obra se ajustaron debido al tipo de edificación (**${datosProyecto.tipo_edificacion.toUpperCase()}**) con **${datosProyecto.num_pisos} piso(s)** y la instalación sobre **${datosProyecto.material_pared.toUpperCase()}**.
`;
        return report;
    };

    return (
        <div className="mt-8 pt-6 border-t border-gray-300">
            <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                {generateReport()}
            </ReactMarkdown>
        </div>
    );
}


// --- 4. Componente de Interfaz de Usuario (ACTUALIZADO CON NUEVOS INPUTS) ---
export default function PlannerLogic() {
    const [datosProyecto, setDatosProyecto] = useState<ProyectoDatos>({
        // VALORES REQUERIDOS
        clientName: '',
        issuingCompanyName: '',
        area_m2: 150,
        num_habitaciones: 0,
        nivel_seguridad: 'normal',
        
        // 💡 NUEVOS VALORES REQUERIDOS
        tipo_edificacion: 'casa',
        num_pisos: 1,
        usa_ptz: false,
        usa_ir_largo_alcance: false,

        // Periféricos y Puntos de Conexión
        fuente_centralizada: false,
        usa_switch: false,
        tipo_conector: 'balun_hd',

        // Definición Detallada del Entorno Exterior
        longitud_perimetro: 0,
        conectividad_exterior: 'aereo',
        exposicion_ambiental: 'normal',

        // Complejidad de la Instalación Interior
        ruta_cableado: 'canaleta',
        horario_instalacion: 'habil',

        // Almacenamiento Adicional y RAID
        raid: false,
        modelo_nvr_dvr: 'economico',

        // Integración con Alarmas
        integracion_alarma: false,

        // VALORES OPCIONALES
        interior_camaras: 0, 
        exterior_camaras: 0,
        resolucion_mp: '5',
        dias_grabacion: 30,
        horas_grabacion: 24,
        material_pared: 'ladrillo',
        distancia_cable: 50,
        ubicacion: 'Ciudad de ejemplo',
    });
    
    const [calculado, setCalculado] = useState(false);
    const [recomendaciones, setRecomendaciones] = useState<Recomendacion | null>(null);

    // Estado para el botón de carga
    const [isGenerating, setIsGenerating] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        // Manejar el checkbox como booleano
        const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : (type === 'number' ? Number(value) : value);
        
        setDatosProyecto(prev => ({
            ...prev,
            [name]: finalValue,
        }));
        setCalculado(false);
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsGenerating(true);

        // 1. Llama a la acción del servidor para verificar los permisos
        const result = await generateSecureReport(datosProyecto);

        // 2. Si hay un error (límite alcanzado, cuenta expirada), muéstralo y detente.
        if (result.error) {
            toast.error(result.error);
            setIsGenerating(false);
            return;
        }

        // 3. Si todo está bien, procede a calcular y mostrar el reporte.
        const resultados = calcularRecomendaciones(datosProyecto);
        setRecomendaciones(resultados);
        setCalculado(true);
        setIsGenerating(false);
    };

    return (
        <div className="p-8 space-y-8 max-w-5xl mx-auto bg-white rounded-xl shadow-2xl">
            <h1 className="text-3xl font-extrabold text-blue-800 border-b pb-4">
                Generador de Plan de Seguridad HikVision
            </h1>

            <form onSubmit={handleSubmit} className="space-y-8">
                
                {/* SECCIÓN 0: Información del Cliente */}
                <div className="p-6 border-2 border-gray-200 rounded-xl bg-gray-50">
                    <h2 className="text-xl font-semibold mb-4 text-gray-700">Información del Proyecto</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Cliente (Dirigido a)</label>
                            <input type="text" name="clientName" value={datosProyecto.clientName}
                               onChange={handleInputChange}
                               placeholder="Ej: Mi Empresa S.A. o Juan Pérez"
                               className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Compañía Emisora</label>
                            <input type="text" name="issuingCompanyName" value={datosProyecto.issuingCompanyName}
                                   onChange={handleInputChange}
                                   placeholder="Ej: Su Compañía de Seguridad"
                                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                    </div>
                </div>


                {/* SECCIÓN A: Datos Básicos Requeridos */}
                <div className="p-6 border-2 border-indigo-100 rounded-xl bg-indigo-50">
                    <h2 className="text-xl font-semibold mb-4 text-indigo-700">A. Datos Geométricos y Nivel de Riesgo (Requeridos)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* 1. Área Cuadrada (Requerido) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Área Total del Sitio (m²)</label>
                            <input type="number" name="area_m2" value={datosProyecto.area_m2} 
                                   onChange={handleInputChange} min="1" required
                                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        {/* 2. N° de Habitaciones/Oficinas (Requerido) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">N° de Habitaciones u Oficinas</label>
                            <input type="number" name="num_habitaciones" value={datosProyecto.num_habitaciones || ''} 
                                   onChange={handleInputChange} min="0" required
                                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        {/* 3. Nivel de Seguridad (Requerido) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nivel de Seguridad Deseado</label>
                            <select name="nivel_seguridad" value={datosProyecto.nivel_seguridad} onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                <option value="baja">Baja</option>
                                <option value="normal">Normal</option>
                                <option value="alta">Alta</option>
                                <option value="extrema">Extrema</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* 💡 NUEVA SECCIÓN: Contexto de la Edificación */}
                <div className="p-6 border-2 border-green-100 rounded-xl bg-green-50">
                    <h2 className="text-xl font-semibold mb-4 text-green-700">B. Contexto de Edificación y Requerimientos Especiales</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        
                        {/* 4. Tipo de Edificación */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tipo de Edificación</label>
                            <select name="tipo_edificacion" value={datosProyecto.tipo_edificacion} onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                <option value="casa">Casa/Vivienda</option>
                                <option value="oficina">Oficina/Consultorio</option>
                                <option value="edificio">Edificio (Comercial/Aptos)</option>
                                <option value="estacionamiento">Estacionamiento</option>
                                <option value="finca">Finca/Propiedad Rural</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>
                        
                        {/* 5. N° de Pisos */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Número de Pisos/Plantas</label>
                            <input type="number" name="num_pisos" value={datosProyecto.num_pisos} 
                                   onChange={handleInputChange} min="1" required
                                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        
                        {/* 6. PTZ Checkbox */}
                        <div className="flex items-center pt-5">
                            <input type="checkbox" name="usa_ptz" checked={datosProyecto.usa_ptz} 
                                   onChange={handleInputChange} id="usa_ptz"
                                   className="h-4 w-4 text-green-600 border-gray-300 rounded"
                            />
                            <label htmlFor="usa_ptz" className="ml-2 block text-sm font-medium text-gray-700">Requiere Cámara PTZ (Móvil)</label>
                        </div>

                        {/* 7. IR Largo Alcance Checkbox */}
                        <div className="flex items-center pt-5">
                            <input type="checkbox" name="usa_ir_largo_alcance" checked={datosProyecto.usa_ir_largo_alcance} 
                                   onChange={handleInputChange} id="usa_ir_largo_alcance"
                                   className="h-4 w-4 text-green-600 border-gray-300 rounded"
                            />
                            <label htmlFor="usa_ir_largo_alcance" className="ml-2 block text-sm font-medium text-gray-700">IR Largo Alcance (Noche Total)</label>
                        </div>
                        
                    </div>
                </div>

                {/* Periféricos y Puntos de Conexión */}
                <div className="p-6 border-2 border-blue-100 rounded-xl bg-blue-50">
                    <h2 className="text-xl font-semibold mb-4 text-blue-700">D. Periféricos y Puntos de Conexión</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex items-center pt-5">
                            <input type="checkbox" name="fuente_centralizada" checked={datosProyecto.fuente_centralizada}
                                   onChange={handleInputChange} id="fuente_centralizada"
                                   className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                            />
                            <label htmlFor="fuente_centralizada" className="ml-2 block text-sm font-medium text-gray-700">Fuente de Alimentación Centralizada</label>
                        </div>
                        <div className="flex items-center pt-5">
                            <input type="checkbox" name="usa_switch" checked={datosProyecto.usa_switch}
                                   onChange={handleInputChange} id="usa_switch"
                                   className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                            />
                            <label htmlFor="usa_switch" className="ml-2 block text-sm font-medium text-gray-700">Puntos de Red/Uso de Switch</label>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tipo de Conector</label>
                            <select name="tipo_conector" value={datosProyecto.tipo_conector} onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                <option value="balun_hd">Balun HD</option>
                                <option value="bnc_jack">BNC/Jack</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Definición Detallada del Entorno Exterior */}
                <div className="p-6 border-2 border-yellow-100 rounded-xl bg-yellow-50">
                    <h2 className="text-xl font-semibold mb-4 text-yellow-700">E. Definición Detallada del Entorno Exterior</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Longitud de Perímetro (m)</label>
                            <input type="number" name="longitud_perimetro" value={datosProyecto.longitud_perimetro || ''}
                                   onChange={handleInputChange} min="0"
                                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tipo de Conectividad Exterior</label>
                            <select name="conectividad_exterior" value={datosProyecto.conectividad_exterior} onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                <option value="aereo">Aéreo con guaya</option>
                                <option value="subterraneo">Subterráneo/Zanjas</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Grado de Exposición Ambiental</label>
                            <select name="exposicion_ambiental" value={datosProyecto.exposicion_ambiental} onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                <option value="normal">Normal</option>
                                <option value="corrosivo">Corrosivo/Alto Polvo</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Complejidad de la Instalación Interior */}
                <div className="p-6 border-2 border-purple-100 rounded-xl bg-purple-50">
                    <h2 className="text-xl font-semibold mb-4 text-purple-700">F. Complejidad de la Instalación Interior</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Ruta del Cableado</label>
                            <select name="ruta_cableado" value={datosProyecto.ruta_cableado} onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                <option value="canaleta">Visto/Canaleta</option>
                                <option value="oculto">Oculto/Tubería Existente</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Horario de Instalación</label>
                            <select name="horario_instalacion" value={datosProyecto.horario_instalacion} onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                <option value="habil">Horas Hábiles</option>
                                <option value="fuera_horario">Fuera de Horario/Fines de Semana</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Almacenamiento Adicional y RAID */}
                <div className="p-6 border-2 border-red-100 rounded-xl bg-red-50">
                    <h2 className="text-xl font-semibold mb-4 text-red-700">G. Almacenamiento Adicional y RAID</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-center pt-5">
                            <input type="checkbox" name="raid" checked={datosProyecto.raid}
                                   onChange={handleInputChange} id="raid"
                                   className="h-4 w-4 text-red-600 border-gray-300 rounded"
                            />
                            <label htmlFor="raid" className="ml-2 block text-sm font-medium text-gray-700">Redundancia de Disco (RAID)</label>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Modelo NVR/DVR Base</label>
                            <select name="modelo_nvr_dvr" value={datosProyecto.modelo_nvr_dvr} onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                <option value="economico">Económico</option>
                                <option value="pro">Pro/Capacidad</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Integración con Alarmas */}
                <div className="p-6 border-2 border-teal-100 rounded-xl bg-teal-50">
                    <h2 className="text-xl font-semibold mb-4 text-teal-700">H. Integración con Alarmas</h2>
                    <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                        <div className="flex items-center pt-5">
                            <input type="checkbox" name="integracion_alarma" checked={datosProyecto.integracion_alarma}
                                   onChange={handleInputChange} id="integracion_alarma"
                                   className="h-4 w-4 text-teal-600 border-gray-300 rounded"
                            />
                            <label htmlFor="integracion_alarma" className="ml-2 block text-sm font-medium text-gray-700">Integración con Alarma</label>
                        </div>
                    </div>
                </div>


                {/* SECCIÓN C: Personalización y Logística (Opcional) - Mantenido */}
                <div className="p-6 border-2 border-gray-200 rounded-xl bg-gray-50">
                    <h2 className="text-xl font-semibold mb-4 text-gray-700">C. Personalización y Logística (Opcional - Sobrepasa el cálculo)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Cámaras Int/Ext Manuales */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Cámaras Int. Manuales</label>
                            <input type="number" name="interior_camaras" value={datosProyecto.interior_camaras || ''} 
                                   onChange={handleInputChange} min="0" max="16"
                                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Cámaras Ext. Manuales</label>
                            <input type="number" name="exterior_camaras" value={datosProyecto.exterior_camaras || ''} 
                                   onChange={handleInputChange} min="0" max="16"
                                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        
                        {/* Resolución */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Resolución</label>
                            <select name="resolucion_mp" value={datosProyecto.resolucion_mp} onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                <option value="2">2 MP (1080p)</option>
                                <option value="5">5 MP (2K)</option>
                                <option value="8">8 MP (4K)</option>
                            </select>
                        </div>
                        
                        {/* Días y Horas de Grabación */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Días de Retención</label>
                            <input type="number" name="dias_grabacion" value={datosProyecto.dias_grabacion} 
                                   onChange={handleInputChange} min="7" max="90"
                                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        
                        {/* Material de Pared */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Material de Pared</label>
                            <select name="material_pared" value={datosProyecto.material_pared} onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                <option value="drywall">Drywall/Yeso</option>
                                <option value="ladrillo">Ladrillo/Bloque</option>
                                <option value="hormigon">Hormigón/Concreto</option>
                            </select>
                        </div>
                        
                        {/* Distancia Promedio */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Distancia Cable (m)</label>
                            <input type="number" name="distancia_cable" value={datosProyecto.distancia_cable} 
                                   onChange={handleInputChange} min="10" max="300"
                                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        
                        {/* Ubicación */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Ubicación (Mano de Obra)</label>
                            <input type="text" name="ubicacion" value={datosProyecto.ubicacion} 
                                   onChange={handleInputChange}
                                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                    </div>
                </div>

                {/* Botón de Cálculo */}
                <button
                    type="submit"
                    disabled={datosProyecto.area_m2 <= 0 || isGenerating}
                    className={`w-full py-3 text-lg font-bold rounded-lg transition duration-300 
                                ${datosProyecto.area_m2 <= 0 || isGenerating
                                    ? 'bg-gray-400 cursor-not-allowed' 
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                >
                    {isGenerating ? 'Generando...' : (datosProyecto.area_m2 <= 0 ? 'Ingrese el Área para Calcular' : 'Generar Plan de Trabajo Exacto')}
                </button>
            </form>

            {/* Resultados y Recomendaciones */}
            {calculado && recomendaciones && (
                <MarkdownReport recomendaciones={recomendaciones} datosProyecto={datosProyecto} />
            )}
        </div>
    );
}
