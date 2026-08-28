export async function getPerfil(supabase, userId: string) {

    const { data: socio, error } = await supabase
        .from("socios")
        .select(`
            id,
            nombre,
            apellido,
            alias,
            numero,
            talla,
            dni,
            fecha_nacimiento,
            telefono,
            email,
            fecha_alta,
            fecha_baja,
            cantidad_pagada,
            rol,
            activo
        `)
        .eq("id", userId)
        .single();

    if (error || !socio) {
        throw new Error("Perfil no encontrado");
    }

    // Determinamos la temporada actual de forma dinámica (igual que en el frontend)
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = ahora.getMonth() + 1;
    const temporadaActual = mes >= 9 ? `${anio}/${anio + 1}` : `${anio - 1}/${anio}`;

    // Procesamos el array de cantidad_pagada si viene como tal
    let cuotasArray = socio.cantidad_pagada;
    if (typeof cuotasArray === "string") {
        try {
            cuotasArray = JSON.parse(cuotasArray);
        } catch (e) {
            cuotasArray = [];
        }
    }

    let pagadoTemporadaActual = 0;
    let cuotaTemporadaActual = 100; // Valor por defecto

    if (Array.isArray(cuotasArray)) {
        const datosTemporada = cuotasArray.find(
            item => item && String(item.temporada).trim() === temporadaActual.trim()
        );
        if (datosTemporada) {
            pagadoTemporadaActual = Number(datosTemporada.pagado) || 0;
            cuotaTemporadaActual = Number(datosTemporada.cuota) || 100;
        }
    }

    const pendiente = Math.max(0, cuotaTemporadaActual - pagadoTemporadaActual);

    // Devolvemos el objeto socio manteniendo el array original intacto y calculando los pendientes
    return {
        ...socio,
        cantidad_pagada: cuotasArray, // Devolvemos el array completo para que lo lea el frontend
        cantidad_pendiente: pendiente
    };
}
