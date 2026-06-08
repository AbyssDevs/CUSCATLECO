const menuState = {
  items: [],
  categories: [],
  filter: {
    categoria_id: "",
    nombre: "",
    orderBy: "nombre",
    orderDir: "ASC",
  },
};

window.activeViewId = 'menu-restaurante';

function isAdminMenuPage() {
  return document.querySelector("#menuPlatillos[data-admin='true']") !== null;
}

function isPedidoMenuPage() {
  return window.activeViewId === 'tomar-pedido';
}

function toggleMenu() {
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("menuBackdrop");
  if (sidebar) sidebar.classList.toggle("active");
  if (backdrop) backdrop.classList.toggle("active");
}

function cerrarSesion() {
  window.location.href = "/logout";
}

function mostrarViews(seccion) {
  const secciones = ["tomar-pedido", "menu-restaurante", "notificaciones", "pedidos-pendientes", "cobros", "verMesas"];
  secciones.forEach((id) => {
    const elemento = document.getElementById(id);
    if (elemento) elemento.style.display = "none";
  });

  const view = document.getElementById(seccion);
  if (view) {
    view.style.display = "block";
  }

  window.activeViewId = seccion;

  if (seccion === "menu-restaurante" || seccion === "tomar-pedido") {
    loadMenu();
  }

  if (seccion === "notificaciones" && typeof window.cargarNotificaciones === "function") {
    window.cargarNotificaciones();
  }

  if (seccion === "verMesas" && typeof cargarMesas === "function") {
    cargarMesas();
  }

  if (seccion === "tomar-pedido" && typeof window.cargarMesasPedido === "function") {
    window.cargarMesasPedido();
  }
}

async function cargarUsuarioLogueado() {
  try {
    const respuesta = await fetch("/api/usuario");
    if (!respuesta.ok) {
      throw new Error("No se pudo obtener información del usuario");
    }

    const usuario = await respuesta.json();
    const userName = document.getElementById("userName");
    const userRole = document.getElementById("userRole");
    const nombreUsuario = usuario.nombre || usuario.usuario_nombre || usuario.name || "Usuario";
    const rolUsuario = usuario.role || usuario.rol || "Sin rol";

    if (userName) userName.textContent = nombreUsuario;
    if (userRole) userRole.textContent = rolUsuario;

    const bienvenida = document.getElementById("bienvenidaUsuario");
    if (bienvenida) {
      bienvenida.innerHTML = `Bienvenido, <strong>${nombreUsuario}</strong> (${rolUsuario})`;
    }

    return usuario;
  } catch (error) {
    console.error("Error cargando usuario:", error);
    const userName = document.getElementById("userName");
    const userRole = document.getElementById("userRole");
    if (userName) userName.textContent = "Usuario";
    if (userRole) userRole.textContent = "No disponible";
    if (error.message.includes("401")) {
      window.location.href = "/";
    }
  }
}

function formatPrice(value) {
  const number = Number(value);
  if (Number.isNaN(number)) return "$0.00";
  return number.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function truncateText(text, limit = 100) {
  if (!text) return "";
  const normalized = String(text).trim();
  return normalized.length <= limit ? normalized : normalized.slice(0, limit).trim() + "...";
}

function getActiveViewElement() {
  return document.getElementById(window.activeViewId) || document;
}

function setMenuLoading(show) {
  const activeView = getActiveViewElement();
  const loading = activeView.querySelector(".menu-loading") || document.getElementById("menuLoading");
  if (loading) loading.style.display = show ? "flex" : "none";
}

function setMenuEmpty(message) {
  const activeView = getActiveViewElement();
  const empty = activeView.querySelector(".menu-empty") || document.getElementById("menuEmpty");
  if (!empty) return;
  empty.textContent = message;
  empty.style.display = message ? "flex" : "none";
}

function renderMenu(items) {
  menuState.items = items;
  window.menuItems = items;
  const activeView = getActiveViewElement();
  const tableBody = activeView.querySelector(".menu-table-body") || document.getElementById("menuTableBody");
  const cardList = activeView.querySelector(".menu-card-list") || document.getElementById("menuCardList");

  const filteredItems = [...items];

  const adminMode = isAdminMenuPage();
  const pedidoMode = isPedidoMenuPage();

  if (tableBody) {
    if (filteredItems.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="${adminMode || pedidoMode ? 6 : 5}" style="padding: 18px; text-align: center;">No hay platillos disponibles en este momento</td>
        </tr>
      `;
    } else {
      tableBody.innerHTML = filteredItems
        .map((item) => {
          const disponible = item.platillo_disponible === true || item.platillo_disponible === 1 || item.platillo_disponible === "1";
          const actualizadoInfo = item.actualizado_por && item.fecha_actualizacion
            ? `<span class="menu-item-meta">Actualizado por ${item.actualizado_por} el ${item.fecha_actualizacion}</span>`
            : "";
            
          let actionCol = "";
          if (adminMode) {
              actionCol = `
                <td>
                  <button class="btn-editar" onclick="editarPlatillo(${item.id_platillo})"><i class="fa-solid fa-pen"></i> Editar</button>
                </td>
                <td>
                  <button class="btn-activar" onclick="activarPlatillo(${item.id_platillo})"><i class="fa-solid fa-power-off"></i> Activar</button>
                </td>
                <td>
                  <button class="btn-desactivar" onclick="desactivarPlatillo(${item.id_platillo})"><i class="fa-solid fa-trash"></i> Eliminar</button>
                </td>
              `;
          } else if (pedidoMode) {
              const pedidoItem = window.pedidoActual?.items?.find(i => String(i.id_platillo) === String(item.id_platillo));
              const enPedido = Boolean(pedidoItem);
              const cantidadEnPedido = Number(pedidoItem?.cantidad) || 0;
              actionCol = `
                <td>
                  <span class="menu-item-meta menu-cantidad-pedido" data-id-platillo="${item.id_platillo}" ${enPedido ? "" : 'style="display:none;"'}>${enPedido ? `Cantidad: ${cantidadEnPedido}` : ""}</span>
                  <button class="btn-agregar" data-id-platillo="${item.id_platillo}" data-default-text="Agregar" data-disponible="${disponible ? "true" : "false"}" onclick="agregarAlPedidoDesdeMenu(${item.id_platillo})" ${!disponible ? 'disabled style="opacity:0.5;cursor:not-allowed;background:#ccc;"' : 'style="background:#248a4c;color:white;"'}>
                    <i class="fa-solid ${enPedido ? 'fa-plus-circle' : 'fa-plus'}"></i> ${enPedido ? 'Agregar otro' : 'Agregar'}
                  </button>
                </td>
              `;
          }

          return `
            <tr ${!disponible && pedidoMode ? 'style="opacity: 0.6;"' : ''}>
              <td><img src="http://localhost:3000${item.platillo_imagen_url}" alt="${item.platillo_nombre}" class="menu-item-img"></td>
              <td>
                <div style="display:flex; flex-direction:column; gap:6px;">
                  <strong>${item.platillo_nombre || "Sin nombre"}</strong>
                  ${actualizadoInfo}
                  ${!disponible ? `<span class="menu-card-status">No disponible</span>` : ""}
                </div>
              </td>
              <td class="categoria-col">${item.categoria_nombre || "-"}</td>
              <td class="descripcion-col">${truncateText(item.platillo_descripcion || "", 100)}</td>
              <td class="precio-col">${formatPrice(item.platillo_precio)}</td>
              ${actionCol}
            </tr>
          `;
        })
        .join("");
    }
  }

  if (cardList) {
    if (filteredItems.length === 0) {
      cardList.innerHTML = "";
    } else {
      cardList.innerHTML = filteredItems
        .map((item) => {
          const disponible = item.platillo_disponible === true || item.platillo_disponible === 1 || item.platillo_disponible === "1";
          const actualizadoInfo = item.actualizado_por && item.fecha_actualizacion
            ? `<span class="menu-item-meta">Actualizado por ${item.actualizado_por} el ${item.fecha_actualizacion}</span>`
            : "";
            
          let adminActions = "";
          let pedidoActions = "";
          
          if (adminMode) {
              adminActions = `
                <div class="menu-card-actions">
                  <button class="btn-editar" onclick="editarPlatillo(${item.id_platillo})"><i class="fa-solid fa-pen"></i> Editar</button>
                  <button class="btn-activar" onclick="activarPlatillo(${item.id_platillo})"><i class="fa-solid fa-power-off"></i> Activar</button>
                  <button class="btn-desactivar" onclick="desactivarPlatillo(${item.id_platillo})"><i class="fa-solid fa-trash"></i> Eliminar</button>
                </div>
              `;
          } else if (pedidoMode) {
              const pedidoItem = window.pedidoActual?.items?.find(i => String(i.id_platillo) === String(item.id_platillo));
              const enPedido = Boolean(pedidoItem);
              const cantidadEnPedido = Number(pedidoItem?.cantidad) || 0;
              pedidoActions = `
                <div class="menu-card-actions" style="margin-top: 10px;">
                  <span class="menu-item-meta menu-cantidad-pedido" data-id-platillo="${item.id_platillo}" ${enPedido ? "" : 'style="display:none;"'}>${enPedido ? `Cantidad: ${cantidadEnPedido}` : ""}</span>
                  <button class="btn-agregar" data-id-platillo="${item.id_platillo}" data-default-text="Agregar al pedido" data-disponible="${disponible ? "true" : "false"}" onclick="agregarAlPedidoDesdeMenu(${item.id_platillo})" ${!disponible ? 'disabled style="opacity:0.5;cursor:not-allowed;background:#ccc;width:100%;"' : 'style="background:#248a4c;color:white;width:100%;"'}>
                    <i class="fa-solid ${enPedido ? 'fa-plus-circle' : 'fa-plus'}"></i> ${enPedido ? 'Agregar otro' : 'Agregar al pedido'}
                  </button>
                </div>
              `;
          }

          return `
            <div class="menu-card" ${!disponible && pedidoMode ? 'style="opacity: 0.6;"' : ''}>
              ${item.platillo_imagen_url ? `<img src="http://localhost:3000${item.platillo_imagen_url}" alt="${item.platillo_nombre}" class="menu-card-img">` : `<div class="menu-card-img" style="background: #eee; display:flex; align-items:center; justify-content:center; color:#888;">Sin imagen</div>`}
              <div class="menu-card-header">
                <div>
                  <h3 class="menu-card-title">${item.platillo_nombre || "Sin nombre"}</h3>
                  <p class="menu-card-category">${item.categoria_nombre || "Sin categoría"}</p>
                </div>
                <span class="menu-card-price">${formatPrice(item.platillo_precio)}</span>
              </div>
              <p class="menu-card-desc">${truncateText(item.platillo_descripcion || "", 100)}</p>
              ${actualizadoInfo}
              ${!disponible ? `<span class="menu-card-status">No disponible</span>` : ""}
              ${adminActions}
              ${pedidoActions}
            </div>
          `;
        })
        .join("");
    }
  }

  if (filteredItems.length === 0) {
    setMenuEmpty("No hay platillos disponibles en este momento");
  } else {
    setMenuEmpty("");
  }

  updateSortHeaders();
  renderCategoryFilter(menuState.items);
  if (typeof window.actualizarEstadoBotonesMenu === "function") {
    window.actualizarEstadoBotonesMenu();
  }
}

async function ensureMenuCategories() {
  if (menuState.categories.length > 0) {
    return;
  }

  try {
    const response = await fetch(`/api/platillos?orderBy=nombre&orderDir=ASC`);
    if (!response.ok) {
      throw new Error("Error cargando categorías");
    }
    menuState.categories = await response.json();
  } catch (error) {
    console.warn("No se pudieron cargar categorías del menú:", error);
    menuState.categories = [];
  }
}

async function loadMenu() {
  setMenuLoading(true);
  setMenuEmpty("");
  updateSortHeaders();
  try {
    await ensureMenuCategories();

    const query = [];
    if (menuState.filter.categoria_id) {
      query.push(`categoria_id=${encodeURIComponent(menuState.filter.categoria_id)}`);
    }
    if (menuState.filter.nombre) {
      query.push(`nombre=${encodeURIComponent(menuState.filter.nombre.trim())}`);
    }
    query.push(`orderBy=${encodeURIComponent(menuState.filter.orderBy)}`);
    query.push(`orderDir=${encodeURIComponent(menuState.filter.orderDir)}`);

    const response = await fetch(`/api/platillos?${query.join("&")}`);
    if (!response.ok) {
      throw new Error("Error cargando el menú");
    }
    const items = await response.json();
    renderMenu(items);
  } catch (error) {
    console.error("Error cargando menú:", error);
    setMenuEmpty("No hay platillos disponibles en este momento");
    const activeView = getActiveViewElement();
    const tableBody = activeView.querySelector(".menu-table-body") || document.getElementById("menuTableBody");
    const cardList = activeView.querySelector(".menu-card-list") || document.getElementById("menuCardList");
    if (tableBody) tableBody.innerHTML = "";
    if (cardList) cardList.innerHTML = "";
  } finally {
    setMenuLoading(false);
  }
}

function debounce(fn, delay = 250) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

function renderCategoryFilter(items) {
  const selects = document.querySelectorAll(".menu-category-filter, #menuCategoryFilter");
  if (selects.length === 0) return;

  const sourceItems = menuState.categories.length > 0 ? menuState.categories : items;
  const selectedCategory = menuState.filter.categoria_id;
  const categories = Array.from(
    new Map(
      sourceItems
        .filter((item) => item.id_categoria)
        .map((item) => [item.id_categoria, item.categoria_nombre || "Sin categoría"])
    )
  )
    .map(([id, nombre]) => ({ id, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }));

  const optionsHtml = `
    <option value="">Todas las categorías</option>
    ${categories
      .map(
        (category) => `
          <option value="${category.id}" ${selectedCategory === String(category.id) ? "selected" : ""}>
            ${category.nombre}
          </option>
        `
      )
      .join("")}
  `;

  selects.forEach(select => {
    select.innerHTML = optionsHtml;
    if (selectedCategory) {
      select.value = selectedCategory;
    }
  });
}

function updateSortHeaders() {
  const activeView = getActiveViewElement();
  const sortableHeaders = activeView.querySelectorAll("th.sortable");
  
  sortableHeaders.forEach((header) => {
    const indicator = header.querySelector(".sort-indicator");
    if (!indicator) return;

    if (header.dataset.sort === menuState.filter.orderBy) {
      indicator.textContent = menuState.filter.orderDir === "ASC" ? "▲" : "▼";
    } else {
      indicator.textContent = "";
    }
  });
}

function attachMenuControls() {
  const categorySelects = document.querySelectorAll(".menu-category-filter, #menuCategoryFilter");
  const searchInputs = document.querySelectorAll(".menu-search-input, #menuSearchInput");
  
  categorySelects.forEach(select => {
    select.addEventListener("change", (event) => {
      menuState.filter.categoria_id = event.target.value;
      loadMenu();
    });
  });

  searchInputs.forEach(input => {
    input.addEventListener(
      "input",
      debounce((event) => {
        menuState.filter.nombre = event.target.value;
        loadMenu();
      }, 250)
    );
  });

  document.addEventListener("click", (event) => {
    const header = event.target.closest("th.sortable");
    if (!header) return;

    const activeView = getActiveViewElement();
    if (!activeView.contains(header)) return;

    const field = header.dataset.sort;
    if (!field) return;

    if (menuState.filter.orderBy === field) {
      menuState.filter.orderDir = menuState.filter.orderDir === "ASC" ? "DESC" : "ASC";
    } else {
      menuState.filter.orderBy = field;
      menuState.filter.orderDir = "ASC";
    }

    loadMenu();
  });

  // ─── ESCUCHADOR DELEGADO PARA CAPTURAR LA ACCIÓN DE CANCELAR PEDIDO ───
  document.addEventListener("click", (event) => {
    const btnCancelar = event.target.closest(".btn-cancelar-pedido, #btn-cancelar-orden, [data-action='cancelar-pedido']");
    if (!btnCancelar) return;
    event.preventDefault();

    const pedidoData = {
      id: btnCancelar.getAttribute("data-id") || btnCancelar.getAttribute("data-id-pedido") || btnCancelar.getAttribute("data-pedido"),
      mesa: btnCancelar.getAttribute("data-mesa") || null,
      tipo: btnCancelar.getAttribute("data-tipo") || "Salon",
      estado: btnCancelar.getAttribute("data-estado") || "Pendiente"
    };

    confirmarAnulacionPedido(pedidoData);
  });
}

window.addEventListener("DOMContentLoaded", () => {
  cargarUsuarioLogueado();
  attachMenuControls();

  const menuSection = document.querySelector("#menu-restaurante, #menuPlatillos");

  if (menuSection && menuSection.style.display !== "none") {
    loadMenu();
  } else if (document.getElementById('tomar-pedido') && document.getElementById('tomar-pedido').style.display !== "none") {
    window.activeViewId = 'tomar-pedido';
    loadMenu();
  }
});

/* =========================================================
   UX MEJORADA
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const btnEnviar = document.getElementById("btn-enviar-pedido");

  if (btnEnviar) {
    btnEnviar.addEventListener("click", () => {
      if (btnEnviar.disabled) return;

      btnEnviar.innerHTML = `
        <i class="fas fa-spinner fa-spin"></i>
        Enviando...
      `;
      btnEnviar.style.opacity = "0.8";

      setTimeout(() => {
        btnEnviar.innerHTML = `
          <i class="fas fa-paper-plane"></i>
          Enviar a cocina
        `;
        btnEnviar.style.opacity = "1";
      }, 2500);
    });
  }

  validarEstadoBotonesEliminarPlatillos("Pendiente");

  const sidebarItems = document.querySelectorAll(".sidebar li");
  sidebarItems.forEach(item => {
    item.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    });
  });
});

function validarEstadoBotonesEliminarPlatillos(estadoPedido) {
  const container = document.getElementById("lista-platillos-pedido");
  if (!container) return;

  const botonesEliminar = container.querySelectorAll(".btn-eliminar");
  const esPendiente = estadoPedido && estadoPedido.trim().toLowerCase() === "pendiente";

  botonesEliminar.forEach((btn) => {
    btn.disabled = !esPendiente;

    if (!esPendiente) {
      btn.style.opacity = "0.5";
      btn.style.cursor = "not-allowed";
      btn.title = "No se puede eliminar, pedido enviado a cocina";
    } else {
      btn.style.opacity = "1";
      btn.style.cursor = "pointer";
      btn.removeAttribute("title");
    }

    btn.onclick = (event) => {
      if (!esPendiente) {
        event.preventDefault();
        if (typeof toast === "function") {
          toast("error", "No puedes eliminar un pedido enviado a cocina.");
        }
        return false;
      }
    };
  });
}

/* =========================================================
   SUBTAREA JIRA: MOSTRAR MODAL DE CONFIRMACIÓN PARA ANULAR PEDIDO
========================================================= */
async function confirmarAnulacionPedido(pedido) {
  // 1. Validación de Seguridad Estricta
  const estadoActual = (pedido.estado || "").trim().toLowerCase();
  if (estadoActual === "facturado") {
    await Swal.fire({
      icon: "error",
      title: "Acción no permitida",
      text: "No se puede cancelar un pedido que ya fue facturado o cerrado.",
      confirmButtonColor: "#8b2f2f"
    });
    return;
  }

  // 2. Construcción dinámica del mensaje según el tipo de pedido
  let textoMensaje = `¿Estás seguro de anular el pedido #${pedido.id_pedido || pedido.id || "X"} de Mesa ${pedido.mesa || "Y"}? Esta acción no se puede deshacer.`;
  
  if (pedido.tipo && pedido.tipo.trim().toLowerCase() === "para llevar") {
    textoMensaje = `¿Estás seguro de anular el pedido #${pedido.id_pedido || pedido.id || "X"} de tipo Para llevar? Esta acción no se puede deshacer.`;
  }

  // 3. Lanzamiento del Modal de SweetAlert2 con campo de motivo (Máx 200 caracteres)
  const { value: motivoCancelacion, isConfirmed } = await Swal.fire({
    title: "Confirmar Anulación",
    text: textoMensaje,
    icon: "warning",
    input: "textarea",
    inputPlaceholder: "Escribe el motivo de la cancelación aquí (Opcional)...",
    inputAttributes: {
      maxlength: "200",
      rows: "3"
    },
    showCancelButton: true,
    confirmButtonText: "Sí, anular pedido",
    cancelButtonText: "No, mantener pedido",
    confirmButtonColor: "#dc3545",
    cancelButtonColor: "#6c757d",
    focusCancel: true
  });

  // 4. Espacio reservado para la integración futura con la API (Próxima Subtarea)
  if (isConfirmed) {
    console.log("Anulación confirmada para el pedido ID:", pedido.id_pedido || pedido.id);
    console.log("Motivo proporcionado:", motivoCancelacion ? motivoCancelacion.trim() : "Ninguno");
    
    const idPedido = pedido.id_pedido || pedido.id;
    if (!idPedido) {
      if (typeof toast === "function") {
        toast("error", "No se encontró el ID del pedido a cancelar.");
      }
      return;
    }

    try {
      const res = await fetch(`/api/pedidos/${idPedido}/cancelar`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          motivo: motivoCancelacion ? motivoCancelacion.trim() : ""
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo cancelar el pedido");
      }

      if (typeof toast === "function") {
        toast("success", data.message || "Pedido cancelado correctamente");
      } else {
        await Swal.fire("Éxito", data.message || "Pedido cancelado correctamente", "success");
      }

      // Cerrar modal de detalle si estuviera abierto
      const modalExistente = document.getElementById("modal-detalle-pedido");
      if (modalExistente) {
        modalExistente.remove();
      }

      // Recargar la lista de pedidos activos del mesero
      if (typeof window.cargarMisPedidos === "function") {
        window.cargarMisPedidos();
      } else if (typeof cargarMisPedidos === "function") {
        cargarMisPedidos();
      }

    } catch (error) {
      console.error(error);
      if (typeof toast === "function") {
        toast("error", error.message);
      } else {
        await Swal.fire("Error", error.message, "error");
      }
    }
  }
}