document.addEventListener("DOMContentLoaded", () => {
  let platillosDisponibles = [];
  let mesasPedido = [];
  let pedidoActivo = null;
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

    const primerSelect = document.querySelector(".platillo-select");
    if (primerSelect) {
      poblarSelectPlatillos(primerSelect);
    }

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
    const info = document.getElementById("pedido-activo-info");

    if (formCard) formCard.style.display = "block";
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

  function poblarSelectPlatillos(select) {
    select.innerHTML = '<option value="">Seleccione un platillo...</option>';
    platillosDisponibles.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id_platillo;
      const estado = p.platillo_disponible ? "" : " [No disponible]";
      opt.textContent = `${p.platillo_nombre} - $${p.platillo_precio}${estado}`;
      select.appendChild(opt);
    });

    select.addEventListener("change", actualizarBloqueoTipoPedido);
  }

  function actualizarBloqueoTipoPedido() {
    const selects = document.querySelectorAll(".platillo-select");
    let algunSeleccionado = false;
    selects.forEach((s) => {
      if (s.value !== "") algunSeleccionado = true;
    });

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
    const info = document.getElementById("pedido-activo-info");

    if (type === "llevar") {
      pedidoActivo = null;
      if (mesaContainer) mesaContainer.style.display = "none";
      if (formCard) formCard.style.display = "block";
      if (info) {
        info.style.display = "none";
        info.innerHTML = "";
      }
      return;
    }

    if (mesaContainer) mesaContainer.style.display = "block";
    if (formCard) formCard.style.display = pedidoActivo ? "block" : "none";
    cargarMesasPedido();
    if (pedidoActivo) {
      mostrarFormularioPedido();
    }
  }

  function setupEventListeners() {
    document.querySelectorAll(".pedido-type-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".pedido-type-btn").forEach((b) => b.classList.remove("active"));
        this.classList.add("active");
        aplicarTipoPedido(this.dataset.type);
      });
    });

    // ============================================
    // CUS-124: Botón para añadir otro platillo
    // ============================================
    document.getElementById("btn-add-platillo").addEventListener("click", () => {
      // 1. Obtener el contenedor donde van las filas de platillos
      const container = document.getElementById("platillos-container");
  
      // 2. Crear una nueva fila (div)
      const newRow = document.createElement("div");
      newRow.className = "platillo-row";
      newRow.style.cssText = "display: flex; gap: 10px; margin-bottom: 10px; align-items: center;";
  
    // 3. Agregar el HTML interno de la fila
    newRow.innerHTML = `
      <select class="platillo-select" style="flex: 3;">
        <option value="">Seleccione un platillo...</option>
      </select>
      <input type="number" class="platillo-cantidad" value="1" min="1" max="99" style="flex: 1;">
      <input type="text" class="platillo-notas" placeholder="Notas (opcional)" style="flex: 2; padding: 12px 15px; border: 1px solid #ddd; border-radius: 6px;">
      <button type="button" class="btn-eliminar-fila" style="background: #dc3545; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer;">
        <i class="fas fa-trash"></i>
      </button>
    `;
  
      // 4. Agregar la nueva fila al contenedor
      container.appendChild(newRow);
      
      // 5. Llenar el select con los platillos disponibles
      poblarSelectPlatillos(newRow.querySelector(".platillo-select"));
      
      // 6. Bloquear/desbloquear el tipo de pedido (salón/llevar)
      actualizarBloqueoTipoPedido();
      
      // 7. ACTUALIZAR SUBTOTAL EN TIEMPO REAL (CUS-124)
      actualizarSubtotal();
    });

    document.getElementById("platillos-container").addEventListener("input", (e) => {
      if (e.target.classList.contains("platillo-cantidad")) {
        let val = e.target.value;
        if (val !== "") {
          let num = parseInt(val);
          if (isNaN(num)) num = 1;
          if (num < 1) num = 1;
          if (num > 99) num = 99;
          if (val != num) e.target.value = num;
        }
      }
    });

    document.getElementById("platillos-container").addEventListener("change", (e) => {
      if (e.target.classList.contains("platillo-cantidad")) {
        if (e.target.value === "" || parseInt(e.target.value) < 1) {
          e.target.value = 1;
        } else if (parseInt(e.target.value) > 99) {
          e.target.value = 99;
        }
      }
    });

    // ============================================
    // CUS-124: Eliminar fila de platillo
    // ============================================
    document.getElementById("platillos-container").addEventListener("click", (e) => {
      if (e.target.closest(".btn-eliminar-fila")) {
        const rows = document.querySelectorAll(".platillo-row");
        if (rows.length > 1) {
          e.target.closest(".platillo-row").remove();
          actualizarBloqueoTipoPedido();
          actualizarSubtotal();
        } else {
          toast("warning", "Debe haber al menos un platillo en el pedido");
        }
      }
    });

    // ============================================
    // CUS-124: Actualizar subtotal al cambiar cantidad
    // ============================================
    document.getElementById("platillos-container").addEventListener("input", (e) => {
      if (e.target.classList.contains("platillo-cantidad")) {
        let val = e.target.value;
        if (val !== "") {
          let num = parseInt(val);
          if (isNaN(num)) num = 1;
          if (num < 1) num = 1;
          if (num > 99) num = 99;
          if (val != num) e.target.value = num;
        }
        actualizarSubtotal();
      }
    });

    // ============================================
    // CUS-124: Actualizar subtotal al cambiar platillo
    // ============================================
    document.getElementById("platillos-container").addEventListener("change", (e) => {
      if (e.target.classList.contains("platillo-cantidad")) {
        if (e.target.value === "" || parseInt(e.target.value) < 1) {
          e.target.value = 1;
        } else if (parseInt(e.target.value) > 99) {
          e.target.value = 99;
        }
        actualizarSubtotal();
      }
      if (e.target.classList.contains("platillo-select")) {
        actualizarSubtotal();
      }
    });

    document.getElementById("btn-enviar-pedido").addEventListener("click", enviarPedido);
  }

  function obtenerItemsPedido() {
    const items = [];
    const rows = document.querySelectorAll(".platillo-row");
    rows.forEach((row) => {
      const id_platillo = row.querySelector(".platillo-select").value;
      const cantidad = parseInt(row.querySelector(".platillo-cantidad").value);
      const notas = row.querySelector(".platillo-notas").value.trim();
      if (id_platillo && cantidad > 0) {
        items.push({ id_platillo, cantidad, notas });
      }
    });
    return items;
  }

  async function enviarPedido() {
    const typeBtn = document.querySelector(".pedido-type-btn.active");
    const tipo = typeBtn.dataset.type === "salon" ? "Salon" : "Llevar";
    const items = obtenerItemsPedido();

    if (tipo === "Salon" && !pedidoActivo) {
      toast("warning", "Seleccione una mesa para iniciar el pedido");
      return;
    }

    if (items.length === 0) {
      toast("warning", "Debe seleccionar al menos un platillo valido");
      return;
    }

    try {
      const url = tipo === "Salon"
        ? `/api/pedidos/${pedidoActivo.id_pedido}/items`
        : "/api/pedidos/crear";

      const body = tipo === "Salon"
        ? { items }
        : { tipo, id_mesa: null, items };

      const res = await fetch(url, {
        method: tipo === "Salon" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al enviar pedido");

      toast("success", "Pedido  guardado correctamente");
      resetForm();
    } catch (error) {
      console.error(error);
      toast("error", error.message);
    }
  }

  // ============================================
  // CUS-124: Actualizar subtotal en tiempo real
  // ============================================
  function actualizarSubtotal() {
    let subtotal = 0;
    const rows = document.querySelectorAll(".platillo-row");
    
    rows.forEach(row => {
      const select = row.querySelector(".platillo-select");
      const cantidad = parseInt(row.querySelector(".platillo-cantidad")?.value) || 0;
      
      if (select && select.value) {
        const option = select.options[select.selectedIndex];
        const precioTexto = option.textContent.match(/\$([0-9.]+)/);
        const precio = precioTexto ? parseFloat(precioTexto[1]) : 0;
        subtotal += precio * cantidad;
      }
    });
    
    const subtotalSpan = document.getElementById("subtotal-pedido");
    if (subtotalSpan) {
      subtotalSpan.textContent = `$${subtotal.toFixed(2)}`;
    }
  }

  function resetForm() {
    pedidoActivo = null;

    document.querySelector('.pedido-type-btn[data-type="salon"]').click();

    const container = document.getElementById("platillos-container");
    container.innerHTML = `
      <div class="platillo-row" style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center;">
        <select class="platillo-select" style="flex: 3;">
          <option value="">Seleccione un platillo...</option>
        </select>
        <input type="number" class="platillo-cantidad" value="1" min="1" max="99" style="flex: 1;">
        <input type="text" class="platillo-notas" placeholder="Notas (opcional)" style="flex: 2; padding: 12px 15px; border: 1px solid #ddd; border-radius: 6px;">
        <button type="button" class="btn-eliminar-fila" style="background: #dc3545; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer;">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
    poblarSelectPlatillos(container.querySelector(".platillo-select"));
    actualizarBloqueoTipoPedido();
    cargarMesasPedido();
  }
});
