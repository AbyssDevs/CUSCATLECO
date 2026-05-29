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

function configurarFormularioPedidoCajero() {
  const form = document.getElementById("formPedidoCajero");
  if (!form) return;

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
      return;
    }

    const payload = {
      cliente: nombreCliente,
      telefono: telefonoCliente || "",
      observaciones: observacionesPedido || "",
      tipo: window.tipoPedidoCajero,
      mesa: mesaPedido,
      estado: "Pendiente",
      productos: [],
    };

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
        title: "Pedido creado",
        text: `Pedido para ${nombreCliente} creado correctamente.`,
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
      const tieneFactura = Boolean(pedido.factura_id || pedido.tieneFactura || pedido.id_factura);
      const estadoPedido = pedido.estado || "";
      const disabled = (estadoPedido === "Pendiente" || estadoPedido === "En preparación" || estadoPedido === "En preparacion" || estadoPedido === "Listo" || estadoPedido === "Preparado" || tieneFactura) ? "disabled" : "";

      return `
        <tr>
          <td>${pedido.id_pedido || pedido.id || "--"}</td>
          <td>${pedido.mesa || "Sin mesa"}</td>
          <td>${pedido.mesero || pedido.usuario || "--"}</td>
          <td>${pedido.total != null ? pedido.total : "--"}</td>
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

  contenedorMenu.addEventListener("click", (event) => {
    const button = event.target.closest(".btn-agregar");
    if (!button) return;
    event.preventDefault();

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
