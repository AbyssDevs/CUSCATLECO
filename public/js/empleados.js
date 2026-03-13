function mostrar(seccion) {
  document.getElementById("resumen").style.display = "none";
  document.getElementById("empleados").style.display = "none";
  // document.getElementById("ordenes").style.display = "none"; // Para un Sprint futuro

  document.getElementById(seccion).style.display = "block";
}

// REGISTRAR EMPLEADO
async function registrarEmpleado() {
  let nombre = document.getElementById("usuario_nombre").value.trim();
  let email = document.getElementById("usuario_email").value.trim();
  let password = document.getElementById("usuario_password").value.trim();
  let rol = document.getElementById("rol_nombre").value;

  if (!nombre || !email || !password) {
    alert("Todos los campos son obligatorios");
    return;
  }

  try {
    let respuesta = await fetch("/api/empleados", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nombre,
        email,
        password,
        rol,
      }),
    });

    let datos = await respuesta.json();

    if (respuesta.ok) {
      alert("Empleado registrado correctamente");

      limpiarFormulario();

      cargarEmpleados();
    } else {
      alert(datos.error || "Error al registrar empleado");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Error de conexión con el servidor");
  }
}

// CARGAR EMPLEADOS
async function cargarEmpleados() {
  try {
    let respuesta = await fetch("/api/empleados");

    let empleados = await respuesta.json();

    let lista = document.getElementById("listaEmpleados");

    lista.innerHTML = "";

    empleados.forEach(emp => {
      let card = document.createElement("div");
      card.classList.add("empleado-card");

      card.innerHTML = `
        <div class="empleado-info">
            <p><strong>Nombre:</strong> ${emp.usuario_nombre}</p>
            <p><strong>Email:</strong> ${emp.usuario_email}</p>
            <p><strong>Rol:</strong> ${emp.rol_nombre}</p>
        </div>

        <button onclick="eliminarEmpleado(${emp.id_usuario})">
            Eliminar
        </button>
        `;

      lista.appendChild(card);
    });
  } catch (error) {
    console.error("Error cargando empleados:", error);
  }
}

// ELIMINAR EMPLEADO
async function eliminarEmpleado(id) {
  if (!confirm("¿Eliminar empleado?")) return;

  try {
    let respuesta = await fetch(`/api/empleados/${id}`, {
      method: "DELETE",
    });

    if (respuesta.ok) {
      cargarEmpleados();
    } else {
      alert("No se pudo eliminar");
    }
  } catch (error) {
    console.error("Error eliminando:", error);
  }
}

// LIMPIAR FORMULARIO
function limpiarFormulario() {
  document.getElementById("usuario_nombre").value = "";
  document.getElementById("usuario_email").value = "";
  document.getElementById("usuario_password").value = "";
}

// CARGA INICIAL
document.addEventListener("DOMContentLoaded", () => {
  mostrar("resumen");

  cargarEmpleados();
});

function cerrarSesion() {
  window.location.href = "/logout";
}
