async function apiFetch(url, options = {}) {
  if (!url) throw new Error("URL no válida");
  const res = await fetch(`/api${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error en la solicitud");
  return data;
}

const contenedorPedidos = document.getElementById("contenedor-pedidos");

const LS_NOTIF = "cocina_notificaciones";

let pedidosGlobal = [];
let ultimaListaPedidos = [];
let toastsActivos = 0;

document.addEventListener("DOMContentLoaded", () => {
  inyectarEstilosNotificaciones();
  actualizarBadge();
  cargarPedidos(true);
  setupEventListeners();
  setInterval(async () => {
    if (document.visibilityState === "visible") {
      await cargarPedidos(false);
    }
  }, 10000);
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    mostrarNotificacionesAcumuladas();
  }
});

function inyectarEstilosNotificaciones() {
  const estilo = document.createElement("style");
  estilo.textContent = `
    .toast-notification {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 99999;
      background: #1a1a2e;
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.2);
      font-family: 'Roboto', Arial, sans-serif;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 12px;
      transform: translateX(120%);
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: none;
      max-width: 360px;
      border-left: 4px solid #f39c12;
    }
    .toast-notification.show {
      transform: translateX(0);
      pointer-events: auto;
    }
    .toast-notification .toast-icon {
      font-size: 24px;
    }
    .toast-notification .toast-close {
      margin-left: auto;
      background: none;
      border: none;
      color: rgba(255,255,255,0.6);
      cursor: pointer;
      font-size: 18px;
      padding: 0 4px;
      pointer-events: auto;
    }
    .toast-notification .toast-close:hover {
      color: white;
    }
    .badge-notificaciones {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #e74c3c;
      color: white;
      font-size: 12px;
      font-weight: 700;
      min-width: 22px;
      height: 22px;
      border-radius: 11px;
      padding: 0 6px;
      margin-left: 10px;
      vertical-align: middle;
      line-height: 1;
    }
  `;
  document.head.appendChild(estilo);
}

function setupEventListeners() {
  const filtroEstado = document.getElementById("filtroEstadoPlatillos");
  if (filtroEstado) {
    filtroEstado.addEventListener("change", () => {
      renderPedidos(filtrarPedidos());
    });
  }

  window.addEventListener("storage", (e) => {
    if (e.key === LS_NOTIF) {
      actualizarBadge();
    }
  });

  const btnActualizar = document.getElementById("btnActualizarPedidos");
  if (btnActualizar) {
    btnActualizar.addEventListener("click", async () => {
      localStorage.removeItem(LS_NOTIF);
      actualizarBadge();
      await cargarPedidos(true);
    });
  }
}

async function cargarPedidos(esInicial = false) {
  try {
    if (!esInicial) mostrarLoading();
    const pedidos = await apiFetch("/pedidos/cocina/pendientes");
    const filtrados = pedidos.filter(p => p.pedido_estado !== "Listo");

    if (!esInicial) {
      const nuevos = compararListas(filtrados, ultimaListaPedidos);
      nuevos.forEach(pedido => {
        acumularNotificacion(pedido);
      });
    }

    ultimaListaPedidos = [...filtrados];
    pedidosGlobal = filtrados;
    actualizarDashboard();
    renderPedidos(filtrarPedidos());
  } catch (error) {
    console.error(error);
    contenedorPedidos.innerHTML = `
      <div class="mensaje-error">Error al cargar pedidos</div>
    `;
  }
}

function compararListas(nuevaLista, viejaLista) {
  const idsViejos = new Set(viejaLista.map(p => p.id_pedido));
  return nuevaLista.filter(p => !idsViejos.has(p.id_pedido));
}

function acumularNotificacion(pedido) {
  const mesa = pedido.mesa || pedido.mesa_numero || "N/A";
  const mensaje = `🍽️ Nuevo pedido #${pedido.id_pedido} - Mesa ${mesa}`;

  if (document.visibilityState === "visible") {
    mostrarToast(mensaje);
  } else {
    const lista = JSON.parse(localStorage.getItem(LS_NOTIF) || "[]");
    lista.push(mensaje);
    localStorage.setItem(LS_NOTIF, JSON.stringify(lista));
  }

  actualizarBadge();
}

function mostrarNotificacionesAcumuladas() {
  const lista = JSON.parse(localStorage.getItem(LS_NOTIF) || "[]");
  if (lista.length === 0) return;

  const resumen = lista.length === 1
    ? lista[0]
    : `🔔 ${lista.length} nuevos pedidos llegaron mientras no estabas`;

  localStorage.removeItem(LS_NOTIF);
  actualizarBadge();
  mostrarToast(resumen, 6000);
}

function mostrarToast(mensaje, duracion = 5000) {
  const toast = document.createElement("div");
  toast.className = "toast-notification";
  toast.innerHTML = `
    <span class="toast-icon">🍽️</span>
    <span class="toast-text">${mensaje.replace("🍽️ ", "")}</span>
    <button class="toast-close">&times;</button>
  `;

  document.body.appendChild(toast);
  toastsActivos++;

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  toast.querySelector(".toast-close").addEventListener("click", () => {
    cerrarToast(toast);
  });

  setTimeout(() => {
    cerrarToast(toast);
  }, duracion);
}

function cerrarToast(toast) {
  toast.classList.remove("show");
  setTimeout(() => {
    if (toast.parentNode) toast.remove();
    toastsActivos--;
  }, 400);
}

function badgeCount() {
  const lista = JSON.parse(localStorage.getItem(LS_NOTIF) || "[]");
  return lista.length;
}

function actualizarBadge() {
  const count = badgeCount();
  let badge = document.getElementById("badge-notificaciones");
  if (count > 0) {
    if (!badge) {
      badge = document.createElement("span");
      badge.id = "badge-notificaciones";
      badge.className = "badge-notificaciones";
      const titulo = document.querySelector("#ordenes h1");
      if (titulo) titulo.appendChild(badge);
    }
    badge.textContent = count;
  } else {
    if (badge) badge.remove();
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
      <div class="mensaje-info">No hay pedidos pendientes</div>
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
      if (!id_pedido) return;
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
    await cargarPedidos(true);

  } catch (error) {
    console.error(error);
    toast("error", "Error al cambiar estado del pedido");
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
  sessionStorage.clear();
  window.location.href = "/logout";
};
