const MAX_BULK_MESAS = 50;
const ESTADOS_MESA = ["Libre", "Ocupada", "Reservada", "Limpieza", "Mantenimiento"];
const ICONOS_ESTADO = {
  Libre: "fa-check-circle",
  Ocupada: "fa-times-circle",
  Reservada: "fa-clock",
  Limpieza: "fa-broom",
  Mantenimiento: "fa-tools"
};
const mesasState = {
  mesas: [],
  filtros: {
    busqueda: "",
    capacidad: "",
    estado: "",
    ubicacion: ""
  }
};
const PRIORIDAD_ESTADOS_MESA = {
  Libre: 1,
  Ocupada: 2,
  Reservada: 3,
  Limpieza: 4,
  Mantenimiento: 5
};
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
    toast("error", "No tienes permiso para eliminar mesas.");
    return;
  }

  const confirmado = await confirmar("Deseas eliminar esta mesa?", "Esta accion no se puede deshacer.");
  if (!confirmado) return;

  try {
    const respuesta = await fetch(`/api/mesas/${mesaId}`, {
      method: "DELETE",
    });

    const datos = await respuesta.json();
    if (!respuesta.ok) {
      toast("error", datos.error || "No se pudo eliminar la mesa.");
      return;
    }

    toast("success", "Mesa eliminada correctamente.");
    cargarMesas();
  } catch (error) {
    console.error("Error eliminando mesa:", error);
    toast("error", "Error de conexion. Intente nuevamente.");
  }
}

function crearBotonEliminar(mesaId) {
  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "btn-eliminar";
  boton.innerHTML = '<i class="fa-solid fa-power-off"></i> Eliminar';
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
  const estadoNormalizado = normalizarEstadoMesa(estadoActual);
  const icono = ICONOS_ESTADO[estadoNormalizado] || "fa-question-circle";

  if (esAdministrador()) {
    const span = document.createElement("span");
    span.className = `mesa-estado-text ${estadoClass(estadoNormalizado)}`;
    span.innerHTML = `<i class="fa-solid ${icono}"></i> ${estadoNormalizado}`;
    return span;
  }

  const select = document.createElement("select");
  select.className = "mesa-estado-select";
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
      mostrarMensajeMesas("Error de conexion. Intente nuevamente.", true);
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
  document.getElementById("bulk_count_input").value = "";
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
    numeroInput.placeholder = "Numero inicial";
    titulo.textContent = "Crear mesas en serie";
    botonCrear.textContent = "Crear mesas en serie";
    toggleBtn.textContent = "Volver a crear individual";
    bulkHint.textContent = `Maximo ${MAX_BULK_MESAS} mesas en serie. El numero ingresado sera el numero inicial.`;
  } else {
    bulkField.style.display = "none";
    numeroInput.placeholder = "Numero de mesa";
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

function asegurarFiltrosMesas() {
  const verMesasSection = document.getElementById("verMesas");
  if (!verMesasSection || document.getElementById("mesaSearchInput")) return;

  const filtros = document.createElement("div");
  filtros.className = "menu-page-header mesas-filtros";
  filtros.innerHTML = `
    <input id="mesaSearchInput" type="text" placeholder="Buscar mesa..." autocomplete="off">
    <select id="mesaCapacidadFilter">
      <option value="">Todas las capacidades</option>
    </select>
    <select id="mesaEstadoFilter">
      <option value="">Todos los estados</option>
    </select>
    <select id="mesaUbicacionFilter">
      <option value="">Todas las ubicaciones</option>
    </select>
  `;

  const loading = document.getElementById("verMesasLoading");
  verMesasSection.insertBefore(filtros, loading);

  document.getElementById("mesaSearchInput").addEventListener("input", (event) => {
    mesasState.filtros.busqueda = event.target.value;
    renderMesas();
  });
  document.getElementById("mesaCapacidadFilter").addEventListener("change", (event) => {
    mesasState.filtros.capacidad = event.target.value;
    renderMesas();
  });
  document.getElementById("mesaEstadoFilter").addEventListener("change", (event) => {
    mesasState.filtros.estado = event.target.value;
    renderMesas();
  });
  document.getElementById("mesaUbicacionFilter").addEventListener("change", (event) => {
    mesasState.filtros.ubicacion = event.target.value;
    renderMesas();
  });
}

function mesaViewModel(mesa) {
  const mesaAct = mesa.mesa_actualizada_por ?? mesa.actualizada_por ?? null;
  return {
    mesaId: mesa.id_mesa ?? mesa.id ?? null,
    mesaNum: mesa.mesa_numero ?? mesa.numero ?? "--",
    mesaCap: mesa.mesa_capacidad ?? mesa.capacidad ?? "--",
    mesaEstado: normalizarEstadoMesa(mesa.mesa_estado ?? mesa.estado ?? "Disponible"),
    mesaUbi: mesa.mesa_ubicacion ?? mesa.ubicacion ?? "Area General",
    mesaAct,
    mesaFecha: mesa.mesa_actualizado_en ?? mesa.actualizado_en ?? mesa.mesa_actualizado_at ?? mesa.actualizado_at ?? null,
    mesaActTexto: mesaAct ? `Actualizada por: ${mesaAct}` : "Actualizada por: --"
  };
}

function actualizarOpcionesFiltrosMesas() {
  const capacidadSelect = document.getElementById("mesaCapacidadFilter");
  const estadoSelect = document.getElementById("mesaEstadoFilter");
  const ubicacionSelect = document.getElementById("mesaUbicacionFilter");
  if (!capacidadSelect || !estadoSelect || !ubicacionSelect) return;

  const mesas = mesasState.mesas.map(mesaViewModel);
  const capacidades = [...new Set(mesas.map((mesa) => String(mesa.mesaCap)).filter(Boolean))]
    .sort((a, b) => Number(a) - Number(b));
  const estados = [...new Set(mesas.map((mesa) => mesa.mesaEstado).filter(Boolean))]
    .sort((a, b) => (PRIORIDAD_ESTADOS_MESA[a] ?? 99) - (PRIORIDAD_ESTADOS_MESA[b] ?? 99));
  const ubicaciones = [...new Set(mesas.map((mesa) => mesa.mesaUbi).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

  capacidadSelect.innerHTML = `
    <option value="">Todas las capacidades</option>
    ${capacidades.map((capacidad) => `<option value="${capacidad}">${capacidad} personas</option>`).join("")}
  `;
  estadoSelect.innerHTML = `
    <option value="">Todos los estados</option>
    ${estados.map((estado) => `<option value="${estado}">${estado}</option>`).join("")}
  `;
  ubicacionSelect.innerHTML = `
    <option value="">Todas las ubicaciones</option>
    ${ubicaciones.map((ubicacion) => `<option value="${ubicacion}">${ubicacion}</option>`).join("")}
  `;

  capacidadSelect.value = mesasState.filtros.capacidad;
  estadoSelect.value = mesasState.filtros.estado;
  ubicacionSelect.value = mesasState.filtros.ubicacion;
}

function obtenerMesasFiltradas() {
  const busqueda = mesasState.filtros.busqueda.trim().toLowerCase();
  return mesasState.mesas
    .map(mesaViewModel)
    .filter((mesa) => {
      const textoMesa = [
        mesa.mesaNum,
        mesa.mesaCap,
        mesa.mesaEstado,
        mesa.mesaUbi,
        mesa.mesaAct
      ].join(" ").toLowerCase();

      return (!busqueda || textoMesa.includes(busqueda))
        && (!mesasState.filtros.capacidad || String(mesa.mesaCap) === mesasState.filtros.capacidad)
        && (!mesasState.filtros.estado || mesa.mesaEstado === mesasState.filtros.estado)
        && (!mesasState.filtros.ubicacion || mesa.mesaUbi === mesasState.filtros.ubicacion);
    })
    .sort((a, b) => {
      const prioridadA = PRIORIDAD_ESTADOS_MESA[a.mesaEstado] ?? 99;
      const prioridadB = PRIORIDAD_ESTADOS_MESA[b.mesaEstado] ?? 99;
      if (prioridadA !== prioridadB) return prioridadA - prioridadB;
      return Number(a.mesaNum) - Number(b.mesaNum);
    });
}

function formatearFechaMesa(fecha) {
  if (!fecha) return "";
  return new Date(fecha).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function renderMesas() {
  const empty = document.getElementById("verMesasEmpty");
  const tablaBody = document.getElementById("verMesasTableBody");
  const cardList = document.getElementById("verMesasCardList");
  const mesasFiltradas = obtenerMesasFiltradas();

  if (empty) empty.textContent = "";
  if (tablaBody) tablaBody.innerHTML = "";
  if (cardList) cardList.innerHTML = "";

  if (mesasState.mesas.length === 0) {
    if (empty) empty.textContent = "No hay mesas registradas.";
    return;
  }

  if (mesasFiltradas.length === 0) {
    if (empty) empty.textContent = "No hay mesas que coincidan con los filtros.";
    return;
  }

  mesasFiltradas.forEach((mesa) => {
    const fechaTexto = formatearFechaMesa(mesa.mesaFecha);
    const actualizado = `${mesa.mesaActTexto}${fechaTexto ? ` · ${fechaTexto}` : ""}`;

    if (tablaBody) {
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td><strong>${mesa.mesaNum}</strong></td>
        <td>${mesa.mesaCap} personas</td>
        <td></td>
        <td>${mesa.mesaUbi}</td>
        <td>${actualizado}</td>
        ${esAdministrador() ? "<td></td>" : ""}
      `;
      fila.children[2].appendChild(crearSelectEstado(mesa.mesaId, mesa.mesaEstado));
      if (esAdministrador()) {
        const botonEliminar = crearBotonEliminar(mesa.mesaId);
        botonEliminar.style.marginLeft = "0";
        fila.children[5].appendChild(botonEliminar);
      }
      tablaBody.appendChild(fila);
    }

    if (cardList) {
      const card = document.createElement("div");
      card.className = "menu-card";
      card.innerHTML = `
        <div class="menu-card-header">
          <div>
            <h3 class="menu-card-title">Mesa #${mesa.mesaNum}</h3>
            <p class="menu-card-category">Capacidad: ${mesa.mesaCap} personas</p>
          </div>
          <span class="menu-card-status ${estadoClass(mesa.mesaEstado)}">${mesa.mesaEstado}</span>
        </div>
        <div class="menu-card-desc">
          <p><strong>Ubicacion:</strong> ${mesa.mesaUbi}</p>
          <p style="font-size: 0.85rem; color: #666; margin-top: 8px;">
            <i class="fa-solid fa-user-pen"></i> ${actualizado}
          </p>
        </div>
      `;
      const selectContainer = document.createElement("div");
      selectContainer.style.marginTop = "0.75rem";
      selectContainer.appendChild(crearSelectEstado(mesa.mesaId, mesa.mesaEstado));
      if (esAdministrador()) {
        const botonEliminar = crearBotonEliminar(mesa.mesaId);
        botonEliminar.style.marginTop = "0.75rem";
        botonEliminar.style.display = "inline-block";
        selectContainer.appendChild(botonEliminar);
      }
      card.querySelector(".menu-card-desc").appendChild(selectContainer);
      cardList.appendChild(card);
    }
  });
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

  asegurarFiltrosMesas();

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
    mesasState.mesas = Array.isArray(mesas) ? mesas : [];
    actualizarOpcionesFiltrosMesas();
    renderMesas();
  } catch (error) {
    console.error(error);
    if (empty) {
      empty.textContent = "No se pudo cargar la lista de mesas. Intente nuevamente.";
    } else {
      toast("error", "No se pudo cargar la lista de mesas. Intente nuevamente.");
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
    toast("error", "El numero de mesa debe ser un entero mayor que 0.");
    return;
  }

  if (!capacidad || capacidad <= 0) {
    toast("error", "La capacidad debe ser mayor que 0.");
    return;
  }

  if (bulkMode) {
    const cantidad = Number(document.getElementById("bulk_count_input").value);
    if (!cantidad || cantidad <= 0) {
      toast("error", "La cantidad de mesas debe ser mayor que 0.");
      return;
    }

    if (cantidad > MAX_BULK_MESAS) {
      toast("error", `No se pueden crear mas de ${MAX_BULK_MESAS} mesas en serie.`);
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
        toast("error", datos.error || "Error al crear las mesas.");
        return;
      }

      toast("success", `${cantidad} mesas creadas exitosamente.`);
      limpiarFormularioMesas();
      cargarMesas();
    } catch (error) {
      console.error(error);
      toast("error", "Error de conexion. Intente nuevamente.");
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
      toast("error", datos.error || "Error al crear la mesa.");
      return;
    }

    toast("success", "Mesa creada exitosamente.");
    limpiarFormularioMesas();
    cargarMesas();
  } catch (error) {
    console.error(error);
    toast("error", "Error de conexion. Intente nuevamente.");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("mesas")) {
    actualizarFormularioModo();
  }
});
