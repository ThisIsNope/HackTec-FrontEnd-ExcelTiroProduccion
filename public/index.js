  async function handleLogin(event) {
        event.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const API_URL = "https://calamity-hypertext-strenuous.ngrok-free.dev";
        alert(`Intentando iniciar sesión con:\nCorreo: ${username}\nContraseña: ${password}`);
        const test = await fetch(`${API_URL}/roles`, {
            
            headers: { 
                "ngrok-skip-browser-warning": "true",
                "Content-Type": "application/json"
            },

        }); 
        let data = await test.json();
        console.log(data);

    } 