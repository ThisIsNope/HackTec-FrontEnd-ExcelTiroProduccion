async function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const API_URL = "https://calamity-hypertext-strenuous.ngrok-free.dev";

    const test = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true"
        },
        body: JSON.stringify([username, password])
    }); 

    const data = await test.json();
    if (data.ok) {
        sessionStorage.setItem("user", JSON.stringify(data.user));
        window.location.href = "../index.html";
    } else {
        alert("Usuario y/o Contraseña Incorrectos");
    }
}
