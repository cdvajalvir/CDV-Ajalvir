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
        const { data: response, error } = await supabaseClient.functions.invoke('gestion-convocatorias', {
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
        const estaApuntado = response.estaApuntado; // Lo calculamos directamente en el backend de forma segura

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
                    <div>
                        <button id="btnAsistencia" class="btn ${estaApuntado ? 'btn-secondary' : 'btn-primary'}">
                            ${estaApuntado ? '❌ No podré asistir / Cancelar' : '✅ Confirmar mi asistencia'}
                        </button>
                    </div>
                </div>
                <p id="mensajeAsistencia" class="estado-asistencia"></p>
            </article>
        `;

        const btnAsistencia = document.getElementById("btnAsistencia");
        const mensajeAsistencia = document.getElementById("mensajeAsistencia");

        btnAsistencia.addEventListener("click", async () => {
            btnAsistencia.disabled = true;
            btnAsistencia.textContent = "Actualizando...";

            try {
                // Llamamos a la Edge Function para alternar la asistencia del socio de forma segura
                const { data: updateResp, error: updateError } = await supabaseClient.functions.invoke('gestion-convocatorias', {
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
                btnAsistencia.textContent = estaApuntado ? '❌ No podré asistir / Cancelar' : '✅ Confirmar mi asistencia';
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
