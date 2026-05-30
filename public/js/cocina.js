import { apiFetch } from "./api.js";

const contenedorPedidos =
  document.getElementById("contenedor-pedidos");

let pedidosGlobal = [];

// ================================
// INIT
// ================================
document.addEventListener("DOMContentLoaded", () => {

  cargarPedidos();

  setupEventListeners();

  // Auto refresco cada 10 segundos
  setInterval(async () => {

    await cargarPedidos();

  }, 10000);

});

// ================================
// EVENTOS
// ================================
function setupEventListeners() {

  const filtroEstado = document.getElementById(
    "filtroEstadoPlatillos"
  );

  if (filtroEstado) {

    filtroEstado.addEventListener("change", () => {

      renderPedidos(
        filtrarPedidos()
      );

    });

  }

  const btnActualizar = document.getElementById(
    "btnActualizarPedidos"
  );

  if (btnActualizar) {

    btnActualizar.addEventListener("click", async () => {

      await cargarPedidos();

    });

  }

}

// ================================
// CARGAR PEDIDOS
// ================================
async function cargarPedidos() {

  try {

    mostrarLoading();

    const pedidos = await apiFetch(
      "/pedidos/cocina/pendientes"
    );

    pedidosGlobal = pedidos;

    actualizarDashboard();

    renderPedidos(
      filtrarPedidos()
    );

  } catch (error) {

    console.error(error);

    contenedorPedidos.innerHTML = `
      <div class="alert alert-danger">
        Error al cargar pedidos
      </div>
    `;

  }

}

// ================================
// LOADING
// ================================
function mostrarLoading() {

  contenedorPedidos.innerHTML = `
    <div class="text-center py-5">

      <div class="spinner-border text-warning"></div>

      <div class="mt-3">
        Cargando pedidos...
      </div>

    </div>
  `;

}

// ================================
// FILTRAR PEDIDOS
// ================================
function filtrarPedidos() {

  const filtroEstado = document.getElementById(
    "filtroEstadoPlatillos"
  );

  if (!filtroEstado) {
    return pedidosGlobal;
  }

  const filtro = filtroEstado.value;

  if (filtro === "todos") {
    return pedidosGlobal;
  }

  return pedidosGlobal.filter((pedido) => {

    if (
      filtro === "Pendiente" &&
      pedido.pedido_estado === "Pendiente"
    ) {
      return true;
    }

    if (
      filtro === "En preparación" &&
      pedido.pedido_estado === "EnPreparacion"
    ) {
      return true;
    }

    if (
      filtro === "Preparado" &&
      pedido.pedido_estado === "Listo"
    ) {
      return true;
    }

    return false;

  });

}

// ================================
// DASHBOARD
// ================================
function actualizarDashboard() {

  const pendientes = pedidosGlobal.filter(
    p => p.pedido_estado === "Pendiente"
  ).length;

  const preparando = pedidosGlobal.filter(
    p => p.pedido_estado === "EnPreparacion"
  ).length;

  const listos = pedidosGlobal.filter(
    p => p.pedido_estado === "Listo"
  ).length;

  const pendientesHTML =
    document.getElementById("ordenesPendientes");

  const preparandoHTML =
    document.getElementById("ordenesPreparando");

  const listosHTML =
    document.getElementById("ordenesListos");

  if (pendientesHTML) {
    pendientesHTML.textContent = pendientes;
  }

  if (preparandoHTML) {
    preparandoHTML.textContent = preparando;
  }

  if (listosHTML) {
    listosHTML.textContent = listos;
  }

}

// ================================
// RENDER PEDIDOS
// ================================
function renderPedidos(pedidos) {

  if (!pedidos || pedidos.length === 0) {

    contenedorPedidos.innerHTML = `
      <div class="alert alert-info text-center">
        No hay pedidos pendientes
      </div>
    `;

    return;
  }

  contenedorPedidos.innerHTML = "";

  pedidos.forEach(pedido => {

    const card = document.createElement("div");

    card.className =
      "card shadow-sm mb-4 border-0";

    const badgeEstado =
      obtenerBadgeEstado(
        pedido.pedido_estado
      );

    const botonAccion =
      obtenerBotonAccion(
        pedido
      );

    const platillosHTML =
      pedido.platillos.map(platillo => {

        return `
          <li class="list-group-item">

            <div class="d-flex justify-content-between">

              <div>

                <strong>
                  ${platillo.nombre}
                </strong>

                <br>

                <small class="text-muted">
                  Cantidad:
                  ${platillo.cantidad}
                </small>

                ${
                  platillo.notas
                    ? `
                      <div class="mt-1">

                        <small class="text-danger">
                          Nota:
                          ${platillo.notas}
                        </small>

                      </div>
                    `
                    : ""
                }

              </div>

            </div>

          </li>
        `;

      }).join("");

    card.innerHTML = `
      <div class="card-body">

        <div class="d-flex justify-content-between align-items-center mb-3">

          <div>

            <h5 class="mb-1">
              Pedido #${pedido.id_pedido}
            </h5>

            <small class="text-muted">
              ${pedido.mesa}
            </small>

          </div>

          ${badgeEstado}

        </div>

        <div class="mb-3">

          <small class="text-muted">
            ${formatearFecha(
              pedido.pedido_fecha_hora
            )}
          </small>

        </div>

        <ul class="list-group mb-3">

          ${platillosHTML}

        </ul>

        <div class="d-flex justify-content-between align-items-center mb-3">

          <strong>Total:</strong>

          <span class="fw-bold">
            $${Number(
              pedido.pedido_total
            ).toFixed(2)}
          </span>

        </div>

        ${botonAccion}

      </div>
    `;

    contenedorPedidos.appendChild(card);

  });

  activarEventosEstado();

}

// ================================
// BADGES
// ================================
function obtenerBadgeEstado(estado) {

  if (estado === "Pendiente") {

    return `
      <span class="badge bg-warning text-dark">
        Pendiente
      </span>
    `;

  }

  if (estado === "EnPreparacion") {

    return `
      <span class="badge bg-primary">
        En preparación
      </span>
    `;

  }

  if (estado === "Listo") {

    return `
      <span class="badge bg-success">
        Listo
      </span>
    `;

  }

  return `
    <span class="badge bg-secondary">
      ${estado}
    </span>
  `;

}

// ================================
// BOTONES
// ================================
function obtenerBotonAccion(pedido) {

  if (pedido.pedido_estado === "Pendiente") {

    return `
      <button
        class="btn btn-warning w-100 btn-cambiar-estado"
        data-id="${pedido.id_pedido}"
        data-estado="EnPreparacion"
      >
        Iniciar preparación
      </button>
    `;

  }

  if (
    pedido.pedido_estado === "EnPreparacion"
  ) {

    return `
      <button
        class="btn btn-success w-100 btn-cambiar-estado"
        data-id="${pedido.id_pedido}"
        data-estado="Listo"
      >
        Marcar como listo
      </button>
    `;

  }

  return `
    <button
      class="btn btn-secondary w-100"
      disabled
    >
      Finalizado
    </button>
  `;

}

// ================================
// EVENTOS BOTONES
// ================================
function activarEventosEstado() {

  const botones = document.querySelectorAll(
    ".btn-cambiar-estado"
  );

  botones.forEach(boton => {

    boton.addEventListener("click", async () => {

      const id_pedido =
        boton.dataset.id;

      const estado =
        boton.dataset.estado;

      await cambiarEstado(
        id_pedido,
        estado
      );

    });

  });

}

// ================================
// CAMBIAR ESTADO
// ================================
async function cambiarEstado(
  id_pedido,
  estado
) {

  try {

    const confirmar = await Swal.fire({

      title: "Confirmar acción",

      text:
        estado === "EnPreparacion"
          ? "¿Iniciar preparación del pedido?"
          : "¿Marcar pedido como listo?",

      icon: "question",

      showCancelButton: true,

      confirmButtonText: "Sí",

      cancelButtonText: "Cancelar",

      confirmButtonColor: "#7a1d1d"

    });

    if (!confirmar.isConfirmed) {
      return;
    }

    await apiFetch(
      `/pedidos/cocina/${id_pedido}/estado`,
      {
        method: "PUT",

        body: JSON.stringify({
          nuevoEstado: estado
        })
      }
    );

    toast(
      "success",
      estado === "EnPreparacion"
        ? "Pedido en preparación"
        : "Pedido marcado como listo"
    );

    await cargarPedidos();

  } catch (error) {

    console.error(error);

    toast(
      "error",
      error.message ||
      "Error al cambiar estado"
    );

  }

}

// ================================
// FORMATEAR FECHA
// ================================
function formatearFecha(fecha) {

  const f = new Date(fecha);

  return f.toLocaleString(
    "es-SV",
    {
      dateStyle: "short",
      timeStyle: "short"
    }
  );

}

// ================================
// MENÚ LATERAL
// ================================
window.mostrarMenu = function(id) {

  document
    .querySelectorAll(".contenido > div")
    .forEach((section) => {

      if (
        section.id === "resumen" ||
        section.id === "ordenes"
      ) {

        section.style.display =
          section.id === id
            ? "block"
            : "none";

      }

    });

  cerrarMenuMobile();

};

window.toggleMenu = function() {

  const sidebar =
    document.getElementById("sidebar");

  const backdrop =
    document.getElementById("menuBackdrop");

  sidebar.classList.toggle("show");

  backdrop.classList.toggle("show");

};

function cerrarMenuMobile() {

  const sidebar =
    document.getElementById("sidebar");

  const backdrop =
    document.getElementById("menuBackdrop");

  sidebar.classList.remove("show");

  backdrop.classList.remove("show");

}

// ================================
// CERRAR SESIÓN
// ================================
window.cerrarSesion = function() {

  localStorage.clear();

  window.location.href = "/login.html";

};