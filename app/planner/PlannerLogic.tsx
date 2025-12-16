'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner'; // Usaremos toast para los mensajes de error

// Pequeño convertidor Markdown -> HTML para evitar dependencias pesadas
function simpleMarkdownToHtml(md: string) {
    // Escape HTML
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Handle code blocks ```
    md = md.replace(/```([\s\S]*?)```/g, (_m, code) => `<pre><code>${esc(code)}</code></pre>`);

    const lines = md.split(/\r?\n/);
    let out: string[] = [];
    let inList = false;
    for (let line of lines) {
        // Remove leading indentation (but keep code blocks handled above)
        const trimmed = line.replace(/^\s+/, '');
        if (/^###\s+/.test(trimmed)) {
            if (inList) { out.push('</ul>'); inList = false; }
            out.push(`<h3>${esc(trimmed.replace(/^###\s+/, ''))}</h3>`);
            continue;
        }
        if (/^##\s+/.test(trimmed)) {
            if (inList) { out.push('</ul>'); inList = false; }
            out.push(`<h2>${esc(trimmed.replace(/^##\s+/, ''))}</h2>`);
            continue;
        }
        if (/^#\s+/.test(trimmed)) {
            if (inList) { out.push('</ul>'); inList = false; }
            out.push(`<h1>${esc(trimmed.replace(/^#\s+/, ''))}</h1>`);
            continue;
        }
        if (/^>\s+/.test(trimmed)) {
            if (inList) { out.push('</ul>'); inList = false; }
            const inner = trimmed.replace(/^>\s+/, '');
            // Process simple inline markdown inside blockquote
            const innerProcessed = esc(inner)
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/`([^`]+)`/g, '<code>$1</code>');
            // If inner starts with a header marker, render it inside blockquote
            if (/^###\s+/.test(inner)) {
                out.push(`<blockquote><h3>${esc(inner.replace(/^###\s+/, ''))}</h3></blockquote>`);
            } else if (/^##\s+/.test(inner)) {
                out.push(`<blockquote><h2>${esc(inner.replace(/^##\s+/, ''))}</h2></blockquote>`);
            } else if (/^#\s+/.test(inner)) {
                out.push(`<blockquote><h1>${esc(inner.replace(/^#\s+/, ''))}</h1></blockquote>`);
            } else {
                out.push(`<blockquote>${innerProcessed}</blockquote>`);
            }
            continue;
        }
        if (/^-\s+/.test(trimmed)) {
            if (!inList) { out.push('<ul>'); inList = true; }
            out.push(`<li>${esc(trimmed.replace(/^-\s+/, ''))}</li>`);
            continue;
        }

        // inline bold **text** and inline code `code`
        let processed = esc(trimmed)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`([^`]+)`/g, '<code>$1</code>');

        if (processed.trim() === '') {
            if (inList) { out.push('</ul>'); inList = false; }
            out.push('<br/>');
        } else {
            if (inList) { out.push('</ul>'); inList = false; }
            out.push(`<p>${processed}</p>`);
        }
    }
    if (inList) out.push('</ul>');
    return out.join('\n');
}

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

// --- 3. Componente de Informe (Formato profesional) ---
function MarkdownReport({ recomendaciones, datosProyecto }: { recomendaciones: Recomendacion, datosProyecto: ProyectoDatos }) {
    const formatCurrency = (v: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
    const formatTb = (v: number) => `${v} TB`;

    // Download the report as a standalone HTML file
    const downloadHTML = () => {
        if (typeof document === 'undefined') return;
        const content = document.getElementById('report-content')?.innerHTML || '';
        const full = `<!doctype html><html><head><meta charset="utf-8"><title>Informe</title>
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <style>body{font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,'Helvetica Neue',Arial; padding:20px; color:#0f172a} h2{color:#0f172a}</style>
        </head><body>${content}</body></html>`;
        const blob = new Blob([full], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `informe-${Date.now()}.html`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    // Download a Word-compatible .doc (HTML content saved with .doc MIME)
    const downloadWord = () => {
        if (typeof document === 'undefined') return;
        const content = document.getElementById('report-content')?.innerHTML || '';
        const full = `<!doctype html><html><head><meta charset="utf-8"><title>Informe</title>
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <style>body{font-family:Times,serif; padding:20px; color:#000} h2{color:#000}</style>
        </head><body>${content}</body></html>`;
        const blob = new Blob([full], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `informe-${Date.now()}.doc`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    // Open a print window for PDF (user chooses "Save as PDF" in the print dialog)
    const downloadPDF = () => {
        if (typeof document === 'undefined' || typeof window === 'undefined') return;
        const content = document.getElementById('report-content')?.innerHTML || '';
        const win = window.open('', '_blank', 'width=900,height=700');
        if (!win) {
            try { toast.error('No se pudo abrir la ventana de impresión. Revise bloqueadores.'); } catch (e) {}
            return;
        }
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>Informe</title>
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <style>body{font-family:Inter,Arial,Helvetica,sans-serif; padding:20px; color:#0f172a} h2{color:#0f172a}</style>
        </head><body>${content}</body></html>`;
        win.document.open();
        win.document.write(html);
        win.document.close();
        win.focus();
        // Give the document a moment to render then trigger print
        setTimeout(() => { win.print(); /* keep open for user to save */ }, 500);
    };

    return (
        <section id="report-content" className="mt-8 p-6 bg-white rounded-xl shadow-md">
            <header className="mb-6">
                <h2 className="text-2xl font-extrabold text-slate-800">✅ Informe Detallado del Proyecto</h2>
                <p className="text-sm text-slate-500">Empresa emisora: <strong>{datosProyecto.issuingCompanyName || 'Autoplancam'}</strong> — Cliente: <strong>{datosProyecto.clientName || 'Cliente'}</strong></p>
            </header>

            <div className="flex gap-3 mb-4">
                <button type="button" onClick={downloadPDF} className="px-3 py-2 bg-slate-800 text-white rounded-md text-sm">Descargar PDF</button>
                <button type="button" onClick={downloadWord} className="px-3 py-2 bg-green-600 text-white rounded-md text-sm">Descargar Word</button>
                <button type="button" onClick={downloadHTML} className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm">Descargar HTML</button>
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-700">Cálculo de Cámaras</h3>
                <p className="mt-2 text-slate-600">El sistema sugiere <strong>{recomendaciones.camaras_sugeridas_area}</strong> cámaras (factor {HIKVISION_SPECS.FACTOR_EDIFICACION[datosProyecto.tipo_edificacion].factor_camaras.toFixed(1)} por ser {datosProyecto.tipo_edificacion.toUpperCase()}) basadas en <strong>{datosProyecto.area_m2} m²</strong> y el nivel de seguridad <strong>{datosProyecto.nivel_seguridad.toUpperCase()}</strong>.</p>
                <p className="mt-2 text-slate-600">Contexto: <strong>{datosProyecto.tipo_edificacion.toUpperCase()}</strong> — {datosProyecto.num_pisos} piso(s). {datosProyecto.usa_ptz ? 'Incluye PTZ. ' : ''}{datosProyecto.usa_ir_largo_alcance ? 'Incluye IR de largo alcance.' : ''}</p>
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-700">Equipamiento recomendado</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                    <div className="col-span-1">
                        <p className="text-sm text-slate-600">Cámaras (Total)</p>
                        <p className="text-xl font-bold text-slate-800">{recomendaciones.total_camaras} <span className="text-sm font-medium text-slate-500">(Int: {recomendaciones.final_int_camaras} / Ext: {recomendaciones.final_ext_camaras})</span></p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-600">Grabador</p>
                        <p className="text-lg font-semibold">{recomendaciones.modelo_dvr} <span className="text-sm text-slate-500">({recomendaciones.canales_dvr} canales)</span></p>
                        <p className="text-sm text-slate-500 mt-1">Discos: {recomendaciones.num_hdds} x {recomendaciones.modelo_hdd} ({formatTb(recomendaciones.almacenamiento_tb_min)})</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-600">Coste estimado</p>
                        <p className="text-2xl font-extrabold text-slate-800 mt-1">{formatCurrency(recomendaciones.costo_total_equipos)}</p>
                    </div>
                </div>
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-700">Desglose de costos</h3>
                <ul className="mt-3 space-y-2 text-slate-600">
                    <li><strong>Costo de cámaras:</strong> {formatCurrency(recomendaciones.costo_total_equipos - recomendaciones.costo_dvr - recomendaciones.costo_hdd)}</li>
                    <li><strong>Costo DVR:</strong> {formatCurrency(recomendaciones.costo_dvr)}</li>
                    <li><strong>Costo HDD:</strong> {formatCurrency(recomendaciones.costo_hdd)}</li>
                </ul>
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-700">Resumen financiero</h3>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 rounded">
                        <div className="text-sm text-slate-500">Equipos</div>
                        <div className="text-lg font-bold">{formatCurrency(recomendaciones.costo_total_equipos)}</div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded">
                        <div className="text-sm text-slate-500">Consumibles</div>
                        <div className="text-lg font-bold">{formatCurrency(recomendaciones.costo_consumibles)}</div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded">
                        <div className="text-sm text-slate-500">Mano de obra</div>
                        <div className="text-lg font-bold">{formatCurrency(recomendaciones.costo_instalacion)}</div>
                    </div>
                </div>
                <div className="mt-4 text-right">
                    <div className="text-sm text-slate-500">Total proyecto estimado</div>
                    <div className="text-2xl font-extrabold text-slate-800">{formatCurrency(recomendaciones.costo_final_estimado)}</div>
                </div>
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-700">Materiales y notas logísticas</h3>
                <ul className="mt-3 list-disc list-inside text-slate-600">
                    {recomendaciones.materiales.map((m, i) => (
                        <li key={i}>{m}</li>
                    ))}
                </ul>

                <div className="mt-4 text-slate-600">
                    <p><strong>Periféricos y conectividad:</strong> {(datosProyecto.fuente_centralizada ? 'Fuente centralizada. ' : 'Fuentes individuales. ') + (datosProyecto.usa_switch ? 'Switch incluido. ' : '') + `Conectores: ${datosProyecto.tipo_conector.toUpperCase().replace('_',' ')}`}</p>
                    <p className="mt-2"><strong>Entorno exterior:</strong> {datosProyecto.longitud_perimetro > 0 ? `Perímetro ${datosProyecto.longitud_perimetro}m, conectividad ${datosProyecto.conectividad_exterior}.` : 'No aplica.'} {datosProyecto.exposicion_ambiental === 'corrosivo' ? 'Ambiente corrosivo — consumibles especiales.' : ''}</p>
                    <p className="mt-2"><strong>Instalación:</strong> Ruta: {datosProyecto.ruta_cableado.toUpperCase()}. Horario: {datosProyecto.horario_instalacion.toUpperCase()}.</p>
                </div>
            </div>

        </section>
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

        try {
            // Llamamos a la ruta API que ejecuta la verificación server-side
            const resp = await fetch('/api/admin/generate-secure-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosProyecto),
            });

            const result = await resp.json();

            if (result.error) {
                toast.error(result.error);
                setIsGenerating(false);
                return;
            }

            // Si la verificación server-side es exitosa, calculamos y mostramos el reporte en cliente
            const resultados = calcularRecomendaciones(datosProyecto);
            setRecomendaciones(resultados);
            setCalculado(true);
        } catch (err: any) {
            toast.error(err?.message || 'Error al generar el reporte');
        } finally {
            setIsGenerating(false);
        }
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
                            <p className="text-xs text-gray-500 italic mb-1">Nombre de la persona o empresa que recibirá el informe.</p>
                            <input type="text" name="clientName" value={datosProyecto.clientName}
                               onChange={handleInputChange}
                               placeholder="Ej: Mi Empresa S.A. o Juan Pérez"
                               className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Compañía Emisora</label>
                            <p className="text-xs text-gray-500 italic mb-1">Nombre de su empresa, quien realiza esta cotización.</p>
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
                            <p className="text-xs text-gray-500 italic mb-1">El factor más importante para el cálculo inicial de cámaras.</p>
                            <input type="number" name="area_m2" value={datosProyecto.area_m2} 
                                   onChange={handleInputChange} min="1" required
                                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        {/* 2. N° de Habitaciones/Oficinas (Requerido) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">N° de Habitaciones u Oficinas</label>
                            <p className="text-xs text-gray-500 italic mb-1">Puntos de interés clave que requieren cobertura individual.</p>
                            <input type="number" name="num_habitaciones" value={datosProyecto.num_habitaciones || ''} 
                                   onChange={handleInputChange} min="0" required
                                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        {/* 3. Nivel de Seguridad (Requerido) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nivel de Seguridad Deseado</label>
                            <p className="text-xs text-gray-500 italic mb-1">Ajusta la densidad de cámaras y la robustez del sistema.</p>
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

                {/* SECCIÓN B: Contexto de la Edificación */}
                <div className="p-6 border-2 border-green-100 rounded-xl bg-green-50">
                    <h2 className="text-xl font-semibold mb-4 text-green-700">B. Contexto de Edificación y Requerimientos Especiales</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                        
                        {/* Tipo de Edificación y Pisos */}
                        <div className="grid grid-cols-2 gap-4">
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
                            <div>
                                <label className="block text-sm font-medium text-gray-700">N° de Pisos</label>
                                <input type="number" name="num_pisos" value={datosProyecto.num_pisos} 
                                       onChange={handleInputChange} min="1" required
                                       className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                />
                            </div>
                            <p className="text-xs text-gray-500 italic col-span-2">El tipo y la altura de la edificación afectan la complejidad del cableado y la mano de obra.</p>
                        </div>

                        {/* Checkboxes de Cámaras Especiales */}
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-gray-700">Requerimientos de Cámaras Especiales</label>
                            <div className="flex items-center">
                                <input type="checkbox" name="usa_ptz" checked={datosProyecto.usa_ptz} onChange={handleInputChange} id="usa_ptz" className="h-4 w-4 text-green-600 border-gray-300 rounded"/>
                                <label htmlFor="usa_ptz" className="ml-2 block text-sm text-gray-700">Requiere Cámara PTZ (Móvil 360°)</label>
                            </div>
                            <div className="flex items-center">
                                <input type="checkbox" name="usa_ir_largo_alcance" checked={datosProyecto.usa_ir_largo_alcance} onChange={handleInputChange} id="usa_ir_largo_alcance" className="h-4 w-4 text-green-600 border-gray-300 rounded"/>
                                <label htmlFor="usa_ir_largo_alcance" className="ml-2 block text-sm text-gray-700">Requiere IR Largo Alcance (80m+ en oscuridad total)</label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SECCIÓN C: Personalización y Logística (Opcional) */}
                <div className="p-6 border-2 border-gray-200 rounded-xl bg-gray-50">
                    <h2 className="text-xl font-semibold mb-4 text-gray-700">C. Personalización y Logística (Opcional - Anula el cálculo automático)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Cámaras Int/Ext Manuales */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Cámaras Int. (Manual)</label>
                            <p className="text-xs text-gray-500 italic mb-1">Define un número fijo de cámaras interiores.</p>
                            <input type="number" name="interior_camaras" value={datosProyecto.interior_camaras || ''} 
                                   onChange={handleInputChange} min="0" max="16"
                                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Cámaras Ext. (Manual)</label>
                            <p className="text-xs text-gray-500 italic mb-1">Define un número fijo de cámaras exteriores.</p>
                            <input type="number" name="exterior_camaras" value={datosProyecto.exterior_camaras || ''} 
                                   onChange={handleInputChange} min="0" max="16"
                                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        
                        {/* Resolución */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Resolución</label>
                            <p className="text-xs text-gray-500 italic mb-1">Mayor resolución implica más detalle y más almacenamiento.</p>
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
                            <p className="text-xs text-gray-500 italic mb-1">Tiempo que se guardarán las grabaciones.</p>
                            <input type="number" name="dias_grabacion" value={datosProyecto.dias_grabacion} 
                                   onChange={handleInputChange} min="7" max="90"
                                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        
                        {/* Material de Pared */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Material de Pared</label>
                            <p className="text-xs text-gray-500 italic mb-1">Afecta la complejidad y costo de la instalación.</p>
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
                            <p className="text-xs text-gray-500 italic mb-1">Distancia promedio de cada cámara al grabador.</p>
                            <input type="number" name="distancia_cable" value={datosProyecto.distancia_cable} 
                                   onChange={handleInputChange} min="10" max="300"
                                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        
                        {/* Ubicación */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Ubicación (Mano de Obra)</label>
                            <p className="text-xs text-gray-500 italic mb-1">Ciudad o zona. Afecta costos de movilización.</p>
                            <input type="text" name="ubicacion" value={datosProyecto.ubicacion} 
                                   onChange={handleInputChange}
                                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                    </div>
                </div>

                {/* SECCIÓN D: Periféricos y Puntos de Conexión */}
                <div className="p-6 border-2 border-blue-100 rounded-xl bg-blue-50">
                    <h2 className="text-xl font-semibold mb-4 text-blue-700">D. Periféricos y Conectividad</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-gray-700">Alimentación y Red</label>
                            <p className="text-xs text-gray-500 italic mb-1">Define cómo se energizarán y conectarán las cámaras.</p>
                            <div className="flex items-center">
                                <input type="checkbox" name="fuente_centralizada" checked={datosProyecto.fuente_centralizada} onChange={handleInputChange} id="fuente_centralizada" className="h-4 w-4 text-blue-600 border-gray-300 rounded"/>
                                <label htmlFor="fuente_centralizada" className="ml-2 block text-sm text-gray-700">Fuente de Poder Centralizada</label>
                            </div>
                            <div className="flex items-center">
                                <input type="checkbox" name="usa_switch" checked={datosProyecto.usa_switch} onChange={handleInputChange} id="usa_switch" className="h-4 w-4 text-blue-600 border-gray-300 rounded"/>
                                <label htmlFor="usa_switch" className="ml-2 block text-sm text-gray-700">Requiere Switch de Red</label>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tipo de Conector de Video</label>
                            <p className="text-xs text-gray-500 italic mb-1">Los Baluns son recomendados para mayor calidad y distancia.</p>
                            <select name="tipo_conector" value={datosProyecto.tipo_conector} onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                <option value="balun_hd">Balun HD (Recomendado)</option>
                                <option value="bnc_jack">BNC/Jack (Básico)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* SECCIÓN E: Entorno Exterior */}
                <div className="p-6 border-2 border-yellow-100 rounded-xl bg-yellow-50">
                    <h2 className="text-xl font-semibold mb-4 text-yellow-700">E. Detalles del Entorno Exterior</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Longitud de Perímetro (m)</label>
                            <p className="text-xs text-gray-500 italic mb-1">Si se requiere cobertura perimetral, ingrese la longitud.</p>
                            <input type="number" name="longitud_perimetro" value={datosProyecto.longitud_perimetro || ''}
                                   onChange={handleInputChange} min="0"
                                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tipo de Conectividad Exterior</label>
                            <p className="text-xs text-gray-500 italic mb-1">El cableado subterráneo es más costoso pero más seguro.</p>
                            <select name="conectividad_exterior" value={datosProyecto.conectividad_exterior} onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                <option value="aereo">Aéreo con guaya</option>
                                <option value="subterraneo">Subterráneo/Zanjas</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Grado de Exposición Ambiental</label>
                            <p className="text-xs text-gray-500 italic mb-1">Ambientes salinos o con mucho polvo requieren protección extra.</p>
                            <select name="exposicion_ambiental" value={datosProyecto.exposicion_ambiental} onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                <option value="normal">Normal</option>
                                <option value="corrosivo">Corrosivo/Alto Polvo</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* SECCIÓN F: Complejidad de la Instalación Interior */}
                <div className="p-6 border-2 border-purple-100 rounded-xl bg-purple-50">
                    <h2 className="text-xl font-semibold mb-4 text-purple-700">F. Detalles de la Instalación Interior</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Ruta del Cableado</label>
                            <p className="text-xs text-gray-500 italic mb-1">El cableado oculto es más estético pero aumenta el costo.</p>
                            <select name="ruta_cableado" value={datosProyecto.ruta_cableado} onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                <option value="canaleta">Visto/Canaleta</option>
                                <option value="oculto">Oculto/Tubería Existente</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Horario de Instalación</label>
                            <p className="text-xs text-gray-500 italic mb-1">Trabajar fuera de horas de oficina puede tener recargos.</p>
                            <select name="horario_instalacion" value={datosProyecto.horario_instalacion} onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                <option value="habil">Horas Hábiles</option>
                                <option value="fuera_horario">Fuera de Horario/Fines de Semana</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* SECCIÓN G: Almacenamiento y Redundancia */}
                <div className="p-6 border-2 border-red-100 rounded-xl bg-red-50">
                    <h2 className="text-xl font-semibold mb-4 text-red-700">G. Almacenamiento y Funciones Pro</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-gray-700">Funciones Avanzadas</label>
                            <p className="text-xs text-gray-500 italic mb-1">Opciones que requieren equipos más robustos.</p>
                            <div className="flex items-center">
                                <input type="checkbox" name="raid" checked={datosProyecto.raid} onChange={handleInputChange} id="raid" className="h-4 w-4 text-red-600 border-gray-300 rounded"/>
                                <label htmlFor="raid" className="ml-2 block text-sm text-gray-700">Discos en Espejo (RAID 1)</label>
                            </div>
                            <div className="flex items-center">
                                <input type="checkbox" name="integracion_alarma" checked={datosProyecto.integracion_alarma} onChange={handleInputChange} id="integracion_alarma" className="h-4 w-4 text-red-600 border-gray-300 rounded"/>
                                <label htmlFor="integracion_alarma" className="ml-2 block text-sm text-gray-700">Integración con Panel de Alarma</label>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Modelo NVR/DVR Base</label>
                            <p className="text-xs text-gray-500 italic mb-1">Los modelos 'Pro' ofrecen más capacidad y funciones.</p>
                            <select name="modelo_nvr_dvr" value={datosProyecto.modelo_nvr_dvr} onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                <option value="economico">Económico</option>
                                <option value="pro">Pro/Capacidad</option>
                            </select>
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
