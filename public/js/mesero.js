// =============================================
// VARIABLES GLOBALES
// =============================================

let platillosDisponibles = [];
let mesasPedido = [];
let pedidoActivo = null;
let pedidoBloqueado = false;

// =============================================
// ACTUALIZAR ESTADO BOTONES
// =============================================

function actualizarEstadoBotonesMenu() {

  const botonesAgregar =
    document.querySelectorAll(".btn-agregar");

  botonesAgregar.forEach((button) => {

    button.disabled = pedidoBloqueado;

  });

  const botonesEliminar =
    document.querySelectorAll(".btn-eliminar-fila");

  botonesEliminar.forEach((button) => {

    button.disabled = pedidoBloqueado;

    if (pedidoBloqueado) {

      button.style.opacity = "0.5";
      button.style.cursor = "not-allowed";

    } else {

      button.style.opacity = "1";
      button.style.cursor = "pointer";

    }

  });

  const botonesMas =
    document.querySelectorAll(".btn-aumentar-cantidad");

  botonesMas.forEach((button) => {

    button.disabled = pedidoBloqueado;

  });

  const botonesMenos =
    document.querySelectorAll(".btn-disminuir-cantidad");

  botonesMenos.forEach((button) => {

    button.disabled = pedidoBloqueado;

  });

  const inputsCantidad =
    document.querySelectorAll(".platillo-cantidad");

  inputsCantidad.forEach((input) => {

    input.disabled = pedidoBloqueado;

  });

  // ===========================================
  // BOTON ENVIAR
  // ===========================================

  const btnEnviar =
    document.getElementById("btn-enviar-pedido");

  if (!btnEnviar) return;

  const items =
    obtenerItemsPedido();

  if (items.length === 0) {

    btnEnviar.disabled = true;

    btnEnviar.title =
      "Agrega al menos un platillo";

    btnEnviar.style.cursor =
      "not-allowed";

    btnEnviar.style.opacity =
      "0.6";

  } else if (pedidoBloqueado) {

    btnEnviar.disabled = true;

    btnEnviar.title =
      "El pedido ya está en preparación";

    btnEnviar.style.cursor =
      "not-allowed";

    btnEnviar.style.opacity =
      "0.6";

  } else {

    btnEnviar.disabled = false;

    btnEnviar.title = "";

    btnEnviar.style.cursor =
      "pointer";

    btnEnviar.style.opacity =
      "1";

  }

}

// =============================================
// AGREGAR PLATILLO
// =============================================

function agregarPlatilloDesdeMenu(idPlatillo) {

  if (pedidoBloqueado) {

    toast(
      "warning",
      "El pedido ya no puede modificarse"
    );

    return;

  }

  const platillo =
    obtenerPlatilloPorId(idPlatillo);

  if (!platillo) {
    return;
  }

  if (!platilloDisponible(platillo)) {

    toast(
      "warning",
      "Este platillo no está disponible"
    );

    return;

  }

  const container =
    document.getElementById("platillos-container");

  if (!container) return;

  const emptyText =
    container.querySelector(".pedido-empty-text");

  if (emptyText) {
    emptyText.remove();
  }

  const existingRow =
    [...container.querySelectorAll(".platillo-row")]
      .find(
        (row) =>
          String(row.dataset.idPlatillo) ===
          String(idPlatillo)
      );

  if (existingRow) {

    const inputCantidad =
      existingRow.querySelector(".platillo-cantidad");

    const valor =
      parseInt(inputCantidad.value) || 1;

    inputCantidad.value =
      Math.min(valor + 1, 99);

  } else {

    container.appendChild(
      crearFilaPlatillo(platillo)
    );

  }

  actualizarBloqueoTipoPedido();
  actualizarSubtotal();
  syncPedidoActualGlobal();
  actualizarEstadoBotonesMenu();

  toast("success", "Platillo agregado");

}

// =============================================
// EVENTOS
// =============================================

function setupEventListeners() {

  document
    .querySelectorAll(".pedido-type-btn")
    .forEach((btn) => {

      btn.addEventListener("click", function () {

        if (
          this.classList.contains("disabled-btn")
        ) {
          return;
        }

        document
          .querySelectorAll(".pedido-type-btn")
          .forEach((b) =>
            b.classList.remove("active")
          );

        this.classList.add("active");

        aplicarTipoPedido(this.dataset.type);

      });

    });

  const container =
    document.getElementById("platillos-container");

  container.addEventListener("click", (e) => {

    if (pedidoBloqueado) {
      return;
    }

    if (
      e.target.closest(".btn-eliminar-fila")
    ) {

      e.target
        .closest(".platillo-row")
        ?.remove();

      renderEstadoPedidoVacio();

      actualizarBloqueoTipoPedido();

      actualizarSubtotal();

      syncPedidoActualGlobal();

      actualizarEstadoBotonesMenu();

    }

    if (
      e.target.closest(".btn-aumentar-cantidad")
    ) {

      const inputCantidad =
        e.target
          .closest(".cantidad-control")
          .querySelector(".platillo-cantidad");

      const valor =
        parseInt(inputCantidad.value) || 1;

      if (valor < 99) {

        inputCantidad.value =
          valor + 1;

      }

      actualizarSubtotal();

      actualizarEstadoBotonesMenu();

    }

    if (
      e.target.closest(".btn-disminuir-cantidad")
    ) {

      const inputCantidad =
        e.target
          .closest(".cantidad-control")
          .querySelector(".platillo-cantidad");

      const valor =
        parseInt(inputCantidad.value) || 1;

      if (valor > 1) {

        inputCantidad.value =
          valor - 1;

      }

      actualizarSubtotal();

      actualizarEstadoBotonesMenu();

    }

  });

  document
    .getElementById("btn-enviar-pedido")
    .addEventListener("click", enviarPedido);

}

// =============================================
// ENVIAR PEDIDO
// =============================================

async function enviarPedido() {

  if (pedidoBloqueado) {

    toast(
      "warning",
      "El pedido ya no puede modificarse"
    );

    return;

  }

  const typeBtn =
    document.querySelector(".pedido-type-btn.active");

  const tipo =
    typeBtn.dataset.type === "salon"
      ? "Salon"
      : "Llevar";

  const items =
    obtenerItemsPedido();

  if (tipo === "Salon" && !pedidoActivo) {

    toast(
      "warning",
      "Seleccione una mesa"
    );

    return;

  }

  if (items.length === 0) {

    toast(
      "warning",
      "Debe agregar al menos un platillo"
    );

    return;

  }

  // ===========================================
  // MODAL CONFIRMACION
  // ===========================================

  const numeroPedido =
    pedidoActivo?.pedido_numero
    || "Nuevo Pedido";

  const confirmar = confirm(
    `¿Enviar pedido ${numeroPedido} a cocina?\n\n` +
    `No podrás modificar los platillos ` +
    `si el cocinero pasa a estado En preparación`
  );

  if (!confirmar) {
    return;
  }

  try {

    let res;

    // =========================================
    // PEDIDO SALON
    // =========================================

    if (tipo === "Salon") {

      // =======================================
      // EVITAR DUPLICADOS
      // =======================================

      res = await fetch(
        `/api/pedidos/${pedidoActivo.id_pedido}/reemplazar-items`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            items
          })
        }
      );

    } else {

      // =======================================
      // CREAR PEDIDO LLEVAR
      // =======================================

      res = await fetch(
        "/api/pedidos/crear",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            tipo,
            id_mesa: null,
            items
          })
        }
      );

    }

    const data =
      await res.json();

    if (!res.ok) {

      throw new Error(
        data.error ||
        "Error al enviar pedido"
      );

    }

    // =========================================
    // NO BLOQUEAR AUN
    // =========================================

    pedidoActivo = {
      ...pedidoActivo,
      pedido_estado: "Pendiente"
    };

    toast(
      "success",
      "Pedido enviado correctamente"
    );

    // =========================================
    // CONSULTAR ESTADO REAL
    // =========================================

    verificarEstadoPedido();

  } catch (error) {

    console.error(error);

    toast(
      "error",
      error.message
    );

  }

}

// =============================================
// VERIFICAR ESTADO PEDIDO
// =============================================

async function verificarEstadoPedido() {

  if (!pedidoActivo?.id_pedido) {
    return;
  }

  try {

    const res = await fetch(
      `/api/pedidos/${pedidoActivo.id_pedido}`
    );

    if (!res.ok) {
      return;
    }

    const pedido =
      await res.json();

    if (
      pedido.pedido_estado ===
      "EnPreparacion"
    ) {

      pedidoBloqueado = true;

      actualizarEstadoBotonesMenu();

      toast(
        "warning",
        "Pedido bloqueado: cocina ya inició preparación"
      );

    }

  } catch (error) {

    console.error(error);

  }

}

// =============================================
// AUTO REFRESH ESTADO
// =============================================

setInterval(() => {

  verificarEstadoPedido();

}, 5000);

// =============================================
// RESET FORM
// =============================================

function resetForm() {

  pedidoActivo = null;

  pedidoBloqueado = false;

  const container =
    document.getElementById(
      "platillos-container"
    );

  container.innerHTML =
    '<p class="pedido-empty-text">Agregue platillos desde el menú.</p>';

  container.classList.add(
    "pedido-items-empty"
  );

  document
    .querySelector(
      '.pedido-type-btn[data-type="salon"]'
    )
    .click();

  actualizarSubtotal();

  actualizarBloqueoTipoPedido();

  syncPedidoActualGlobal();

  actualizarEstadoBotonesMenu();

  cargarMesasPedido();

}