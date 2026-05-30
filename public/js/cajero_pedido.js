window.tipoPedidoCajero = "Para llevar";

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

    const payload = {
      cliente: nombreCliente,
      telefono: telefonoCliente || "",
      observaciones: observacionesPedido || "",
      tipo: window.tipoPedidoCajero, // "Para llevar" por defecto
      mesa: mesaPedido,
      estado: "Pendiente",
      productos: [],
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
  const contenedorMenu = document.querySelector(".menu-table-body") || document.getElementById("menuTableBody") || document;

  contenedorMenu.addEventListener("click", async (event) => {
    const button = event.target.closest(".btn-agregar");
    if (!button) return;
    event.preventDefault();

    // BLOQUEO REGLA DE JIRA: Evita agregar comida a órdenes en cocina o ya cobradas
    if (
      window.estadoPedidoActualCajero === "pendiente" || 
      window.estadoPedidoActualCajero === "en preparación" || 
      window.estadoPedidoActualCajero === "en preparacion" || 
      window.estadoPedidoActualCajero === "listo para entregar" ||
      window.pedidoTieneFacturaActual === true
    ) {
      await Swal.fire({
        icon: "error",
        title: "Acción no permitida",
        text: "No se pueden añadir platillos a un pedido en proceso o que ya fue facturado.",
      });
      return;
    }

    if (button.disabled) return;

    const idPlatillo = button.getAttribute("data-id") || button.getAttribute("data-id-platillo");
    const nombrePlatillo = button.getAttribute("data-nombre") || button.getAttribute("data-platillo-nombre") || "";
    const precioPlatillo = parseFloat(button.getAttribute("data-precio"));

    if (!idPlatillo) return;

    if (typeof window.agregarAlPedidoDesdeMenu === "function") {
      window.agregarAlPedidoDesdeMenu(idPlatillo);
      return;
    }

    if (typeof window.agregarPlatilloAlPedido === "function") {
      window.agregarPlatilloAlPedido(idPlatillo, nombrePlatillo, Number.isNaN(precioPlatillo) ? null : precioPlatillo);
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
}

window.addEventListener("DOMContentLoaded", () => {
  configurarCajeroPedido();
});