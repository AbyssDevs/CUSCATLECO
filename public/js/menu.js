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

function isAdminMenuPage() {
  return document.querySelector("#menuPlatillos[data-admin='true']") !== null;
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

  if (seccion === "menu-restaurante") {
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

function setMenuLoading(show) {
  const loading = document.getElementById("menuLoading");
  if (loading) loading.style.display = show ? "flex" : "none";
}

function setMenuEmpty(message) {
  const empty = document.getElementById("menuEmpty");
  if (!empty) return;
  empty.textContent = message;
  empty.style.display = message ? "flex" : "none";
}

function renderMenu(items) {
  menuState.items = items;
  const tableBody = document.getElementById("menuTableBody");
  const cardList = document.getElementById("menuCardList");

  const filteredItems = [...items];

  const adminMode = isAdminMenuPage();

  if (tableBody) {
    if (filteredItems.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="${adminMode ? 6 : 4}" style="padding: 18px; text-align: center;">No hay platillos disponibles en este momento</td>
        </tr>
      `;
    } else {
      tableBody.innerHTML = filteredItems
        .map((item) => {
          const disponible = item.platillo_disponible === true || item.platillo_disponible === 1 || item.platillo_disponible === "1";
          const actualizadoInfo = item.actualizado_por && item.fecha_actualizacion
            ? `<span class="menu-item-meta">Actualizado por ${item.actualizado_por} el ${item.fecha_actualizacion}</span>`
            : "";
          return `
            <tr>
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
              ${adminMode ? `
                <td><button class="btn-editar" onclick="editarPlatillo(${item.id_platillo})"><i class="fa-solid fa-pen"></i> Editar</button></td>
                <td><button class="btn-activar" onclick="activarPlatillo(${item.id_platillo})"><i class="fa-solid fa-power-off"></i> Activar</button></td>
                <td><button class="btn-desactivar" onclick="desactivarPlatillo(${item.id_platillo})"><i class="fa-solid fa-power-off"></i> Desactivar</button></td>
              ` : ""}
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
          return `
            <div class="menu-card">
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
              ${adminMode ? `
                <div class="menu-card-actions">
                  <button class="btn-editar" onclick="editarPlatillo(${item.id_platillo})"><i class="fa-solid fa-pen"></i> Editar</button>
                  <button class="btn-activar" onclick="activarPlatillo(${item.id_platillo})"><i class="fa-solid fa-power-off"></i> Activar</button>
                  <button class="btn-desactivar" onclick="desactivarPlatillo(${item.id_platillo})"><i class="fa-solid fa-trash"></i> Eliminar</button>
                </div>
              ` : ""}
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
    const tableBody = document.getElementById("menuTableBody");
    const cardList = document.getElementById("menuCardList");
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
  const select = document.getElementById("menuCategoryFilter");
  if (!select) return;

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

  select.innerHTML = `
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

  if (selectedCategory) {
    select.value = selectedCategory;
  }
}

function updateSortHeaders() {
  const sortableHeaders = document.querySelectorAll("#menu-restaurante th.sortable, #menuPlatillos th.sortable");
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
  const categorySelect = document.getElementById("menuCategoryFilter");
  const searchInput = document.getElementById("menuSearchInput");
  const sortableHeaders = document.querySelectorAll("#menu-restaurante th.sortable, #menuPlatillos th.sortable");

  if (categorySelect) {
    categorySelect.addEventListener("change", (event) => {
      menuState.filter.categoria_id = event.target.value;
      loadMenu();
    });
  }

  if (searchInput) {
    searchInput.addEventListener(
      "input",
      debounce((event) => {
        menuState.filter.nombre = event.target.value;
        loadMenu();
      }, 250)
    );
  }

  sortableHeaders.forEach((header) => {
    header.addEventListener("click", () => {
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
  });
}

// ─── CUS-156: Subtotal automático ───────────────────────────────────────────

let platillosDisponibles = [];

async function cargarPlatillosParaPedido() {
    try {
        const res = await fetch('/api/platillos');
        if (!res.ok) throw new Error('Error cargando platillos');
        platillosDisponibles = await res.json();
        // Si ya existe una fila, poblarla
        document.querySelectorAll('.select-platillo').forEach(poblarSelectPlatillo);
    } catch (err) {
        console.error('Error cargando platillos para pedido:', err);
    }
}

function poblarSelectPlatillo(select) {
    const valorActual = select.value;
    select.innerHTML = '<option value="">Seleccione un platillo...</option>';
    platillosDisponibles.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id_platillo;
        opt.textContent = `${p.platillo_nombre} — ${formatPrice(p.platillo_precio)}`;
        opt.dataset.precio = p.platillo_precio;
        select.appendChild(opt);
    });
    if (valorActual) select.value = valorActual;
}

function actualizarSubtotalFila(fila) {
    const select   = fila.querySelector('.select-platillo');
    const cantidad = parseInt(fila.querySelector('.input-cantidad').value) || 0;
    const precio   = parseFloat(select.options[select.selectedIndex]?.dataset.precio) || 0;
    fila.querySelector('.subtotal-fila').textContent = formatPrice(precio * cantidad);
    actualizarTotalPedido();
}

function actualizarTotalPedido() {
    let total = 0;
    document.querySelectorAll('.fila-platillo').forEach(fila => {
        const select   = fila.querySelector('.select-platillo');
        const cantidad = parseInt(fila.querySelector('.input-cantidad').value) || 0;
        const precio   = parseFloat(select.options[select.selectedIndex]?.dataset.precio) || 0;
        total += precio * cantidad;
    });
    const el = document.getElementById('total-pedido');
    if (el) el.textContent = formatPrice(total);
}

function agregarFilaPlatillo() {
    const div = document.createElement('div');
    div.className = 'fila-platillo';
    div.style.cssText = 'display:flex; align-items:center; gap:10px; margin-bottom:10px;';
    div.innerHTML = `
        <select class="select-platillo" style="flex:2;">
            <option value="">Seleccione un platillo...</option>
        </select>
        <input type="number" class="input-cantidad" min="1" value="1" style="flex:1; width:60px;">
        <span class="subtotal-fila" style="min-width:75px; font-weight:600;">$0.00</span>
        <button class="btn-eliminar" onclick="eliminarFila(this)">
            <i class="fa-solid fa-trash"></i>
        </button>
    `;
    const select = div.querySelector('.select-platillo');
    const inputCant = div.querySelector('.input-cantidad');
    poblarSelectPlatillo(select);
    select.addEventListener('change', () => actualizarSubtotalFila(div));
    inputCant.addEventListener('input',  () => actualizarSubtotalFila(div));
    document.getElementById('lista-platillos-pedido').appendChild(div);
}

function eliminarFila(btn) {
    const estadoPedido = "Pendiente";

    // Si el pedido ya fue enviado
    if (estadoPedido.toLowerCase() !== "pendiente") {

        btn.disabled = true;
        btn.title = "No se puede eliminar, pedido ya enviado a cocina";

        if (typeof toast === "function") {
            toast("error", "No se puede eliminar, pedido ya enviado a cocina");
        } else {
            alert("No se puede eliminar, pedido ya enviado a cocina");
        }

        return;
    }

    const filas = document.querySelectorAll('.fila-platillo');

    if (filas.length > 1) {
        btn.closest('.fila-platillo').remove();
        actualizarTotalPedido();
    }
}

window.addEventListener("DOMContentLoaded", () => {
  cargarUsuarioLogueado();

  attachMenuControls();

  const menuSection = document.querySelector("#menu-restaurante, #menuPlatillos");
  if (menuSection && menuSection.style.display !== "none") {
    loadMenu();
  }

  // CUS-156: Crear primera fila de platillo y cargar datos del API
  agregarFilaPlatillo();
  cargarPlatillosParaPedido();

  // CUS-158: Auto-guardar notas al escribir
  const notasTextarea = document.getElementById('notas-pedido');
  if (notasTextarea) notasTextarea.addEventListener('input', autoGuardarNotas);
});

window.notasPedidoActual = '';

const autoGuardarNotas = debounce(() => {
    window.notasPedidoActual = document.getElementById('notas-pedido')?.value || '';
    mostrarEstadoNotas('💾 Guardado automáticamente');
}, 1000);

function guardarNotasManual() {
    window.notasPedidoActual = document.getElementById('notas-pedido')?.value || '';
    mostrarEstadoNotas('✓ Notas guardadas');
}

function mostrarEstadoNotas(msg) {
    const el = document.getElementById('estado-notas');
    if (!el) return;
    el.textContent = msg;
    setTimeout(() => { el.textContent = ''; }, 2500);
}