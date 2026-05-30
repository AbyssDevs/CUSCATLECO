window.tipoPedidoCajero = "Para llevar";

// Estado local del pedido que se está construyendo. menu.js también lo lee
// (window.pedidoActual?.items) para marcar los platillos ya agregados.
window.pedidoActual = window.pedidoActual || { items: [] };

// Mapea el texto de la UI al valor que exige el backend (/api/pedidos/iniciar).
function tipoPedidoApi() {
  return window.tipoPedidoCajero === "Comer aquí" ? "Salon" : "Llevar";
}

// Busca un platillo dentro del catálogo cargado por menu.js.
function buscarPlatilloEnMenu(idPlatillo) {
  const catalogo = window.menuItems || [];
  return catalogo.find((p) => String(p.id_platillo) === String(idPlatillo)) || null;
}

// Agrega (o incrementa) un platillo en el pedido actual.
function agregarPlatilloAlPedidoCajero(idPlatillo) {
  const platillo = buscarPlatilloEnMenu(idPlatillo);
  if (!platillo) return;

  const disponible =
    platillo.platillo_disponible === true ||
    platillo.platillo_disponible === 1 ||
    platillo.platillo_disponible === "1";
  if (!disponible) return;

  const id = String(platillo.id_platillo);
  const existente = window.pedidoActual.items.find((i) => String(i.id_platillo) === id);

  if (existente) {
    existente.cantidad = Math.min((Number(existente.cantidad) || 1) + 1, 99);
  } else {
    window.pedidoActual.items.push({
      id_platillo: platillo.id_platillo,
      nombre: platillo.platillo_nombre || "Platillo",
      precio: Number(platillo.platillo_precio) || 0,
      cantidad: 1,
    });
  }

  renderPedidoActualCajero();
}

// Recalcula y pinta el subtotal del pedido.
function actualizarSubtotalCajero() {
  const subtotalEl = document.getElementById("subtotal-pedido");
  if (!subtotalEl) return;

  const subtotal = window.pedidoActual.items.reduce(
    (acc, item) => acc + (Number(item.precio) || 0) * (Number(item.cantidad) || 0),
    0
  );
  subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
}

// Sincroniza las insignias del menú (cantidad y texto del botón "Agregar").
// menu.js invoca window.actualizarEstadoBotonesMenu tras cada render del menú.
function actualizarEstadoBotonesMenuCajero() {
  const cantidades = new Map(
    window.pedidoActual.items.map((i) => [String(i.id_platillo), Number(i.cantidad) || 0])
  );

  document.querySelectorAll(".btn-agregar[data-id-platillo]").forEach((button) => {
    if (button.dataset.disponible === "false") return;
    const cantidad = cantidades.get(String(button.dataset.idPlatillo)) || 0;
    const enPedido = cantidad > 0;
    const icon = enPedido ? "fa-plus-circle" : "fa-plus";
    const defaultText = button.dataset.defaultText || "Agregar";
    button.innerHTML = `<i class="fa-solid ${icon}"></i> ${enPedido ? "Agregar otro" : defaultText}`;
  });

  document.querySelectorAll(".menu-cantidad-pedido[data-id-platillo]").forEach((label) => {
    const cantidad = cantidades.get(String(label.dataset.idPlatillo)) || 0;
    if (cantidad > 0) {
      label.textContent = `Cantidad: ${cantidad}`;
      label.style.display = "";
    } else {
      label.textContent = "";
      label.style.display = "none";
    }
  });
}
window.actualizarEstadoBotonesMenu = actualizarEstadoBotonesMenuCajero;

// Pinta la lista de platillos del pedido actual (o el estado vacío).
function renderPedidoActualCajero() {
  const container = document.getElementById("platillos-container");
  if (!container) return;

  const items = window.pedidoActual.items;

  if (items.length === 0) {
    container.classList.add("pedido-items-empty");
    container.innerHTML = '<p class="pedido-empty-text">Agregue platillos desde el menú.</p>';
  } else {
    container.classList.remove("pedido-items-empty");
    container.innerHTML = items
      .map((item) => {
        const id = String(item.id_platillo);
        const precio = Number(item.precio) || 0;
        const cantidad = Number(item.cantidad) || 0;
        return `
          <div class="fila-platillo" data-id-platillo="${id}">
            <div class="fp-info">
              <strong>${item.nombre}</strong>
              <span>$${precio.toFixed(2)} c/u</span>
            </div>
            <div class="fp-cantidad">
              <button type="button" class="fp-btn" data-accion="restar" title="Quitar uno">&minus;</button>
              <span class="fp-num">${cantidad}</span>
              <button type="button" class="fp-btn" data-accion="sumar" title="Agregar uno">+</button>
            </div>
            <span class="fp-total">$${(precio * cantidad).toFixed(2)}</span>
            <button type="button" class="fp-eliminar" data-accion="eliminar" title="Eliminar platillo">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        `;
      })
      .join("");
  }

  actualizarSubtotalCajero();
  actualizarEstadoBotonesMenuCajero();
}

// Controles +/-/eliminar dentro del contenedor del pedido (delegación).
function inicializarControlesPedidoActual() {
  const container = document.getElementById("platillos-container");
  if (!container) return;

  container.addEventListener("click", (event) => {
    const boton = event.target.closest("[data-accion]");
    if (!boton) return;

    const fila = boton.closest(".fila-platillo");
    if (!fila) return;

    const id = String(fila.dataset.idPlatillo);
    const item = window.pedidoActual.items.find((i) => String(i.id_platillo) === id);
    if (!item) return;

    const accion = boton.dataset.accion;
    if (accion === "sumar") {
      item.cantidad = Math.min((Number(item.cantidad) || 1) + 1, 99);
    } else if (accion === "restar") {
      item.cantidad = (Number(item.cantidad) || 1) - 1;
      if (item.cantidad < 1) {
        window.pedidoActual.items = window.pedidoActual.items.filter(
          (i) => String(i.id_platillo) !== id
        );
      }
    } else if (accion === "eliminar") {
      window.pedidoActual.items = window.pedidoActual.items.filter(
        (i) => String(i.id_platillo) !== id
      );
    }

    renderPedidoActualCajero();
  });
}

function actualizarTipoPedidoCajero() {
  const mesaSelect = document.getElementById("mesaPedidoCajero");
  const activeButton = document.querySelector(".pedido-type-btn.active");

  if (activeButton) {
    const tipo = activeButton.dataset.tipo;
    window.tipoPedidoCajero = tipo === "salon" ? "Comer aquí" : "Para llevar";
  }

  if (mesaSelect) {
    mesaSelect.disabled = window.tipoPedidoCajero === "Para llevar";
    if (mesaSelect.disabled) {
      mesaSelect.value = "";
    }
  }
}

const ETIQUETA_BOTON_INICIAR = '<i class="fas fa-paper-plane"></i> Iniciar pedido';

function obtenerBotonIniciarPedido(form) {
  // menu.js engancha un efecto cosmético a #btn-enviar-pedido que lo
  // renombra a "Enviar a cocina" (texto del flujo de mesero, ajeno al
  // pedido "Para llevar" del cajero). Clonamos el botón para descartar
  // ese listener externo y que la vista controle su propio estado.
  const original = document.getElementById("btn-enviar-pedido");
  if (!original) return null;

  const boton = original.cloneNode(true);
  original.replaceWith(boton);
  boton.innerHTML = ETIQUETA_BOTON_INICIAR;
  return boton;
}

function configurarFormularioPedidoCajero() {
  const form = document.getElementById("formPedidoCajero");
  if (!form) return;

  const botonIniciar = obtenerBotonIniciarPedido(form);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nombreCliente = document.getElementById("nombreClienteCajero")?.value.trim() || "";
    const telefonoCliente = document.getElementById("telefonoClienteCajero")?.value.trim() || "";
    const observacionesPedido = document.getElementById("observacionesPedidoCajero")?.value.trim() || "";
    const mesaSelect = document.getElementById("mesaPedidoCajero");
    const mesaPedido = window.tipoPedidoCajero === "Para llevar" ? null : mesaSelect?.value || null;

    if (!nombreCliente) {
      await Swal.fire({
        icon: "warning",
        title: "Nombre requerido",
        text: "Ingresa el nombre del cliente para continuar.",
      });
      document.getElementById("nombreClienteCajero")?.focus();
      return;
    }

    // El backend espera { tipo: "Salon"|"Llevar", id_mesa, items:[{id_platillo,cantidad}] }.
    const items = window.pedidoActual.items.map((i) => ({
      id_platillo: i.id_platillo,
      cantidad: Number(i.cantidad) || 1,
    }));

    const payload = {
      // Contrato real de /api/pedidos/iniciar:
      tipo: tipoPedidoApi(), // "Para llevar" (UI) -> "Llevar" (API)
      id_mesa: mesaPedido,
      items,
      // Datos del cliente: se envían para la integración aunque el backend
      // aún no los persista (no hay columnas cliente/telefono/observaciones).
      cliente: nombreCliente,
      telefono: telefonoCliente,
      observaciones: observacionesPedido,
    };

    if (botonIniciar) {
      botonIniciar.disabled = true;
      botonIniciar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
    }

    try {
      const response = await fetch("/api/pedidos/iniciar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const errorMessage =
          (errorBody && (errorBody.message || errorBody.error || JSON.stringify(errorBody))) ||
          "No se pudo crear el pedido.";
        throw new Error(errorMessage);
      }

      await Swal.fire({
        icon: "success",
        title: "¡Pedido creado!",
        text: `Pedido para llevar de ${nombreCliente} creado correctamente.`,
        timer: 2000,
        showConfirmButton: false,
      });

      form.reset();
      window.pedidoActual.items = [];
      renderPedidoActualCajero();
      actualizarTipoPedidoCajero();

      if (typeof actualizarEstadoMesaCajero === "function") {
        actualizarEstadoMesaCajero();
      }
    } catch (error) {
      console.error("Error al iniciar pedido:", error);
      await Swal.fire({
        icon: "error",
        title: "Error al crear pedido",
        text: error?.message || "No se pudo conectar con el servidor.",
      });
    } finally {
      if (botonIniciar) {
        botonIniciar.disabled = false;
        botonIniciar.innerHTML = ETIQUETA_BOTON_INICIAR;
      }
    }
  });
}

async function manejarRespuestaFactura(response) {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const errorMessage =
      (errorBody && (errorBody.message || errorBody.error || JSON.stringify(errorBody))) ||
      "No se pudo generar la factura.";
    throw new Error(errorMessage);
  }

  const resultado = await response.json();

  await Swal.fire({
    icon: "success",
    title: "Factura generada exitosamente",
    text: `Factura ${resultado.numeroFactura} emitida correctamente.`,
    timer: 2000,
    showConfirmButton: false,
  });

  if (typeof limpiarModalFactura === "function") {
    limpiarModalFactura();
  }

  if (typeof refrescarListaPedidos === "function") {
    refrescarListaPedidos();
  }

  return resultado;
}

function renderCobrosTabla(pedidos = []) {
  const tablaCobros = document.getElementById("tablaCobros");
  if (!tablaCobros) return;

  tablaCobros.innerHTML = pedidos
    .map((pedido) => {
      // CUS-301: Validamos si tiene factura amarrada
      const tieneFactura = Boolean(pedido.factura_id || pedido.tieneFactura || pedido.id_factura);
      
      // Pasamos el estado a minúsculas y limpiamos espacios para evitar fallos del backend
      const estadoPedido = (pedido.estado || "").toLowerCase().trim();
      
      // CUS-302: Bloqueo por estados de cocina exactos de Jira
      const disabled = (
        estadoPedido === "pendiente" || 
        estadoPedido === "en preparación" || 
        estadoPedido === "en preparacion" || 
        estadoPedido === "preparado" ||
        estadoPedido === "listo" || 
        estadoPedido === "listo para entregar" || 
        tieneFactura
      ) ? "disabled" : "";

      // Guardamos en memoria global para controlar la delegación del botón agregar platillo
      window.estadoPedidoActualCajero = estadoPedido;
      window.pedidoTieneFacturaActual = tieneFactura;

      // Corrección del formato de moneda para que el cero (0) pinte bien como dinero
      const totalMostrar = (pedido.total !== undefined && pedido.total !== null) ? `$${parseFloat(pedido.total).toFixed(2)}` : "--";

      return `
        <tr>
          <td>${pedido.id_pedido || pedido.id || "--"}</td>
          <td>${pedido.mesa || "Sin mesa"}</td>
          <td>${pedido.mesero || pedido.usuario || "--"}</td>
          <td>${totalMostrar}</td>
          <td>${pedido.estado || "--"}</td>
          <td>
            <button class="btn-completar" ${disabled}>
              Facturar y Cobrar
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function inicializarDelegacionAgregarPlatillo() {
  // Delegamos sobre toda la vista para capturar el clic tanto en la tabla
  // (.menu-table-body) como en las tarjetas (.menu-card-list), aunque se
  // re-rendericen dinámicamente.
  const contenedor = document.getElementById("tomar-pedido") || document;

  contenedor.addEventListener("click", (event) => {
    const button = event.target.closest(".btn-agregar");
    if (!button || button.disabled) return;
    event.preventDefault();

    const idPlatillo =
      button.getAttribute("data-id-platillo") || button.getAttribute("data-id");
    if (!idPlatillo) return;

    agregarPlatilloAlPedidoCajero(idPlatillo);
  });

  // menu.js renderiza cada botón con onclick="agregarAlPedidoDesdeMenu(id)"
  // (función del flujo de mesero). En el cajero el clic ya se maneja por la
  // delegación de arriba, así que dejamos este global inofensivo para no
  // agregar el platillo dos veces por clic.
  window.agregarAlPedidoDesdeMenu = function () {};
}

function configurarCajeroPedido() {
  const tipoButtons = document.querySelectorAll(".pedido-type-btn");
  tipoButtons.forEach((button) => {
    button.addEventListener("click", () => {
      tipoButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      actualizarTipoPedidoCajero();
    });
  });

  actualizarTipoPedidoCajero();
  configurarFormularioPedidoCajero();
  inicializarDelegacionAgregarPlatillo();
  inicializarControlesPedidoActual();
  renderPedidoActualCajero();
}

window.addEventListener("DOMContentLoaded", () => {
  configurarCajeroPedido();
}); 