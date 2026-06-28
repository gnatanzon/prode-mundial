// CONFIGURACIÓN: Pegá acá la URL de ejecución que te dio Google Apps Script
const URL_API = "https://script.google.com/macros/s/AKfycbxOu_DCu0LEcOj27K5PylAdBQzxBluFq45tgsFSro85Gq5Ozl8rnyDvflw0pGUkpIZJGw/exec";

// Variables globales de la app
let usuarioActual = localStorage.getItem("prode_usuario") || "";

// Al cargar la página, inicializamos la app
document.addEventListener("DOMContentLoaded", () => {
    inicializarUsuario();
    cargarPartidos();
    cargarPosiciones();
    
    // Configurar el evento para guardar el nombre de usuario
    document.getElementById("btn-guardar-usuario").addEventListener("click", guardarUsuario);
});

// --- 1. GESTIÓN DE USUARIO ---
function inicializarUsuario() {
    const seccionLogin = document.getElementById("seccion-login");
    const seccionApp = document.getElementById("seccion-app");
    const spanNombre = document.getElementById("nombre-usuario-activo");

    if (usuarioActual) {
        seccionLogin.style.display = "none";
        seccionApp.style.display = "block";
        spanNombre.textContent = usuarioActual;
    } else {
        seccionLogin.style.display = "block";
        seccionApp.style.display = "none";
    }
}

function guardarUsuario() {
    const inputNombre = document.getElementById("input-nombre");
    const nombre = inputNombre.value.trim();

    if (nombre === "") {
        alert("Por favor, ingresá un nombre válido.");
        return;
    }

    usuarioActual = nombre;
    localStorage.setItem("prode_usuario", nombre);
    inicializarUsuario();
}

// Cierre de sesión opcional por si quieren cambiar de usuario
function cerrarSesion() {
    localStorage.removeItem("prode_usuario");
    usuarioActual = "";
    inicializarUsuario();
}


// --- 2. CARGAR PARTIDOS DESDE GOOGLE SHEETS ---
function cargarPartidos() {
    const contenedorPartidos = document.getElementById("contenedor-partidos");
    contenedorPartidos.innerHTML = "<p>Cargando partidos...</p>";

    fetch(URL_API, {
        method: "POST",
        mode: "cors",
        body: JSON.stringify({ action: "obtenerPartidos" })
    })
    .then(res => res.json())
    .then(res => {
        if (res.status === "success") {
            dibujarPartidos(res.data);
        } else {
            contenedorPartidos.innerHTML = "<p>Error al cargar los partidos.</p>";
        }
    })
    .catch(err => {
        console.error(err);
        contenedorPartidos.innerHTML = "<p>Error de conexión con el servidor.</p>";
    });
}

function dibujarPartidos(partidos) {
    const contenedorPartidos = document.getElementById("contenedor-partidos");
    contenedorPartidos.innerHTML = "";

    if (partidos.length === 0) {
        contenedorPartidos.innerHTML = "<p>No hay partidos cargados en el fixture.</p>";
        return;
    }

    partidos.forEach(partido => {
        const tarjeta = document.createElement("div");
        tarjeta.className = `partido-card ${partido.estado}`;
        
        // Estructura interna de cada tarjeta de partido
        let htmlContenido = `
            <div class="partido-equipos">
                <span class="equipo">${partido.equipo_1}</span>
                
                <div class="inputs-goles">
                    <input type="number" min="0" id="prono-1-${partid.id_partido}" placeholder="-" ${partido.estado === 'jugado' ? 'disabled' : ''}>
                    <span class="vs">vs</span>
                    <input type="number" min="0" id="prono-2-${partid.id_partido}" placeholder="-" ${partido.estado === 'jugado' ? 'disabled' : ''}>
                </div>
                
                <span class="equipo">${partido.equipo_2}</span>
            </div>
        `;

        // Si el partido ya se jugó, mostramos el resultado real abajo
        if (partido.estado === "jugado") {
            htmlContenido += `
                <div class="resultado-real">
                    Resultado real: ${partido.goles_1_real} - ${partido.goles_2_real} (Finalizado)
                </div>
            `;
        } else {
            htmlContenido += `
                <button class="btn-votar" onclick="enviarPronostico('${partido.id_partido}')">
                    Guardar Pronóstico
                </button>
            `;
        }

        tarjeta.innerHTML = htmlContenido;
        contenedorPartidos.appendChild(tarjeta);
    });
}


// --- 3. ENVIAR PRONÓSTICO A LA API ---
function enviarPronostico(idPartido) {
    const inputGoles1 = document.getElementById(`prono-1-${idPartido}`);
    const inputGoles2 = document.getElementById(`prono-2-${idPartido}`);
    
    const goles1 = inputGoles1.value;
    const goles2 = inputGoles2.value;

    if (goles1 === "" || goles2 === "") {
        alert("Por favor, completá ambos casilleros de goles antes de guardar.");
        return;
    }

    const payload = {
        action: "guardarPronostico",
        usuario: usuarioActual,
        id_partido: idPartido,
        goles_1: parseInt(goles1),
        goles_2: parseInt(goles2)
    };

    // Deshabilitamos el botón temporalmente para evitar doble clic
    const boton = event.target;
    boton.disabled = true;
    boton.textContent = "Guardando...";

    fetch(URL_API, {
        method: "POST",
        mode: "cors",
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === "success") {
            alert("¡Pronóstico guardado con éxito!");
            boton.textContent = "Modificar Pronóstico";
        } else {
            alert("Hubo un error: " + data.message);
            boton.textContent = "Guardar Pronóstico";
        }
        boton.disabled = false;
    })
    .catch(err => {
        console.error(err);
        alert("Error de red al intentar guardar.");
        boton.disabled = false;
        boton.textContent = "Guardar Pronóstico";
    });
}


// --- 4. CARGAR TABLA DE POSICIONES ---
function cargarPosiciones() {
    const tablaCuerpo = document.getElementById("tabla-posiciones-body");
    tablaCuerpo.innerHTML = "<tr><td colspan='3'>Actualizando tabla...</td></tr>";

    fetch(URL_API, {
        method: "POST",
        mode: "cors",
        body: JSON.stringify({ action: "obtenerPosiciones" })
    })
    .then(res => res.json())
    .then(res => {
        if (res.status === "success") {
            dibujarPosiciones(res.data);
        } else {
            tablaCuerpo.innerHTML = "<tr><td colspan='3'>Error al procesar el ranking.</td></tr>";
        }
    })
    .catch(err => {
        console.error(err);
        tablaCuerpo.innerHTML = "<tr><td colspan='3'>Error de conexión.</td></tr>";
    });
}

function dibujarPosiciones(ranking) {
    const tablaCuerpo = document.getElementById("tabla-posiciones-body");
    tablaCuerpo.innerHTML = "";

    if (ranking.length === 0) {
        tablaCuerpo.innerHTML = "<tr><td colspan='3'>Aún no hay puntos calculados.</td></tr>";
        return;
    }

    ranking.forEach((puesto, indice) => {
        const fila = document.createElement("tr");
        
        // Destacamos al puntero
        if (indice === 0) fila.className = "puntero-row";

        fila.innerHTML = `
            <td><strong>#${indice + 1}</strong></td>
            <td>${puesto.usuario}</td>
            <td><strong>${puesto.puntos} pts</strong></td>
        `;
        tablaCuerpo.appendChild(fila);
    });
}