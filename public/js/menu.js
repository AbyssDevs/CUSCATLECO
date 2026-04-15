const menuState = {
  items: [],
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

async function editarPlatillo(id) {
  try {
    const response = await fetch(`/api/platillos/${id}`);
    const platillo = await response.json();

    if (!response.ok) {
      throw new Error(platillo.error || "Error cargando el platillo");
    }

    if (!platillo.platillo_disponible) {
      alert("Error: solo se pueden editar platillos activos");
      return;
    }

    document.getElementById("platillo_nombre").value = platillo.platillo_nombre || "";
    document.getElementById("platillo_descripcion").value = platillo.platillo_descripcion || "";
    document.getElementById("platillo_precio").value = platillo.platillo_precio || "";
    document.getElementById("platillo_imagen_url").value = platillo.platillo_imagen_url || "";
    document.getElementById("id_categoria").value = platillo.id_categoria || "1";
    document.getElementById("platillo_disponible").checked = !!platillo.platillo_disponible;

    window.platilloEditando = id;
    const btn = document.getElementById("btnRegistrarPlatillo");
    if (btn) btn.innerText = "Actualizar platillo";

    mostrar("registrarPlatillo");

    const titulo = document.querySelector("#registrarPlatillo h2");
    if (titulo) {
      titulo.innerHTML = `✏️ Editando platillo: <span style="color: #ffffff; font-size: 1.2rem;">${platillo.platillo_nombre}</span>`;

      let cancelBtn = document.getElementById("cancelarEdicionPlatillo");
      if (!cancelBtn) {
        cancelBtn = document.createElement("button");
        cancelBtn.id = "cancelarEdicionPlatillo";
        cancelBtn.innerText = "Cancelar edición";
        cancelBtn.style.marginLeft = "1rem";
        cancelBtn.style.padding = "0.3rem 1rem";
        cancelBtn.style.background = "#dc3545";
        cancelBtn.style.color = "white";
        cancelBtn.style.border = "none";
        cancelBtn.style.borderRadius = "5px";
        cancelBtn.style.cursor = "pointer";
        cancelBtn.onclick = cancelarEdicionPlatillo;
      }
      if (!titulo.contains(cancelBtn)) {
        titulo.appendChild(cancelBtn);
      }
    }

    document.getElementById("registrarPlatillo").scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    console.error("Error editando platillo:", error);
    alert(error.message || "Error al intentar editar el platillo.");
  }
}

function cancelarEdicionPlatillo() {
  limpiarFormularioPlatillo();
  window.platilloEditando = null;
  const btn = document.getElementById("btnRegistrarPlatillo");
  if (btn) btn.innerText = "Crear Platillo";

  const titulo = document.querySelector("#registrarPlatillo h2");
  if (titulo) {
    titulo.innerHTML = "Registrar Platillo";
  }

  const cancelBtn = document.getElementById("cancelarEdicionPlatillo");
  if (cancelBtn) cancelBtn.remove();

  mostrar("menuPlatillos");
}

function limpiarFormularioPlatillo() {
  document.getElementById("platillo_nombre").value = "";
  document.getElementById("platillo_descripcion").value = "";
  document.getElementById("platillo_precio").value = "";
  document.getElementById("platillo_imagen_url").value = "";
  document.getElementById("id_categoria").value = "1";
  document.getElementById("platillo_disponible").checked = true;
}

async function activarPlatillo(id) {
  try {
    const response = await fetch(`/api/platillos/${id}/estado`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ platillo_disponible: true }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "No se pudo activar el platillo");
    }

    loadMenu();
  } catch (error) {
    console.error("Error activando platillo:", error);
    alert(error.message || "Error al activar el platillo.");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  cargarUsuarioLogueado();

  const menuSection = document.getElementById("menu-restaurante");
  if (menuSection && menuSection.style.display !== "none") {
    loadMenu();
  }
});
