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
        text: "El pedido se creó correctamente.",
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
}

window.addEventListener("DOMContentLoaded", () => {
  configurarCajeroPedido();
});
