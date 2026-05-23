
let userType;

async function registrarUser(event) {
    event.preventDefault();
    const userType = document.getElementById('user-type').value;
    const nombre = document.getElementById("nombre").value;
    const paterno = document.getElementById("last-name").value;
    const materno = document.getElementById("middle-name").value;
    const correo = document.getElementById("email").value;
    const telefono = document.getElementById("phone").value;
    const pass = document.getElementById("new-password").value;
    const passconf = document.getElementById("confirm-password").value;
    
    const ciudad = document.getElementById("city").value;
    const direccion = document.getElementById("address").value;


    if (!nombre || !correo || !telefono || !pass || !ciudad || !direccion) {
        alert("Por favor llena todos los campos obligatorios");
        return;
    }
    if(pass !== passconf){
        alert("Las contraseñas deben coincidir");
        return;
    }

    const fechaRegistro = new Date().toISOString().split("T")[0];
    let body;

    if (userType === "empresa") {
        const rfc = document.getElementById("rfc").value;
        const razonSocial = document.getElementById("business-name").value;
        const sectorIndustrial = document.getElementById("business-type").value;
        const paginaWeb = document.getElementById("website").value;
        const descripcion = document.getElementById("business-description").value;

        if (!rfc || !razonSocial || !sectorIndustrial) {
            alert("Por favor llena todos los campos de empresa");
            return;
        }

        body = [nombre, paterno, materno, 2, correo, telefono, pass, ciudad, direccion, fechaRegistro, rfc, razonSocial, sectorIndustrial, paginaWeb, descripcion];
    } else {
        body = [nombre, paterno, materno, 1, correo, telefono, pass, ciudad, direccion, fechaRegistro, null, null, null, null, null];
    }

    try {
        const res = await fetch("https://calamity-hypertext-strenuous.ngrok-free.dev/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true"
            },
            body: JSON.stringify(body)
        });

        const data = await res.json();

        if (res.ok) {
            alert(data.message);
            window.location.href = "../public/login.html";
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
        alert("Error al conectar con el servidor");
    }
}

function toggleCompanyFields() {
    userType = document.getElementById('user-type').value;
    const companyForm = document.getElementById('info-para-empresa');
    if (userType === 'empresa') {
        companyForm.style.display = 'block';
    } else {
        companyForm.style.display = 'none';
    }
}