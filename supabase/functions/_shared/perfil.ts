// Define el importe total de la cuota fija del club
const CUOTA_TOTAL = 100; // <-- Cambia este número por el importe total real (ej: 100, 120, etc.)

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

    // Convertimos la cantidad pagada a número (por si viniera null o undefined)
    const pagado = Number(socio.cantidad_pagada) || 0;

    // Calculamos lo que falta por pagar
    const pendiente = Math.max(0, CUOTA_TOTAL - pagado);

    // Devolvemos el objeto socio con el nuevo campo 'cantidad_pendiente'
    return {
        ...socio,
        cantidad_pagada: pagado,
        cantidad_pendiente: pendiente
    };
}
