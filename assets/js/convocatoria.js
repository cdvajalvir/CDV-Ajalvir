// assets/js/convocatoria.js
import { comprobarAcceso, cerrarSesion } from "./auth.js";
import { supabaseClient } from "./supabase.js";

window.cerrarSesion = cerrarSesion;

comprobarAcceso(["socio", "administrador", "admin", "directiva"], async (socioActual) => {
    await cargarConvocatoriasActivas();
});

async function cargarConvocatoriasActivas() {
    const contenedor = document.getElementById("contenedorConvocatoria");
    if (!contenedor) return;

    contenedor.innerHTML = `<p style="text-align: center; padding: 2rem; color: #fff;">Cargando convocatorias...</p>`;

    try {
        // Llamamos a la Edge Function para obtener las convocatorias activas
        const { data: response, error } = await supabaseClient.functions.invoke('convocatoria-socio', {
            body: { action: 'cargar_activas_socio' } // Ajustado para recibir lista de activas
        });

        if (error) throw error;
        if (response && response.error) throw new Error(response.error);

        // Aceptamos tanto un array directo como un objeto con propiedad data
        const convocatorias = Array.isArray(response) ? response : (response.data || [response.data].filter(Boolean));

        if (!convocatorias || convocatorias.length === 0) {
            contenedor.innerHTML = `
                <div class="convocatoria-card" style="text-align: center; max-width: 600px; margin: 0 auto;">
                    <h3>No hay convocatorias activas</h3>
                    <p>En este momento no hay ningún partido programado. Vuelve a consultar más adelante.</p>
                </div>
            `;
            return;
        }

        // Creamos la cuadrícula contenedora
        const grid = document.createElement("div");
        grid.className = "convocatorias-grid";
        contenedor.innerHTML = "";
        contenedor.appendChild(grid);

        convocatorias.forEach(item => {
            const convo = item.convocatoria || item;
            const usersArray = Array.isArray(convo.users) ? convo.users : [];
            const estaApuntado = item.estaApuntado; 
            const estaNoApuntado = item.estaNoApuntado;

            const card = document.createElement("article");
            card.className = "convocatoria-card";

            card.innerHTML = `
                <div>
                    <h2 style="margin-top: 0; color: #fff; font-size: 1.25rem; margin-bottom: 0.75rem;">
                        ⚽ ${convo.convocatoria || "Encuentro oficial"}
                    </h2>

                    <div class="convocatoria-detalle">
                        <div class="detalle-item">
                            <span>Lugar</span>
                            <p>${convo.lugar || "Por determinar"}</p>
                        </div>
                        <div class="detalle-item">
                            <span>Hora</span>
                            <p>${convo.hora || "Por determinar"}</p>
                        </div>
                    </div>

                    ${convo.comentarios ? `
                        <div class="comentarios-box">
                            <span style="font-size: 0.75rem; color: rgba(255,255,255,0.6); display: block; margin-bottom: 0.2rem;">Comentarios:</span>
                            <p style="margin: 0; color: #fff; font-size: 0.9rem;">${convo.comentarios}</p>
                        </div>
                    ` : ''}
                </div>

                <div>
                    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; margin-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem;">
                        <p style="margin: 0; font-size: 0.85rem; color: rgba(255,255,255,0.8);">
                            Confirmados: <strong class="contador-confirmados">${usersArray.length}</strong>
                        </p>
                    </div>

                    <div style="display: flex; gap: 0.5rem; flex-direction: column; margin-top: 0.75rem;">
                        <button class="btn ${estaApuntado ? 'btn-secondary' : 'btn-primary'} btn-asistencia" data-id="${convo.id}" style="width: 100%; font-size: 0.85rem; padding: 8px;">
                            ${estaApuntado ? '❌ Cancelar asistencia' : '✅ Confirmar mi asistencia'}
                        </button>
                        <button class="btn ${estaNoApuntado ? 'btn-secondary' : 'btn-primary'} btn-no-asistencia" data-id="${convo.id}" style="width: 100%; font-size: 0.85rem; padding: 8px;">
                            ${estaNoApuntado ? '↩️ Borrar "No puedo ir"' : '❌ No puedo asistir'}
                        </button>
                    </div>
                    <p class="estado-asistencia" data-msg-id="${convo.id}"></p>
                </div>
            `;

            // Listeners independientes para cada tarjeta de convocatoria
            const btnAsistencia = card.querySelector(".btn-asistencia");
            const btnNoAsistencia = card.querySelector(".btn-no-asistencia");
            const mensajeAsistencia = card.querySelector(`[data-msg-id="${convo.id}"]`);

            btnAsistencia.addEventListener("click", async () => {
                btnAsistencia.disabled = true;
                btnNoAsistencia.disabled = true;
                btnAsistencia.textContent = "Actualizando...";

                try {
                    const { data: updateResp, error: updateError } = await supabaseClient.functions.invoke('convocatoria-socio', {
                        body: { 
                            action: 'toggle_asistencia',
                            payload: { convocatoriaId: convo.id }
                        }
                    });

                    if (updateError) throw updateError;
                    if (updateResp && updateResp.error) throw new Error(updateResp.error);

                    mensajeAsistencia.style.color = "#34d399";
                    mensajeAsistencia.textContent = updateResp.apuntado ? "¡Asistencia confirmada!" : "Has cancelado tu asistencia.";

                    setTimeout(() => {
                        cargarConvocatoriasActivas();
                    }, 1000);

                } catch (err) {
                    console.error("Error al actualizar asistencia:", err);
                    mensajeAsistencia.style.color = "#ef4444";
                    mensajeAsistencia.textContent = `Error: ${err.message}`;
                    btnAsistencia.disabled = false;
                    btnNoAsistencia.disabled = false;
                    btnAsistencia.textContent = estaApuntado ? '❌ Cancelar asistencia' : '✅ Confirmar mi asistencia';
                }
            });

            btnNoAsistencia.addEventListener("click", async () => {
                btnAsistencia.disabled = true;
                btnNoAsistencia.disabled = true;
                btnNoAsistencia.textContent = "Actualizando...";

                try {
                    const { data: updateResp, error: updateError } = await supabaseClient.functions.invoke('convocatoria-socio', {
                        body: { 
                            action: 'toggle_no_asistencia',
                            payload: { convocatoriaId: convo.id }
                        }
                    });

                    if (updateError) throw updateError;
                    if (updateResp && updateResp.error) throw new Error(updateResp.error);

                    mensajeAsistencia.style.color = "#34d399";
                    mensajeAsistencia.textContent = updateResp.noApuntado ? "Registrado: No podrás asistir." : "Estado borrado.";

                    setTimeout(() => {
                        cargarConvocatoriasActivas();
                    }, 1000);

                } catch (err) {
                    console.error("Error al actualizar no asistencia:", err);
                    mensajeAsistencia.style.color = "#ef4444";
                    mensajeAsistencia.textContent = `Error: ${err.message}`;
                    btnAsistencia.disabled = false;
                    btnNoAsistencia.disabled = false;
                    btnNoAsistencia.textContent = estaNoApuntado ? '↩️ Borrar "No puedo ir"' : '❌ No puedo asistir';
                }
            });

            grid.appendChild(card);
        });

    } catch (err) {
        console.error("Error al cargar las convocatorias:", err);
        contenedor.innerHTML = `
            <div class="convocatoria-card" style="text-align: center; max-width: 600px; margin: 0 auto;">
                <p style="color: #ef4444;">Error al cargar los datos: ${err.message}</p>
            </div>
        `;
    }
}
