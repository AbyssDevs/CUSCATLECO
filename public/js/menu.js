const menuState = {
  items: [],
  categories: [],
  filter: {
    categoria_id: "",
    nombre: "",
    orderBy: "nombre",
    orderDir: "ASC",
  },
  rawItemsSnapshot: [] // Almacena el estado de red de la última sincronización
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
  const secciones = ["tomar-pedido", "menu-restaurante", "pedidos-pendientes", "cobros", "verMesas"];
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

  if (seccion === "verMesas" && typeof cargarMesas === "function") {
    cargarMesas();
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
                  <button class="btn-activar" onclick="activarPlatillo(${item.id_platillo})"><i class="fa-solid fa-power-off"></i> Activar</button>
                  <button class="btn-desactivar" onclick="desactivarPlatillo(${item.id_platillo})"><i class="fa-solid fa-power-off"></i> Desactivar</button>
                </td>
              `;
          } else if (pedidoMode) {
              const enPedido = window.pedidoActual && window.pedidoActual.items.some(i => i.id_platillo === item.id_platillo);
              actionCol = `
                <td>
                  <button class="btn-agregar" onclick="agregarAlPedidoDesdeMenu(${item.id_platillo})" ${!disponible ? 'disabled style="opacity:0.5;cursor:not-allowed;background:#ccc;"' : 'style="background:#248a4c;color:white;"'}>
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
              const enPedido = window.pedidoActual && window.pedidoActual.items.some(i => i.id_platillo === item.id_platillo);
              pedidoActions = `
                <div class="menu-card-actions" style="margin-top: 10px;">
                  <button class="btn-agregar" onclick="agregarAlPedidoDesdeMenu(${item.id_platillo})" ${!disponible ? 'disabled style="opacity:0.5;cursor:not-allowed;background:#ccc;width:100%;"' : 'style="background:#248a4c;color:white;width:100%;"'}>
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
}

// ========================================================
// SIMULACIÓN DE DATOS (MOCK DATA) PARA FRONTEND PUERO
// ========================================================
const USE_MOCK_DATA = true;

const PLATILLOS_MOCK = [
  {
    id_platillo: 1,
    platillo_nombre: "Pupusas Revueltas",
    platillo_precio: 1.25,
    platillo_descripcion: "Pupusas tradicionales de maíz rellenas de chicharrón, frijoles y queso, servidas con curtido y salsa.",
    platillo_disponible: 1,
    platillo_imagen_url: "/uploads/pupusas.jpg",
    categoria_nombre: "Antojitos",
    id_categoria: 1,
    actualizado_por: "Carlos Guardado",
    fecha_actualizacion: "2026-05-20"
  },
  {
    id_platillo: 2,
    platillo_nombre: "Sopa de Gallina India",
    platillo_precio: 6.50,
    platillo_descripcion: "Sopa tradicional preparada con gallina india criolla, vegetales de la temporada y acompañada de porción de gallina asada.",
    platillo_disponible: 1,
    platillo_imagen_url: "/uploads/sopa.jpg",
    categoria_nombre: "Sopas",
    id_categoria: 2,
    actualizado_por: "Marta Gómez",
    fecha_actualizacion: "2026-05-19"
  },
  {
    id_platillo: 3,
    platillo_nombre: "Yuca Frita con Chicharrón",
    platillo_precio: 3.75,
    platillo_descripcion: "Porción de yuca frita acompañada de chicharrones crujientes, curtido y salsa de tomate casera.",
    platillo_disponible: 1,
    platillo_imagen_url: "/uploads/yuca.jpg",
    categoria_nombre: "Antojitos",
    id_categoria: 1,
    actualizado_por: "Carlos Guardado",
    fecha_actualizacion: "2026-05-18"
  },
  {
    id_platillo: 4,
    platillo_nombre: "Horchata de Morro",
    platillo_precio: 1.50,
    platillo_descripcion: "Bebida típica refrescante hecha a base de semilla de morro, arroz, canela y leche.",
    platillo_disponible: 1,
    platillo_imagen_url: "/uploads/horchata.jpg",
    categoria_nombre: "Bebidas",
    id_categoria: 3,
    actualizado_por: "Marta Gómez",
    fecha_actualizacion: "2026-05-20"
  },
  {
    id_platillo: 5,
    platillo_nombre: "Tamal de Elote",
    platillo_precio: 1.00,
    platillo_descripcion: "Tamal dulce elaborado con elote tierno molido, servido caliente. Opcional con crema.",
    platillo_disponible: 0,
    platillo_imagen_url: "/uploads/tamal.jpg",
    categoria_nombre: "Antojitos",
    id_categoria: 1,
    actualizado_por: "Carlos Guardado",
    fecha_actualizacion: "2026-05-15"
  }
];

async function ensureMenuCategories() {
  if (menuState.categories.length > 0) {
    return;
  }

  if (USE_MOCK_DATA) {
    const map = new Map();
    PLATILLOS_MOCK.forEach(item => {
      if (item.id_categoria) {
        map.set(item.id_categoria, item.categoria_nombre);
      }
    });
    menuState.categories = Array.from(map.entries()).map(([id, nombre]) => ({
      id_categoria: id,
      categoria_nombre: nombre
    }));
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

    let items = [];

    if (USE_MOCK_DATA) {
      // Guardar snapshot de los datos del mock antes de filtrar
      menuState.rawItemsSnapshot = JSON.parse(JSON.stringify(PLATILLOS_MOCK));

      // Simular retraso inicial de red de 200ms si no es una actualización manual
      await new Promise(resolve => setTimeout(resolve, 200));

      // Copiamos datos del mock
      let filtered = [...PLATILLOS_MOCK];

      // Filtro por categoría
      if (menuState.filter.categoria_id) {
        filtered = filtered.filter(item => String(item.id_categoria) === String(menuState.filter.categoria_id));
      }

      // Filtro por nombre
      if (menuState.filter.nombre) {
        const query = menuState.filter.nombre.toLowerCase().trim();
        filtered = filtered.filter(item =>
          item.platillo_nombre.toLowerCase().includes(query) ||
          item.platillo_descripcion.toLowerCase().includes(query)
        );
      }

      // Ordenación
      const field = menuState.filter.orderBy;
      const key = field === "precio" ? "platillo_precio" : "platillo_nombre";
      const dir = menuState.filter.orderDir === "ASC" ? 1 : -1;

      filtered.sort((a, b) => {
        if (typeof a[key] === "string") {
          return a[key].localeCompare(b[key]) * dir;
        }
        return (Number(a[key]) - Number(b[key])) * dir;
      });

      items = filtered;
    } else {
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
      items = await response.json();
    }

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
}

// ========================================================
// LÓGICA DE ACTUALIZACIÓN MANUAL (CON SPINNER Y setTimeout)
// ========================================================
function attachActualizarControl() {
  const btnActualizar = document.getElementById("btnActualizarMenu");
  const container = document.getElementById("platillosContainer");
  const loader = document.getElementById("loaderPlatillos");

  if (!btnActualizar) return;

  btnActualizar.addEventListener("click", () => {
    btnActualizar.disabled = true;
    const originalText = btnActualizar.innerHTML;
    btnActualizar.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Cargando...`;

    if (loader) loader.style.display = "flex";
    if (container) container.classList.add("loading");

    const randomDelay = Math.floor(Math.random() * 500) + 1000;

    setTimeout(async () => {
      simularCambioEnServidorSilencioso();

      await loadMenu();

      if (loader) loader.style.display = "none";
      if (container) container.classList.remove("loading");
      btnActualizar.disabled = false;
      btnActualizar.innerHTML = originalText;

      if (typeof Swal !== "undefined") {
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "Menú actualizado con éxito",
          showConfirmButton: false,
          timer: 1500
        });
      }
    }, randomDelay);
  });
}

function simularCambioEnServidorSilencioso() {
  const randomIndex = Math.floor(Math.random() * PLATILLOS_MOCK.length);
  const platillo = PLATILLOS_MOCK[randomIndex];
  platillo.platillo_disponible = platillo.platillo_disponible === 1 ? 0 : 1;
}

// ========================================================
// SISTEMA DE POLLING Y SINCRONIZACIÓN AUTOMÁTICA
// ========================================================

let pollingIntervalId = null;

function startMenuPolling() {
  if (pollingIntervalId) clearInterval(pollingIntervalId);

  pollingIntervalId = setInterval(async () => {
    await ejecutarCicloPolling();
  }, 10000);
}

function verificarCambiosEnServidor() {
  if (!menuState.rawItemsSnapshot || menuState.rawItemsSnapshot.length === 0) return false;
  if (menuState.rawItemsSnapshot.length !== PLATILLOS_MOCK.length) return true;

  for (let i = 0; i < PLATILLOS_MOCK.length; i++) {
    const sItem = PLATILLOS_MOCK[i];
    const snapshotItem = menuState.rawItemsSnapshot.find(item => item.id_platillo === sItem.id_platillo);
    
    if (!snapshotItem) return true;

    const sDisp = sItem.platillo_disponible === 1 || sItem.platillo_disponible === true;
    const snapDisp = snapshotItem.platillo_disponible === 1 || snapshotItem.platillo_disponible === true;
    if (sDisp !== snapDisp) return true;

    if (Number(sItem.platillo_precio) !== Number(snapshotItem.platillo_precio)) return true;

    if (sItem.platillo_nombre !== snapshotItem.platillo_nombre) return true;
    if (sItem.platillo_descripcion !== snapshotItem.platillo_descripcion) return true;
  }
  return false;
}

async function ejecutarCicloPolling() {
  const syncLed = document.getElementById("syncLed");
  const syncText = document.getElementById("syncText");

  if (!syncLed || !syncText) return;

  syncLed.className = "sync-led state-checking";
  syncText.textContent = "Comprobando...";

  await new Promise(resolve => setTimeout(resolve, 800));

  const hayCambios = verificarCambiosEnServidor();

  if (hayCambios) {
    console.log("[Polling] Se detectaron cambios en el servidor. Actualizando lista silenciosamente...");

    syncLed.className = "sync-led state-updated";
    syncText.textContent = "¡Actualizado!";

    await loadMenu();

    setTimeout(() => {
      syncLed.className = "sync-led state-sync";
      syncText.textContent = "Sincronizado";
    }, 2500);
  } else {
    syncLed.className = "sync-led state-sync";
    syncText.textContent = "Sincronizado";
  }
}

// ========================================================
// SIMULADOR DE CAMBIOS EN EL SERVIDOR (MODO PRUEBA / DEV)
// ========================================================
function simularCambioEnServidor() {
  if (PLATILLOS_MOCK.length === 0) return;

  const randomIndex = Math.floor(Math.random() * PLATILLOS_MOCK.length);
  const platillo = PLATILLOS_MOCK[randomIndex];

  const tipoCambio = Math.random() > 0.5 ? "disponibilidad" : "precio";

  if (tipoCambio === "disponibilidad") {
    platillo.platillo_disponible = platillo.platillo_disponible === 1 ? 0 : 1;
    console.log(`[Simulador Servidor] "${platillo.platillo_nombre}" ahora disponible = ${platillo.platillo_disponible === 1 ? "Sí" : "No"}`);
  } else {
    const variacion = (Math.random() * 1.50 - 0.75).toFixed(2);
    const precioAnterior = platillo.platillo_precio;
    platillo.platillo_precio = Math.max(0.50, Number((Number(platillo.platillo_precio) + Number(variacion)).toFixed(2)));
    console.log(`[Simulador Servidor] "${platillo.platillo_nombre}" cambió precio: $${precioAnterior} -> $${platillo.platillo_precio}`);
  }

  if (typeof Swal !== "undefined") {
    Swal.fire({
      toast: true,
      position: "bottom-start",
      icon: "info",
      title: "Cambio simulado en servidor",
      html: `Platillo: <b>${platillo.platillo_nombre}</b> modificado.<br>Espera el polling automático en 10 seg.`,
      showConfirmButton: false,
      timer: 3500
    });
  }
}

// ========================================================
// INICIALIZACIÓN
// ========================================================
window.addEventListener("DOMContentLoaded", () => {
  cargarUsuarioLogueado();

  attachMenuControls();
  
  attachActualizarControl();

  const btnSimular = document.getElementById("btnSimularCambio");
  if (btnSimular) {
    btnSimular.addEventListener("click", () => {
      simularCambioEnServidor();
    });
  }

  const menuSection = document.querySelector("#menu-restaurante, #menuPlatillos");
  if (menuSection && menuSection.style.display !== "none") {
    loadMenu();
  } else if (document.getElementById('tomar-pedido') && document.getElementById('tomar-pedido').style.display !== "none") {
    loadMenu();
  }

  startMenuPolling();
});