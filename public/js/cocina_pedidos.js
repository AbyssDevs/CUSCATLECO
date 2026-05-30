let pollingInterval = null;

async function verificarSesion() {
  try {
    const res = await fetch("/api/usuario");
    if (!res.ok) throw new Error("Sesión no válida");
    return await res.json();
  } catch {
    return null;
  }
}

function mostrarMenu(seccion) {
  const secciones = ["resumen", "ordenes"];
  secciones.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
  const vista = document.getElementById(seccion);
  if (vista) vista.style.display = "block";

  if (seccion === "ordenes") {
    cargarPedidosCocina();
  }
}

function toggleMenu() {
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("menuBackdrop");
  if (sidebar) sidebar.classList.toggle("active");
  if (backdrop) backdrop.classList.toggle("active");
}

function cerrarSesion() {
  window.location.href = "/logout";
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
    <div class="card" data-id-pedido="${pedido.id_pedido}" onclick="verDetallePedido(${pedido.id_pedido})" style="cursor: pointer;">
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

  container.innerHTML = "<p>Cargando pedidos...</p>";

  try {
    const res = await fetch("/api/pedidos/cocina/pendientes");

    if (res.status === 401) {
      container.innerHTML = "<p>Tu sesión expiró. <a href='/'>Inicia sesión nuevamente</a></p>";
      return;
    }

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
  try {
    const res = await fetch(`/api/pedidos/${idPedido}/cocina/estado`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevoEstado })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Error al cambiar estado");
    }

    await cargarPedidosCocina();
    actualizarResumen();

  } catch (error) {
    console.error("Error cambiando estado:", error);
    alert(error.message);
  }
}

async function actualizarResumen() {
  try {
    const res = await fetch("/api/pedidos/cocina/pendientes");
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
    if (document.getElementById("ordenes")?.style.display !== "none") {
      cargarPedidosCocina();
    }
    actualizarResumen();
  }, 10000);
}

async function cargarUsuarioLogueado() {
  const usuario = await verificarSesion();
  if (usuario) {
    const userNameEl = document.getElementById("userName");
    const userRoleEl = document.getElementById("userRole");
    const bienvenidaEl = document.getElementById("bienvenidaUsuario");
    if (userNameEl) userNameEl.textContent = usuario.nombre || "Usuario";
    if (userRoleEl) userRoleEl.textContent = usuario.rol || "Cocina";
    if (bienvenidaEl) bienvenidaEl.textContent = `Bienvenido, ${usuario.nombre || "usuario"}`;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const sesion = await verificarSesion();
  if (!sesion) {
    document.body.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;">
        <h2>Tu sesión ha expirado</h2>
        <p><a href="/" style="color:#c0392b;font-size:1.2rem;">Inicia sesión nuevamente</a></p>
      </div>
    `;
    return;
  }

  await cargarUsuarioLogueado();
  mostrarMenu("ordenes");
  cargarPedidosCocina();
  actualizarResumen();

  document.querySelectorAll(".nav-btn[data-view]").forEach(btn => {
    btn.addEventListener("click", () => mostrarMenu(btn.dataset.view));
  });

  const btnCerrar = document.getElementById("btn-cerrar-sesion");
  if (btnCerrar) btnCerrar.addEventListener("click", cerrarSesion);

  const btnHamburger = document.getElementById("btn-hamburger");
  if (btnHamburger) btnHamburger.addEventListener("click", toggleMenu);

  const backdrop = document.getElementById("menuBackdrop");
  if (backdrop) backdrop.addEventListener("click", toggleMenu);

  const btnActualizar = document.getElementById("btnActualizarPedidos");
  if (btnActualizar) {
    btnActualizar.addEventListener("click", () => {
      cargarPedidosCocina();
      actualizarResumen();
    });
  }

  iniciarPolling();
});

window.cargarPedidosCocina = cargarPedidosCocina;

async function verDetallePedido(idPedido) {
    try {
        const card = document.querySelector(`.card[data-id-pedido="${idPedido}"]`);
        if (!card) {
            alert("No se encontró el pedido");
            return;
        }

        const numeroPedido = card.querySelector(".pedido-header h3")?.innerText || `Pedido #${idPedido}`;
        const ubicacion = card.querySelector("p:first-of-type")?.innerText || "Mesa desconocida";
        const estado = card.querySelector(".pedido-header span")?.innerText || "Desconocido";
        const hora = card.querySelector("p:nth-of-type(2)")?.innerText || "Hora no disponible";
        
        const items = [];
        card.querySelectorAll("ul li").forEach(li => {
            items.push(li.innerText);
        });
        const platillosHtml = items.map(item => `<li>${item}</li>`).join("");
        
        // EXTRAER TOTAL DEL TEXTO DE LA TARJETA
        let totalTexto = "Precio no disponible";
        const textoCompleto = card.innerText;
        const match = textoCompleto.match(/\$[\d,]+\.\d{2}/);
        if (match) {
            totalTexto = match[0];
        }

        const body = document.getElementById("modalDetalleBody");
        if (!body) return;

        body.innerHTML = `
            <div class="detalle-pedido">
                <p><strong>📋 ${numeroPedido}</strong></p>
                <p><strong>🍽️ Ubicación:</strong> ${ubicacion}</p>
                <p><strong>📌 Estado:</strong> ${estado}</p>
                <p><strong>⏰ Hora:</strong> ${hora}</p>
                <h4>🥘 Platillos:</h4>
                <ul>${platillosHtml}</ul>
                <p><strong>💰 ${totalTexto}</strong></p>
            </div>
        `;
        document.getElementById("modalDetallePedido").style.display = "flex";
    } catch (error) {
        console.error("Error al mostrar detalle:", error);
        alert("No se pudo mostrar el detalle del pedido");
    }
}

function cerrarModalDetalle() {
  document.getElementById("modalDetallePedido").style.display = "none";
}

document.getElementById("modalDetallePedido")?.addEventListener("click", function (e) {
  if (e.target === this) cerrarModalDetalle();
});