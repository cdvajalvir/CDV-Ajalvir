import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function getUsuario(req: Request) {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
        throw new Error("No autorizado");
    }

    const supabase = createClient(
        Deno.env.get("SUPABASE_URL"),
        Deno.env.get("SUPABASE_ANON_KEY"),
        {
            global:{
                headers:{
                    Authorization:authHeader
                }
            }
        }
    );

    const {
        data:{ user },
        error
    } = await supabase.auth.getUser();

    if(error || !user){
        throw new Error("Sesión inválida");
    }

    return user;

    /*// Buscar socio
    const { data:socio } = await supabase
        .from("socios")
        .select(`
            id,
            rol,
            activo
        `)
        .eq("id", user.id)
        .single();
    
    if(!socio){
        throw new Error("Socio no encontrado");
    }

    return {
        user,
        socio
    };*/
}
