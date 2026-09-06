// assets/js/convocatoria.js
import { comprobarAcceso, cerrarSesion } from "./auth.js";
import { supabaseClient } from "./supabase.js";

window.cerrarSesion = cerrarSesion;

comprobarAcceso(["socio", "administrador", "admin", "directiva"], async (socioActual) => {
    await cargarProximaConvocatoria();
});

async function cargarProximaConvocatoria() {
    const contenedor = document.getElementById("contenedorConvocatoria");
    if (!contenedor) return;

    contenedor.innerHTML = `<p style="text-align: center; padding: 2rem; color: #fff;">Cargando convocatoria...</p>`;

    try {
        // Llamamos a la Edge Function para obtener la convocatoria activa de forma segura
        const { data: response, error } = await supabaseClient.functions.invoke('convocatoria-socio', {
            body: { action: 'cargar_activa_socio' }
        });

        if (error) throw error;
        if (response && response.error) throw new Error(response.error);

        const convo = response.data;

        if (!convo) {
            contenedor.innerHTML = `
                <div class="convocatoria-card" style="text-align: center;">
                    <h3>No hay convocatorias activas</h3>
                    <p>En este momento no hay ningún partido programado. Vuelve a consultar más adelante.</p>
                </div>
            `;
            return;
        }

        const usersArray = Array.isArray(convo.users) ? convo.users : [];
        const usersNookArray = Array.isArray(convo.users_nook) ? convo.users_nook : [];
        
        const estaApuntado = response.estaApuntado; 
        const estaNoApuntado = response.estaNoApuntado;

        contenedor.innerHTML = `
            <article class="convocatoria-card">
                <h2 style="margin-top: 0; color: #fff; font-size: 1.5rem; margin-bottom: 1rem;">
                    ⚽ ${convo.convocatoria || "Encuentro oficial"}
                </h2>

                <div class="convocatoria-detalle">
                    <div class="detalle-item">
                        <span>Lugar del encuentro</span>
                        <p>${convo.lugar || "Por determinar"}</p>
                    </div>
                    <div class="detalle-item">
                        <span>Hora</span>
                        <p>${convo.hora || "Por determinar"}</p>
                    </div>
                </div>

                ${convo.comentarios ? `
                    <div class="comentarios-box">
                        <span style="font-size: 0.85rem; color: rgba(255,255,255,0.6); display: block; margin-bottom: 0.25rem;">Comentarios del Administrador:</span>
                        <p style="margin: 0; color: #fff;">${convo.comentarios}</p>
                    </div>
                ` : ''}

                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-top: 2rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1.5rem;">
                    <div>
                        <p style="margin: 0; font-size: 0.9rem; color: rgba(255,255,255,0.8);">
                            Total jugadores confirmados: <strong id="contadorConfirmados">${usersArray.length}</strong>
                        </p>
                    </div>
                    <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                        <button id="btnAsistencia" class="btn ${estaApuntado ? 'btn-secondary' : 'btn-primary'}">
                            ${estaApuntado ? '❌ Cancelar asistencia' : '✅ Confirmar mi asistencia'}
                        </button>
                        <button id="btnAsistencia" class="btn ${estaNoApuntado ? 'btn-secondary' : 'btn-primary'}">
                            ${estaNoApuntado ? '↩️ Borrar "No puedo ir"' : '❌ No puedo asistir'}
                        </button>

                        
                        // <button id="btnNoAsistencia" class="btn ${estaNoApuntado ? 'btn-secondary' : 'btn-outline'}" style="${estaNoApuntado ? '' : 'background: transparent; border: 1px solid rgba(255,255,255,0.3); color: #fff;'}">
                            // ${estaNoApuntado ? '↩️ Borrar "No puedo ir"' : '❌ No puedo asistir'}
                        // </button>
                    </div>
                </div>
                <p id="mensajeAsistencia" class="estado-asistencia"></p>
            </article>
        `;

        const btnAsistencia = document.getElementById("btnAsistencia");
        const btnNoAsistencia = document.getElementById("btnNoAsistencia");
        const mensajeAsistencia = document.getElementById("mensajeAsistencia");

        // Evento para Confirmar Asistencia (Sí voy)
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
                mensajeAsistencia.textContent = updateResp.apuntado ? "¡Asistencia confirmada correctamente!" : "Has cancelado tu asistencia.";

                setTimeout(() => {
                    cargarProximaConvocatoria();
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

        // Evento para No Asistencia (No puedo ir) - <--- ESTO ES LO QUE FALTABA
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
                mensajeAsistencia.textContent = updateResp.noApuntado ? "Registrado: No podrás asistir." : "Has borrado tu estado de no asistencia.";

                setTimeout(() => {
                    cargarProximaConvocatoria();
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

    } catch (err) {
        console.error("Error al cargar la convocatoria:", err);
        contenedor.innerHTML = `
            <div class="convocatoria-card" style="text-align: center;">
                <p style="color: #ef4444;">Error al cargar los datos de la convocatoria: ${err.message}</p>
            </div>
        `;
    }
}
