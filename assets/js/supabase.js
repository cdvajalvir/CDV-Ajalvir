import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.50.0/+esm";


const SUPABASE_URL = "https://lqqqbiltwrmkjmrmpwpu.supabase.co";
const SUPABASE_KEY = "sb_publishable_ij8DKD_mYxqLxtF1L6PlCA_EZfXE_hc";

export const supabaseClient = createClient(
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

// probarConexion();
