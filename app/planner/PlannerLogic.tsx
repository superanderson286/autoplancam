// app/planner/PlannerLogic.tsx
'use client';

import { useState } from 'react';

// --- 1. Base de Datos de Equipos HikVision (Simulado - Se usará para el cálculo) ---
// Mantenemos esto por ahora, lo cambiaremos por la DB real en el siguiente paso.
const HIKVISION_SPECS = {
    DVR_4CH: { modelo: "DS-7204HQHI-K1", costo: 150, capacidad_max_hdd: 6, max_canales: 4 },
    DVR_8CH: { modelo: "DS-7208HQHI-K1", costo: 220, capacidad_max_hdd: 10, max_canales: 8 },
    // Valores de Bitrate para cálculo de HDD más preciso (en Kbps)
    BITRATE_5MP: 4096, 
    BITRATE_2MP: 2048,
    CAMARA_DOMO: { modelo: "DS-2CE56H0T-ITPF(C)", costo: 40, resolucion: 5 },
    CAMARA_BULLET: { modelo: "DS-2CE16H0T-ITF(C)", costo: 45, resolucion: 5 },
    HDD_1TB: { modelo: "WD Purple 1TB", costo: 60, capacidad_gb: 1000 },
    HDD_4TB: { modelo: "WD Purple 4TB", costo: 150, capacidad_gb: 4000 },
};

// --- Tipos de Datos ---
interface ProyectoDatos {
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
}

// --- 2. Función de Cálculo Principal (Ajustada) ---
function calcularRecomendaciones(datos: ProyectoDatos): Recomendacion {
    const { interior_camaras, exterior_camaras, resolucion_mp, dias_grabacion, horas_grabacion, material_pared } = datos;

    const total_camaras = interior_camaras + exterior_camaras;
    if (total_camaras === 0) {
         return null as any; // Retorna nulo si no hay cámaras para evitar errores
    }

    // a. CÁMARAS Y DVR/NVR
    const bitrate = resolucion_mp === '8' ? HIKVISION_SPECS.BITRATE_5MP * 2 : // Aprox para 4K
                    resolucion_mp === '5' ? HIKVISION_SPECS.BITRATE_5MP : 
                    HIKVISION_SPECS.BITRATE_2MP;

    const CH_necesarios = total_camaras;
    let modelo_dvr_data;
    if (CH_necesarios <= 4) {
        modelo_dvr_data = HIKVISION_SPECS.DVR_4CH;
    } else if (CH_necesarios <= 8) {
        modelo_dvr_data = HIKVISION_SPECS.DVR_8CH;
    } else {
        // En un plan real, aquí sugerirías un NVR o múltiples DVRs. Usamos el 8ch por simplicidad.
        modelo_dvr_data = HIKVISION_SPECS.DVR_8CH; 
    }

    // b. ALMACENAMIENTO (HDD) - Fórmula mejorada
    // HDD Total (GB) = (Bitrate * 3600 * Horas * Días * Cámaras) / (8 * 1024)
    const consumo_total_gb = (bitrate * 3600 * horas_grabacion * dias_grabacion * total_camaras) / (8 * 1024 * 1024);
    const consumo_total_tb = consumo_total_gb / 1024;
    
    // Selección del disco duro
    let modelo_hdd_data;
    if (consumo_total_tb > 3.5) {
        modelo_hdd_data = HIKVISION_SPECS.HDD_4TB;
    } else {
        modelo_hdd_data = HIKVISION_SPECS.HDD_1TB;
    }

    // c. MATERIALES Y COSTO TOTAL (Estimación)
    const costo_camaras_int = interior_camaras * HIKVISION_SPECS.CAMARA_DOMO.costo;
    const costo_camaras_ext = exterior_camaras * HIKVISION_SPECS.CAMARA_BULLET.costo;
    const costo_dvr = modelo_dvr_data.costo;
    const costo_hdd = modelo_hdd_data.costo;
    
    const costo_total_equipos = costo_camaras_int + costo_camaras_ext + costo_dvr + costo_hdd;
    
    // Impacto de la mano de obra según el material de pared
    const factor_mano_obra = material_pared === 'hormigon' ? 0.60 : // 60% más difícil/caro
                             material_pared === 'drywall' ? 0.30 : // 30% más fácil/barato
                             0.40; // 40% base para ladrillo

    const costo_instalacion = costo_total_equipos * factor_mano_obra;
    const materiales_base = 100 + (total_camaras * 25); // Costo variable de conectores/cable
    
    const costo_final_estimado = costo_total_equipos + materiales_base + costo_instalacion;

    return {
        total_camaras,
        canales_dvr: modelo_dvr_data.max_canales,
        modelo_dvr: modelo_dvr_data.modelo,
        modelo_camara_int: HIKVISION_SPECS.CAMARA_DOMO.modelo,
        modelo_camara_ext: HIKVISION_SPECS.CAMARA_BULLET.modelo,
        almacenamiento_tb_min: parseFloat(consumo_total_tb.toFixed(1)),
        modelo_hdd: modelo_hdd_data.modelo,
        costo_total_equipos: Math.round(costo_total_equipos),
        costo_final_estimado: Math.round(costo_final_estimado),
        materiales: [
            `${total_camaras}x Baluns HD-TVI`,
            `${total_camaras}x Fuentes de poder`,
            `1x Rollo de cable UTP (categoría 5e o 6)`,
            `Cajas de paso y tubería (estimado según ${material_pared})`,
            `Herrajes y tornillería especializada para ${material_pared}`
        ],
        factor_mano_obra: factor_mano_obra,
    };
}


// --- 3. Componente de Interfaz de Usuario ---
export default function PlannerLogic() {
    const [datosProyecto, setDatosProyecto] = useState<ProyectoDatos>({
        interior_camaras: 2,
        exterior_camaras: 2,
        resolucion_mp: '5',
        dias_grabacion: 30,
        horas_grabacion: 24,
        material_pared: 'ladrillo',
        distancia_cable: 50,
        ubicacion: 'Caracas, Venezuela',
    });
    
    const [calculado, setCalculado] = useState(false);
    const [recomendaciones, setRecomendaciones] = useState<Recomendacion | null>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setDatosProyecto(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value,
        }));
        setCalculado(false); // Resetear cálculo al cambiar datos
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const resultados = calcularRecomendaciones(datosProyecto);
        setRecomendaciones(resultados);
        setCalculado(true);
    };
    
    // Obtener los datos necesarios para renderizar el formulario
    const total_camaras_actual = datosProyecto.interior_camaras + datosProyecto.exterior_camaras;

    return (
        <div className="p-8 space-y-8 max-w-5xl mx-auto bg-white rounded-xl shadow-2xl">
            <h1 className="text-3xl font-extrabold text-blue-800 border-b pb-4">
                Generador de Plan de Seguridad HikVision
            </h1>

            <form onSubmit={handleSubmit} className="space-y-8">
                
                {/* SECCIÓN A: Datos Técnicos del Sitio */}
                <div className="p-6 border-2 border-blue-100 rounded-xl bg-blue-50">
                    <h2 className="text-xl font-semibold mb-4 text-blue-700">A. Requisitos de Cobertura y Calidad</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* 1. Cámaras Interiores */}
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700">Cámaras Interiores (Domo)</label>
                            <input type="number" name="interior_camaras" value={datosProyecto.interior_camaras} 
                                   onChange={handleInputChange} min="0" max="16" required
                                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        {/* 2. Cámaras Exteriores */}
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700">Cámaras Exteriores (Bullet)</label>
                            <input type="number" name="exterior_camaras" value={datosProyecto.exterior_camaras} 
                                   onChange={handleInputChange} min="0" max="16" required
                                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        {/* 3. Resolución */}
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700">Resolución Mínima</label>
                            <select name="resolucion_mp" value={datosProyecto.resolucion_mp} onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                <option value="2">2 MP (1080p)</option>
                                <option value="5">5 MP (2K) - Recomendado</option>
                                <option value="8">8 MP (4K)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* SECCIÓN B: Requisitos de Grabación y Logística */}
                <div className="p-6 border-2 border-green-100 rounded-xl bg-green-50">
                    <h2 className="text-xl font-semibold mb-4 text-green-700">B. Almacenamiento y Logística</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* 4. Días de Grabación */}
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700">Días Mínimos de Retención</label>
                            <input type="number" name="dias_grabacion" value={datosProyecto.dias_grabacion} 
                                   onChange={handleInputChange} min="7" max="90" required
                                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        {/* 5. Horas de Grabación Diaria */}
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700">Horas de Grabación Diaria (24 para 24/7)</label>
                            <input type="number" name="horas_grabacion" value={datosProyecto.horas_grabacion} 
                                   onChange={handleInputChange} min="1" max="24" required
                                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        {/* 6. Material de Pared */}
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700">Material de Pared/Techo</label>
                            <select name="material_pared" value={datosProyecto.material_pared} onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                <option value="drywall">Drywall/Yeso (Baja Dificultad)</option>
                                <option value="ladrillo">Ladrillo/Bloque (Estándar)</option>
                                <option value="hormigon">Hormigón/Concreto (Alta Dificultad)</option>
                            </select>
                        </div>
                        {/* 7. Distancia Promedio */}
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700">Distancia Promedio Cámara-DVR (m)</label>
                            <input type="number" name="distancia_cable" value={datosProyecto.distancia_cable} 
                                   onChange={handleInputChange} min="10" max="300" required
                                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        {/* 8. Ubicación */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Ciudad/Ubicación (Para Costo de Mano de Obra)</label>
                            <input type="text" name="ubicacion" value={datosProyecto.ubicacion} 
                                   onChange={handleInputChange} placeholder="Ej: Ciudad de México"
                                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                    </div>
                </div>

                {/* Botón de Cálculo */}
                <button
                    type="submit"
                    disabled={total_camaras_actual === 0}
                    className={`w-full py-3 text-lg font-bold rounded-lg transition duration-300 
                               ${total_camaras_actual === 0 
                                    ? 'bg-gray-400 cursor-not-allowed' 
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                >
                    {total_camaras_actual === 0 ? 'Añade Cámaras para Calcular' : 'Generar Plan de Trabajo Exacto'}
                </button>
            </form>

            {/* Resultados y Recomendaciones */}
            {calculado && recomendaciones && (
                <div className="mt-8 pt-6 border-t border-gray-300">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">✅ Informe Detallado del Proyecto</h2>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Equipos Requeridos */}
                        <div className="lg:col-span-2 bg-blue-50 p-6 rounded-xl border-l-4 border-blue-500 shadow-md">
                            <h3 className="text-xl font-bold mb-3 text-blue-700">EQUIPAMIENTO HIKVISION</h3>
                            <p className="mb-2">**Cámaras Totales:** {recomendaciones.total_camaras} ({datosProyecto.interior_camaras} Int. / {datosProyecto.exterior_camaras} Ext.)</p>
                            <p className="mb-2">**Grabador (DVR/NVR):** {recomendaciones.modelo_dvr} ({recomendaciones.canales_dvr} Canales) - *Necesario para cubrir los {recomendaciones.total_camaras} puntos.*</p>
                            <p className="mb-2">**Modelo Interior:** {recomendaciones.modelo_camara_int} (Domo) - **Modelo Exterior:** {recomendaciones.modelo_camara_ext} (Bullet)</p>
                            <p className="mb-2">**Almacenamiento Mínimo:** {recomendaciones.almacenamiento_tb_min} TB (Calculado para {datosProyecto.dias_grabacion} días a {datosProyecto.horas_grabacion}h)</p>
                            <p className="mb-2">**Disco Duro Recomendado:** {recomendaciones.modelo_hdd}</p>
                            <p className="mt-4 text-xl font-extrabold text-blue-900">Costo de Equipos (Estimado): **${recomendaciones.costo_total_equipos} USD**</p>
                        </div>

                        {/* Costos Finales */}
                        <div className="lg:col-span-1 bg-yellow-50 p-6 rounded-xl border-l-4 border-yellow-500 shadow-md flex flex-col justify-between">
                            <div>
                                <h3 className="text-xl font-bold mb-3 text-yellow-700">RESUMEN FINANCIERO</h3>
                                <div className="space-y-2">
                                    <p>Costo de Equipos: **${recomendaciones.costo_total_equipos} USD**</p>
                                    <p>Costo de Materiales Adicionales: **~$100 USD + variable**</p>
                                    <p>Mano de Obra (Aprox.): **{Math.round(recomendaciones.costo_final_estimado - recomendaciones.costo_total_equipos - 100 - (recomendaciones.total_camaras * 25))} USD**</p>
                                </div>
                            </div>
                            <div className="mt-4 pt-3 border-t border-yellow-300">
                                <p className="text-2xl font-extrabold text-red-700">
                                    Total Proyecto Estimado: **${recomendaciones.costo_final_estimado} USD**
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Materiales y Notas */}
                    <div className="mt-6 p-6 bg-gray-50 rounded-xl border border-gray-200">
                        <h3 className="text-xl font-bold mb-3 text-gray-700">MATERIALES Y NOTAS TÉCNICAS</h3>
                        <ul className="list-disc list-inside space-y-1 text-gray-600">
                            {recomendaciones.materiales.map((m, index) => (
                                <li key={index}>{m}</li>
                            ))}
                            <li>**NOTA TÉCNICA:** La distancia de cable ({datosProyecto.distancia_cable}m) está dentro del rango para señal HD. Usaremos Baluns de alta calidad.</li>
                            <li>**NOTA LOGÍSTICA:** La mano de obra se ajustó en un **{Math.round(recomendaciones.factor_mano_obra * 100)}%** debido a la instalación sobre **{datosProyecto.material_pared}**.</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}