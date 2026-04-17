//1
let empleadoEditando = null;

function mostrar(seccion) {
  document.getElementById("resumen").style.display = "none";
  document.getElementById("empleados").style.display = "none";
  document.getElementById("registrarEmpleado").style.display = "none";
  document.getElementById("registrarPlatillo").style.display = "none";
  document.getElementById("menuPlatillos").style.display = "none";
  document.getElementById("mesas").style.display = "none";
  // document.getElementById("ordenes").style.display = "none"; // Para un Sprint futuro

  document.getElementById(seccion).style.display = "block";

  if (seccion === "empleados") {
    cargarEmpleados();
  }

  if (seccion === "menuPlatillos") {
    loadMenu();
  }

  if (seccion === "mesas" || seccion === "verMesas") {
    cargarMesas();
  }
}

//Mostrar usuarios al cargar la página
// ===== FUNCIÓN PARA CARGAR DATOS DEL USUARIO =====
async function cargarUsuarioLogueado() {
  try {
    const respuesta = await fetch("/api/usuario");

    if (!respuesta.ok) {
      throw new Error("No se pudo obtener información del usuario");
    }

    const usuario = await respuesta.json();
    const nombreUsuario = usuario.nombre || usuario.usuario_nombre || usuario.name || "Usuario";
    const rolUsuario = usuario.rol || usuario.role || "Sin rol";

    // Actualizar el sidebar con la información del usuario
    document.getElementById("userName").textContent = nombreUsuario;
    document.getElementById("userRole").textContent = rolUsuario;

    // También podemos mostrar el nombre en el mensaje de bienvenida
    const bienvenida = document.getElementById("bienvenidaUsuario");
    if (bienvenida) {
      bienvenida.innerHTML = `Bienvenido, <strong>${nombreUsuario}</strong> (${rolUsuario})`;
    }

    return usuario;
  } catch (error) {
    console.error("Error cargando usuario:", error);

    // Si hay error, mostrar valores por defecto
    document.getElementById("userName").textContent = "Usuario";
    document.getElementById("userRole").textContent = "No disponible";

    // Si el error es de autenticación, redirigir al login
    if (error.message.includes("401")) {
      window.location.href = "/";
    }
  }
}

// CARGA INICIAL
document.addEventListener("DOMContentLoaded", () => {
  // Primero cargar el usuario logueado
  cargarUsuarioLogueado().then(() => {
    // Luego mostrar la sección por defecto
    mostrar("resumen");
    cargarEmpleados();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      cerrarModalEdicion();
    }
  });
});

// REGISTRAR EMPLEADO
async function registrarEmpleado() {
  let nombre = document.getElementById("usuario_nombre").value.trim();
  let email = document.getElementById("usuario_email").value.trim();
  let telefono = document
    .getElementById("usuario_telefono")
    .value.replace(/\D/g, "");
  let password = document.getElementById("usuario_password").value.trim();
  let rol = document.getElementById("rol_nombre").value;

  if (!nombre || !email || !telefono) {
    alert("Nombre, email y teléfono son obligatorios");
    return;
  }

  if (!empleadoEditando && !password) {
    alert("La contraseña es obligatoria para nuevos empleados");
    return;
  }

  if (!/^\d{8}$/.test(telefono)) {
    alert("El teléfono debe tener 8 números");
    return;
  }

  let url = "/api/empleados";
  let metodo = "POST";

  if (empleadoEditando) {
    url = `/api/empleados/${empleadoEditando}`;
    metodo = "PUT";
  }

  // Enviar password solo si tiene valor
  let bodyData = { nombre, email, telefono, rol };
  if (password) bodyData.password = password;

  try {
    let respuesta = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyData),
    });

    let datos = await respuesta.json();

    if (respuesta.ok) {
      alert(
        empleadoEditando
          ? "Empleado actualizado correctamente"
          : "Empleado registrado correctamente",
      );
      limpiarFormulario();
      cargarEmpleados();
      empleadoEditando = null;
      document.getElementById("btnRegistrar").innerText = "Registrar empleado";

      mostrar("empleados");
    } else {
      alert(datos.error || "Error al registrar empleado");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Error de conexión con el servidor");
  }

  contarEmpleados();

}

// CARGAR EMPLEADOS
async function cargarEmpleados() {
  try {
    let respuesta = await fetch("/api/empleados");

    let empleados = await respuesta.json();

    let lista = document.getElementById("listaEmpleados");

    lista.innerHTML = "";

    empleados.forEach((emp) => {
      let fila = document.createElement("tr");

      fila.innerHTML = `
        <td>${emp.id_usuario}</td>
        <td>${emp.usuario_nombre}</td>
        <td>${emp.usuario_email}</td>
        <td>${emp.usuario_telefono}</td>
        <td>${emp.rol_nombre}</td>
        <td>${emp.fecha_creacion}</td>
        <td><button class="btn-editar" onclick="editarEmpleado(${emp.id_usuario})">Editar</button></td>
        <td><button class="btn-eliminar" onclick="eliminarEmpleado(${emp.id_usuario})">Eliminar</button></td>
      `;

      lista.appendChild(fila);
    });
  } catch (error) {
    console.error("Error cargando empleados:", error);
  }

  contarEmpleados();
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

 contarEmpleados();
}

//Editar empleado
//posdata: No borrar los emojis por favor, es para ayudar visualmente al usuario a identificar que está editando un empleado y no registrando uno nuevo, además de darle un toque más amigable al formulario
function editarEmpleado(id) {
  let fila = event.target.closest("tr");
  let celdas = fila.querySelectorAll("td");

  // Llenar el formulario
  document.getElementById("usuario_nombre").value = celdas[1].innerText;
  document.getElementById("usuario_email").value = celdas[2].innerText;
  document.getElementById("usuario_telefono").value = celdas[3].innerText;
  document.getElementById("rol_nombre").value = celdas[4].innerText;
  document.getElementById("usuario_password").value = "";

  empleadoEditando = id;
  document.getElementById("btnRegistrar").innerText = "Actualizar empleado";

  // Cambiar a la pestaña de registro
  mostrar("registrarEmpleado");

  // MOSTRAR INDICADOR DE EDICIÓN
  let titulo = document.querySelector("#registrarEmpleado h2");
  let originalText = titulo.innerText;
  titulo.innerHTML =
    '✏️ Editando empleado: <span style="color: #000000; font-size: 1.2rem;">' +
    celdas[1].innerText +
    "</span>";

  // Crear botón para cancelar edición
  let cancelBtn = document.createElement("button");
  cancelBtn.id = "cancelarEdicion";
  cancelBtn.innerText = "Cancelar edición";
  cancelBtn.style.marginLeft = "1rem";
  cancelBtn.style.padding = "0.3rem 1rem";
  cancelBtn.style.background = "#dc3545";
  cancelBtn.style.color = "white";
  cancelBtn.style.border = "none";
  cancelBtn.style.borderRadius = "5px";
  cancelBtn.style.cursor = "pointer";
  cancelBtn.onclick = cancelarEdicion;

  // Agregar botón al lado del título
  titulo.appendChild(cancelBtn);

  // Scroll al formulario
  document
    .getElementById("registrarEmpleado")
    .scrollIntoView({ behavior: "smooth" });
}

// Función para cancelar edición
function cancelarEdicion() {
  limpiarFormulario();
  empleadoEditando = null;
  document.getElementById("btnRegistrar").innerText = "Registrar empleado";

  // Restaurar título
  let titulo = document.querySelector("#registrarEmpleado h2");
  titulo.innerHTML = "Registrar empleado";

  // Volver a la lista de empleados
  mostrar("empleados");

  contarEmpleados();

}

// LIMPIAR FORMULARIO
function limpiarFormulario() {
  document.getElementById("usuario_nombre").value = "";
  document.getElementById("usuario_email").value = "";
  document.getElementById("usuario_password").value = "";
  document.getElementById("usuario_telefono").value = "";
}

function cerrarSesion() {
  window.location.href = "/logout";
}

// Validación para el campo de teléfono para permitir solo números, limitar a 8 dígitos y agregar un guion después de los primeros 4 dígitos
document
  .getElementById("usuario_telefono")
  .addEventListener("input", function () {
    this.value = this.value.replace(/\D/g, "").slice(0, 8);
  });

document
  .getElementById("usuario_telefono")
  .addEventListener("input", function () {
    let numeros = this.value.replace(/\D/g, "").slice(0, 8);

    if (numeros.length > 4) {
      this.value = numeros.slice(0, 4) + "-" + numeros.slice(4);
    } else {
      this.value = numeros;
    }
  });

// Función para contar empleados visibles
function contarEmpleados() {
  const tabla = document.getElementById("tablaEmpleados");
  const filas = tabla
    .getElementsByTagName("tbody")[0]
    .getElementsByTagName("tr");

  let contador = 0;

  for (let i = 0; i < filas.length; i++) {
    if (filas[i].style.display !== "none") {
      contador++;
    }
  }

  document.getElementById("contadorEmpleados").innerText = contador;
}
