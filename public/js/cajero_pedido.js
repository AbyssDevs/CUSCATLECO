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
  actualizarBotonEnviarPedido();
}

// Habilita o deshabilita el botón de envío según si hay platillos en el pedido.
function actualizarBotonEnviarPedido() {
  const boton = document.getElementById("btn-enviar-pedido");
  if (!boton) return;
  const hayItems = window.pedidoActual.items.length > 0;
  boton.disabled = !hayItems;
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

    const items = window.pedidoActual.items.map((i) => ({
      id_platillo: i.id_platillo,
      cantidad: Number(i.cantidad) || 1,
    }));

    const payload = {
      tipo: tipoPedidoApi(),
      id_mesa: mesaPedido,
      items,
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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatoDinero(value) {
  return `$${(Number(value) || 0).toFixed(2)}`;
}

function formatoFechaHora(value) {
  if (!value) return "--";
  const fecha = new Date(value);
  if (Number.isNaN(fecha.getTime())) return "--";
  return fecha.toLocaleString("es-SV", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

async function obtenerJson(response, mensajeFallback) {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const errorMessage =
      (errorBody && (errorBody.message || errorBody.error || JSON.stringify(errorBody))) ||
      mensajeFallback;
    throw new Error(errorMessage);
  }

  return response.json();
}

function renderDetalleFacturaHtml(detalle = []) {
  return `
    <div class="factura-detalle-wrap">
      <table class="factura-detalle-tabla">
        <thead>
          <tr>
            <th>Platillo</th>
            <th>Cant.</th>
            <th>Precio</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${detalle.map((item) => `
            <tr>
              <td>${escapeHtml(item.nombre)}</td>
              <td>${Number(item.cantidad) || 0}</td>
              <td>${formatoDinero(item.precio_unitario)}</td>
              <td>${formatoDinero(item.subtotal)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderResumenFacturaHtml(data) {
  return `
    <div class="factura-resumen">
      <div><span>Subtotal sin IVA</span><strong>${formatoDinero(data.subtotal)}</strong></div>
      <div><span>IVA 13% (informativo)</span><strong>${formatoDinero(data.iva)}</strong></div>
      <div class="factura-total"><span>Total a pagar</span><strong>${formatoDinero(data.total)}</strong></div>
    </div>
  `;
}

function renderVistaFacturaHtml(factura) {
  return `
    <div class="factura-vista-wrap">
      <section class="factura-vista" data-factura-id="${escapeHtml(factura.id_factura)}">
        <header class="factura-vista-header">
          <div>
            <p class="factura-leyenda">Consumidor Final</p>
            <h2>${escapeHtml(factura.numero_factura)}</h2>
          </div>
          <div class="factura-fecha">${escapeHtml(formatoFechaHora(factura.fecha_emision))}</div>
        </header>
        <div class="factura-meta">
          <div><span>Pedido</span><strong>${escapeHtml(factura.pedido_numero || factura.id_pedido)}</strong></div>
          <div><span>Cajero</span><strong>${escapeHtml(factura.nombre_cajero || "N/A")}</strong></div>
          ${factura.nombre_cliente ? `<div><span>Cliente</span><strong>${escapeHtml(factura.nombre_cliente)}</strong></div>` : ""}
          ${factura.nit_cliente ? `<div><span>NIT</span><strong>${escapeHtml(factura.nit_cliente)}</strong></div>` : ""}
        </div>
        ${renderDetalleFacturaHtml(factura.detalle)}
        ${renderResumenFacturaHtml(factura)}
        <div class="factura-leyendas">
          <span>Consumidor Final</span>
          <span>Documento no válido como crédito fiscal</span>
        </div>
      </section>
      <div class="factura-actions">
        <button type="button" class="btn-descargar-factura">
          <i class="fa-solid fa-file-pdf"></i> Descargar PDF
        </button>
      </div>
    </div>
  `;
}

async function mostrarFacturaEnPantalla(factura) {
  await Swal.fire({
    title: "Factura generada",
    html: renderVistaFacturaHtml(factura),
    width: 820,
    showCloseButton: true,
    showConfirmButton: false,
    didOpen: () => {
      const btnPdf = Swal.getHtmlContainer().querySelector(".btn-descargar-factura");
      const facturaElemento = Swal.getHtmlContainer().querySelector(".factura-vista");
      if (btnPdf && facturaElemento && typeof html2pdf !== "undefined") {
        btnPdf.addEventListener("click", () => {
          const filename = `factura_${escapeHtml(factura.id_factura || factura.pedido_numero || factura.id_pedido)}.pdf`;
          html2pdf()
            .set({
              margin: 10,
              filename,
              image: { type: "jpeg", quality: 0.98 },
              html2canvas: { scale: 2, useCORS: true },
              jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
              pagebreak: { mode: ["css", "legacy"] },
            })
            .from(facturaElemento)
            .save();
        });
      }
    },
  });
}

async function abrirModalFactura(pedidoId) {
  try {
    const previewResponse = await fetch(`/api/facturas/pedido/${encodeURIComponent(pedidoId)}/previsualizar`);
    const preview = await obtenerJson(previewResponse, "No se pudo cargar el detalle del pedido.");

    const result = await Swal.fire({
      title: "Generar factura",
      html: `
        <div class="factura-modal">
          <div class="factura-pedido-numero">
            Pedido ${escapeHtml(preview.pedido.pedido_numero || preview.pedido.id_pedido)}
          </div>
          ${renderDetalleFacturaHtml(preview.detalle)}
          ${renderResumenFacturaHtml(preview)}
          <div class="factura-form-grid">
            <label>
              Nombre del cliente
              <input id="nombreFacturaCliente" class="swal2-input factura-input" type="text" maxlength="100" autocomplete="off">
            </label>
            <label>
              NIT
              <input id="nitFacturaCliente" class="swal2-input factura-input" type="text" maxlength="20" autocomplete="off">
            </label>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Confirmar factura",
      cancelButtonText: "Cancelar",
      width: 760,
      focusConfirm: false,
      preConfirm: async () => {
        const nombreCliente = document.getElementById("nombreFacturaCliente")?.value.trim() || null;
        const nitCliente = document.getElementById("nitFacturaCliente")?.value.trim() || null;

        try {
          const response = await fetch("/api/facturas/generar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id_pedido: pedidoId,
              nombre_cliente: nombreCliente,
              nit_cliente: nitCliente,
            }),
          });
          return await obtenerJson(response, "No se pudo generar la factura.");
        } catch (error) {
          Swal.showValidationMessage(error.message);
          return false;
        }
      },
    });

    if (!result.isConfirmed || !result.value) return;

    toast("success", "Factura generada exitosamente");
    await mostrarFacturaEnPantalla(result.value);
    await cargarPedidosCajero();
  } catch (error) {
    console.error("Error generando factura:", error);
    await Swal.fire({
      icon: "error",
      title: "Error al generar factura",
      text: error?.message || "No se pudo generar la factura.",
    });
  }
}

async function verFacturaExistente(idFactura) {
  try {
    const response = await fetch(`/api/facturas/${encodeURIComponent(idFactura)}`);
    const factura = await obtenerJson(response, "No se pudo cargar la factura.");
    await mostrarFacturaEnPantalla(factura);
  } catch (error) {
    await Swal.fire({
      icon: "error",
      title: "Error al cargar factura",
      text: error?.message || "No se pudo cargar la factura.",
    });
  }
}

function renderCobrosTabla(pedidos = []) {
  const tablaCobros = document.getElementById("tablaCobros");
  if (!tablaCobros) return;

  if (pedidos.length === 0) {
    tablaCobros.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:#999;">No hay pedidos entregados o cerrados</td></tr>`;
    return;
  }

  tablaCobros.innerHTML = pedidos
    .map((pedido) => {
      const id = pedido.id_pedido || pedido.id || "--";
      const mesa = pedido.mesa || pedido.mesa_numero || "Sin mesa";
      const mesero = pedido.mesero || pedido.mesero_nombre || pedido.usuario || "--";
      const total = pedido.pedido_total !== undefined && pedido.pedido_total !== null
        ? formatoDinero(pedido.pedido_total)
        : pedido.total !== undefined
          ? formatoDinero(pedido.total)
          : "--";
      const estado = pedido.pedido_estado || pedido.estado || "--";
      const facturaId = pedido.factura_id || pedido.id_factura || "";
      const tieneFactura = Boolean(facturaId || pedido.tieneFactura);
      const esFacturable = (estado === "Entregado" || estado === "Cerrado") && !tieneFactura;

      return `
        <tr>
          <td>${escapeHtml(pedido.pedido_numero || id)}</td>
          <td>${escapeHtml(mesa)}</td>
          <td>${escapeHtml(mesero)}</td>
          <td>${total}</td>
          <td>${escapeHtml(estado)}</td>
          <td style="display: flex; gap: 4px; align-items: center;">
            ${
              esFacturable
                ? `<button class="btn-completar btn-generar-factura" data-id="${escapeHtml(id)}">
                    <i class="fa-solid fa-file-invoice-dollar"></i> Generar factura
                  </button>`
                : `<button class="btn-completar" disabled>
                    <i class="fa-solid fa-file-invoice"></i> Factura generada
                  </button>`
            }
            ${
              facturaId
                ? `<button class="btn-ver-factura-cajero" data-id-factura="${escapeHtml(facturaId)}" title="Ver factura">
                    <i class="fa-solid fa-eye"></i>
                  </button>`
                : ""
            }
          </td>
        </tr>
      `;
    })
    .join("");
  return;

  if (pedidos.length === 0) {
    tablaCobros.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:#999;">No hay pedidos pendientes</td></tr>`;
    return;
  }

  tablaCobros.innerHTML = pedidos
    .map((pedido) => {
      const id = pedido.id_pedido || pedido.id || "--";
      const mesa = pedido.mesa || pedido.mesa_numero || "Sin mesa";
      const mesero = pedido.mesero || pedido.mesero_nombre || pedido.usuario || "--";
      const total = (pedido.pedido_total !== undefined && pedido.pedido_total !== null) ? `$${parseFloat(pedido.pedido_total).toFixed(2)}` : (pedido.total !== undefined ? `$${parseFloat(pedido.total).toFixed(2)}` : "--");
      const estado = pedido.pedido_estado || pedido.estado || "--";
      const tieneFactura = Boolean(pedido.factura_id || pedido.tieneFactura || pedido.id_factura);
      
      const estadoPedido = estado.toLowerCase().trim();
      
      // CUS-302: Bloqueo por estados de cocina exactos de Jira
      const disabledCobro = (
        estadoPedido === "pendiente" || 
        estadoPedido === "en preparación" || 
        estadoPedido === "en preparacion" || 
        estadoPedido === "preparado" ||
        estadoPedido === "listo para entregar" || 
        tieneFactura
      ) ? "disabled" : "";

      const esFacturado = estadoPedido === "facturado" || tieneFactura;
      const disabledCancelar = esFacturado ? "disabled" : "";
      const estiloDeshabilitado = esFacturado ? "style='opacity: 0.5; cursor: not-allowed; margin-left: 6px; background: #6c757d; color: white; border: none; padding: 6px 12px; border-radius: 4px;'" : "style='margin-left: 6px; background: #dc3545; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;'";

      window.estadoPedidoActualCajero = estadoPedido;
      window.pedidoTieneFacturaActual = tieneFactura;

      return `
        <tr>
          <td>${id}</td>
          <td>${mesa}</td>
          <td>${mesero}</td>
          <td>${total}</td>
          <td>${estado}</td>
          <td style="display: flex; gap: 4px; align-items: center;">
            <button class="btn-completar" ${disabledCobro}>
              Facturar y Cobrar
            </button>
            <button class="btn-cancelar-pedido" 
                    ${disabledCancelar} 
                    ${estiloDeshabilitado}
                    data-id="${pedido.id_pedido || pedido.id || ''}" 
                    data-mesa="${pedido.mesa || 'Sin mesa'}" 
                    data-tipo="${pedido.tipo || 'Llevar'}" 
                    data-estado="${pedido.estado || ''}">
              Cancelar
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

function inicializarFacturacionCajero() {
  const tablaCobros = document.getElementById("tablaCobros");
  if (!tablaCobros) return;

  tablaCobros.addEventListener("click", async (event) => {
    const btnGenerar = event.target.closest(".btn-generar-factura");
    if (btnGenerar && !btnGenerar.disabled) {
      event.preventDefault();
      await abrirModalFactura(btnGenerar.dataset.id);
      return;
    }

    const btnVer = event.target.closest(".btn-ver-factura-cajero");
    if (btnVer && btnVer.dataset.idFactura) {
      event.preventDefault();
      await verFacturaExistente(btnVer.dataset.idFactura);
    }
  });
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
  inicializarFacturacionCajero();
  renderPedidoActualCajero();
}

async function cargarPedidosCajero() {
  try {
    const res = await fetch("/api/pedidos/cajero/pendientes");
    if (!res.ok) throw new Error("Error al cargar pedidos");
    const pedidos = await res.json();
    renderCobrosTabla(pedidos);
  } catch (error) {
    console.error(error);
    const tabla = document.getElementById("tablaCobros");
    if (tabla) tabla.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:#999;">No hay pedidos pendientes</td></tr>`;
  }
}

window.refrescarListaPedidos = cargarPedidosCajero;

window.mostrarViews = function(id) {
  document.querySelectorAll(".contenido > div").forEach(section => {
    if (section.id === "cobros" || section.id === "menu-restaurante" || section.id === "tomar-pedido") {
      section.style.display = section.id === id ? "block" : "none";
    }
  });

  window.activeViewId = id;
  
  // Cargar platillos cuando se muestra la sección de tomar-pedido
  if (id === "tomar-pedido" && typeof loadMenu === "function") {
    loadMenu();
  }
  
  if (id === "cobros") cargarPedidosCajero();
};

window.toggleMenu = function() {
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("menuBackdrop");
  sidebar.classList.toggle("show");
  backdrop.classList.toggle("show");
};

window.cerrarSesion = function() {
  localStorage.clear();
  window.location.href = "/login.html";
};

document.addEventListener("DOMContentLoaded", () => {
  // Cargar platillos del menú para el cajero
  if (typeof loadMenu === "function") {
    loadMenu();
  }
  
  configurarCajeroPedido();
  cargarPedidosCajero();
  setInterval(cargarPedidosCajero, 15000);
});
