const MAX_BULK_MESAS = 50;
const ESTADOS_MESA = ["Libre", "Ocupada", "Reservada", "Limpieza"];
let bulkMode = false;

function mostrarMensajeMesas(mensaje, esError = false) {
  const contenedor = document.getElementById("mesasMensaje");
  if (!contenedor) return;
  contenedor.textContent = mensaje;
  contenedor.style.color = esError ? "#b22222" : "#1f7a1f";
}

function normalizarEstadoMesa(estado) {
  if (!estado) return "Libre";
  if (estado.toString().trim().toLowerCase() === "disponible") return "Libre";
  return estado.toString().trim();
}

function obtenerRolUsuario() {
  const rolElemento = document.getElementById("userRole");
  return rolElemento ? rolElemento.textContent.trim().toLowerCase() : "";
}

function esAdministrador() {
  return obtenerRolUsuario().includes("administrador");
}

async function eliminarMesa(mesaId) {
  if (!esAdministrador()) {
    mostrarMensajeMesas("No tienes permiso para eliminar mesas.", true);
    return;
  }

  const confirmar = window.confirm("¿Deseas eliminar esta mesa?");
  if (!confirmar) return;

  try {
    const respuesta = await fetch(`/api/mesas/${mesaId}`, {
      method: "DELETE",
    });

    const datos = await respuesta.json();
    if (!respuesta.ok) {
      mostrarMensajeMesas(datos.error || "No se pudo eliminar la mesa.", true);
      return;
    }

    mostrarMensajeMesas("Mesa eliminada correctamente.");
    cargarMesas();
  } catch (error) {
    console.error("Error eliminando mesa:", error);
    mostrarMensajeMesas("Error de conexión. Intente nuevamente.", true);
  }
}

function crearBotonEliminar(mesaId) {
  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "btn-eliminar";
  boton.textContent = "Eliminar";
  boton.style.marginLeft = "0.5rem";
  boton.addEventListener("click", async (event) => {
    event.preventDefault();
    await eliminarMesa(mesaId);
  });
  return boton;
}

function estadoClass(estado) {
  const estadoNormalizado = normalizarEstadoMesa(estado).toLowerCase();
  if (estadoNormalizado === "libre") return "status-disponible";
  return `status-${estadoNormalizado.replace(/\s+/g, "-")}`;
}

function crearSelectEstado(mesaId, estadoActual) {
  const select = document.createElement("select");
  select.className = "mesa-estado-select";
  const estadoNormalizado = normalizarEstadoMesa(estadoActual);

  ESTADOS_MESA.forEach((estado) => {
    const option = document.createElement("option");
    option.value = estado;
    option.textContent = estado;
    if (estado === estadoNormalizado) {
      option.selected = true;
    }
    select.appendChild(option);
  });

  if (!mesaId) {
    select.disabled = true;
    return select;
  }

  select.addEventListener("change", async () => {
    select.disabled = true;
    const nuevoEstado = select.value;
    try {
      const respuesta = await fetch(`/api/mesas/${mesaId}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mesa_estado: nuevoEstado }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) {
        mostrarMensajeMesas(datos.error || "No se pudo actualizar el estado de la mesa.", true);
        select.value = estadoNormalizado;
        return;
      }
      mostrarMensajeMesas(`Estado de la mesa actualizado a ${nuevoEstado}.`);
      cargarMesas();
    } catch (error) {
      console.error("Error actualizando estado de mesa:", error);
      mostrarMensajeMesas("Error de conexión. Intente nuevamente.", true);
      select.value = estadoNormalizado;
    } finally {
      select.disabled = false;
    }
  });

  return select;
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

  if (!bulkField || !numeroInput || !titulo || !botonCrear || !toggleBtn || !bulkHint) {
    return;
  }

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
  if (document.getElementById("mesas")) {
    actualizarFormularioModo();
  }

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
      const mesaId = mesa.id_mesa ?? mesa.id ?? null;
      const mesaNum = mesa.mesa_numero ?? mesa.numero ?? "--";
      const mesaCap = mesa.mesa_capacidad ?? mesa.capacidad ?? "--";
      const mesaEstadoRaw = mesa.mesa_estado ?? mesa.estado ?? "Disponible";
      const mesaEstado = normalizarEstadoMesa(mesaEstadoRaw);
      const mesaUbi = mesa.mesa_ubicacion ?? mesa.ubicacion ?? "Área General";
      const mesaAct = mesa.mesa_actualizada_por ?? mesa.actualizada_por ?? null;
      const mesaFecha = mesa.mesa_actualizado_en ?? mesa.actualizado_en ?? mesa.mesa_actualizado_at ?? mesa.actualizado_at ?? null;
      const mesaActTexto = mesaAct ? `Actualizada por: ${mesaAct}` : "Actualizada por: --";
      const estadoClase = estadoClass(mesaEstado);

      // Render Table Row (Desktop)
      if (tablaBody) {
        const fila = document.createElement("tr");
        const selectEstado = crearSelectEstado(mesaId, mesaEstado);
        fila.innerHTML = `
          <td><strong>${mesaNum}</strong></td>
          <td>${mesaCap} personas</td>
          <td></td>
          <td>${mesaUbi}</td>
          <td>${mesaActTexto}${mesaFecha ? ` · ${new Date(mesaFecha).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}</td>
        `;
        fila.children[2].appendChild(selectEstado);
        if (esAdministrador()) {
          const botonEliminar = crearBotonEliminar(mesaId);
          fila.children[4].appendChild(botonEliminar);
        }
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
            <span class="menu-card-status ${estadoClase}">${mesaEstado}</span>
          </div>
          <div class="menu-card-desc">
            <p><strong>📍 Ubicación:</strong> ${mesaUbi}</p>
            <p style="font-size: 0.85rem; color: #666; margin-top: 8px;">
              <i class="fa-solid fa-user-pen"></i> ${mesaActTexto}${mesaFecha ? ` · ${new Date(mesaFecha).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}
            </p>
          </div>
        `;
        const selectContainer = document.createElement("div");
        selectContainer.style.marginTop = "0.75rem";
        selectContainer.appendChild(crearSelectEstado(mesaId, mesaEstado));
        if (esAdministrador()) {
          const botonEliminar = crearBotonEliminar(mesaId);
          botonEliminar.style.marginTop = "0.75rem";
          botonEliminar.style.display = "inline-block";
          selectContainer.appendChild(botonEliminar);
        }
        card.querySelector(".menu-card-desc").appendChild(selectContainer);
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
  if (document.getElementById("mesas")) {
    actualizarFormularioModo();
  }
});