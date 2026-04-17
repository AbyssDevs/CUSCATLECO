const MAX_BULK_MESAS = 50;
let bulkMode = false;

function mostrarMensajeMesas(mensaje, esError = false) {
  const contenedor = document.getElementById("mesasMensaje");
  if (!contenedor) return;
  contenedor.textContent = mensaje;
  contenedor.style.color = esError ? "#b22222" : "#1f7a1f";
}

function limpiarFormularioMesas() {
  document.getElementById("mesa_numero").value = "";
  document.getElementById("mesa_capacidad").value = "";
  document.getElementById("mesa_ubicacion").value = "";
  document.getElementById("bulk_count").value = "";
}

function actualizarFormularioModo() {
  const bulkField = document.getElementById("bulk_count");
  const numeroInput = document.getElementById("mesa_numero");
  const titulo = document.getElementById("mesasTitulo");
  const botonCrear = document.getElementById("btnCrearMesa");
  const toggleBtn = document.getElementById("toggleBulkModeBtn");
  const bulkHint = document.getElementById("bulkHint");

  if (bulkMode) {
    bulkField.style.display = "inline-block";
    numeroInput.placeholder = "Número inicial";
    titulo.textContent = "Crear mesas en serie";
    botonCrear.textContent = "Crear mesas en serie";
    toggleBtn.textContent = "Volver a crear individual";
    bulkHint.textContent = `Máximo ${MAX_BULK_MESAS} mesas en serie. El número ingresado será el número inicial.`;
  } else {
    bulkField.style.display = "none";
    numeroInput.placeholder = "Número de mesa";
    titulo.textContent = "Crear mesas";
    botonCrear.textContent = "Crear mesa";
    toggleBtn.textContent = "Crear en serie";
    bulkHint.textContent = "";
  }
}

function toggleBulkMode() {
  bulkMode = !bulkMode;
  actualizarFormularioModo();
  mostrarMensajeMesas("");
}

async function cargarMesas() {
  actualizarFormularioModo();

  const verMesasSection = document.getElementById("verMesas");
  const isVerMesas = verMesasSection && verMesasSection.style.display !== "none";

  if (!isVerMesas) {
    return;
  }

  const loading = document.getElementById("verMesasLoading");
  const empty = document.getElementById("verMesasEmpty");
  const tablaBody = document.getElementById("verMesasTableBody");
  const cardList = document.getElementById("verMesasCardList");

  if (loading) loading.style.display = "block";
  if (empty) empty.textContent = "";
  if (tablaBody) tablaBody.innerHTML = "";
  if (cardList) cardList.innerHTML = "";

  try {
    const respuesta = await fetch("/api/mesas");
    if (!respuesta.ok) {
      throw new Error("No se pudo cargar la lista de mesas.");
    }

    const mesas = await respuesta.json();

    if (!Array.isArray(mesas) || mesas.length === 0) {
      if (empty) empty.textContent = "No hay mesas registradas.";
      return;
    }

    mesas.forEach((mesa) => {
      const mesaNum = mesa.mesa_numero ?? mesa.numero ?? "--";
      const mesaCap = mesa.mesa_capacidad ?? mesa.capacidad ?? "--";
      const mesaEstado = mesa.mesa_estado ?? mesa.estado ?? "Disponible";
      const mesaUbi = mesa.mesa_ubicacion ?? mesa.ubicacion ?? "Área General";
      const mesaAct = mesa.mesa_actualizada_por ?? mesa.actualizada_por ?? "--";

      // Render Table Row (Desktop)
      if (tablaBody) {
        const fila = document.createElement("tr");
        fila.innerHTML = `
          <td><strong>${mesaNum}</strong></td>
          <td>${mesaCap} personas</td>
          <td><span class="menu-card-status status-${mesaEstado.toLowerCase()}">${mesaEstado}</span></td>
          <td>${mesaUbi}</td>
          <td>${mesaAct}</td>
        `;
        tablaBody.appendChild(fila);
      }

      // Render Card (Mobile)
      if (cardList) {
        const card = document.createElement("div");
        card.className = "menu-card";
        card.innerHTML = `
          <div class="menu-card-header">
            <div>
              <h3 class="menu-card-title">Mesa #${mesaNum}</h3>
              <p class="menu-card-category">Capacidad: ${mesaCap} personas</p>
            </div>
            <span class="menu-card-status status-${mesaEstado.toLowerCase()}">${mesaEstado}</span>
          </div>
          <div class="menu-card-desc">
            <p><strong>📍 Ubicación:</strong> ${mesaUbi}</p>
            <p style="font-size: 0.85rem; color: #666; margin-top: 8px;">
              <i class="fa-solid fa-user-pen"></i> Actualizada por: ${mesaAct}
            </p>
          </div>
        `;
        cardList.appendChild(card);
      }
    });
  } catch (error) {
    console.error(error);
    if (empty) {
      empty.textContent = "No se pudo cargar la lista de mesas. Intente nuevamente.";
    } else {
      mostrarMensajeMesas("No se pudo cargar la lista de mesas. Intente nuevamente.", true);
    }
  } finally {
    if (loading) loading.style.display = "none";
  }
}

async function crearMesa() {
  const numero = Number(document.getElementById("mesa_numero").value);
  const capacidad = Number(document.getElementById("mesa_capacidad").value);
  const ubicacion = document.getElementById("mesa_ubicacion").value.trim();

  if (!numero || numero <= 0) {
    mostrarMensajeMesas("El número de mesa debe ser un entero mayor que 0.", true);
    return;
  }

  if (!capacidad || capacidad <= 0) {
    mostrarMensajeMesas("La capacidad debe ser mayor que 0.", true);
    return;
  }

  if (bulkMode) {
    const cantidad = Number(document.getElementById("bulk_count").value);
    if (!cantidad || cantidad <= 0) {
      mostrarMensajeMesas("La cantidad de mesas debe ser mayor que 0.", true);
      return;
    }

    if (cantidad > MAX_BULK_MESAS) {
      mostrarMensajeMesas(`No se pueden crear más de ${MAX_BULK_MESAS} mesas en serie.`, true);
      return;
    }

    const mesas = Array.from({ length: cantidad }, (_, index) => ({
      mesa_numero: numero + index,
      mesa_capacidad: capacidad,
      mesa_ubicacion: ubicacion,
      mesa_estado: "Disponible",
    }));

    try {
      const respuesta = await fetch("/api/mesas/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mesas }),
      });

      const datos = await respuesta.json();
      if (!respuesta.ok) {
        mostrarMensajeMesas(datos.error || "Error al crear las mesas.", true);
        return;
      }

      mostrarMensajeMesas(`${cantidad} mesas creadas exitosamente.`);
      limpiarFormularioMesas();
      cargarMesas();
    } catch (error) {
      console.error(error);
      mostrarMensajeMesas("Error de conexión. Intente nuevamente.", true);
    }

    return;
  }

  try {
    const respuesta = await fetch("/api/mesas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mesa_numero: numero,
        mesa_capacidad: capacidad,
        mesa_ubicacion: ubicacion,
        mesa_estado: "Disponible",
      }),
    });

    const datos = await respuesta.json();
    if (!respuesta.ok) {
      mostrarMensajeMesas(datos.error || "Error al crear la mesa.", true);
      return;
    }

    mostrarMensajeMesas("Mesa creada exitosamente.");
    limpiarFormularioMesas();
    cargarMesas();
  } catch (error) {
    console.error(error);
    mostrarMensajeMesas("Error de conexión. Intente nuevamente.", true);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  actualizarFormularioModo();
});