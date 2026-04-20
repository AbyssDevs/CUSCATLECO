// js/ui/alerts.js

function toast(tipo, mensaje) {
  if (typeof Swal === "undefined") {
    alert(mensaje);
    return;
  }

  const Toast = Swal.mixin({
    toast: true,
    position: "top",
    showConfirmButton: false,
    timer: 2500
  });

  Toast.fire({
    icon: tipo,
    title: mensaje
  });
}

function modal(tipo, titulo, texto = "") {
  if (typeof Swal === "undefined") {
    alert(texto || titulo);
    return;
  }

  return Swal.fire({
    icon: tipo,
    title: titulo,
    text: texto
  });
}

async function confirmar(titulo, texto = "") {
  if (typeof Swal === "undefined") {
    return confirm(titulo + (texto ? "\n" + texto : ""));
  }

  const result = await Swal.fire({
    title: titulo,
    text: texto,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar"
  });

  return result.isConfirmed;
}