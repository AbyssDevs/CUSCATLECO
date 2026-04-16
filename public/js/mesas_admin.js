let mesasCache = [];

function mostrarMensajeMesas(mensaje, esError = false) {
  const contenedor = document.getElementById("mesasMensaje");
  if (!contenedor) return;
  contenedor.textContent = mensaje;
  contenedor.style.color = esError ? "#b22222" : "#1f7a1f";
}

function limpiarFormularioMesas() {
  document.getElementById("mesa_numero").value = "";
  document.getElementById("mesa_capacidad").value = "";
  document.getElementById("mesa_ubicacion").value = "";
}

function limpiarFormularioMesasMasivas() {
  document.getElementById("bulk_start_numero").value = "";
  document.getElementById("bulk_count").value = "";
  document.getElementById("bulk_capacidad").value = "";
  document.getElementById("bulk_ubicacion").value = "";
}

async function cargarMesas() {
  try {
    const respuesta = await fetch("/api/mesas");
    if (!respuesta.ok) {
      throw new Error("No se pudo cargar la lista de mesas");
    }

    mesasCache = await respuesta.json();
    const cuerpo = document.getElementById("tablaMesasBody");
    if (!cuerpo) return;

    if (mesasCache.length === 0) {
      cuerpo.innerHTML = `
        <tr>
          <td colspan="4" style="text-align:center; padding: 1rem;">
            No hay mesas registradas.
          </td>
        </tr>
      `;
      return;
    }

    cuerpo.innerHTML = mesasCache
      .map(
        (mesa) => `
        <tr>
          <td>${mesa.mesa_numero}</td>
          <td>${mesa.mesa_capacidad}</td>
          <td>${mesa.mesa_ubicacion || "-"}</td>
          <td>${mesa.mesa_estado || "Libre"}</td>
        </tr>
      `,
      )
      .join("");
  } catch (error) {
    console.error(error);
    mostrarMensajeMesas("Error cargando mesas. Intente nuevamente.", true);
  }
}

function validarNumeroNoDuplicado(numero) {
  return !mesasCache.some((mesa) => Number(mesa.mesa_numero) === numero);
}

async function crearMesa() {
  const numero = Number(document.getElementById("mesa_numero").value);
  const capacidad = Number(document.getElementById("mesa_capacidad").value);
  const ubicacion = document.getElementById("mesa_ubicacion").value.trim();

  if (!numero || numero <= 0) {
    mostrarMensajeMesas("El número de mesa debe ser un entero mayor que 0.", true);
    return;
  }

  if (!capacidad || capacidad <= 0) {
    mostrarMensajeMesas("La capacidad debe ser mayor que 0.", true);
    return;
  }

  if (!validarNumeroNoDuplicado(numero)) {
    mostrarMensajeMesas("Ya existe una mesa registrada con ese número.", true);
    return;
  }

  try {
    const respuesta = await fetch("/api/mesas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mesa_numero: numero,
        mesa_capacidad: capacidad,
        mesa_ubicacion: ubicacion,
        mesa_estado: "Libre",
      }),
    });

    const datos = await respuesta.json();
    if (!respuesta.ok) {
      mostrarMensajeMesas(datos.error || "Error al crear la mesa.", true);
      return;
    }

    mostrarMensajeMesas("Mesa creada exitosamente.");
    limpiarFormularioMesas();
    cargarMesas();
  } catch (error) {
    console.error(error);
    mostrarMensajeMesas("Error de conexión. Intente nuevamente.", true);
  }
}

async function crearMesasEnSerie() {
  const inicio = Number(document.getElementById("bulk_start_numero").value);
  const cantidad = Number(document.getElementById("bulk_count").value);
  const capacidad = Number(document.getElementById("bulk_capacidad").value);
  const ubicacion = document.getElementById("bulk_ubicacion").value.trim();

  if (!inicio || inicio <= 0) {
    mostrarMensajeMesas("El número inicial debe ser mayor que 0.", true);
    return;
  }

  if (!cantidad || cantidad <= 0) {
    mostrarMensajeMesas("La cantidad de mesas debe ser mayor que 0.", true);
    return;
  }

  if (!capacidad || capacidad <= 0) {
    mostrarMensajeMesas("La capacidad debe ser mayor que 0.", true);
    return;
  }

  const mesas = Array.from({ length: cantidad }, (_, index) => ({
    mesa_numero: inicio + index,
    mesa_capacidad: capacidad,
    mesa_ubicacion: ubicacion,
    mesa_estado: "Libre",
  }));

  const numerosSolicitados = mesas.map((mesa) => mesa.mesa_numero);
  const numeroDuplicadoEnSolicitud = new Set(numerosSolicitados).size !== numerosSolicitados.length;

  if (numeroDuplicadoEnSolicitud) {
    mostrarMensajeMesas("Los números de mesa en la solicitud no pueden repetirse.", true);
    return;
  }

  const numeroExistente = mesas.find((mesa) => !validarNumeroNoDuplicado(mesa.mesa_numero));
  if (numeroExistente) {
    mostrarMensajeMesas(
      `La mesa ${numeroExistente.mesa_numero} ya existe. Ajuste el número inicial o reduzca la cantidad.`,
      true,
    );
    return;
  }

  try {
    const respuesta = await fetch("/api/mesas/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mesas }),
    });

    const datos = await respuesta.json();
    if (!respuesta.ok) {
      mostrarMensajeMesas(datos.error || "Error al crear las mesas.", true);
      return;
    }

    mostrarMensajeMesas(`${cantidad} mesas creadas exitosamente.`);
    limpiarFormularioMesasMasivas();
    cargarMesas();
  } catch (error) {
    console.error(error);
    mostrarMensajeMesas("Error de conexión. Intente nuevamente.", true);
  }
}
