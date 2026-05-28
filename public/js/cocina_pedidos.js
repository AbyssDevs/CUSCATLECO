const pedidosCocina = [
  {
    id: 105,
    mesa: 4,
    tipo: "Salon",
    horaEnvio: "2026-05-27T14:35:00",
    estado: "Pendiente",
    platillos: [
      { cantidad: 2, nombre: "Hamburguesa", notas: "sin cebolla" },
      { cantidad: 1, nombre: "Pupusas Revueltas", notas: "con curtido aparte" }
    ]
  },
  {
    id: 106,
    mesa: null,
    tipo: "Llevar",
    horaEnvio: "2026-05-27T14:42:00",
    estado: "Pendiente",
    platillos: [
      { cantidad: 3, nombre: "Pupusas de Queso", notas: "bien tostadas" },
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

function obtenerUbicacionPedido(pedido) {
  if (pedido.tipo === "Llevar" || pedido.mesa === null || pedido.mesa === undefined) {
    return "Para llevar";
  }

  return `Mesa ${pedido.mesa}`;
}

function formatearHoraEnvio(fechaHora) {
  const fecha = new Date(fechaHora);

  if (Number.isNaN(fecha.getTime())) {
    return fechaHora || "Sin hora";
  }

  return fecha.toLocaleTimeString("es-SV", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function convertirHoraAMinutos(hora) {
  const partes = String(hora).split(":");
  const horas = Number(partes[0]);
  const minutos = Number(partes[1]);

  return horas * 60 + minutos;
}

function ordenarPedidosPorHora(pedidos) {
  return [...pedidos].sort((a, b) => {
    const horaA = a.horaEnvio;
    const horaB = b.horaEnvio;

    if (
      typeof horaA === "string" &&
      typeof horaB === "string" &&
      horaA.includes(":") &&
      horaB.includes(":") &&
      !horaA.includes("T") &&
      !horaB.includes("T")
    ) {
      return convertirHoraAMinutos(horaA) - convertirHoraAMinutos(horaB);
    }

    return new Date(horaA).getTime() - new Date(horaB).getTime();
  });
}

function crearTarjetaPedido(pedido) {
  const platillosHtml = pedido.platillos
    .map((platillo) => {
      const notas = platillo.notas ? ` - ${platillo.notas}` : " - sin notas";
      return `<li>${platillo.cantidad}x ${platillo.nombre}${notas}</li>`;
    })
    .join("");

  const claseEstado = pedido.estado === "EnPreparación" ? "preparando" : "pendiente";

  return `
    <div class="card" data-id-pedido="${pedido.id}" style="width: 300px; text-align: left;">
      <div class="pedido-header">
        <h3>Pedido #${pedido.id}</h3>
        <span class="${claseEstado}">${pedido.estado}</span>
      </div>

      <p style="font-size: 16px; color: #333; margin-bottom: 8px;">
        ${obtenerUbicacionPedido(pedido)}
      </p>

      <p style="font-size: 14px; color: #666; margin-bottom: 12px;">
        <i class="fa-regular fa-clock"></i> ${formatearHoraEnvio(pedido.horaEnvio)}
      </p>

      <ul style="padding-left: 20px; color: #555;">
        ${platillosHtml}
      </ul>

      <button class="btn-editar btn-iniciar-preparacion" data-id="${pedido.id}">
        Iniciar preparación
      </button>
    </div>
  `;
}

function renderizarPedidos(pedidos) {
  const contenedor = document.getElementById("listaPedidosCocina");

  if (!contenedor) return;

  if (!pedidos || pedidos.length === 0) {
    contenedor.innerHTML = "<p>No hay pedidos pendientes</p>";
    return;
  }

  const pedidosOrdenados = ordenarPedidosPorHora(pedidos);

  contenedor.innerHTML = pedidosOrdenados
    .map((pedido) => crearTarjetaPedido(pedido))
    .join("");
}

function cambiarEstadoPedido(idPedido, nuevoEstado) {
  const pedido = pedidosCocina.find((pedido) => pedido.id === Number(idPedido));

  if (!pedido) return;

  pedido.estado = nuevoEstado;
  renderizarPedidos(pedidosCocina);
}

function configurarBotonIniciarPreparacion() {
  const contenedor = document.getElementById("listaPedidosCocina");

  if (!contenedor) return;

  contenedor.addEventListener("click", (event) => {
    const boton = event.target.closest(".btn-iniciar-preparacion");

    if (!boton) return;

    cambiarEstadoPedido(boton.dataset.id, "EnPreparación");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderizarPedidos(pedidosCocina);
  configurarBotonIniciarPreparacion();
});