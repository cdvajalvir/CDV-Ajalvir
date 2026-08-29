// assets/js/convocatoria.js
import { comprobarAcceso, cerrarSesion } from "./auth.js";
import { supabaseClient } from "./supabase.js";

window.cerrarSesion = cerrarSesion;

comprobarAcceso(["socio", "administrador", "admin", "directiva"], async (socioActual) => {
    await cargarProximaConvocatoria(socioActual.id);
});

async function cargarProximaConvocatoria(userId) {
    const contenedor = document.getElementById("contenedorConvocatoria");
    if (!contenedor) return;

    try {
        // Consultamos la convocatoria que tenga el campo 'activa' en true
        const { data: convocatorias, error } = await supabaseClient
            .from("convocatorias")
            .select("*")
            .eq("activa", true)
            .limit(1);

        if (error) throw error;

        if (!convocatorias || convocatorias.length === 0) {
            contenedor.innerHTML = `
                <div class="convocatoria-card" style="text-align: center;">
                    <h3>No hay convocatorias activas</h3>
                    <p>En este momento no hay ningún partido programado. Vuelve a consultar más adelante.</p>
                </div>
            `;
            return;
        }

        const convo = convocatorias[0]; 
        
        // Asegurarnos de normalizar el array de usuarios de forma robusta
        let usersArray = [];
        if (Array.isArray(convo.users)) {
            usersArray = convo.users;
        } else if (typeof convo.users === "string") {
            // Por si Supabase lo devuelve en formato texto de array de postgres tipo "{uuid1,uuid2}"
            usersArray = convo.users.replace(/[{}]/g, "").split(",").filter(Boolean);
        }

        const estaApuntado = usersArray.includes(userId);

        // Renderizamos la tarjeta de la convocatoria
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

        // Lógica del botón de asistencia
        const btnAsistencia = document.getElementById("btnAsistencia");
        const mensajeAsistencia = document.getElementById("mensajeAsistencia");

        btnAsistencia.addEventListener("click", async () => {
            btnAsistencia.disabled = true;
            btnAsistencia.textContent = "Actualizando...";

            try {
                // Volvemos a consultar los datos frescos de la BD justo antes de modificar
                const { data: freshConvoData, error: fetchError } = await supabaseClient
                    .from("convocatorias")
                    .select("users")
                    .eq("id", convo.id)
                    .single();

                if (fetchError) throw fetchError;

                let currentUsers = Array.isArray(freshConvoData.users) ? freshConvoData.users : [];
                const yaApuntadoAhora = currentUsers.includes(userId);
                let nuevosUsers = [...currentUsers];

                if (yaApuntadoAhora) {
                    nuevosUsers = nuevosUsers.filter(id => id !== userId);
                } else {
                    nuevosUsers.push(userId);
                }

                // Actualizamos en Supabase y pedimos .select() para verificar si afectó registros
                const { data: updateData, error: updateError } = await supabaseClient
                    .from("convocatorias")
                    .update({ users: nuevosUsers })
                    .eq("id", convo.id)
                    .select();

                if (updateError) throw updateError;

                // Si updateData está vacío, significa que RLS bloqueó la operación silenciosamente
                if (!updateData || updateData.length === 0) {
                    throw new Error("Supabase ha bloqueado la actualización. Revisa la política de UPDATE en RLS.");
                }

                mensajeAsistencia.style.color = "#2e7d32";
                mensajeAsistencia.textContent = yaApuntadoAhora ? "Has cancelado tu asistencia." : "¡Asistencia confirmada correctamente!";

                setTimeout(() => {
                    cargarProximaConvocatoria(userId);
                }, 1000);

            } catch (err) {
                console.error("Error al actualizar asistencia:", err);
                mensajeAsistencia.style.color = "#d9534f";
                mensajeAsistencia.textContent = `Error: ${err.message}`;
                btnAsistencia.disabled = false;
                btnAsistencia.textContent = estaApuntado ? '❌ No podré asistir / Cancelar' : '✅ Confirmar mi asistencia';
            }
        });

    } catch (err) {
        console.error("Error al cargar la convocatoria:", err);
        contenedor.innerHTML = `
            <div class="convocatoria-card" style="text-align: center;">
                <p style="color: #d9534f;">Error al cargar los datos de la convocatoria.</p>
            </div>
        `;
    }
}
