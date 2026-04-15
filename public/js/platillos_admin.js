window.platilloEditando = null;

async function registrarPlatillo() {
    const nombre = document.getElementById('platillo_nombre').value.trim();
    const descripcion = document.getElementById('platillo_descripcion').value.trim();
    const precio = parseFloat(document.getElementById('platillo_precio').value);
    const imagen_url = document.getElementById('platillo_imagen_url').value.trim();
    const id_categoria = parseInt(document.getElementById('id_categoria').value);
    const disponible = document.getElementById('platillo_disponible').checked;

    // Validación básica
    if (!nombre) {
        alert("El nombre del platillo es obligatorio.");
        return;
    }
    if (isNaN(precio) || precio <= 0) {
        alert("Ingresa un precio válido y mayor a 0.");
        return;
    }

    const platilloData = {
        platillo_nombre: nombre,
        platillo_descripcion: descripcion,
        platillo_precio: precio,
        platillo_imagen_url: imagen_url,
        id_categoria: id_categoria,
        platillo_disponible: disponible
    };

    try {
        let respuesta;
        let datos;

        if (window.platilloEditando) {
            respuesta = await fetch(`/api/platillos/${window.platilloEditando}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(platilloData)
            });
            datos = await respuesta.json();

            if (respuesta.ok) {
                alert("✅ Platillo actualizado correctamente");
                cancelarEdicionPlatillo();
                loadMenu();
                return;
            } else if (respuesta.status === 403) {
                alert("Error: solo se pueden editar platillos activos");
                return;
            } else {
                alert("❌ Error: " + (datos.error || "No se pudo actualizar el platillo"));
                return;
            }
        }

        respuesta = await fetch('/api/platillos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(platilloData)
        });

        datos = await respuesta.json();

        if (respuesta.ok) {
            alert("✅ Platillo creado correctamente");
            limpiarFormularioPlatillo();
        } else {
            alert("❌ Error: " + (datos.error || "No se pudo crear el platillo"));
        }
    } catch (error) {
        console.error("Error en la petición:", error);
        alert("❌ Ocurrió un error al intentar crear el platillo. Revisa tu conexión al servidor.");
    }
}

function limpiarFormularioPlatillo() {
    document.getElementById('platillo_nombre').value = '';
    document.getElementById('platillo_descripcion').value = '';
    document.getElementById('platillo_precio').value = '';
    document.getElementById('platillo_imagen_url').value = '';
    document.getElementById('id_categoria').value = '1';
    document.getElementById('platillo_disponible').checked = true;
}

function cancelarEdicionPlatillo() {
    limpiarFormularioPlatillo();
    window.platilloEditando = null;
    const btn = document.getElementById('btnRegistrarPlatillo');
    if (btn) btn.innerText = 'Crear Platillo';

    const titulo = document.querySelector('#registrarPlatillo h2');
    if (titulo) {
        titulo.innerHTML = 'Registrar Platillo';
    }

    const cancelBtn = document.getElementById('cancelarEdicionPlatillo');
    if (cancelBtn) cancelBtn.remove();

    mostrar('menuPlatillos');
}
