const menuState = {
  items: [],
};

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
  const secciones = ["tomar-pedido", "menu-restaurante", "pedidos-pendientes", "cobros"];
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
    if (userName) userName.textContent = usuario.nombre || "Usuario";
    if (userRole) userRole.textContent = usuario.rol || "Sin rol";

    const bienvenida = document.getElementById("bienvenidaUsuario");
    if (bienvenida) {
      bienvenida.innerHTML = `Bienvenido, <strong>${usuario.nombre}</strong> (${usuario.rol})`;
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

function applyMenuFilters() {
  const searchInput = document.getElementById("menuSearch");
  const categorySelect = document.getElementById("menuCategory");
  let filtered = [...menuState.items];

  if (searchInput && searchInput.value.trim()) {
    const query = searchInput.value.trim().toLowerCase();
    filtered = filtered.filter((item) => {
      const nombre = String(item.platillo_nombre || "").toLowerCase();
      const descripcion = String(item.platillo_descripcion || "").toLowerCase();
      return nombre.includes(query) || descripcion.includes(query);
    });
  }

  if (categorySelect && categorySelect.value && categorySelect.value !== "todos") {
    filtered = filtered.filter((item) => item.categoria_nombre === categorySelect.value);
  }

  return filtered;
}

function renderMenu(items) {
  menuState.items = items;
  const tableBody = document.getElementById("menuTableBody");
  const cardList = document.getElementById("menuCardList");
  const categorySelect = document.getElementById("menuCategory");

  if (categorySelect) {
    const categories = [...new Set(items.map((item) => item.categoria_nombre).filter(Boolean))];
    categorySelect.innerHTML = `
      <option value="todos">Todas las categorías</option>
      ${categories.map((categoria) => `<option value="${categoria}">${categoria}</option>`).join("")}
    `;
  }

  const filteredItems = applyMenuFilters();

  if (tableBody) {
    if (filteredItems.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="4" style="padding: 18px; text-align: center;">No hay platillos disponibles en este momento</td>
        </tr>
      `;
    } else {
      tableBody.innerHTML = filteredItems
        .map((item) => {
          const disponible = item.platillo_disponible === true || item.platillo_disponible === 1 || item.platillo_disponible === "1";
          return `
            <tr>
              <td>
                <div style="display:flex; flex-direction:column; gap:6px;">
                  <strong>${item.platillo_nombre || "Sin nombre"}</strong>
                  ${!disponible ? `<span class="menu-card-status">No disponible</span>` : ""}
                </div>
              </td>
              <td class="categoria-col">${item.categoria_nombre || "-"}</td>
              <td class="descripcion-col">${truncateText(item.platillo_descripcion || "", 100)}</td>
              <td class="precio-col">${formatPrice(item.platillo_precio)}</td>
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
          return `
            <div class="menu-card">
              <div class="menu-card-header">
                <div>
                  <h3 class="menu-card-title">${item.platillo_nombre || "Sin nombre"}</h3>
                  <p class="menu-card-category">${item.categoria_nombre || "Sin categoría"}</p>
                </div>
                <span class="menu-card-price">${formatPrice(item.platillo_precio)}</span>
              </div>
              <p class="menu-card-desc">${truncateText(item.platillo_descripcion || "", 100)}</p>
              ${!disponible ? `<span class="menu-card-status">No disponible</span>` : ""}
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
}

async function loadMenu() {
  setMenuLoading(true);
  setMenuEmpty("");
  try {
    const response = await fetch("/api/platillos?orderBy=nombre&orderDir=ASC");
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

function initializeMenuEvents() {
  const searchInput = document.getElementById("menuSearch");
  const categorySelect = document.getElementById("menuCategory");

  if (searchInput) {
    searchInput.addEventListener("input", () => renderMenu(menuState.items));
  }
  if (categorySelect) {
    categorySelect.addEventListener("change", () => renderMenu(menuState.items));
  }
}

window.addEventListener("DOMContentLoaded", () => {
  cargarUsuarioLogueado();
  initializeMenuEvents();

  const menuSection = document.getElementById("menu-restaurante");
  if (menuSection && menuSection.style.display !== "none") {
    loadMenu();
  }
});
