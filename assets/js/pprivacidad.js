document.addEventListener("DOMContentLoaded", () => {
    const linkVolver = document.getElementById("linkVolver");
    if (linkVolver) {
        linkVolver.addEventListener("click", (e) => {
            e.preventDefault();
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = "index.html";
            }
        });
    }
});
