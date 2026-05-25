import { apiFetch } from "./api.js";

const contenedorPedidos =
  document.getElementById("contenedor-pedidos");

// =====================================
// INICIO
// =====================================

document.addEventListener("DOMContentLoaded", () => {

  cargarPedidos();

  // Auto refresco cada 10 segundos
  setInterval(() => {

    cargarPedidos();

  }, 10000);

});

// =====================================
// CARGAR PEDIDOS
// =====================================

async function cargarPedidos() {

  try {

    contenedorPedidos.innerHTML = `
      <div class="text-center py-5">

        <div class="spinner-border text-warning"></div>

      </div>
    `;

    const pedidos = await apiFetch(
      "/pedidos/cocina/pendientes"
    );

    renderPedidos(pedidos);

  } catch (error) {

    console.error(error);

    contenedorPedidos.innerHTML = `
      <div class="alert alert-danger">

        Error al cargar pedidos

      </div>
    `;

  }

}

// =====================================
// RENDER PEDIDOS
// =====================================

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

  pedidos.forEach((pedido) => {

    const card = document.createElement("div");

    card.className =
      "card shadow-sm mb-4 border-0";

    // =========================
    // BADGE ESTADO
    // =========================

    let badgeEstado = "";

    if (pedido.pedido_estado === "Pendiente") {

      badgeEstado = `
        <span class="badge bg-warning text-dark">
          Pendiente
        </span>
      `;

    } else if (
      pedido.pedido_estado === "En preparación"
    ) {

      badgeEstado = `
        <span class="badge bg-primary">
          En preparación
        </span>
      `;

    } else {

      badgeEstado = `
        <span class="badge bg-success">
          Preparado
        </span>
      `;

    }

    // =========================
    // BOTON ACCION
    // =========================

    let botonAccion = "";

    if (pedido.pedido_estado === "Pendiente") {

      botonAccion = `
        <button
          class="btn btn-warning w-100 btn-cambiar-estado"
          data-id="${pedido.id_pedido}"
          data-estado="En preparación"
        >
          Iniciar preparación
        </button>
      `;

    } else if (
      pedido.pedido_estado === "En preparación"
    ) {

      botonAccion = `
        <button
          class="btn btn-success w-100 btn-cambiar-estado"
          data-id="${pedido.id_pedido}"
          data-estado="Preparado"
        >
          Marcar como listo
        </button>
      `;

    }

    // =========================
    // PLATILLOS
    // =========================

    const platillosHTML =
      pedido.platillos.map((platillo) => {

        return `
          <li class="list-group-item">

            <div class="d-flex justify-content-between">

              <div>

                <strong>
                  ${platillo.nombre}
                </strong>

                <br>

                <small class="text-muted">
                  Cantidad: ${platillo.cantidad}
                </small>

                ${
                  platillo.notas
                    ? `
                      <div class="mt-1">

                        <small class="text-danger">
                          Nota: ${platillo.notas}
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

    // =========================
    // HTML CARD
    // =========================

    card.innerHTML = `
      <div class="card-body">

        <div
          class="d-flex justify-content-between align-items-center mb-3"
        >

          <div>

            <h5 class="mb-1">
              Pedido #${pedido.id_pedido}
            </h5>

            <small class="text-muted">
              ${pedido.mesa || "Pedido para llevar"}
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

        <div
          class="d-flex justify-content-between align-items-center mb-3"
        >

          <strong>Total:</strong>

          <span class="fw-bold">
            $${Number(
              pedido.pedido_total || 0
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

// =====================================
// EVENTOS BOTONES
// =====================================

function activarEventosEstado() {

  const botones = document.querySelectorAll(
    ".btn-cambiar-estado"
  );

  botones.forEach((boton) => {

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

// =====================================
// CAMBIAR ESTADO
// =====================================

async function cambiarEstado(
  id_pedido,
  estado
) {

  try {

    const confirmar = confirm(

      estado === "En preparación"
        ? "¿Iniciar preparación del pedido?"
        : "¿Marcar pedido como preparado?"

    );

    if (!confirmar) return;

    await apiFetch(
      `/pedidos/cocina/${id_pedido}/estado`,
      {
        method: "PUT",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          nuevoEstado: estado
        })
      }
    );

    alert("Estado actualizado correctamente");

    cargarPedidos();

  } catch (error) {

    console.error(error);

    alert(
      error.message ||
      "Error al cambiar estado"
    );

  }

}

// =====================================
// FORMATEAR FECHA
// =====================================

function formatearFecha(fecha) {

  if (!fecha) {
    return "Fecha no disponible";
  }

  const f = new Date(fecha);

  return f.toLocaleString("es-SV", {
    dateStyle: "short",
    timeStyle: "short"
  });

}