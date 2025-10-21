// app/planner/PlannerLogic.tsx
'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

// --- 1. Base de Datos de Equipos HikVision (Simulado - Mantenemos para el cálculo) ---
const HIKVISION_SPECS = {
    // ... (Mantén el objeto HIKVISION_SPECS sin cambios por ahora)
    DVR_4CH: { modelo: "DS-7204HQHI-K1", costo: 150, capacidad_max_hdd: 6, max_canales: 4 },
    DVR_8CH: { modelo: "DS-7208HQHI-K1", costo: 220, capacidad_max_hdd: 10, max_canales: 8 },
    BITRATE_5MP: 4096, 
    BITRATE_2MP: 2048,
    CAMARA_DOMO: { modelo: "DS-2CE56H0T-ITPF(C)", costo: 40, resolucion: 5 },
    CAMARA_BULLET: { modelo: "DS-2CE16H0T-ITF(C)", costo: 45, resolucion: 5 },
    HDD_1TB: { modelo: "WD Purple 1TB", costo: 60, capacidad_gb: 1000 },
    HDD_4TB: { modelo: "WD Purple 4TB", costo: 150, capacidad_gb: 4000 },
    // Definición de factor de cámaras basado en nivel de seguridad
    FACTOR_SEGURIDAD: {
        baja: 0.015, // 1.5 cámaras por cada 100m²
        normal: 0.02, // 2.0 cámaras por cada 100m²
        alta: 0.03,  // 3.0 cámaras por cada 100m² (para áreas abiertas)
        extrema: 0.045 // 4.5 cámaras por cada 100m²
    }
};

// --- Tipos de Datos ACTUALIZADOS ---
interface ProyectoDatos {
    // Campos requeridos para el cálculo principal
    area_m2: number;            // Área total en metros cuadrados
    num_habitaciones: number;   // Cantidad de habitaciones/oficinas (0 para espacio abierto)
    nivel_seguridad: 'baja' | 'normal' | 'alta' | 'extrema'; // Tipo de seguridad
    
    // Campos opcionales
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
    costo_total_equipos: number;
    costo_final_estimado: number;
    materiales: string[];
    factor_mano_obra: number;
    costo_instalacion: number;
    costo_consumibles: number; // 👈 ¡NUEVO CAMPO!
    final_int_camaras: number; 
    final_ext_camaras: number;
}

// --- 2. Función de Cálculo Principal (Lógica de Sugerencia de Cámaras) ---
function calcularRecomendaciones(datos: ProyectoDatos): Recomendacion | null {
    const { 
        area_m2, num_habitaciones, nivel_seguridad, 
        interior_camaras, exterior_camaras, resolucion_mp, 
        dias_grabacion, horas_grabacion, material_pared 
    } = datos;

    if (area_m2 <= 0) return null;

    // 1. CÁLCULO DE CÁMARAS SUGERIDAS (Lógica basada en M² y Seguridad)
    const factor_por_area = HIKVISION_SPECS.FACTOR_SEGURIDAD[nivel_seguridad];
    const camaras_sugeridas_area = Math.ceil((area_m2 / 100) * factor_por_area * 10) / 10;
    
    let camaras_sugeridas_oficinas = 0;
    if (num_habitaciones > 0) {
        camaras_sugeridas_oficinas = Math.ceil(num_habitaciones / 4); 
    }
    
    const total_sugeridas = Math.ceil(camaras_sugeridas_area + camaras_sugeridas_oficinas);
    const total_manual = interior_camaras + exterior_camaras;
    
    const total_camaras = Math.max(total_manual, total_sugeridas);
    
    const final_int_camaras = total_manual >= total_sugeridas ? interior_camaras : Math.ceil(total_camaras * 0.5);
    const final_ext_camaras = total_manual >= total_sugeridas ? exterior_camaras : Math.floor(total_camaras * 0.5);
    
    // 2. CÁLCULO DE DVR, HDD y COSTOS
    const bitrate = resolucion_mp === '8' ? HIKVISION_SPECS.BITRATE_5MP * 2 :
                    resolucion_mp === '5' ? HIKVISION_SPECS.BITRATE_5MP : 
                    HIKVISION_SPECS.BITRATE_2MP;

    const CH_necesarios = total_camaras;
    let modelo_dvr_data;
    if (CH_necesarios <= 4) {
        modelo_dvr_data = HIKVISION_SPECS.DVR_4CH;
    } else if (CH_necesarios <= 8) {
        modelo_dvr_data = HIKVISION_SPECS.DVR_8CH;
    } else {
        modelo_dvr_data = HIKVISION_SPECS.DVR_8CH; 
    }
    
    // CÁLCULO DE ALMACENAMIENTO (HDD)
    const consumo_total_gb = (bitrate * 3600 * horas_grabacion * dias_grabacion * total_camaras) / (8 * 1024 * 1024);
    const consumo_total_tb = consumo_total_gb / 1024;
    
    let modelo_hdd_data;
    if (consumo_total_tb > 3.5) {
        modelo_hdd_data = HIKVISION_SPECS.HDD_4TB;
    } else {
        modelo_hdd_data = HIKVISION_SPECS.HDD_1TB;
    }

    // CÁLCULO DE COSTOS DE EQUIPOS
    const costo_camaras_int = final_int_camaras * HIKVISION_SPECS.CAMARA_DOMO.costo;
    const costo_camaras_ext = final_ext_camaras * HIKVISION_SPECS.CAMARA_BULLET.costo;
    const costo_dvr = modelo_dvr_data.costo;
    const costo_hdd = modelo_hdd_data.costo;
    
    const costo_total_equipos = costo_camaras_int + costo_camaras_ext + costo_dvr + costo_hdd;
    
    // LÓGICA DE MANO DE OBRA Y CONSUMIBLES DETALLADA
    const factor_mano_obra = material_pared === 'hormigon' ? 0.60 : 
                             material_pared === 'drywall' ? 0.30 : 
                             0.40; // Ladrillo

    const costo_instalacion = costo_total_equipos * factor_mano_obra;
    
    let tipo_tornillo: string;
    let costo_consumibles_base: number;

    if (material_pared === 'hormigon') {
        tipo_tornillo = "Tornillo de anclaje expansivo (mín. 1/4\") y Taquetes de impacto.";
        costo_consumibles_base = 150; // Más caro perforar y asegurar
    } else if (material_pared === 'drywall') {
        tipo_tornillo = "Tornillo para Drywall con anclaje mariposa/toggle.";
        costo_consumibles_base = 80; // Más económico
    } else { // ladrillo
        tipo_tornillo = "Tornillo autorroscante y Taquetes plásticos estándar.";
        costo_consumibles_base = 100; // Estándar
    }
    
    const costo_consumibles_variable = total_camaras * 8; // Costo por cámara (baluns, conectores, caja)
    const costo_consumibles = costo_consumibles_base + costo_consumibles_variable;

    const tipo_cable = datos.distancia_cable > 80 ? "UTP Cat. 6 100% Cobre (Recomendado)" : "UTP Cat. 5e";
    const cable_estimado_m = total_camaras * datos.distancia_cable * 1.1; // 10% de holgura
    const rollos_305m_estimados = Math.ceil(cable_estimado_m / 305);
    
    const costo_final_estimado = costo_total_equipos + costo_consumibles + costo_instalacion;
    
    return {
        total_camaras,
        camaras_sugeridas_area: Math.ceil(camaras_sugeridas_area + camaras_sugeridas_oficinas),
        canales_dvr: modelo_dvr_data.max_canales,
        modelo_dvr: modelo_dvr_data.modelo,
        modelo_camara_int: HIKVISION_SPECS.CAMARA_DOMO.modelo,
        modelo_camara_ext: HIKVISION_SPECS.CAMARA_BULLET.modelo,
        almacenamiento_tb_min: parseFloat(consumo_total_tb.toFixed(1)),
        modelo_hdd: modelo_hdd_data.modelo,
        costo_total_equipos: Math.round(costo_total_equipos),
        costo_final_estimado: Math.round(costo_final_estimado),
        
        // MATERIALES Y CONSUMIBLES DETALLADOS
        materiales: [
            `Cable: ${tipo_cable} (Est. ${rollos_305m_estimados} rollo(s) de 305m - ${Math.ceil(cable_estimado_m)}m totales).`,
            `${total_camaras * 2}x Baluns HD-TVI (Receptor y Transmisor)`,
            `${total_camaras}x Fuentes de poder 12V DC (Transformadores)`,
            `Tornillería: ${tipo_tornillo} (Mínimo ${total_camaras * 4} unidades).`,
            `Cajas de paso/Registro: ${total_camaras} unidades (para protección de Baluns)`,
            `Consumibles Varios: Bridas, cinta de aislar, silicona industrial.`
        ],
        
        factor_mano_obra: factor_mano_obra,
        costo_instalacion: Math.round(costo_instalacion),
        costo_consumibles: Math.round(costo_consumibles), // 👈 AÑADIDO
        final_int_camaras: final_int_camaras, 
        final_ext_camaras: final_ext_camaras, 
    };
}

// --- 3. Componente de Informe con Markdown ---
function MarkdownReport({ recomendaciones, datosProyecto }: { recomendaciones: Recomendacion, datosProyecto: ProyectoDatos }) {
    const total_camaras_manual = datosProyecto.interior_camaras + datosProyecto.exterior_camaras;

    const generateReport = () => {
        let cameraCalcExplanation = `El sistema sugiere **${recomendaciones.camaras_sugeridas_area} cámaras** basadas en ${datosProyecto.area_m2}m² y el nivel de seguridad **${datosProyecto.nivel_seguridad.toUpperCase()}**.`
        if (total_camaras_manual > 0 && total_camaras_manual > recomendaciones.camaras_sugeridas_area) {
            cameraCalcExplanation += ` Se usó su conteo manual de ${total_camaras_manual} (Int: ${datosProyecto.interior_camaras}, Ext: ${datosProyecto.exterior_camaras}) porque es mayor.`
        } else if (total_camaras_manual > 0 && total_camaras_manual < recomendaciones.camaras_sugeridas_area) {
            cameraCalcExplanation += ` Su conteo manual (${total_camaras_manual}) fue ignorado por ser inferior al recomendado (${recomendaciones.camaras_sugeridas_area}).`
        } else {
            cameraCalcExplanation += ` Se aplicó el cálculo sugerido de ${recomendaciones.total_camaras} cámaras.`
        }

        const report = `
## ✅ Informe Detallado del Proyecto

<div class="bg-yellow-50 p-4 mb-6 rounded-lg border-l-4 border-yellow-500">
<p class="font-semibold text-lg text-yellow-700">CÁLCULO DE CÁMARAS:</p>
<p class="text-sm text-yellow-800">
${cameraCalcExplanation}
</p>
</div>

<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

<div class="lg:col-span-2 bg-blue-50 p-6 rounded-xl border-l-4 border-blue-500 shadow-md">
### EQUIPAMIENTO HIKVISION
- **Cámaras Totales (Final):** ${recomendaciones.total_camaras} (Int: ${recomendaciones.final_int_camaras} / Ext: ${recomendaciones.final_ext_camaras})
- **Grabador (DVR/NVR):** ${recomendaciones.modelo_dvr} (${recomendaciones.canales_dvr} Canales)
- **Modelo Interior:** ${recomendaciones.modelo_camara_int} (Domo)
- **Modelo Exterior:** ${recomendaciones.modelo_camara_ext} (Bullet)
- **Almacenamiento Mínimo:** ${recomendaciones.almacenamiento_tb_min} TB (Requerido)
- **Disco Duro Recomendado:** ${recomendaciones.modelo_hdd}
<p class="mt-4 text-xl font-extrabold text-blue-900">Costo de Equipos (Estimado): <strong>$${recomendaciones.costo_total_equipos} USD</strong></p>
</div>

<div class="lg:col-span-1 bg-yellow-50 p-6 rounded-xl border-l-4 border-yellow-500 shadow-md flex flex-col justify-between">
<div class="space-y-2">
### RESUMEN FINANCIERO
- **Costo de Equipos:** $${recomendaciones.costo_total_equipos} USD
- **Costo de Consumibles:** ~$${recomendaciones.costo_consumibles} USD
- **Mano de Obra (Factor ${Math.round(recomendaciones.factor_mano_obra * 100)}%):** ~$${recomendaciones.costo_instalacion} USD
</div>
<div class="mt-4 pt-3 border-t border-yellow-300">
<p class="text-2xl font-extrabold text-red-700">
Total Proyecto Estimado: <strong>$${recomendaciones.costo_final_estimado} USD</strong>
</p>
</div>
</div>

</div>

<div class="mt-6 p-6 bg-gray-50 rounded-xl border border-gray-200">
### 📋 MATERIALES Y CONSUMIBLES REQUERIDOS (Detallado)
${recomendaciones.materiales.map(m => `- ${m}`).join('\n')}

<p class="mt-4 text-sm italic text-gray-500">
**NOTA TÉCNICA:** La mano de obra y consumibles se ajustaron debido a la instalación sobre **${datosProyecto.material_pared.toUpperCase()}**.
</p>
</div>
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


// --- 4. Componente de Interfaz de Usuario ---
export default function PlannerLogic() {
    const [datosProyecto, setDatosProyecto] = useState<ProyectoDatos>({
        // VALORES REQUERIDOS
        area_m2: 150,
        num_habitaciones: 0,
        nivel_seguridad: 'normal',

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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setDatosProyecto(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value,
        }));
        setCalculado(false);
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const resultados = calcularRecomendaciones(datosProyecto);
        setRecomendaciones(resultados);
        setCalculado(true);
    };

    return (
        <div className="p-8 space-y-8 max-w-5xl mx-auto bg-white rounded-xl shadow-2xl">
            <h1 className="text-3xl font-extrabold text-blue-800 border-b pb-4">
                Generador de Plan de Seguridad HikVision
            </h1>

            <form onSubmit={handleSubmit} className="space-y-8">
                
                {/* SECCIÓN A: Datos Básicos Requeridos */}
                <div className="p-6 border-2 border-indigo-100 rounded-xl bg-indigo-50">
                    <h2 className="text-xl font-semibold mb-4 text-indigo-700">A. Datos Geométricos y Nivel de Riesgo (Requeridos)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* 1. Área Cuadrada (Requerido) */}
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700">Área Total del Sitio (m²)</label>
                            <input type="number" name="area_m2" value={datosProyecto.area_m2} 
                                   onChange={handleInputChange} min="1" required
                                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        {/* 2. N° de Habitaciones/Oficinas (Requerido) */}
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700">N° de Habitaciones u Oficinas (0 para Espacio Abierto)</label>
                            <input type="number" name="num_habitaciones" value={datosProyecto.num_habitaciones} 
                                   onChange={handleInputChange} min="0" required
                                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        {/* 3. Nivel de Seguridad (Requerido) */}
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700">Nivel de Seguridad Deseado</label>
                            <select name="nivel_seguridad" value={datosProyecto.nivel_seguridad} onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                <option value="baja">Baja (Solo Puntos Clave)</option>
                                <option value="normal">Normal (Buena Cobertura)</option>
                                <option value="alta">Alta (Densidad de Cámaras)</option>
                                <option value="extrema">Extrema (Cobertura Total y Redundancia)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* SECCIÓN B: Personalización y Logística (Opcional) */}
                <div className="p-6 border-2 border-gray-200 rounded-xl bg-gray-50">
                    <h2 className="text-xl font-semibold mb-4 text-gray-700">B. Personalización y Logística (Opcional - Sobrepasa el cálculo)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* 4. Cámaras Interiores (Opcional) */}
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700">Cámaras Int. Manuales</label>
                            <input type="number" name="interior_camaras" value={datosProyecto.interior_camaras} 
                                   onChange={handleInputChange} min="0" max="16"
                                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        {/* 5. Cámaras Exteriores (Opcional) */}
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700">Cámaras Ext. Manuales</label>
                            <input type="number" name="exterior_camaras" value={datosProyecto.exterior_camaras} 
                                   onChange={handleInputChange} min="0" max="16"
                                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        {/* 6. Resolución (Opcional) */}
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700">Resolución</label>
                            <select name="resolucion_mp" value={datosProyecto.resolucion_mp} onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                <option value="2">2 MP (1080p)</option>
                                <option value="5">5 MP (2K)</option>
                                <option value="8">8 MP (4K)</option>
                            </select>
                        </div>
                        {/* 7. Días de Grabación */}
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700">Días de Retención</label>
                            <input type="number" name="dias_grabacion" value={datosProyecto.dias_grabacion} 
                                   onChange={handleInputChange} min="7" max="90"
                                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        {/* 8. Horas de Grabación */}
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700">Horas de Grabación Diaria</label>
                            <input type="number" name="horas_grabacion" value={datosProyecto.horas_grabacion} 
                                   onChange={handleInputChange} min="1" max="24"
                                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        {/* 9. Material de Pared */}
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700">Material de Pared</label>
                            <select name="material_pared" value={datosProyecto.material_pared} onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                <option value="drywall">Drywall/Yeso</option>
                                <option value="ladrillo">Ladrillo/Bloque</option>
                                <option value="hormigon">Hormigón/Concreto</option>
                            </select>
                        </div>
                        {/* 10. Distancia Promedio */}
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700">Distancia Cable (m)</label>
                            <input type="number" name="distancia_cable" value={datosProyecto.distancia_cable} 
                                   onChange={handleInputChange} min="10" max="300"
                                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        {/* 11. Ubicación */}
                        <div className="col-span-1">
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
                    disabled={datosProyecto.area_m2 <= 0}
                    className={`w-full py-3 text-lg font-bold rounded-lg transition duration-300 
                               ${datosProyecto.area_m2 <= 0 
                                    ? 'bg-gray-400 cursor-not-allowed' 
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                >
                    {datosProyecto.area_m2 <= 0 ? 'Ingrese el Área para Calcular' : 'Generar Plan de Trabajo Exacto'}
                </button>
            </form>

            {/* Resultados y Recomendaciones */}
            {calculado && recomendaciones && (
                <MarkdownReport recomendaciones={recomendaciones} datosProyecto={datosProyecto} />
            )}
        </div>
    );
}
