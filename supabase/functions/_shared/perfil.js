export async function getPerfil(supabase, userId) {

    const { data:socio, error } = await supabase
        .from("socios")
        .select(`
            id,
            nombre,
            apellido,
            dni,
            email,
            telefono,
            talla,
            fecha_nacimiento,
            cantidad_pagada,
            rol,
            activo
        `)
        .eq("id", userId)
        .single();

    if(error || !socio){
        throw new Error("Perfil no encontrado");
    }

    return socio;
}
