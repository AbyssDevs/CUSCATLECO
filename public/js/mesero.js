document.addEventListener("DOMContentLoaded", () => {

  let platillosDisponibles = [];
  let mesasPedido = [];
  let pedidoActivo = null;
  let pedidoEnviado = false;

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
    syncPedidoActualGlobal();
    actualizarEstadoBotonesMenu();
    aplicarTipoPedido("salon");

  }

  async function cargarPlatillos() {

    try {

      const res = await fetch("/api/platillos");

      if (!res.ok) {
        throw new Error("Error al cargar platillos");
      }

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

      if (!res.ok) {
        throw new Error("Error al cargar mesas");
      }

      mesasPedido = await res.json();

      renderMesasPedido();

    } catch (error) {

      console.error(error);

      if (empty) {
        empty.textContent = "No se pudieron cargar las mesas.";
      }

      toast("error", "No se pudieron cargar las mesas");

    } finally {

      if (loading) {
        loading.style.display = "none";
      }

    }

  }

  function normalizarEstadoMesa(estado) {

    if (!estado) return "Libre";

    if (estado.toString().trim().toLowerCase() === "disponible") {
      return "Libre";
    }

    return estado.toString().trim();

  }

  function mesaPedidoViewModel(mesa) {

    return {
      id_mesa: mesa.id_mesa ?? mesa.id ?? null,
      mesa_numero: mesa.mesa_numero ?? mesa.numero ?? "--",
      mesa_capacidad: mesa.mesa_capacidad ?? mesa.capacidad ?? "--",
      mesa_ubicacion: mesa.mesa_ubicacion ?? mesa.ubicacion ?? "Area General",
      mesa_estado: normalizarEstadoMesa(
        mesa.mesa_estado ?? mesa.estado ?? "Disponible"
      ),
      raw: mesa
    };

  }

  function asegurarFiltrosMesasPedido() {

    const mesaContainer = document.getElementById("mesa-container");

    if (!mesaContainer || document.getElementById("mesaPedidoSearchInput")) {
      return;
    }

    const filtros = document.createElement("div");

    filtros.className = "menu-page-header mesas-filtros";

    filtros.innerHTML = `
      <input
        id="mesaPedidoSearchInput"
        type="text"
        placeholder="Buscar mesa..."
        autocomplete="off"
      >

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

  }

  function renderMesasPedido() {

    const list = document.getElementById("mesas-pedido-list");

    if (!list) return;

    list.innerHTML = "";

    mesasPedido
      .map(mesaPedidoViewModel)
      .forEach((mesa) => {

        const estado = mesa.mesa_estado;
        const disponible = estado === "Libre";

        const card = document.createElement("div");

        card.className = "mesa-pedido-card";

        card.innerHTML = `
          <div>
            <h4>Mesa ${mesa.mesa_numero}</h4>
            <p>${mesa.mesa_capacidad} personas</p>
            <p>${mesa.mesa_ubicacion}</p>

            <span class="mesa-pedido-status">
              ${estado}
            </span>
          </div>

          <button
            type="button"
            class="btn-elegir-mesa"
            ${disponible ? "" : "disabled"}
          >
            Elegir mesa
          </button>
        `;

        const boton = card.querySelector(".btn-elegir-mesa");

        boton.addEventListener("click", () => {
          confirmarInicioPedido(mesa.raw);
        });

        list.appendChild(card);

      });

  }

  async function confirmarInicioPedido(mesa) {

    try {

      const res = await fetch("/api/pedidos/iniciar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          tipo: "Salon",
          id_mesa: mesa.id_mesa,
          items: []
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "No se pudo iniciar el pedido"
        );
      }

      pedidoActivo = {
        ...data,
        id_mesa: mesa.id_mesa,
        mesa_numero: mesa.mesa_numero,
        mesa_ubicacion: mesa.mesa_ubicacion
      };

      mostrarFormularioPedido();

      toast("success", "Pedido iniciado correctamente");

      await cargarMesasPedido();

    } catch (error) {

      console.error(error);

      toast("error", error.message);

    }

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
        <span>
          <strong>
            ${pedidoActivo.pedido_numero || `Pedido #${pedidoActivo.id_pedido}`}
          </strong>
        </span>

        <span>
          Estado: ${pedidoActivo.pedido_estado || "Pendiente"}
        </span>

        <span>
          Mesa ${pedidoActivo.mesa_numero}
        </span>
      `;

    }

  }

  function actualizarBloqueoTipoPedido() {

    const algunSeleccionado =
      document.querySelectorAll(".platillo-row").length > 0;

    const typeBtns =
      document.querySelectorAll(".pedido-type-btn");

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

    const mesaContainer =
      document.getElementById("mesa-container");

    const formCard =
      document.getElementById("pedido-form-card");

    const menuPanel =
      document.querySelector(".pedido-menu-panel");

    const info =
      document.getElementById("pedido-activo-info");

    if (type === "llevar") {

      pedidoActivo = null;

      if (mesaContainer) mesaContainer.style.display = "none";
      if (formCard) formCard.style.display = "block";
      if (menuPanel) menuPanel.style.display = "block";

      if (info) {
        info.style.display = "none";
        info.innerHTML = "";
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

    return (
      platillo?.platillo_disponible === true ||
      platillo?.platillo_disponible === 1 ||
      platillo?.platillo_disponible === "1"
    );

  }

  function escapeHtml(value) {

    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  }

  function obtenerPlatilloPorId(idPlatillo) {

    return platillosDisponibles.find(
      (p) => String(p.id_platillo) === String(idPlatillo)
    );

  }

  function renderEstadoPedidoVacio() {

    const container =
      document.getElementById("platillos-container");

    if (!container) return;

    const tieneItems =
      container.querySelectorAll(".platillo-row").length > 0;

    container.classList.toggle(
      "pedido-items-empty",
      !tieneItems
    );

    if (!tieneItems) {

      container.innerHTML =
        '<p class="pedido-empty-text">Agregue platillos desde el menú.</p>';

    }

  }

  function crearFilaPlatillo(platillo, cantidad = 1) {

    const row = document.createElement("div");

    row.className = "platillo-row";

    row.dataset.idPlatillo = platillo.id_platillo;
    row.dataset.precio = Number(platillo.platillo_precio) || 0;

    row.innerHTML = `
      <div class="platillo-info-pedido">

        <input
          type="hidden"
          class="platillo-id"
          value="${platillo.id_platillo}"
        >

        <strong>
          ${escapeHtml(platillo.platillo_nombre)}
        </strong>

        <span>
          $${Number(platillo.platillo_precio).toFixed(2)}
        </span>

      </div>

      <div class="cantidad-control">

        <button
          type="button"
          class="btn-disminuir-cantidad"
        >
          -
        </button>

        <input
          type="number"
          class="platillo-cantidad"
          value="${cantidad}"
          min="1"
          max="99"
        >

        <button
          type="button"
          class="btn-aumentar-cantidad"
        >
          +
        </button>

      </div>

      <button
        type="button"
        class="btn-eliminar-fila"
      >
        <i class="fas fa-trash"></i>
      </button>
    `;

    return row;

  }

  function obtenerItemsPedido() {

    const rows =
      document.querySelectorAll(".platillo-row");

    const items = [];

    rows.forEach((row) => {

      const id_platillo =
        row.querySelector(".platillo-id")?.value;

      const cantidad =
        parseInt(
          row.querySelector(".platillo-cantidad")?.value
        );

      if (id_platillo && cantidad > 0) {

        items.push({
          id_platillo,
          cantidad
        });

      }

    });

    return items;

  }

  function syncPedidoActualGlobal() {

    window.pedidoActual = {
      items: obtenerItemsPedido()
    };

  }

  function actualizarEstadoBotonesMenu() {

    const botones =
      document.querySelectorAll(".btn-agregar");

    botones.forEach((button) => {

      button.disabled = pedidoEnviado;

    });

  }

  function agregarPlatilloDesdeMenu(idPlatillo) {

    if (pedidoEnviado) {

      toast(
        "warning",
        "Pedido ya enviado a cocina"
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

  window.agregarAlPedidoDesdeMenu =
    agregarPlatilloDesdeMenu;

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
          inputCantidad.value = valor + 1;
        }

        actualizarSubtotal();

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
          inputCantidad.value = valor - 1;
        }

        actualizarSubtotal();

      }

    });

    document
      .getElementById("btn-enviar-pedido")
      .addEventListener("click", enviarPedido);

  }

  async function enviarPedido() {

    const typeBtn =
      document.querySelector(".pedido-type-btn.active");

    const tipo =
      typeBtn.dataset.type === "salon"
        ? "Salon"
        : "Llevar";

    const items = obtenerItemsPedido();

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

    try {

      let res;

      if (tipo === "Salon") {

        res = await fetch(
          `/api/pedidos/${pedidoActivo.id_pedido}/items`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ items })
          }
        );

      } else {

        res = await fetch("/api/pedidos/crear", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            tipo,
            id_mesa: null,
            items
          })
        });

      }

      const data = await res.json();

      if (!res.ok) {

        throw new Error(
          data.error || "Error al enviar pedido"
        );

      }

      pedidoEnviado = true;

      actualizarEstadoBotonesMenu();

      toast(
        "success",
        "Pedido enviado correctamente"
      );

      setTimeout(() => {
        resetForm();
      }, 1500);

    } catch (error) {

      console.error(error);

      toast("error", error.message);

    }

  }

  function actualizarSubtotal() {

    let subtotal = 0;

    const rows =
      document.querySelectorAll(".platillo-row");

    rows.forEach((row) => {

      const precio =
        Number(row.dataset.precio) || 0;

      const cantidad =
        parseInt(
          row.querySelector(".platillo-cantidad")?.value
        ) || 0;

      subtotal += precio * cantidad;

    });

    const subtotalSpan =
      document.getElementById("subtotal-pedido");

    if (subtotalSpan) {

      subtotalSpan.textContent =
        `$${subtotal.toFixed(2)}`;

    }

  }

  function resetForm() {

    pedidoActivo = null;
    pedidoEnviado = false;

    const container =
      document.getElementById("platillos-container");

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

});