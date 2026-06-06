window.tipoPedidoCajero = "Para llevar";

function actualizarTipoPedidoCajero() {
  const mesaSelect = document.getElementById("mesaPedidoCajero");
  const activeButton = document.querySelector(".pedido-type-btn.active");

  if (activeButton) {
    const tipo = activeButton.dataset.tipo;
    window.tipoPedidoCajero = tipo === "salon" ? "Comer aquí" : "Para llevar";
  }

  if (mesaSelect) {
    mesaSelect.disabled = window.tipoPedidoCajero === "Para llevar";
    if (mesaSelect.disabled) {
      mesaSelect.value = "";
    }
  }
}

function configurarFormularioPedidoCajero() {
  const form = document.getElementById("formPedidoCajero");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nombreCliente = document.getElementById("nombreClienteCajero")?.value.trim() || "";
    const telefonoCliente = document.getElementById("telefonoClienteCajero")?.value.trim() || "";
    const observacionesPedido = document.getElementById("observacionesPedidoCajero")?.value.trim() || "";
    const mesaSelect = document.getElementById("mesaPedidoCajero");
    const mesaPedido = window.tipoPedidoCajero === "Para llevar" ? null : mesaSelect?.value || null;

    if (!nombreCliente) {
      await Swal.fire({
        icon: "warning",
        title: "Nombre requerido",
        text: "Ingresa el nombre del cliente para continuar.",
      });
      return;
    }

    const payload = {
      cliente: nombreCliente,
      telefono: telefonoCliente || "",
      observaciones: observacionesPedido || "",
      tipo: window.tipoPedidoCajero,
      mesa: mesaPedido,
      estado: "Pendiente",
      productos: [],
    };

    try {
      const response = await fetch("/api/pedidos/iniciar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const errorMessage =
          (errorBody && (errorBody.message || errorBody.error || JSON.stringify(errorBody))) ||
          "No se pudo crear el pedido.";
        throw new Error(errorMessage);
      }

      await Swal.fire({
        icon: "success",
        title: "Pedido creado",
        text: `Pedido para ${nombreCliente} creado correctamente.`,
        timer: 2000,
        showConfirmButton: false,
      });

      form.reset();
      actualizarTipoPedidoCajero();

      if (typeof actualizarEstadoMesaCajero === "function") {
        actualizarEstadoMesaCajero();
      }
    } catch (error) {
      console.error("Error al iniciar pedido:", error);
      await Swal.fire({
        icon: "error",
        title: "Error al crear pedido",
        text: error?.message || "No se pudo conectar con el servidor.",
      });
    }
  });
}

async function manejarRespuestaFactura(response) {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const errorMessage =
      (errorBody && (errorBody.message || errorBody.error || JSON.stringify(errorBody))) ||
      "No se pudo generar la factura.";
    throw new Error(errorMessage);
  }

  const resultado = await response.json();

  await Swal.fire({
    icon: "success",
    title: "Factura generada exitosamente",
    text: `Factura ${resultado.numeroFactura} emitida correctamente.`,
    timer: 2000,
    showConfirmButton: false,
  });

  if (typeof limpiarModalFactura === "function") {
    limpiarModalFactura();
  }

  if (typeof refrescarListaPedidos === "function") {
    refrescarListaPedidos();
  }

  return resultado;
}

function renderCobrosTabla(pedidos = []) {
  const tablaCobros = document.getElementById("tablaCobros");
  if (!tablaCobros) return;

  tablaCobros.innerHTML = pedidos
    .map((pedido) => {
      const tieneFactura = Boolean(pedido.factura_id || pedido.tieneFactura || pedido.id_factura);
      const estadoPedido = pedido.estado || "";
      const disabled = (estadoPedido === "Pendiente" || estadoPedido === "En preparación" || estadoPedido === "En preparacion" || estadoPedido === "Listo" || estadoPedido === "Preparado" || tieneFactura) ? "disabled" : "";

      return `
        <tr>
          <td>${pedido.id_pedido || pedido.id || "--"}</td>
          <td>${pedido.mesa || "Sin mesa"}</td>
          <td>${pedido.mesero || pedido.usuario || "--"}</td>
          <td>${pedido.total != null ? pedido.total : "--"}</td>
          <td>${pedido.estado || "--"}</td>
          <td>
            <button class="btn-completar" ${disabled}>
              Facturar y Cobrar
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function inicializarDelegacionAgregarPlatillo() {
  const contenedorMenu = document.querySelector(".menu-table-body") || document.getElementById("menuTableBody") || document;

  contenedorMenu.addEventListener("click", (event) => {
    const button = event.target.closest(".btn-agregar");
    if (!button) return;
    event.preventDefault();

    if (button.disabled) return;

    const idPlatillo = button.getAttribute("data-id") || button.getAttribute("data-id-platillo");
    const nombrePlatillo = button.getAttribute("data-nombre") || button.getAttribute("data-platillo-nombre") || "";
    const precioPlatillo = parseFloat(button.getAttribute("data-precio"));

    if (!idPlatillo) return;

    if (typeof window.agregarAlPedidoDesdeMenu === "function") {
      window.agregarAlPedidoDesdeMenu(idPlatillo);
      return;
    }

    if (typeof window.agregarPlatilloAlPedido === "function") {
      window.agregarPlatilloAlPedido(idPlatillo, nombrePlatillo, Number.isNaN(precioPlatillo) ? null : precioPlatillo);
    }
  });
}

function configurarCajeroPedido() {
  const tipoButtons = document.querySelectorAll(".pedido-type-btn");
  tipoButtons.forEach((button) => {
    button.addEventListener("click", () => {
      tipoButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      actualizarTipoPedidoCajero();
    });
  });

  actualizarTipoPedidoCajero();
  configurarFormularioPedidoCajero();
  inicializarDelegacionAgregarPlatillo();
  
  // Manejador para botones "Facturar y Cobrar"
  configurarBotonesFacturar();
}

// Función para configurar los botones de facturación
function configurarBotonesFacturar() {
  document.addEventListener('click', async (event) => {
    const btnFacturar = event.target.closest('.btn-completar');
    if (!btnFacturar) return;
    
    event.preventDefault();
    
    // Obtener ID del pedido de la fila
    const fila = btnFacturar.closest('tr');
    if (!fila) return;
    
    const idPedido = fila.querySelector('td:first-child')?.textContent.trim();
    
    if (!idPedido || idPedido === '--') {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo identificar el pedido',
      });
      return;
    }
    
    // Guardar ID del pedido seleccionado
    window.pedidoIdSeleccionado = idPedido;
    
    // Mostrar modal de factura con SweetAlert2
    const { value: formValues } = await Swal.fire({
      title: 'Generar Factura',
      html: `
        <div style="text-align: left;">
          <label for="swalNombreFactura" style="display: block; margin-bottom: 8px; font-weight: 600;">
            Nombre del Cliente (Opcional)
          </label>
          <input type="text" id="swalNombreFactura" class="swal2-input" placeholder="Nombre del cliente" style="width: 90%; margin: 0 auto 15px;">
          
          <label for="swalNitFactura" style="display: block; margin-bottom: 8px; font-weight: 600;">
            NIT/Cédula (Opcional)
          </label>
          <input type="text" id="swalNitFactura" class="swal2-input" placeholder="NIT o número de cédula" style="width: 90%; margin: 0 auto;">
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Confirmar Factura',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        return {
          nombre: document.getElementById('swalNombreFactura')?.value || null,
          nit: document.getElementById('swalNitFactura')?.value || null,
        };
      },
    });
    
    if (formValues) {
      // Guardar los datos del cliente en variables globales
      window.facturaData = {
        nombreCliente: formValues.nombre,
        nit: formValues.nit,
      };
      
      // Llamar a la función de confirmación que está en el HTML
      if (typeof confirmarFacturaPedido === 'function') {
        await confirmarFacturaPedido();
      }
    }
  });
}

// Función para descargar el PDF de la factura
async function descargarPDFFactura() {
  const facturaData = window.ultrafacturaGenerada;
  
  if (!facturaData) {
    alert('No hay datos de factura para descargar');
    return;
  }
  
  try {
    // Intentar descargar PDF desde el servidor
    const facturaId = facturaData.numeroFactura;
    const response = await fetch(`/api/facturas/pdf/${facturaId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/pdf',
      }
    });
    
    if (!response.ok) {
      throw new Error('No se pudo descargar el PDF desde el servidor');
    }
    
    // Obtener el blob y descargar
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factura_${facturaId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error descargando PDF:', error);
    
    // Si el servidor no tiene el endpoint, generar PDF desde HTML del ticket
    generarYDescargarPDFLocal();
  }
}

// Función para generar y descargar PDF localmente si el servidor no proporciona
function generarYDescargarPDFLocal() {
  const facturaData = window.ultrafacturaGenerada;
  
  if (!facturaData) {
    alert('No hay datos de factura para generar PDF');
    return;
  }
  
  // Crear contenido HTML del PDF
  const contenidoPDF = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Factura ${facturaData.numeroFactura}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background: white;
          color: #333;
        }
        .factura-container {
          border: 1px solid #ddd;
          padding: 30px;
          background: white;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #7a1d1d;
          padding-bottom: 20px;
        }
        .header h1 {
          margin: 0;
          color: #7a1d1d;
          font-size: 28px;
        }
        .header p {
          margin: 5px 0;
          color: #666;
          font-size: 14px;
        }
        .factura-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
          padding: 15px;
          background: #f9f9f9;
          border-radius: 5px;
        }
        .info-group {
          padding: 10px;
        }
        .info-label {
          font-weight: bold;
          color: #7a1d1d;
          margin-bottom: 5px;
          font-size: 12px;
          text-transform: uppercase;
        }
        .info-value {
          font-size: 14px;
          color: #333;
        }
        .resumen {
          margin: 30px 0;
          border-top: 1px solid #ddd;
          border-bottom: 1px solid #ddd;
          padding: 20px 0;
        }
        .resumen-linea {
          display: flex;
          justify-content: space-between;
          margin: 10px 0;
          font-size: 14px;
        }
        .resumen-linea.total {
          font-weight: bold;
          font-size: 18px;
          color: #7a1d1d;
          margin-top: 15px;
          padding-top: 15px;
          border-top: 2px solid #7a1d1d;
        }
        .pie {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          font-size: 12px;
          color: #666;
        }
        .fecha-hora {
          text-align: center;
          color: #999;
          font-size: 11px;
          margin-top: 10px;
        }
        @media print {
          body { margin: 0; padding: 0; }
          .factura-container { border: none; }
        }
      </style>
    </head>
    <body>
      <div class="factura-container">
        <div class="header">
          <h1>FACTURA</h1>
          <p>RESTAURANTE CUSCATLECO</p>
        </div>
        
        <div class="factura-info">
          <div class="info-group">
            <div class="info-label">Número de Factura</div>
            <div class="info-value">${facturaData.numeroFactura || 'N/A'}</div>
          </div>
          <div class="info-group">
            <div class="info-label">Fecha</div>
            <div class="info-value">${new Date().toLocaleDateString('es-SV')}</div>
          </div>
          <div class="info-group">
            <div class="info-label">Cliente</div>
            <div class="info-value">${facturaData.nombreCliente || 'Consumidor Final'}</div>
          </div>
          ${facturaData.nit ? `
            <div class="info-group">
              <div class="info-label">NIT/Cédula</div>
              <div class="info-value">${facturaData.nit}</div>
            </div>
          ` : ''}
        </div>
        
        ${facturaData.total ? `
          <div class="resumen">
            <div class="resumen-linea">
              <span>Subtotal:</span>
              <span>$${parseFloat(facturaData.total).toFixed(2)}</span>
            </div>
            <div class="resumen-linea total">
              <span>Total a Pagar:</span>
              <span>$${parseFloat(facturaData.total).toFixed(2)}</span>
            </div>
          </div>
        ` : ''}
        
        <div class="pie">
          <p>Gracias por su compra en Restaurante Cuscatleco</p>
          <div class="fecha-hora">
            Generado: ${new Date().toLocaleString('es-SV')}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  
  // Crear blob y descargar
  const blob = new Blob([contenidoPDF], { type: 'text/html;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `factura_${facturaData.numeroFactura}.html`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Función para imprimir el ticket de factura
function imprimirTicketFactura() {
  const facturaData = window.ultrafacturaGenerada;
  
  if (!facturaData) {
    alert('No hay datos de factura para imprimir');
    return;
  }
  
  // Crear contenido del ticket
  const contenidoTicket = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Ticket Factura</title>
      <style>
        body {
          font-family: 'Courier New', monospace;
          width: 80mm;
          margin: 0;
          padding: 10px;
          background: white;
        }
        .ticket {
          text-align: center;
          border: 1px dashed #333;
          padding: 10px;
        }
        .header {
          margin-bottom: 15px;
          font-weight: bold;
          font-size: 14px;
        }
        .numero-factura {
          font-size: 16px;
          font-weight: bold;
          margin: 10px 0;
        }
        .fecha {
          font-size: 11px;
          margin: 5px 0;
        }
        .seccion {
          margin: 15px 0;
          border-top: 1px dashed #333;
          border-bottom: 1px dashed #333;
          padding: 8px 0;
          font-size: 12px;
        }
        .linea {
          display: flex;
          justify-content: space-between;
          margin: 3px 0;
        }
        .total {
          font-weight: bold;
          font-size: 14px;
          margin-top: 10px;
        }
        .pie {
          font-size: 10px;
          margin-top: 15px;
          text-align: center;
          color: #666;
        }
        @media print {
          body { margin: 0; padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="ticket">
        <div class="header">RESTAURANTE CUSCATLECO</div>
        <div class="numero-factura">FACTURA #${facturaData.numeroFactura || 'N/A'}</div>
        <div class="fecha">${new Date().toLocaleString('es-SV')}</div>
        
        <div class="seccion">
          <strong>Cliente:</strong><br>
          ${facturaData.nombreCliente || 'Consumidor Final'}
          ${facturaData.nit ? '<br>NIT: ' + facturaData.nit : ''}
        </div>
        
        ${facturaData.total ? `
          <div class="seccion">
            <div class="linea">
              <span>Subtotal:</span>
              <span>$${parseFloat(facturaData.total).toFixed(2)}</span>
            </div>
            <div class="linea" style="font-weight: bold; font-size: 14px;">
              <span>Total:</span>
              <span>$${parseFloat(facturaData.total).toFixed(2)}</span>
            </div>
          </div>
        ` : ''}
        
        <div class="pie">
          Gracias por su compra<br>
          ${new Date().toLocaleDateString('es-SV')}
        </div>
      </div>
    </body>
    </html>
  `;
  
  // Abrir en nueva ventana e imprimir
  const ventana = window.open('', '_blank');
  ventana.document.write(contenidoTicket);
  ventana.document.close();
  
  setTimeout(() => {
    ventana.print();
  }, 250);
}

// Función para refrescar la lista de pedidos pendientes de cobro
async function refrescarListaPedidos() {
  try {
    // Obtener pedidos del servidor
    const response = await fetch('/api/pedidos/activos');
    
    if (!response.ok) {
      console.error('Error al obtener pedidos:', response.statusText);
      return;
    }

    const pedidos = await response.json();
    
    // Renderizar la tabla de cobros
    renderCobrosTabla(pedidos);
    
    // Recargar búsqueda si existe campo de búsqueda
    const buscarMesa = document.getElementById('buscarMesaCobro');
    if (buscarMesa) {
      buscarMesa.value = '';
    }
  } catch (error) {
    console.error('Error refrescando lista de pedidos:', error);
  }
}

// Función para limpiar el modal de factura
function limpiarModalFactura() {
  const nombreFactura = document.getElementById('nombreFacturaCliente');
  const nitFactura = document.getElementById('nitFacturaCliente');
  const idPedidoFactura = document.getElementById('idPedidoFactura') || document.getElementById('pedidoIdFactura');
  
  if (nombreFactura) nombreFactura.value = '';
  if (nitFactura) nitFactura.value = '';
  if (idPedidoFactura) idPedidoFactura.value = '';
  
  window.pedidoIdSeleccionado = null;
}

// Función para cerrar el modal de factura
function cerrarModalFactura() {
  // Cerrar modal usando SweetAlert2 si está abierto
  if (typeof Swal !== 'undefined') {
    Swal.close();
  }
  
  // Si existe un elemento modal HTML, ocultarlo
  const modal = document.getElementById('modalFactura') || document.querySelector('[data-modal="factura"]');
  if (modal) {
    modal.style.display = 'none';
  }
}

window.addEventListener("DOMContentLoaded", () => {
  configurarCajeroPedido();
});
