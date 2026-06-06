async function apiFetch(url, options = {}) {
  const res = await fetch(`/api${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error en la solicitud");
  return data;
}

const contenedorPedidos =
  document.getElementById("contenedor-pedidos");

let pedidosGlobal = [];

document.addEventListener("DOMContentLoaded", () => {
  cargarPedidos();
  setupEventListeners();
  setInterval(async () => {
    await cargarPedidos();
  }, 10000);
});

function setupEventListeners() {
  const filtroEstado = document.getElementById("filtroEstadoPlatillos");
  if (filtroEstado) {
    filtroEstado.addEventListener("change", () => {
      renderPedidos(filtrarPedidos());
    });
  }

  const btnActualizar = document.getElementById("btnActualizarPedidos");
  if (btnActualizar) {
    btnActualizar.addEventListener("click", async () => {
      await cargarPedidos();
    });
  }
}

async function cargarPedidos() {
  try {
    mostrarLoading();
    const pedidos = await apiFetch("/pedidos/cocina/pendientes");
    pedidosGlobal = pedidos.filter(p => p.pedido_estado !== "Listo");
    actualizarDashboard();
    renderPedidos(filtrarPedidos());
  } catch (error) {
    console.error(error);
    contenedorPedidos.innerHTML = `
      <div class="mensaje-error">
        Error al cargar pedidos
      </div>
    `;
  }
}

function mostrarLoading() {
  contenedorPedidos.innerHTML = `
    <div class="loading-container">
      <div class="spinner-custom"></div>
      <div>Cargando pedidos...</div>
    </div>
  `;
}

function filtrarPedidos() {
  const filtroEstado = document.getElementById("filtroEstadoPlatillos");
  if (!filtroEstado) return pedidosGlobal;

  const filtro = filtroEstado.value;
  if (filtro === "todos") return pedidosGlobal;

  return pedidosGlobal.filter((pedido) => {
    if (filtro === "Pendiente" && pedido.pedido_estado === "Pendiente") return true;
    if (filtro === "EnPreparacion" && pedido.pedido_estado === "EnPreparacion") return true;
    if (filtro === "Listo" && pedido.pedido_estado === "Listo") return true;
    return false;
  });
}

function actualizarDashboard() {
  const pendientes = pedidosGlobal.filter(p => p.pedido_estado === "Pendiente").length;
  const preparando = pedidosGlobal.filter(p => p.pedido_estado === "EnPreparacion").length;
  const listos = pedidosGlobal.filter(p => p.pedido_estado === "Listo").length;

  const elPendientes = document.getElementById("ordenesPendientes");
  const elPreparando = document.getElementById("ordenesPreparando");
  const elListos = document.getElementById("ordenesListos");

  if (elPendientes) elPendientes.textContent = pendientes;
  if (elPreparando) elPreparando.textContent = preparando;
  if (elListos) elListos.textContent = listos;
}

function renderPedidos(pedidos) {
  if (!pedidos || pedidos.length === 0) {
    contenedorPedidos.innerHTML = `
      <div class="mensaje-info">
        No hay pedidos pendientes
      </div>
    `;
    return;
  }

  contenedorPedidos.innerHTML = '<div class="pedidos-grid"></div>';
  const grid = contenedorPedidos.firstChild;

  pedidos.forEach(pedido => {
    const card = document.createElement("div");
    card.className = "pedido-card";

    const badgeEstado = obtenerBadgeEstado(pedido.pedido_estado);
    const botonAccion = obtenerBotonAccion(pedido);

    const platillosHTML = pedido.platillos.map(platillo => {
      return `
        <li class="pedido-platillo">
          <span class="pedido-platillo-nombre">${platillo.nombre}</span>
          <span class="pedido-platillo-cantidad">x${platillo.cantidad}</span>
          ${platillo.notas ? `
            <div class="pedido-platillo-nota">${platillo.notas}</div>
          ` : ""}
        </li>
      `;
    }).join("");

    card.innerHTML = `
      <div class="pedido-card-header">
        <span class="pedido-numero">Pedido #${pedido.id_pedido}</span>
        ${badgeEstado}
      </div>
      <div class="pedido-card-body">
        <div class="pedido-info">
          <span class="pedido-mesa">${pedido.mesa}</span>
          <span class="pedido-hora">${formatearFecha(pedido.pedido_fecha_hora)}</span>
        </div>
        <ul class="pedido-platillos">${platillosHTML}</ul>
        <div class="pedido-total">
          <span>Total</span>
          <span>$${Number(pedido.pedido_total).toFixed(2)}</span>
        </div>
        ${botonAccion}
      </div>
    `;

    grid.appendChild(card);
  });

  activarEventosEstado();
}

function obtenerBadgeEstado(estado) {
  if (estado === "Pendiente") return `<span class="estado-badge estado-pendiente">Pendiente</span>`;
  if (estado === "EnPreparacion") return `<span class="estado-badge estado-preparacion">En preparación</span>`;
  if (estado === "Listo") return `<span class="estado-badge estado-listo">Listo</span>`;
  return `<span class="estado-badge">${estado}</span>`;
}

function obtenerBotonAccion(pedido) {
  if (pedido.pedido_estado === "Pendiente") {
    return `
      <button class="btn-accion btn-preparar btn-cambiar-estado"
        data-id="${pedido.id_pedido}"
        data-estado="EnPreparacion"
        data-estado-actual="${pedido.pedido_estado}">
        <i class="fa-solid fa-fire"></i> Iniciar preparación
      </button>
    `;
  }

  if (pedido.pedido_estado === "EnPreparacion") {
    return `
      <button class="btn-accion btn-listo btn-cambiar-estado"
        data-id="${pedido.id_pedido}"
        data-estado="Listo"
        data-estado-actual="${pedido.pedido_estado}">
        <i class="fa-solid fa-check-circle"></i> Marcar como listo
      </button>
    `;
  }

  return `<button class="btn-accion btn-finalizado" disabled>Finalizado</button>`;
}

function activarEventosEstado() {
  const botones = document.querySelectorAll(".btn-cambiar-estado");
  botones.forEach(boton => {
    boton.addEventListener("click", async () => {
      const id_pedido = boton.dataset.id;
      const estado = boton.dataset.estado;
      const estadoActual = boton.dataset.estadoActual;
      await cambiarEstado(id_pedido, estado, estadoActual);
    });
  });
}

async function cambiarEstado(id_pedido, estado, estadoActual) {
  try {
    if (estado === "EnPreparacion" && estadoActual !== "Pendiente") {
      toast("error", "No se puede cambiar el estado");
      return;
    }

    if (estado === "Listo" && estadoActual !== "EnPreparacion") {
      toast("error", "No se puede cambiar el estado");
      return;
    }

    const confirmar = await Swal.fire({
      title: "Confirmar acción",
      text: estado === "EnPreparacion" ? "¿Iniciar preparación del pedido?" : "¿Marcar pedido como listo?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#7a1d1d"
    });

    if (!confirmar.isConfirmed) return;

    await apiFetch(`/pedidos/${id_pedido}/cocina/estado`, {
      method: "PATCH",
      body: JSON.stringify({ estado: estado })
    });

    toast("success", estado === "EnPreparacion" ? "Pedido en preparación" : "Pedido marcado como listo");
    await cargarPedidos();

  } catch (error) {
    console.error(error);
    toast("error", error.message || "Error al cambiar estado");
  }
}

function formatearFecha(fecha) {
  const f = new Date(fecha);
  return f.toLocaleString("es-SV", { dateStyle: "short", timeStyle: "short" });
}

window.mostrarMenu = function(id) {
  document.querySelectorAll(".contenido > div").forEach((section) => {
    if (section.id === "resumen" || section.id === "ordenes") {
      section.style.display = section.id === id ? "block" : "none";
    }
  });
  cerrarMenuMobile();
};

window.toggleMenu = function() {
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("menuBackdrop");
  sidebar.classList.toggle("show");
  backdrop.classList.toggle("show");
};

function cerrarMenuMobile() {
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("menuBackdrop");
  sidebar.classList.remove("show");
  backdrop.classList.remove("show");
}

window.cerrarSesion = function() {
  localStorage.clear();
  window.location.href = "/login.html";
};
