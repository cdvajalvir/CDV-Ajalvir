import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function getUsuario(req: Request) {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
        return { user: null, error: "No hay cabecera de autorización" };
    }

    const supabase = createClient(
        Deno.env.get("SUPABASE_URL"),
        Deno.env.get("SUPABASE_ANON_KEY"),
        {
            global: {
                headers: {
                    Authorization: authHeader
                }
            }
        }
    );

    // Extraer el token JWT
    const token = authHeader.replace("Bearer ", "").trim();

    const {
        data: { user },
        error
    } = await supabase.auth.getUser(token);

    if (error || !user) {
        return { user: null, error: error?.message || "Sesión inválida" };
    }

    // Devuelve el objeto { user } para poder hacer: const { user } = await getUsuario(req);
    return { user, error: null };
}
