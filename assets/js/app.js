document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.querySelector("[data-nav-toggle]");
    const links = document.querySelector("[data-nav-links]");

    if (toggle && links) {
        toggle.addEventListener("click", () => {
            links.classList.toggle("open");
        });
    }
});

async function probarConexion() {
    const { data, error } = await supabase
        .from("socios")
        .select("*");

    console.log(data);

    if (error) {
        console.error(error);
    }
}

probarConexion();
