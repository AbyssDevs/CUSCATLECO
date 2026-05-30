// ============================================
// CUS-74: Ver pedidos pendientes en cocina
// ============================================

let pollingInterval = null;

function obtenerToken() {
  return localStorage.getItem("token");
}

function mostrarMenu(seccion) {
  const secciones = ["resumen", "ordenes"];
  secciones.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
  const vista = document.getElementById(seccion);
  if (vista) vista.style.display = "block";
}

function toggleMenu() {
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("menuBackdrop");
  if (sidebar) sidebar.classList.toggle("active");
  if (backdrop) backdrop.classList.toggle("active");
}

function cerrarSesion() {
  localStorage.clear();
  window.location.href = "/";
}

function obtenerUbicacionPedido(pedido) {
  if (pedido.pedido_tipo === "Llevar" || !pedido.mesa_numero) return "Para llevar";
  return `Mesa ${pedido.mesa_numero}`;
}

function formatearHoraEnvio(fechaHora) {
  const fecha = new Date(fechaHora);
  if (isNaN(fecha.getTime())) return "Sin hora";
  return fecha.toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" });
}

function crearTarjetaPedido(pedido) {
  const estado = pedido.pedido_estado;
  const esPendiente = estado === "Pendiente";
  const esEnPreparacion = estado === "EnPreparacion";
  
  const platillosHtml = (pedido.platillos || []).map(p => {
    const notas = p.notas ? ` - ${p.notas}` : "";
    return `<li>${p.cantidad}x ${p.nombre}${notas}</li>`;
  }).join("") || "<li>Sin platillos</li>";

  let botonHtml = "";
  if (esPendiente) {
    botonHtml = `<button class="btn-iniciar-preparacion" data-id="${pedido.id_pedido}">Iniciar preparación</button>`;
  } else if (esEnPreparacion) {
    botonHtml = `<button class="btn-marcar-preparado" data-id="${pedido.id_pedido}">✓ Marcar como Listo</button>`;
  }

  return `
    <div class="card" data-id-pedido="${pedido.id_pedido}">
      <div class="pedido-header">
        <h3>Pedido #${pedido.id_pedido}</h3>
        <span class="${estado === "EnPreparacion" ? "preparando" : "pendiente"}">${estado}</span>
      </div>
      <p>${obtenerUbicacionPedido(pedido)}</p>
      <p><i class="fa-regular fa-clock"></i> ${formatearHoraEnvio(pedido.pedido_fecha_hora)}</p>
      <ul>${platillosHtml}</ul>
      <div class="botones-accion">${botonHtml}</div>
    </div>
  `;
}

async function cargarPedidosCocina() {
  const container = document.getElementById("listaPedidosCocina");
  if (!container) return;

  const token = obtenerToken();
  if (!token) {
    container.innerHTML = "<p>No hay sesión activa. Inicia sesión nuevamente.</p>";
    return;
  }

  container.innerHTML = "<p>Cargando pedidos...</p>";

  try {
    const res = await fetch("/api/pedidos/cocina/pendientes", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${res.statusText}`);
    }
    
    const pedidos = await res.json();
    
    if (!pedidos.length) {
      container.innerHTML = "<p>No hay pedidos pendientes</p>";
      return;
    }
    
    pedidos.sort((a, b) => new Date(a.pedido_fecha_hora) - new Date(b.pedido_fecha_hora));
    container.innerHTML = pedidos.map(p => crearTarjetaPedido(p)).join("");
    
    // Asignar eventos a los botones
    document.querySelectorAll(".btn-iniciar-preparacion").forEach(btn => {
      btn.addEventListener("click", () => cambiarEstadoPedido(btn.dataset.id, "EnPreparacion"));
    });
    document.querySelectorAll(".btn-marcar-preparado").forEach(btn => {
      btn.addEventListener("click", () => cambiarEstadoPedido(btn.dataset.id, "Listo"));
    });
    
  } catch (error) {
    console.error("Error cargando pedidos:", error);
    container.innerHTML = "<p>Error al cargar pedidos. Intente nuevamente.</p>";
  }
}

async function cambiarEstadoPedido(idPedido, nuevoEstado) {
  const token = obtenerToken();
  if (!token) {
    alert("No hay sesión activa");
    return;
  }

  try {
    const res = await fetch(`/api/pedidos/${idPedido}/cocina/estado`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ estado: nuevoEstado })
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Error al cambiar estado");
    }
    
    // Recargar la lista después del cambio
    await cargarPedidosCocina();
    actualizarResumen();
    
  } catch (error) {
    console.error("Error cambiando estado:", error);
    alert(error.message);
  }
}

async function actualizarResumen() {
  const token = obtenerToken();
  if (!token) return;

  try {
    const res = await fetch("/api/pedidos/cocina/pendientes", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Error al obtener resumen");
    
    const pedidos = await res.json();
    const enPreparacion = pedidos.filter(p => p.pedido_estado === "EnPreparacion").length;
    const listos = pedidos.filter(p => p.pedido_estado === "Listo").length;
    
    const preparandoEl = document.getElementById("ordenesPreparando");
    const listosEl = document.getElementById("ordenesListos");
    
    if (preparandoEl) preparandoEl.textContent = enPreparacion;
    if (listosEl) listosEl.textContent = listos;
    
  } catch (error) {
    console.error("Error actualizando resumen:", error);
  }
}

function iniciarPolling() {
  if (pollingInterval) clearInterval(pollingInterval);
  pollingInterval = setInterval(() => {
    const token = obtenerToken();
    if (!token) {
      clearInterval(pollingInterval);
      pollingInterval = null;
      return;
    }
    if (document.getElementById("ordenes")?.style.display !== "none") {
      cargarPedidosCocina();
    }
    actualizarResumen();
  }, 10000);
}

function cargarUsuarioLogueado() {
  const userName = localStorage.getItem("userName");
  const userRole = localStorage.getItem("userRole");
  if (userName) document.getElementById("userName").textContent = userName;
  if (userRole) document.getElementById("userRole").textContent = userRole;
}

// Inicializar cuando la página cargue
document.addEventListener("DOMContentLoaded", () => {
  cargarUsuarioLogueado();
  mostrarMenu("ordenes");
  cargarPedidosCocina();
  actualizarResumen();

  // Navegación sidebar sin onclick inline
  document.querySelectorAll(".nav-btn[data-view]").forEach(btn => {
    btn.addEventListener("click", () => mostrarMenu(btn.dataset.view));
  });

  // Cerrar sesión
  const btnCerrar = document.getElementById("btn-cerrar-sesion");
  if (btnCerrar) btnCerrar.addEventListener("click", cerrarSesion);

  // Hamburger menu móvil
  const btnHamburger = document.getElementById("btn-hamburger");
  if (btnHamburger) btnHamburger.addEventListener("click", toggleMenu);

  // Backdrop
  const backdrop = document.getElementById("menuBackdrop");
  if (backdrop) backdrop.addEventListener("click", toggleMenu);

  // Botón actualizar
  const btnActualizar = document.getElementById("btnActualizarPedidos");
  if (btnActualizar) {
    btnActualizar.addEventListener("click", () => {
      cargarPedidosCocina();
      actualizarResumen();
    });
  }

  iniciarPolling();
});