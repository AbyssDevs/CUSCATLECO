const pedidosCocina = [
  {
    id: 1,
    mesa: 4,
    tipo: "Salon",
    horaEnvio: "2026-05-27T18:20:00",
    estado: "Pendiente",
    platillos: [
      { cantidad: 2, nombre: "Hamburguesa", notas: "sin cebolla" },
      { cantidad: 1, nombre: "Pupusas Revueltas", notas: "con curtido aparte" }
    ]
  },
  {
    id: 2,
    mesa: null,
    tipo: "Llevar",
    horaEnvio: "2026-05-27T18:35:00",
    estado: "Pendiente",
    platillos: [
      { cantidad: 3, nombre: "Pupusas de Queso", notas: "" },
      { cantidad: 2, nombre: "Horchata", notas: "sin hielo" }
    ]
  }
];

function mostrarMenu(seccion) {
  const secciones = ["resumen", "ordenes"];

  secciones.forEach((id) => {
    const elemento = document.getElementById(id);
    if (elemento) elemento.style.display = "none";
  });

  const vista = document.getElementById(seccion);
  if (vista) vista.style.display = "block";
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

function escaparTexto(texto) {
  return String(texto || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatearHora(fechaHora) {
  const fecha = new Date(fechaHora);

  if (Number.isNaN(fecha.getTime())) {
    return fechaHora || "Sin hora";
  }

  return fecha.toLocaleTimeString("es-SV", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function obtenerTextoMesa(pedido) {
  if (pedido.tipo === "Llevar" || pedido.mesa === null || pedido.mesa === undefined) {
    return "Para llevar";
  }

  return `Mesa ${pedido.mesa}`;
}

function obtenerPedidosPendientes() {
  return pedidosCocina
    .filter((pedido) => pedido.estado !== "Preparado" && pedido.estado !== "Cancelado")
    .sort((a, b) => new Date(a.horaEnvio) - new Date(b.horaEnvio));
}

function renderizarPedidos(pedidos) {
  const contenedor = document.getElementById("listaPedidosCocina");

  if (!contenedor) return;

  const pedidosPendientes = pedidos
    .filter((pedido) => pedido.estado !== "Preparado" && pedido.estado !== "Cancelado")
    .sort((a, b) => new Date(a.horaEnvio) - new Date(b.horaEnvio));

  if (pedidosPendientes.length === 0) {
    contenedor.innerHTML = "<p>No hay pedidos pendientes</p>";
    return;
  }

  contenedor.innerHTML = pedidosPendientes
    .map((pedido) => {
      const claseEstado = pedido.estado === "EnPreparación" ? "preparando" : "pendiente";

      const listaPlatillos = pedido.platillos
        .map((platillo) => {
          const notas = platillo.notas ? ` - ${escaparTexto(platillo.notas)}` : "";
          return `<li>${platillo.cantidad}x ${escaparTexto(platillo.nombre)}${notas}</li>`;
        })
        .join("");

      return `
        <div class="card pedido-cocina-card" data-id="${pedido.id}" style="width: 300px; text-align: left; cursor: pointer;">
          <div class="pedido-header">
            <h3>Pedido #${pedido.id}</h3>
            <span class="${claseEstado}">${pedido.estado}</span>
          </div>

          <p style="font-size: 16px; color: #333; margin-bottom: 8px;">
            ${obtenerTextoMesa(pedido)}
          </p>

          <p style="font-size: 14px; color: #666; margin-bottom: 12px;">
            <i class="fa-regular fa-clock"></i> ${formatearHora(pedido.horaEnvio)}
          </p>

          <ul style="padding-left: 20px; color: #555;">
            ${listaPlatillos}
          </ul>

          <div class="detalle-pedido" style="display: none; margin-top: 12px; color: #555;">
            <strong>Detalle completo:</strong>
            <p style="font-size: 14px; margin-top: 6px;">
              Estado actual: ${pedido.estado}<br>
              Enviado a cocina: ${formatearHora(pedido.horaEnvio)}
            </p>
          </div>

          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 15px;">
            <button class="btn-editar" data-accion="iniciar" data-id="${pedido.id}">
              Iniciar preparación
            </button>

            <button class="btn-completar" data-accion="preparado" data-id="${pedido.id}">
              Marcar como preparado
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

function cambiarEstadoPedido(idPedido, nuevoEstado) {
  const pedido = pedidosCocina.find((item) => item.id === Number(idPedido));

  if (!pedido) return;

  pedido.estado = nuevoEstado;
  actualizarListaPedidos();
}

function actualizarListaPedidos() {
  const pedidosPendientes = obtenerPedidosPendientes();
  renderizarPedidos(pedidosPendientes);
}

document.addEventListener("DOMContentLoaded", () => {
  const btnActualizar = document.getElementById("btnActualizarPedidos");
  const listaPedidos = document.getElementById("listaPedidosCocina");

  if (btnActualizar) {
    btnActualizar.addEventListener("click", actualizarListaPedidos);
  }

  if (listaPedidos) {
    listaPedidos.addEventListener("click", (event) => {
      const boton = event.target.closest("button");

      if (boton) {
        event.stopPropagation();

        const idPedido = boton.dataset.id;
        const accion = boton.dataset.accion;

        if (accion === "iniciar") {
          cambiarEstadoPedido(idPedido, "EnPreparación");
        }

        if (accion === "preparado") {
          cambiarEstadoPedido(idPedido, "Preparado");
        }

        return;
      }

      const tarjeta = event.target.closest(".pedido-cocina-card");
      if (!tarjeta) return;

      const detalle = tarjeta.querySelector(".detalle-pedido");
      if (detalle) {
        detalle.style.display = detalle.style.display === "none" ? "block" : "none";
      }
    });
  }

  actualizarListaPedidos();

  setInterval(actualizarListaPedidos, 10000);
});