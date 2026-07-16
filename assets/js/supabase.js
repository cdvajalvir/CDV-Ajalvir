const SUPABASE_URL = "https://lqqqbiltwrmkjmrmpwpu.supabase.co";
const SUPABASE_KEY = "sb_publishable_ij8DKD_mYxqLxtF1L6PlCA_EZfXE_hc";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

async function probarConexion() {
    const { data, error } = await supabaseClient
        .from("socios")
        .select("*");

    console.log(data);

    if (error) {
        console.error(error);
    }
}

probarConexion();


async function insertarSocio() {

    const { data, error } = await supabaseClient
        .from("socios")
        .insert({
            nombre: "Juan",
            apellido: "Pérez",
            email: "juan@test.com",
            password_hash: "temporal"
        });

    console.log(data, error);
}

insertarSocio();
