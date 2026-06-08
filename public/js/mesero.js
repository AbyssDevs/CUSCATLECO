document.addEventListener("DOMContentLoaded", () => {
  // --- Configuración Global ---
  // --- 1. SECCIÓN DE VARIABLES GLOBALES ---
  const esVistaCajero = window.location.pathname.includes("cajero");

  let platillosDisponibles = [];
  let mesasPedido = [];
  let pedidoActivo = null;
  let pedidoEnviado = false;

  let notificacionesMesero = [];

  // CUS-268
  let pollingNotificaciones = null;
  // Cambia esto en la línea 15 temporalmente para probar:
  let ultimaConsulta = new Date(Date.now() - 1440 * 60000).toISOString();
  // Iniciar la búsqueda de notificaciones automáticamente al cargar la página
  iniciarPollingNotificaciones();

// --- AQUÍ ES DONDE DEBES PEGAR LA FUNCIÓN ---
// Pégala justo aquí, entre las variables globales y tus funciones de renderizado
async function iniciarPollingNotificaciones() {
    if (pollingNotificaciones) clearInterval(pollingNotificaciones);

    pollingNotificaciones = setInterval(async () => {
        try {
            const response = await fetch(`/api/notificaciones/nuevas?desde=${ultimaConsulta}`);
            
            if (!response.ok) throw new Error("Error en el polling");

            const nuevasNotificaciones = await response.json();

            if (nuevasNotificaciones && nuevasNotificaciones.length > 0) {
                ultimaConsulta = new Date().toISOString();
                notificacionesMesero = [...nuevasNotificaciones, ...notificacionesMesero];
                actualizarInterfazNotificaciones();
                mostrarToastNotificacion(nuevasNotificaciones[0].mensaje);
            }
        } catch (error) {
            console.error("Error en polling de notificaciones:", error);
        }
    }, 10000); 
}

// --- 2. LUEGO SIGUEN TUS FUNCIONES (renderNotificaciones, etc.) ---
function renderNotificaciones(notificaciones = []) {
    // ... tu código ...
}
  // ============================================
  // CUS-130: Deshabilitar botones si pedido ya enviado a cocina
  // ============================================
  function deshabilitarBotonesPlatillos() {
    pedidoEnviado = true;

    const btnsEliminar = document.querySelectorAll(".btn-eliminar-fila");
    btnsEliminar.forEach(btn => {
      
      btn.disabled = true;
      btn.title = "Pedido ya enviado a cocina";
      btn.style.opacity = "0.6";
      btn.style.cursor = "not-allowed";
    });

    const inputs = document.querySelectorAll(".platillo-cantidad");
    inputs.forEach(input => {
      input.disabled = true;
      input.style.backgroundColor = "#f0f0f0";
    });

    actualizarEstadoBotonesMenu();
  }

  // ============================================
  // CUS-130: Habilitar botones para nuevo pedido
  // ============================================
  function habilitarBotonesPlatillos() {
    pedidoEnviado = false;

    const btnsEliminar = document.querySelectorAll(".btn-eliminar-fila");
    btnsEliminar.forEach(btn => {
      
      btn.disabled = false;
      btn.title = "";
      btn.style.opacity = "1";
      btn.style.cursor = "pointer";
    });

    const inputs = document.querySelectorAll(".platillo-cantidad");
    inputs.forEach(input => {
      input.disabled = false;
      input.style.backgroundColor = "";
    });

    actualizarEstadoBotonesMenu();
  }
  const filtrosMesasPedido = {
    busqueda: "",
    capacidad: "",
    estado: "",
    ubicacion: ""
  };
  const prioridadEstadosMesa = {
    Libre: 1,
    Ocupada: 2,
    Reservada: 3,
    Limpieza: 4,
    Mantenimiento: 5
  };

  init();

async function init() {
    setupEventListeners();
    await cargarPlatillos();
    await cargarMesasPedido();

    renderEstadoPedidoVacio();
    renderNotificaciones(notificacionesMesero); // Render inicial con estado actual

    // --- CUS-268: Inicio del Polling ---
    setInterval(async () => {
        // Aquí llamarás a tu función que consulta al servidor (ej. consultarNuevasNotificaciones())
        // Por ahora, llamamos a la prueba para mantener la reactividad del CUS-266/267
        recibirNotificacionPrueba(); 
        console.log("Polling ejecutado: Notificaciones actualizadas.");
    }, 10000); 

    // Mantenemos tu prueba inicial de los 3 segundos
    setTimeout(() => {
        recibirNotificacionPrueba();
    }, 3000);

    syncPedidoActualGlobal();
    actualizarEstadoBotonesMenu();
    aplicarTipoPedido("salon");

    if (vistaPedidosPendientesActiva()) {
        cargarMisPedidos();
    }
}

async function cargarPlatillos() {
    try {
        const res = await fetch("/api/platillos");
        if (!res.ok) throw new Error("Error al cargar platillos");
        platillosDisponibles = await res.json();
    } catch (error) {
        console.error(error);
        toast("error", "No se pudieron cargar los platillos");
    }
}

  async function cargarMesasPedido() {
    asegurarFiltrosMesasPedido();

    const loading = document.getElementById("mesasPedidoLoading");
    const empty = document.getElementById("mesasPedidoEmpty");
    const list = document.getElementById("mesas-pedido-list");

    if (loading) loading.style.display = "block";
    if (empty) empty.textContent = "";
    if (list) list.innerHTML = "";

    try {
      const res = await fetch("/api/mesas");
      if (!res.ok) throw new Error("Error al cargar mesas");
      mesasPedido = await res.json();
      renderMesasPedido();
    } catch (error) {
      console.error(error);
      if (empty) empty.textContent = "No se pudieron cargar las mesas.";
      toast("error", "No se pudieron cargar las mesas");
    } finally {
      if (loading) loading.style.display = "none";
    }
  }

  window.cargarMesasPedido = cargarMesasPedido;

  function normalizarEstadoMesa(estado) {
    if (!estado) return "Libre";
    if (estado.toString().trim().toLowerCase() === "disponible") return "Libre";
    return estado.toString().trim();
  }

  function mesaDisponible(mesa) {
    return normalizarEstadoMesa(mesa.mesa_estado ?? mesa.estado) === "Libre";
  }

  function mesaPedidoViewModel(mesa) {
    return {
      id_mesa: mesa.id_mesa ?? mesa.id ?? null,
      mesa_numero: mesa.mesa_numero ?? mesa.numero ?? "--",
      mesa_capacidad: mesa.mesa_capacidad ?? mesa.capacidad ?? "--",
      mesa_ubicacion: mesa.mesa_ubicacion ?? mesa.ubicacion ?? "Area General",
      mesa_estado: normalizarEstadoMesa(mesa.mesa_estado ?? mesa.estado ?? "Disponible"),
      raw: mesa
    };
  }

  function asegurarFiltrosMesasPedido() {
    const mesaContainer = document.getElementById("mesa-container");
    if (!mesaContainer || document.getElementById("mesaPedidoSearchInput")) return;

    const filtros = document.createElement("div");
    filtros.className = "menu-page-header mesas-filtros";
    filtros.innerHTML = `
      <input id="mesaPedidoSearchInput" type="text" placeholder="Buscar mesa..." autocomplete="off">
      <select id="mesaPedidoCapacidadFilter">
        <option value="">Todas las capacidades</option>
      </select>
      <select id="mesaPedidoEstadoFilter">
        <option value="">Todos los estados</option>
      </select>
      <select id="mesaPedidoUbicacionFilter">
        <option value="">Todas las ubicaciones</option>
      </select>
    `;

    const loading = document.getElementById("mesasPedidoLoading");
    mesaContainer.insertBefore(filtros, loading);

    document.getElementById("mesaPedidoSearchInput").addEventListener("input", (event) => {
      filtrosMesasPedido.busqueda = event.target.value;
      renderMesasPedido();
    });

    document.getElementById("mesaPedidoCapacidadFilter").addEventListener("change", (event) => {
      filtrosMesasPedido.capacidad = event.target.value;
      renderMesasPedido();
    });

    document.getElementById("mesaPedidoEstadoFilter").addEventListener("change", (event) => {
      filtrosMesasPedido.estado = event.target.value;
      renderMesasPedido();
    });

    document.getElementById("mesaPedidoUbicacionFilter").addEventListener("change", (event) => {
      filtrosMesasPedido.ubicacion = event.target.value;
      renderMesasPedido();
    });
  }

  function actualizarOpcionesFiltrosMesasPedido() {
    const capacidadSelect = document.getElementById("mesaPedidoCapacidadFilter");
    const estadoSelect = document.getElementById("mesaPedidoEstadoFilter");
    const ubicacionSelect = document.getElementById("mesaPedidoUbicacionFilter");
    if (!capacidadSelect || !estadoSelect || !ubicacionSelect) return;

    const mesas = mesasPedido.map(mesaPedidoViewModel);
    const capacidades = [...new Set(mesas.map((mesa) => String(mesa.mesa_capacidad)).filter(Boolean))]
      .sort((a, b) => Number(a) - Number(b));
    const estados = [...new Set(mesas.map((mesa) => mesa.mesa_estado).filter(Boolean))]
      .sort((a, b) => (prioridadEstadosMesa[a] ?? 99) - (prioridadEstadosMesa[b] ?? 99));
    const ubicaciones = [...new Set(mesas.map((mesa) => mesa.mesa_ubicacion).filter(Boolean))]
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

    capacidadSelect.value = filtrosMesasPedido.capacidad;
    estadoSelect.value = filtrosMesasPedido.estado;
    ubicacionSelect.value = filtrosMesasPedido.ubicacion;
  }

  function obtenerMesasPedidoFiltradas() {
    const busqueda = filtrosMesasPedido.busqueda.trim().toLowerCase();

    return mesasPedido
      .map(mesaPedidoViewModel)
      .filter((mesa) => {
        const textoMesa = [
          mesa.mesa_numero,
          mesa.mesa_capacidad,
          mesa.mesa_estado,
          mesa.mesa_ubicacion
        ].join(" ").toLowerCase();

        return (!busqueda || textoMesa.includes(busqueda))
          && (!filtrosMesasPedido.capacidad || String(mesa.mesa_capacidad) === filtrosMesasPedido.capacidad)
          && (!filtrosMesasPedido.estado || mesa.mesa_estado === filtrosMesasPedido.estado)
          && (!filtrosMesasPedido.ubicacion || mesa.mesa_ubicacion === filtrosMesasPedido.ubicacion);
      })
      .sort((a, b) => {
        const prioridadA = prioridadEstadosMesa[a.mesa_estado] ?? 99;
        const prioridadB = prioridadEstadosMesa[b.mesa_estado] ?? 99;
        if (prioridadA !== prioridadB) return prioridadA - prioridadB;
        return Number(a.mesa_numero) - Number(b.mesa_numero);
      });
  }

  function renderMesasPedido() {
    const list = document.getElementById("mesas-pedido-list");
    const empty = document.getElementById("mesasPedidoEmpty");
    if (!list) return;

    list.innerHTML = "";
    if (empty) empty.textContent = "";

    if (!Array.isArray(mesasPedido) || mesasPedido.length === 0) {
      if (empty) empty.textContent = "No hay mesas registradas.";
      return;
    }

    actualizarOpcionesFiltrosMesasPedido();

    const mesasFiltradas = obtenerMesasPedidoFiltradas();
    if (mesasFiltradas.length === 0) {
      if (empty) empty.textContent = "No hay mesas que coincidan con los filtros.";
      return;
    }

    mesasFiltradas
      .forEach((mesa) => {
        const estado = mesa.mesa_estado;
        const disponible = estado === "Libre";
        const card = document.createElement("div");
        card.className = "mesa-pedido-card";
        card.innerHTML = `
          <div>
            <h4>Mesa ${mesa.mesa_numero ?? "--"}</h4>
            <p>${mesa.mesa_capacidad ?? "--"} personas</p>
            <p>${mesa.mesa_ubicacion || "Area General"}</p>
            <span class="mesa-pedido-status ${estadoClassPedido(estado)}">${estado}</span>
          </div>
          <button type="button" class="btn-elegir-mesa" ${disponible ? "" : "disabled"}>
            <i class="fa-solid fa-chair"></i> Elegir mesa
          </button>
        `;

        const boton = card.querySelector(".btn-elegir-mesa");
        boton.addEventListener("click", () => confirmarInicioPedido(mesa.raw));
        list.appendChild(card);
      });
  }

  function estadoClassPedido(estado) {
    const normalizado = normalizarEstadoMesa(estado).toLowerCase();
    if (normalizado === "libre") return "status-disponible";
    return `status-${normalizado.replace(/\s+/g, "-")}`;
  }

  async function confirmarInicioPedido(mesa) {
    const confirmado = await confirmarInicioMesa(mesa);
    if (!confirmado) return;

    pedidoActivo = {
      id_mesa: mesa.id_mesa,
      mesa_numero: mesa.mesa_numero,
      mesa_ubicacion: mesa.mesa_ubicacion,
      pedido_tipo: "Salon",
      pedido_estado: "Pendiente"
    };

    mostrarFormularioPedido();
    toast("success", "Mesa seleccionada");
  }

  async function confirmarInicioMesa(mesa) {
    if (typeof Swal === "undefined") {
      return confirm("Desea iniciar pedido?");
    }

    const result = await Swal.fire({
      title: "Desea iniciar pedido?",
      text: `Mesa ${mesa.mesa_numero}`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Iniciar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#7a1d1d"
    });

    return result.isConfirmed;
  }

  function mostrarFormularioPedido() {
    const formCard = document.getElementById("pedido-form-card");
    const mesaContainer = document.getElementById("mesa-container");
    const menuPanel = document.querySelector(".pedido-menu-panel");
    const info = document.getElementById("pedido-activo-info");

    if (formCard) formCard.style.display = "block";
    if (menuPanel) menuPanel.style.display = "block";
    if (mesaContainer) mesaContainer.style.display = "none";
    if (info && pedidoActivo) {
      info.style.display = "flex";
      info.innerHTML = `
        <span><strong>${pedidoActivo.pedido_numero || (pedidoActivo.id_pedido ? `Pedido #${pedidoActivo.id_pedido}` : "Nuevo Pedido")}</strong></span>
        <span>Estado: ${pedidoActivo.pedido_estado || "Pendiente"}</span>
        <span>Mesa ${pedidoActivo.mesa_numero}</span>
      `;
    }
  }

  function actualizarBloqueoTipoPedido() {
    const algunSeleccionado = document.querySelectorAll(".platillo-row").length > 0;

    const typeBtns = document.querySelectorAll(".pedido-type-btn");
    typeBtns.forEach((btn) => {
      if (algunSeleccionado) {
        btn.classList.add("disabled-btn");
        btn.style.pointerEvents = "none";
        btn.style.opacity = "0.6";
      } else {
        btn.classList.remove("disabled-btn");
        btn.style.pointerEvents = "auto";
        btn.style.opacity = "1";
      }
    });
  }

  function aplicarTipoPedido(type) {
    const mesaContainer = document.getElementById("mesa-container");
    const formCard = document.getElementById("pedido-form-card");
    const menuPanel = document.querySelector(".pedido-menu-panel");
    const info = document.getElementById("pedido-activo-info");

    
    if (type === "llevar" && !window.pedidoEditandoId) {
      pedidoActivo = null;
    }

    if (type === "llevar") {
      if (mesaContainer) mesaContainer.style.display = "none";
      if (formCard) formCard.style.display = "block";
      if (menuPanel) menuPanel.style.display = "block";
      if (info) {
        if (pedidoActivo) {
          mostrarFormularioPedido(); 
        } else {
          info.style.display = "none";
          info.innerHTML = "";
        }
      }
      return;
    }

    if (mesaContainer) mesaContainer.style.display = "block";
    if (formCard) formCard.style.display = pedidoActivo ? "block" : "none";
    if (menuPanel) menuPanel.style.display = pedidoActivo ? "block" : "none";
    cargarMesasPedido();
    if (pedidoActivo) {
      mostrarFormularioPedido();
    }
  }

  function platilloDisponible(platillo) {
    return platillo?.platillo_disponible === true || platillo?.platillo_disponible === 1 || platillo?.platillo_disponible === "1";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatPrice(value) {
    return `$${(Number(value) || 0).toFixed(2)}`;
  }

  function obtenerGridMisPedidos() {
    return document.getElementById("gridPedidosActivos") || null;
  }

  function vistaPedidosPendientesActiva() {
    const view = document.getElementById("pedidos-pendientes");
    return view && view.style.display !== "none";
  }

  function estadoClasePedido(estado) {

    const e = (estado || "").toLowerCase();

    if (e === "enpreparacion") return "preparando";

    if (e === "listo") return "completado";

    if (e === "pendiente") return "pendiente";

    return "pendiente";
}

  function estadoTextoPedido(estado) {
    if (estado === "EnPreparacion") return "EnPreparacion";
    if (estado === "Listo") return "Listo";
    return "Pendiente";
  }

  function obtenerNombreMesaPedido(pedido) {
    const tipo = (pedido.pedido_tipo || pedido.tipo || "").toString().toLowerCase();
    const mesa = pedido.mesa ?? pedido.mesa_numero ?? pedido.numero_mesa;

    if (tipo === "llevar" || mesa === "Para llevar" || mesa == null || mesa === "") {
      return "Para llevar";
    }

    return `Mesa ${mesa}`;
  }

  function obtenerPlatillosPedido(pedido) {
    return pedido.platillos || pedido.items || pedido.detalles || [];
  }

  function obtenerNombrePlatilloPedido(item) {
    return item.nombre || item.platillo_nombre || item.nombre_platillo || "Platillo";
  }

  function obtenerCantidadPlatilloPedido(item) {
    return item.cantidad || item.detalle_pedido_cantidad || 1;
  }

  function calcularTiempo(fecha) {
    const creada = new Date(fecha);
    if (Number.isNaN(creada.getTime())) return "";

    const minutos = Math.max(0, Math.floor((Date.now() - creada.getTime()) / 60000));
    if (minutos < 60) return `Hace ${minutos} minutos`;

    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `Hace ${horas} horas`;

    const dias = Math.floor(horas / 24);
    return `Hace ${dias} dias`;
  }

  function obtenerClaseEstadoPedido(estado) {
    if (estado === "EnPreparacion") return "estado-preparando";
    if (estado === "Listo") return "estado-completado";
    return `estado-${String(estado || "Pendiente").toLowerCase()}`;
}

function renderNotificaciones(notificaciones = []) {
    const container = document.getElementById("notificacionesList");
    if (!container) return;

    // 1. Filtrar solo los últimos 30 minutos (CUS-272)
    const hace30Minutos = new Date(Date.now() - 30 * 60000);
    const recientes = notificaciones.filter(n => new Date(n.fecha) >= hace30Minutos);

    if (recientes.length === 0) {
        container.innerHTML = `<p class="empty">No hay notificaciones recientes</p>`;
        return;
    }

    // 2. Renderizar con estados y clic para ir al detalle (CUS-270)
    container.innerHTML = recientes.map(n => {
        const fechaStr = new Date(n.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        return `
            <div class="notificacion-item ${n.leida ? 'leida' : 'no-leida'}" 
                 onclick="procesarClickNotificacion('${n.id_pedido || ''}')"
                 style="cursor: pointer;">
                <div class="notif-body">
                    <p>${n.mensaje}</p>
                    <small>${fechaStr}</small>
                </div>
                ${!n.leida ? '<span class="badge-nuevo">●</span>' : ''}
            </div>
        `;
    }).join("");
}

function mostrarToastNotificacion(mensaje) {

    if (typeof toast === "function") {

        toast("info", mensaje);
        return;
    }

    if (typeof Swal !== "undefined") {

        Swal.fire({
            toast: true,
            position: "top-end",
            icon: "info",
            title: mensaje,
            showConfirmButton: false,
            timer: 4000,
            timerProgressBar: true
        });
    }
}

// Ahora la función recibe el mensaje real del servidor
function recibirNotificacion(mensajeRecibido) {

    const notificacion = {
        id: Date.now(),
        mensaje: mensajeRecibido, // Usamos el mensaje dinámico
        fecha: new Date(),
        leida: false
    };

    notificacionesMesero.unshift(notificacion);

    renderNotificaciones(notificacionesMesero);

    mostrarToastNotificacion(notificacion.mensaje);
}


  // ==================================================================
  // MIS PEDIDOS ACTIVOS — Module
  // ==================================================================
  const PEDIDOS_POR_PAGINA = 6;
  let misPedidosData = [];
  let misPedidosPagina = 1;
  let misPedidosCargando = false;

  // --- Status helpers ------------------------------------------------
  function obtenerStatusBadgeClass(estado) {
    if (estado === "EnPreparacion") return "status-enpreparacion";
    if (estado === "Listo") return "status-listo";
    return "status-pendiente";
  }

  function obtenerStatusTexto(estado) {

    const e = (estado || "").toLowerCase();

    if (e === "enpreparacion") {
        return "En Preparación";
    }

    if (e === "listo") {
        return "Listo";
    }

    if (e === "pendiente") {
        return "Pendiente";
    }

    return estado || "Pendiente";
}

  // --- Mesa helper ---------------------------------------------------
  function obtenerTextoMesa(pedido) {

    const tipo = (pedido.pedido_tipo || "").toLowerCase();

    if (tipo === "llevar") {
        return "Para llevar";
    }

    if (!pedido.mesa_numero) {
        return "Sin mesa";
    }

    return `Mesa ${pedido.mesa_numero}`;
}

  // --- Hora de inicio ------------------------------------------------
  function formatHoraInicio(fecha) {
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return "--:--";
    return d.toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit", hour12: true });
  }

  // --- UI state toggles ----------------------------------------------
  function toggleMisPedidosLoading(show) {
    const el = document.getElementById("misPedidosLoading");
    if (el) el.style.display = show ? "flex" : "none";
  }

  function toggleMisPedidosEmpty(show) {
    const el = document.getElementById("misPedidosEmpty");
    if (el) el.style.display = show ? "flex" : "none";
  }

  function actualizarContadorPedidos(total) {
    const el = document.getElementById("pedidosCount");
    if (!el) return;
    if (total > 0) {
      el.textContent = `${total} pedido${total !== 1 ? "s" : ""}`;
      el.style.display = "";
    } else {
      el.style.display = "none";
    }
  }

  // --- Render single card --------------------------------------------
  function crearCardPedido(pedido) {

    const estado = (pedido.pedido_estado || "Pendiente").trim();

    const esPendiente =
        estado.toLowerCase() === "pendiente";

    const esListo =
        estado.toLowerCase() === "listo";

    const esPreparacion =
        estado.toLowerCase() === "enpreparacion";

    const esLlevar =
        (pedido.pedido_tipo || "").toLowerCase() === "llevar";

    const mesaTexto = obtenerTextoMesa(pedido);

    const card = document.createElement("div");
    card.className = "pedido-activo-card";
    card.dataset.estado = estado;
    card.dataset.idPedido = pedido.id_pedido;

    // --- Meta badges ---
    let metaHtml = `
      <span class="pedido-meta-item">
        <i class="fa-solid fa-chair"></i> ${escapeHtml(mesaTexto)}
      </span>
      <span class="pedido-meta-item">
        <i class="fa-solid fa-clock"></i> ${escapeHtml(formatHoraInicio(pedido.pedido_fecha_hora))}
      </span>
    `;

    if (esLlevar) {
      metaHtml += `
        <span class="pedido-meta-item pedido-badge-llevar">
          <i class="fa-solid fa-bag-shopping"></i> Para Llevar
        </span>
      `;
    } else {
      metaHtml += `
        <span class="pedido-meta-item">
          <i class="fa-solid fa-utensils"></i> En Salón
        </span>
      `;
    }

    // --- Actions based on estado ---
    let actionsHtml = "";
    let readonlyHtml = "";

    if (esPendiente) {

    actionsHtml = `
<div class="pedido-card-actions">

  <button
      type="button"
      class="btn-editar-pedido"
      data-action="editar"
      data-id="${pedido.id_pedido}">
      <i class="fa-solid fa-pen-to-square"></i>
      Editar Pedido
  </button>

  <button
    type="button"
    class="btn-cancelar-pedido"
    data-action="cancelar"
    data-id="${pedido.id_pedido}"
    data-estado="${estado}"
    data-mesa="${pedido.mesa_numero || ""}"
    data-tipo="${pedido.pedido_tipo || ""}">
    <i class="fa-solid fa-trash"></i>
    Cancelar Pedido
</button>

</div>
`;

}
else if (esListo) {

    actionsHtml = `
        <div class="pedido-card-actions">

          <button type="button" class="btn-entregado" data-action="entregado" data-id="${pedido.id_pedido}">
            <i class="fa-solid fa-check-double"></i> Marcar Entregado
          </button>

          <button type="button" class="btn-ver-detalle" data-action="detalle" data-id="${pedido.id_pedido}">
            <i class="fa-solid fa-eye"></i> Ver Detalle
          </button>

        </div>
    `;

}
else if (esPreparacion) {

    readonlyHtml = `
        <div class="pedido-card-readonly">
          <i class="fa-solid fa-lock"></i>
          Solo lectura — pedido en preparación
        </div>
    `;

    actionsHtml = `
        <div class="pedido-card-actions">

          <button type="button" class="btn-ver-detalle" data-action="detalle" data-id="${pedido.id_pedido}">
            <i class="fa-solid fa-eye"></i> Ver Detalle
          </button>

        </div>
    `;

} else {
      readonlyHtml = `
        <div class="pedido-card-readonly">
          <i class="fa-solid fa-lock"></i> Solo lectura — pedido en preparación
        </div>
      `;
      actionsHtml = `
        <div class="pedido-card-actions">
          <button type="button" class="btn-ver-detalle" data-action="detalle" data-id="${pedido.id_pedido}">
            <i class="fa-solid fa-eye"></i> Ver Detalle
          </button>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="pedido-card-header">
        <span class="pedido-card-numero">
          <i class="fa-solid fa-receipt"></i>
          Pedido #${escapeHtml(String(pedido.id_pedido))}
        </span>
        <span class="pedido-status-badge ${obtenerStatusBadgeClass(estado)}">
          ${escapeHtml(obtenerStatusTexto(estado))}
        </span>
      </div>
      <div class="pedido-card-body">
        <div class="pedido-card-meta">
          ${metaHtml}
        </div>
        <div class="pedido-card-subtotal">
          <span>Subtotal actual</span>
          <span class="subtotal-valor">${formatPrice(pedido.pedido_total || 0)}</span>
        </div>
      </div>
      ${readonlyHtml}
      ${actionsHtml}
    `;

    // Click on card body → placeholder detalle
    card.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      abrirDetallePedido(pedido.id_pedido);
    });

    return card;
  }

  // --- Placeholder detalle -------------------------------------------
  async function abrirDetallePedido(idPedido) {
  try {

    const res = await fetch(`/api/pedidos/${idPedido}`);

    const pedido = await res.json();

    if (!res.ok) {
      throw new Error(pedido.error || "No se pudo cargar el detalle");
    }

    mostrarModalDetallePedido(pedido);

  } catch (error) {
    console.error(error);
    toast("error", error.message);
  }
}

  window.abrirDetallePedido = abrirDetallePedido;

  function mostrarModalDetallePedido(pedido) {
    let modalExistente = document.getElementById("modal-detalle-pedido");

    if (modalExistente) {
        modalExistente.remove();
    }

    const backdrop = document.createElement("div");
    backdrop.className = "detalle-pedido-backdrop";
    backdrop.id = "modal-detalle-pedido";

    // 1. Generar la lista de platillos con soporte para múltiples esquemas de nombres (Corrige undefined y NaN)
    // 2. Generar la lista de platillos con soporte para múltiples esquemas de nombres y notas por defecto
    // 3. Generar la lista de platillos con soporte extendido para propiedades de BD y notas por defecto
    // 1. Generar la lista de platillos mapeando con las propiedades exactas de la Base de Datos
    const itemsHtml = (pedido.platillos || [])
        .map(item => {
            // 1. Nombre real mapeado desde pl.platillo_nombre
            const nombrePlatillo = item.platillo_nombre || "Platillo";
            
            // 2. Cantidad real mapeada desde dp.detalle_pedido_cantidad
            const cantidad = item.detalle_pedido_cantidad || 0;
            
            // 3. Precio unitario real mapeado desde dp.detalle_pedido_precio_unitario
            const precio = item.detalle_pedido_precio_unitario || 0;
            
            // 4. Subtotal real mapeado desde dp.detalle_pedido_subtotal
            const subtotal = item.detalle_pedido_subtotal || (cantidad * precio);

            // 5. Notas reales mapeadas desde dp.detalle_pedido_notas
            const notaReal = item.detalle_pedido_notas;
            const textoNota = (notaReal && notaReal.trim() !== "") 
                ? `📝 <strong>Nota:</strong> ${notaReal}` 
                : "📝 <strong>Nota:</strong> Sin notas u observaciones";

            return `
                <div class="detalle-item">
                    <div class="detalle-item-top">
                        <strong>${cantidad}x ${nombrePlatillo}</strong>
                    </div>
                    <div class="detalle-item-bottom">
                        <span>Precio unitario: $${Number(precio).toFixed(2)}</span>
                        <span>Subtotal: $${Number(subtotal).toFixed(2)}</span>
                    </div>
                    <div class="detalle-nota">
                        ${textoNota}
                    </div>
                </div>
            `;
        })
        .join("");

    // 2. Generar el Historial de Estados (Línea de tiempo)
    const horaBase = new Date(pedido.pedido_fecha_hora);
    const formatearHoraRelativa = (minutosExtra) => {
        const d = new Date(horaBase.getTime() + minutosExtra * 60000);
        return d.toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit", hour12: false });
    };

    const historialHtml = pedido.historial_estados ? 
        pedido.historial_estados.map(h => `
            <div class="historial-linea">
                <span class="historial-hora">${new Date(h.fecha).toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit", hour12: false })}</span> - 
                <span class="historial-texto">${h.descripcion}</span>
            </div>
        `).join("") 
        : `
            <div class="historial-linea"><span class="historial-hora">${formatearHoraRelativa(0)}</span> - Pedido creado</div>
            <div class="historial-linea"><span class="historial-hora">${formatearHoraRelativa(1)}</span> - Enviado a cocina</div>
            ${pedido.pedido_estado === "EnPreparacion" || pedido.pedido_estado === "Listo" || pedido.pedido_estado === "Entregado" ? `
                <div class="historial-linea"><span class="historial-hora">${formatearHoraRelativa(5)}</span> - En preparación</div>
            ` : ""}
            ${pedido.pedido_estado === "Listo" || pedido.pedido_estado === "Entregado" ? `
                <div class="historial-linea"><span class="historial-hora">${formatearHoraRelativa(15)}</span> - Listo para entregar</div>
            ` : ""}
        `;

    // 3. Indicador visual del estado actual (Círculo de color)
    let estadoEmoji = "🟡"; // Pendiente
    if (pedido.pedido_estado === "EnPreparacion") estadoEmoji = "🟠";
    if (pedido.pedido_estado === "Listo" || pedido.pedido_estado === "Entregado" || pedido.pedido_estado === "Facturado") estadoEmoji = "🟢";

    // 4. Calcular total (IVA ya incluido en los precios)
    const totalCalc = Number((pedido.platillos || []).reduce((sum, item) => {
        return sum + (Number(item.detalle_pedido_subtotal) || (Number(item.detalle_pedido_cantidad) || 0) * (Number(item.detalle_pedido_precio_unitario) || 0));
    }, 0)) || 0;

    // 5. Construir la estructura semántica del modal
    backdrop.innerHTML = `
        <div class="detalle-modal">
            <div class="detalle-header">
                <h2>Pedido #${pedido.id_pedido}</h2>
                <button class="detalle-cerrar">
                    [ X ]
                </button>
            </div>

            <div class="detalle-seccion">
                <h3>Información General</h3>
                <div class="detalle-info-general">
                    <div><strong>Mesa:</strong> ${pedido.mesa_numero || "Para llevar"}</div>
                    <div><strong>Tipo:</strong> ${pedido.pedido_tipo || "Salón"}</div>
                    <div><strong>Estado:</strong> ${estadoEmoji} ${pedido.pedido_estado}</div>
                    <div><strong>Hora inicio:</strong> ${new Date(pedido.pedido_fecha_hora).toLocaleDateString()} ${new Date(pedido.pedido_fecha_hora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12:false})}</div>
                </div>
            </div>

            <div class="detalle-seccion">
                <h3>Total a Pagar</h3>
                <div class="detalle-info-general">
                    <div style="font-size: 1.3rem; font-weight: bold; color: #248a4c;"><strong>Total:</strong> $${totalCalc.toFixed(2)}</div>
                </div>
            </div>

            <div class="detalle-seccion">
                <h3>Platillos</h3>
                <div class="detalle-items">
                    ${itemsHtml}
                </div>
            </div>

            <div class="detalle-seccion">
                <h3>Historial de Estados</h3>
                <div class="detalle-historial">
                    ${historialHtml}
                </div>
            </div>

            ${
                (pedido.pedido_estado === "Pendiente" || pedido.pedido_estado === "EnPreparacion" || pedido.factura_id || pedido.pedido_estado === "Entregado" || pedido.pedido_estado === "Facturado")
                ? `
                <div class="detalle-actions">
                    ${(pedido.pedido_estado === "Pendiente" || pedido.pedido_estado === "EnPreparacion") ? `
                        <button class="btn-editar-pedido-modal" data-id="${pedido.id_pedido}">
                            <i class="fa-solid fa-pen"></i> [Editar]
                        </button>
                        <button class="btn-cancelar-pedido" 
                                data-id="${pedido.id_pedido}"
                                data-pedido="${pedido.id_pedido}"
                                data-estado="${pedido.pedido_estado}"
                                data-mesa="${pedido.mesa_numero || ""}"
                                data-tipo="${pedido.pedido_tipo || ""}">
                            <i class="fa-solid fa-ban"></i> [Cancelar]
                        </button>
                        ${pedido.pedido_estado === "EnPreparacion" ? `
                        <button class="btn-marcar-listo" data-id="${pedido.id_pedido}">
                            <i class="fa-solid fa-check-circle"></i> [Marcar como listo]
                        </button>
                        ` : ""}
                    ` : ""}

                    ${pedido.factura_id ? `
                        <button class="btn-ver-factura" data-factura="${pedido.factura_id}">
                            <i class="fa-solid fa-file-invoice"></i> Ver Factura
                        </button>
                    ` : ""}

                    ${(pedido.pedido_estado === "Entregado" || pedido.pedido_estado === "Facturado") ? `
                        <button class="btn-generar-factura" data-pedido="${pedido.id_pedido}">
                            <i class="fa-solid fa-file-invoice-dollar"></i> Generar Factura
                        </button>
                    ` : ""}
                    
                    <button class="btn-cerrar-modal-directo">[Cerrar]</button>
                </div>
                `
                : ""
            }
        </div>
    `;

    document.body.appendChild(backdrop);

    // --- EVENT LISTENERS ---

    const btnEditarModal = backdrop.querySelector(".btn-editar-pedido-modal");
    if (btnEditarModal) {
        btnEditarModal.addEventListener("click", () => {
            backdrop.remove();
            if (typeof editarPedido === "function") editarPedido(pedido.id_pedido);
        });
    }



    const btnFactura = backdrop.querySelector(".btn-ver-factura");
    if (btnFactura) {
        btnFactura.addEventListener("click", () => {
            const facturaId = btnFactura.dataset.factura;
            toast("info", `Factura #${facturaId}`);
        });
    }

    const btnGenerarFactura = backdrop.querySelector(".btn-generar-factura");
    if (btnGenerarFactura) {
        btnGenerarFactura.addEventListener("click", () => {
            console.log("Generar factura para pedido:", pedido.id_pedido);
        });
    }

    const btnMarcarListo = backdrop.querySelector(".btn-marcar-listo");
    if (btnMarcarListo) {
        btnMarcarListo.addEventListener("click", async () => {
            await marcarPedidoListo(pedido.id_pedido);
            backdrop.remove();
        });
    }

    const cerrarModal = () => backdrop.remove();
    backdrop.querySelector(".detalle-cerrar").addEventListener("click", cerrarModal);
    
    const btnCerrarDirecto = backdrop.querySelector(".btn-cerrar-modal-directo");
    if (btnCerrarDirecto) btnCerrarDirecto.addEventListener("click", cerrarModal);

    backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) cerrarModal();
    });
}

  // --- Render all cards with pagination -------------------------------
  function renderizarPedidos(pedidos) {
    const grid = obtenerGridMisPedidos();
    if (!grid) return;

    grid.innerHTML = "";

    if (!Array.isArray(pedidos) || pedidos.length === 0) {
      toggleMisPedidosEmpty(true);
      actualizarContadorPedidos(0);
      actualizarPaginacion(0);
      return;
    }

    toggleMisPedidosEmpty(false);
    actualizarContadorPedidos(pedidos.length);

    // Sort: most recent first (already from API but ensure client-side)
    const sorted = [...pedidos].sort((a, b) => {
      return new Date(b.pedido_fecha_hora) - new Date(a.pedido_fecha_hora);
    });

    misPedidosData = sorted;

    // Paginate
    const totalPages = Math.ceil(sorted.length / PEDIDOS_POR_PAGINA);
    if (misPedidosPagina > totalPages) misPedidosPagina = totalPages;
    if (misPedidosPagina < 1) misPedidosPagina = 1;

    const start = (misPedidosPagina - 1) * PEDIDOS_POR_PAGINA;
    const pageItems = sorted.slice(start, start + PEDIDOS_POR_PAGINA);

    pageItems.forEach((pedido, idx) => {
      const card = crearCardPedido(pedido);
      card.style.animationDelay = `${idx * 0.06}s`;
      grid.appendChild(card);
    });

    actualizarPaginacion(sorted.length);
  }

  // --- Pagination controls -------------------------------------------
  function actualizarPaginacion(total) {
    const pagEl = document.getElementById("pedidosPagination");
    const infoEl = document.getElementById("pagInfo");
    const btnPrev = document.getElementById("btnPagAnterior");
    const btnNext = document.getElementById("btnPagSiguiente");
    if (!pagEl) return;

    const totalPages = Math.max(1, Math.ceil(total / PEDIDOS_POR_PAGINA));

    if (total <= PEDIDOS_POR_PAGINA) {
      pagEl.style.display = "none";
      return;
    }

    pagEl.style.display = "flex";
    if (infoEl) infoEl.textContent = `Página ${misPedidosPagina} de ${totalPages}`;
    if (btnPrev) btnPrev.disabled = misPedidosPagina <= 1;
    if (btnNext) btnNext.disabled = misPedidosPagina >= totalPages;
  }

  // --- Edit pedido action --------------------------------------------
  function editarPedido(idPedido) {
    const pedido = misPedidosData.find(p => String(p.id_pedido) === String(idPedido));
    if (!pedido) {
      toast("error", "No se encontró el pedido");
      return;
    }

    // Configurar el pedido activo
    pedidoActivo = {
      ...pedido,
      mesa_ubicacion: "Area General" 
    };
    window.pedidoEditandoId = idPedido;

    // Limpiar y popular contenedor de platillos
    const container = document.getElementById("platillos-container");
    container.innerHTML = "";
    container.classList.remove("pedido-items-empty");

    if (pedido.platillos && pedido.platillos.length > 0) {
      pedido.platillos.forEach(platilloObj => {
        let pId = platilloObj.id_platillo;
        let pPrecio = platilloObj.precio;

        // Fallback: si el backend no devolvió id_platillo o precio (ej. servidor no reiniciado)
        if (!pId || pPrecio === undefined) {
          const platilloEnMenu = (window.menuItems || []).find(m => m.platillo_nombre === platilloObj.nombre);
          if (platilloEnMenu) {
            pId = platilloEnMenu.id_platillo;
            pPrecio = platilloEnMenu.platillo_precio;
          }
        }

        const p = {
          id_platillo: pId,
          platillo_nombre: platilloObj.nombre,
          platillo_precio: pPrecio
        };
        const fila = crearFilaPlatillo(p, platilloObj.cantidad, platilloObj.id_detalle || null);
        container.appendChild(fila);
      });
    } else {
      renderEstadoPedidoVacio();
    }

    // Actualizar tipo de pedido (Salón vs Llevar)
    const tipo = (pedido.pedido_tipo || "salon").toLowerCase();
    const typeBtn = document.querySelector(`.pedido-type-btn[data-type="${tipo}"]`);
    if (typeBtn) {
      document.querySelectorAll(".pedido-type-btn").forEach(b => b.classList.remove("active"));
      typeBtn.classList.add("active");
    }
    
    aplicarTipoPedido(tipo);
    actualizarSubtotal();
    actualizarBloqueoTipoPedido();
    syncPedidoActualGlobal();
    actualizarEstadoBotonesMenu();

    mostrarViews("tomar-pedido");
    mostrarFormularioPedido();
  }

  window.renderizarPedidos = renderizarPedidos;
  window.calcularTiempo = calcularTiempo;
  window.editarPedido = editarPedido;

  // --- Main data loader -----------------------------------------------
  async function cargarMisPedidos() {
    if (misPedidosCargando) return;
    misPedidosCargando = true;

    const grid = obtenerGridMisPedidos();
    const btnRefresh = document.getElementById("btnActualizarPedidos");

    toggleMisPedidosLoading(true);
    toggleMisPedidosEmpty(false);
    if (grid) grid.innerHTML = "";
    if (btnRefresh) btnRefresh.classList.add("loading");

    try {
      const res = await fetch("/api/pedidos/mis-pedidos");

      if (!res.ok) {
        throw new Error("Error al cargar pedidos");
      }

      const pedidos = await res.json();
      renderizarPedidos(pedidos);
    } catch (error) {
      console.error(error);
      toggleMisPedidosEmpty(true);
      toast("error", "No se pudieron cargar los pedidos");
    } finally {
      misPedidosCargando = false;
      toggleMisPedidosLoading(false);
      if (btnRefresh) btnRefresh.classList.remove("loading");
    }
  }

  window.cargarMisPedidos = cargarMisPedidos;

  function setupMisPedidosViewHook() {
    if (typeof window.mostrarViews !== "function") return;

    const mostrarViewsOriginal = window.mostrarViews;
    window.mostrarViews = function (seccion) {
      mostrarViewsOriginal(seccion);

      if (seccion === "pedidos-pendientes") {
        misPedidosPagina = 1;
        cargarMisPedidos();
      }
    };
  }

  function obtenerPlatilloPorId(idPlatillo) {
    const source = platillosDisponibles.length > 0 ? platillosDisponibles : (window.menuItems || []);
    return source.find((p) => String(p.id_platillo) === String(idPlatillo));
  }

  function renderEstadoPedidoVacio() {
    const container = document.getElementById("platillos-container");
    if (!container) return;

    const tieneItems = container.querySelectorAll(".platillo-row").length > 0;
    container.classList.toggle("pedido-items-empty", !tieneItems);

    if (!tieneItems) {
      container.innerHTML = '<p class="pedido-empty-text">Agregue platillos desde el menú.</p>';
    }
}

/**
 * Renderiza la lista de notificaciones y habilita la navegación al detalle del pedido.
 */
function renderNotificaciones(notificaciones = []) {
    const container = document.getElementById("notificacionesList");
    if (!container) return;

    if (notificaciones.length === 0) {
        container.innerHTML = `<p class="empty">No hay notificaciones</p>`;
        return;
    }

    container.innerHTML = notificaciones.map(n => {
        // Formateo de fecha
        const fechaStr = n.fecha instanceof Date ? n.fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        
        // Se añade evento onclick para procesar el clic
        // Se asume que n tiene una propiedad 'id_pedido'
        return `
            <div class="notificacion-item ${n.leida ? 'leida' : 'no-leida'}" 
                 onclick="procesarClickNotificacion('${n.id_pedido || ''}')"
                 style="cursor: pointer;">
                <div class="notif-body">
                    <p>${n.mensaje}</p>
                    <small>${fechaStr}</small>
                </div>
                ${!n.leida ? '<span class="badge-nuevo">●</span>' : ''}
            </div>
        `;
    }).join("");
}

/**
 * Puente para manejar el clic en la notificación:
 * Marca como leída, refresca la UI y abre el detalle del pedido.
 */
window.procesarClickNotificacion = async function(idPedido) {
    if (!idPedido) return;

    // 1. Marcar como leída en el array global
    notificacionesMesero = notificacionesMesero.map(n => 
        String(n.id_pedido) === String(idPedido) ? { ...n, leida: true } : n
    );
    
    // 2. Refrescar lista y badge
    renderNotificaciones(notificacionesMesero);
    if (typeof actualizarBadgeNotificaciones === 'function') {
        actualizarBadgeNotificaciones();
    }

    // 3. Abrir el modal de detalle (función existente en tu código)
    await abrirDetallePedido(idPedido);
};

// Asegúrate de llamar a esta inicialización dentro de tu función init()
// renderNotificaciones(notificacionesMesero);

  function setupTipoPedidoSelector() {
    document.querySelectorAll(".pedido-type-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".pedido-type-btn").forEach((b) => b.classList.remove("active"));
        this.classList.add("active");
        aplicarTipoPedido(this.dataset.type);
      });
    });
  }

  function crearFilaPlatillo(platillo, cantidad = 1, id_detalle = null) {
    const row = document.createElement("div");
    row.className = "platillo-row";
    row.dataset.idPlatillo = platillo.id_platillo;
    row.dataset.precio = Number(platillo.platillo_precio) || 0;
    if (id_detalle) row.dataset.idDetalle = id_detalle;

    row.innerHTML = `
      <div class="platillo-info-pedido">
        <input type="hidden" class="platillo-id" value="${platillo.id_platillo}">
        ${id_detalle ? `<input type="hidden" class="platillo-id-detalle" value="${id_detalle}">` : ""}
        <strong>${escapeHtml(platillo.platillo_nombre || "Sin nombre")}</strong>
        <span>${formatPrice(platillo.platillo_precio)}</span>
      </div>
      <div class="cantidad-control">
        <button type="button" class="btn-disminuir-cantidad">
          <i class="fas fa-minus"></i>
        </button>
        <input type="number" class="platillo-cantidad" value="${cantidad}" min="1" max="99">
        <button type="button" class="btn-aumentar-cantidad">
          <i class="fas fa-plus"></i>
        </button>
      </div>
      <button type="button" class="btn-eliminar-fila">
        <i class="fas fa-trash"></i>
      </button>
    `;

    return row;
  }

  function syncPedidoActualGlobal() {
    window.pedidoActual = {
      items: obtenerItemsPedido().map((item) => ({
        ...item,
        id_platillo: Number(item.id_platillo)
      })),
      notas: document.getElementById("pedido-notas-generales")?.value.trim() || ""
    };
  }

  function obtenerCantidadesPedidoActual() {
    const cantidades = new Map();
    document.querySelectorAll("#platillos-container .platillo-row").forEach((row) => {
      const idPlatillo = row.dataset.idPlatillo || row.querySelector(".platillo-id")?.value;
      const cantidad = parseInt(row.querySelector(".platillo-cantidad")?.value) || 0;
      if (idPlatillo && cantidad > 0) {
        cantidades.set(String(idPlatillo), cantidad);
      }
    });
    return cantidades;
  }

  function actualizarEstadoBotonesMenu() {
    const cantidades = obtenerCantidadesPedidoActual();

    document.querySelectorAll(".btn-agregar[data-id-platillo]").forEach((button) => {
      const idPlatillo = String(button.dataset.idPlatillo);
      const cantidad = cantidades.get(idPlatillo);
      const enPedido = cantidad > 0;
      const disponible = button.dataset.disponible !== "false";
      const defaultText = button.dataset.defaultText || "Agregar";
      const iconClass = enPedido ? "fa-plus-circle" : "fa-plus";

      button.innerHTML = `<i class="fa-solid ${iconClass}"></i> ${enPedido ? "Agregar otro" : defaultText}`;
      button.disabled = pedidoEnviado || !disponible;
      button.title = pedidoEnviado ? "Pedido ya enviado a cocina" : "";
    });

    document.querySelectorAll(".menu-cantidad-pedido[data-id-platillo]").forEach((label) => {
      const cantidad = cantidades.get(String(label.dataset.idPlatillo));
      if (cantidad > 0) {
        label.textContent = `Cantidad: ${cantidad}`;
        label.style.display = "";
      } else {
        label.textContent = "";
        label.style.display = "none";
      }
    });
  }

  window.actualizarEstadoBotonesMenu = actualizarEstadoBotonesMenu;

  function agregarPlatilloDesdeMenu(idPlatillo) {
    if (pedidoEnviado) {
      toast("warning", "Pedido ya enviado a cocina. No se pueden agregar más platillos.");
      actualizarEstadoBotonesMenu();
      return;
    }

    const platillo = obtenerPlatilloPorId(idPlatillo);
    if (!platillo) {
      toast("error", "No se encontró el platillo seleccionado");
      return;
    }

    if (!platilloDisponible(platillo)) {
      toast("warning", "Este platillo no está disponible");
      return;
    }

    const container = document.getElementById("platillos-container");
    if (!container) return;

    const emptyText = container.querySelector(".pedido-empty-text");
    if (emptyText) emptyText.remove();
    container.classList.remove("pedido-items-empty");

    const existingRow = [...container.querySelectorAll(".platillo-row")]
      .find((row) => String(row.dataset.idPlatillo) === String(idPlatillo));
    if (existingRow) {
      const inputCantidad = existingRow.querySelector(".platillo-cantidad");
      const valor = parseInt(inputCantidad.value) || 1;
      inputCantidad.value = Math.min(valor + 1, 99);
    } else {
      container.appendChild(crearFilaPlatillo(platillo));
    }

    actualizarBloqueoTipoPedido();
    actualizarSubtotal();
    syncPedidoActualGlobal();
    actualizarEstadoBotonesMenu();
    toast("success", "Platillo agregado al pedido");
  }

  window.agregarAlPedidoDesdeMenu = agregarPlatilloDesdeMenu;
  function setupEventListeners() {
    setupTipoPedidoSelector();

    const container = document.getElementById("platillos-container");

    container.addEventListener("click", (e) => {
      if (e.target.closest(".btn-eliminar-fila")) {
        const row = e.target.closest(".platillo-row");
        const nombre = row?.querySelector("strong")?.textContent?.trim() || "este platillo";

        Swal.fire({
          title: `¿Eliminar ${nombre} del pedido?`,
          text: "Esta acción no se puede deshacer.",
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Eliminar",
          cancelButtonText: "Cancelar"
        }).then(async (result) => {
          if (!result.isConfirmed) return;

          const idDetalle = row.dataset.idDetalle || row.querySelector('.platillo-id-detalle')?.value;

          if (idDetalle) {
            try {
              const res = await fetch(`/api/pedidos/platillos/${idDetalle}`, { method: "DELETE" });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || "Error al eliminar platillo");
              toast("success", data.message || "Platillo eliminado correctamente");
              row.remove();
              renderEstadoPedidoVacio();
              actualizarBloqueoTipoPedido();
              actualizarSubtotal();
              syncPedidoActualGlobal();
              actualizarEstadoBotonesMenu();
            } catch (err) {
              console.error(err);
              toast("error", err.message || "No se pudo eliminar el platillo");
            }
          } else {
            row.remove();
            renderEstadoPedidoVacio();
            actualizarBloqueoTipoPedido();
            actualizarSubtotal();
            syncPedidoActualGlobal();
            actualizarEstadoBotonesMenu();
            toast("success", "Platillo eliminado del pedido");
          }
        });

        return;
      }

      if (e.target.closest(".btn-aumentar-cantidad")) {
        const inputCantidad = e.target.closest(".cantidad-control").querySelector(".platillo-cantidad");
        const valor = parseInt(inputCantidad.value) || 1;
        if (valor < 99) inputCantidad.value = valor + 1;
        actualizarSubtotal();
        syncPedidoActualGlobal();
        actualizarEstadoBotonesMenu();
      }

      if (e.target.closest(".btn-disminuir-cantidad")) {
        const inputCantidad = e.target.closest(".cantidad-control").querySelector(".platillo-cantidad");
        const valor = parseInt(inputCantidad.value) || 1;
        if (valor > 1) inputCantidad.value = valor - 1;
        actualizarSubtotal();
        syncPedidoActualGlobal();
        actualizarEstadoBotonesMenu();
      }
    });

    container.addEventListener("input", (e) => {
      if (!e.target.classList.contains("platillo-cantidad")) return;

      let valor = e.target.value;
      if (valor !== "") {
        let numero = parseInt(valor);
        if (isNaN(numero)) numero = 1;
        if (numero < 1) numero = 1;
        if (numero > 99) numero = 99;
        if (valor != numero) e.target.value = numero;
      }

      actualizarSubtotal();
      syncPedidoActualGlobal();
      actualizarEstadoBotonesMenu();
    });

    container.addEventListener("change", (e) => {
      if (!e.target.classList.contains("platillo-cantidad")) return;

      if (e.target.value === "" || parseInt(e.target.value) < 1) {
        e.target.value = 1;
      } else if (parseInt(e.target.value) > 99) {
        e.target.value = 99;
      }

      actualizarSubtotal();
      syncPedidoActualGlobal();
      actualizarEstadoBotonesMenu();
    });

    document.getElementById("btn-enviar-pedido").addEventListener("click", enviarPedido);

    // ==========================================================
    // SUBTAREA: Botón Actualizar Menú Manualmente
    // ==========================================================
    const btnActualizar = document.getElementById("btn-actualizar-menu");
    if (btnActualizar) {
      btnActualizar.addEventListener("click", async () => {
        // Bloqueamos el botón y cambiamos el icono por feedback visual
        btnActualizar.disabled = true;
        btnActualizar.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Cargando...`;

        // Llamamos a tu función que hace la petición real de red y maneja el spinner nativo
        await cargarPlatillos();

        // Si tienes una lógica de renderizado vinculada a filtros en un script global (como menu.js),
        // disparamos su evento para que redibuje el DOM de la tabla/cards con la data fresca.
        if (typeof renderizarMenuEnPantalla === "function") {
          renderizarMenuEnPantalla(platillosDisponibles);
        } else if (typeof window.filtrarYOrdenarMenu === "function") {
          window.filtrarYOrdenarMenu(); 
        }

        // Sincronizamos los textos ("Agregar otro") con las cantidades activas sin perder la orden
        actualizarEstadoBotonesMenu();

        // Restauramos el botón manual
        btnActualizar.disabled = false;
        btnActualizar.innerHTML = `<i class="fa-solid fa-rotate"></i> Actualizar`;
      });
    }

    setupMisPedidosViewHook();

    // --- Mis Pedidos: Refresh button ---
    const btnRefreshPedidos = document.getElementById("btnActualizarPedidos");
    if (btnRefreshPedidos) {
      btnRefreshPedidos.addEventListener("click", () => {
        misPedidosPagina = 1;
        cargarMisPedidos();
      });
    }

    // --- Mis Pedidos: Pagination ---
    const btnPagPrev = document.getElementById("btnPagAnterior");
    const btnPagNext = document.getElementById("btnPagSiguiente");
    if (btnPagPrev) {
      btnPagPrev.addEventListener("click", () => {
        if (misPedidosPagina > 1) {
          misPedidosPagina--;
          renderizarPedidos(misPedidosData);
        }
      });
    }
    if (btnPagNext) {
      btnPagNext.addEventListener("click", () => {
        const totalPages = Math.ceil(misPedidosData.length / PEDIDOS_POR_PAGINA);
        if (misPedidosPagina < totalPages) {
          misPedidosPagina++;
          renderizarPedidos(misPedidosData);
        }
      });
    }

    // --- Mis Pedidos: Card action delegation ---
    const gridMisPedidos = obtenerGridMisPedidos();
    if (gridMisPedidos) {
      gridMisPedidos.addEventListener("click", async (event) => {
        const btn = event.target.closest("button[data-action]");
        if (!btn) return;

        const action = btn.dataset.action;
        const idPedido = btn.dataset.id;

        if (action === "entregado") {
          await marcarPedidoEntregadoConAnimacion(idPedido, btn.closest(".pedido-activo-card"));
        }

        if (action === "editar") {
          editarPedido(Number(idPedido));
        }

        if (action === "detalle") {
          abrirDetallePedido(Number(idPedido));
        }



        if (action === "eliminar") {
          modal("info", "Aún no disponible", "La función de eliminar pedidos estará disponible pronto.");
        }
      });
    }
  }

  async function marcarPedidoListo(idPedido) {
    const confirmar = await Swal.fire({
      title: "¿Marcar pedido como listo?",
      text: "El pedido pasará a estado 'Listo para entregar'",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, marcar listo",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#28a745"
    });
    if (!confirmar.isConfirmed) return;

    try {
      const res = await fetch(`/api/pedidos/${idPedido}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "Listo" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo marcar el pedido como listo");

      toast("success", "Pedido listo para entregar");
      cargarMisPedidos();
      cargarMesasPedido();
    } catch (error) {
      console.error(error);
      toast("error", error.message);
    }
  }

  async function marcarPedidoEntregado(idPedido) {
    if (!idPedido) return;

    try {
      const res = await fetch(`/api/pedidos/${idPedido}/entregar`, {
        method: "PUT"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo marcar el pedido como entregado");

      toast("success", data.message || "Pedido entregado correctamente");
      cargarMisPedidos();
      cargarMesasPedido();
    } catch (error) {
      console.error(error);
      toast("error", error.message);
    }
  }

  // Animated version for card removal
  async function marcarPedidoEntregadoConAnimacion(idPedido, cardElement) {
    if (!idPedido) return;

    try {
      const res = await fetch(`/api/pedidos/${idPedido}/entregar`, {
        method: "PUT"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo marcar el pedido como entregado");

      toast("success", data.message || "¡Pedido entregado correctamente!");

      // Animate card removal
      if (cardElement) {
        cardElement.classList.add("card-removing");
        cardElement.addEventListener("animationend", () => {
          // Remove from data array
          misPedidosData = misPedidosData.filter(p => String(p.id_pedido) !== String(idPedido));
          renderizarPedidos(misPedidosData);
        }, { once: true });
      } else {
        misPedidosData = misPedidosData.filter(p => String(p.id_pedido) !== String(idPedido));
        renderizarPedidos(misPedidosData);
      }

      cargarMesasPedido();
    } catch (error) {
      console.error(error);
      toast("error", error.message);
    }
  }
  function obtenerItemsPedido() {
    const items = [];
    const rows = document.querySelectorAll(".platillo-row");
    rows.forEach((row) => {
      const id_platillo = row.querySelector(".platillo-id")?.value;
      const cantidad = parseInt(row.querySelector(".platillo-cantidad")?.value);
      if (id_platillo && cantidad > 0) {
        items.push({ id_platillo, cantidad });
      }
    });
    return items;
  }

  async function enviarPedido() {
  const typeBtn = document.querySelector(".pedido-type-btn.active");
  const tipo = typeBtn.dataset.type === "salon" ? "Salon" : "Llevar";
  const items = obtenerItemsPedido();
  const notasGenerales = document.getElementById("pedido-notas-generales")?.value.trim() || "";

  if (tipo === "Salon" && !pedidoActivo) {
    toast("warning", "Seleccione una mesa para iniciar el pedido");
    return;
  }

  if (items.length === 0) {
    toast("warning", "Debe seleccionar al menos un platillo válido");
    return;
  }

  try {

    // ==================================================
    // VALIDAR STOCK ANTES DE ENVIAR
    // ==================================================
    for (const item of items) {

      const resStock = await fetch(`/api/platillos/${item.id_platillo}`);

      if (!resStock.ok) {
        throw new Error("No se pudo validar inventario");
      }

      const platillo = await resStock.json();

      if (platillo.stock < item.cantidad) {

        toast(
          "warning",
          `Stock insuficiente para ${platillo.nombre}. Disponible: ${platillo.stock}`
        );

        return;
      }
    }

    const isEditing = !!window.pedidoEditandoId;

    let url;
    let method;
    let body;

    if (isEditing) {
      url = `/api/pedidos/${pedidoActivo.id_pedido}/items`;
      method = "PATCH";
      body = { items, notas: notasGenerales };
    } else {
      if (tipo === "Salon") {
        url = "/api/pedidos/iniciar";
        method = "POST";
        body = { tipo: "Salon", id_mesa: pedidoActivo.id_mesa, items, notas: notasGenerales };
      } else {
        url = "/api/pedidos/crear";
        method = "POST";
        body = { tipo: "Llevar", id_mesa: null, items, notas: notasGenerales };
      }
    }

    const res = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Error al enviar pedido");
    }

    toast("success", "Pedido guardado correctamente");

    resetForm();

  } catch (error) {

    console.error(error);

    toast("error", error.message);

  }
}

  function actualizarSubtotal() {
    let subtotal = 0;
    const rows = document.querySelectorAll(".platillo-row");

    rows.forEach(row => {
      const precio = Number(row.dataset.precio) || 0;
      const cantidad = parseInt(row.querySelector(".platillo-cantidad")?.value) || 0;
      subtotal += precio * cantidad;
    });

    const subtotalSpan = document.getElementById("subtotal-pedido");
    if (subtotalSpan) {
      subtotalSpan.textContent = `$${subtotal.toFixed(2)}`;
    }

    const btnEnviar = document.getElementById("btn-enviar-pedido");
    if (btnEnviar) {
      if (rows.length > 0 && !pedidoEnviado) {
        btnEnviar.disabled = false;
        btnEnviar.title = "Enviar a cocina";
        btnEnviar.style.cursor = "pointer";
        btnEnviar.style.opacity = "1";
      } else {
        btnEnviar.disabled = true;
        btnEnviar.title = "Agrega al menos un platillo";
        btnEnviar.style.cursor = "not-allowed";
        btnEnviar.style.opacity = "0.6";
      }
    }
  }

  function resetForm() {
    pedidoActivo = null;
    window.pedidoEditandoId = null;

    const container = document.getElementById("platillos-container");
    container.innerHTML = '<p class="pedido-empty-text">Agregue platillos desde el menú.</p>';
    container.classList.add("pedido-items-empty");

    const notasGenerales = document.getElementById("pedido-notas-generales");
    if (notasGenerales) notasGenerales.value = "";

    document.querySelector('.pedido-type-btn[data-type="salon"]').click();
    actualizarSubtotal();
    actualizarBloqueoTipoPedido();
    syncPedidoActualGlobal();
    actualizarEstadoBotonesMenu();
    cargarMesasPedido();
    habilitarBotonesPlatillos();
    actualizarEstadoBotonesMenu();
  }
});
