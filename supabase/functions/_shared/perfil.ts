export async function getPerfil(supabase, userId:string) {

    const { data:socio, error } = await supabase
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

    if(error || !socio){
        throw new Error("Perfil no encontrado");
    }

    return socio;
}
