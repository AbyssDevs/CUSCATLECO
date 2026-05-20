document.addEventListener("DOMContentLoaded", () => {
  let platillosDisponibles = [];
  let mesasPedido = [];
  let pedidoActivo = null;
  let pedidoEnviado = false;
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
    syncPedidoActualGlobal();
    actualizarEstadoBotonesMenu();
    aplicarTipoPedido("salon");
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

    try {
      const res = await fetch("/api/pedidos/iniciar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "Salon",
          id_mesa: mesa.id_mesa,
          items: []
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo iniciar el pedido");

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
        <span><strong>${pedidoActivo.pedido_numero || `Pedido #${pedidoActivo.id_pedido}`}</strong></span>
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

  function setupTipoPedidoSelector() {
    document.querySelectorAll(".pedido-type-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".pedido-type-btn").forEach((b) => b.classList.remove("active"));
        this.classList.add("active");
        aplicarTipoPedido(this.dataset.type);
      });
    });
  }

  function crearFilaPlatillo(platillo, cantidad = 1) {
    const row = document.createElement("div");
    row.className = "platillo-row";
    row.dataset.idPlatillo = platillo.id_platillo;
    row.dataset.precio = Number(platillo.platillo_precio) || 0;

    row.innerHTML = `
      <div class="platillo-info-pedido">
        <input type="hidden" class="platillo-id" value="${platillo.id_platillo}">
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
        e.target.closest(".platillo-row")?.remove();
        renderEstadoPedidoVacio();
        actualizarBloqueoTipoPedido();
        actualizarSubtotal();
        syncPedidoActualGlobal();
        actualizarEstadoBotonesMenu();
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
      const url = tipo === "Salon"
        ? `/api/pedidos/${pedidoActivo.id_pedido}/items`
        : "/api/pedidos/crear";

      const body = tipo === "Salon"
        ? { items, notas: notasGenerales }
        : { tipo, id_mesa: null, items, notas: notasGenerales };

      const res = await fetch(url, {
        method: tipo === "Salon" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al enviar pedido");

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
  }

  function resetForm() {
    pedidoActivo = null;

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
