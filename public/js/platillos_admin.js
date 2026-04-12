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

    const nuevoPlatillo = {
        platillo_nombre: nombre,
        platillo_descripcion: descripcion,
        platillo_precio: precio,
        platillo_imagen_url: imagen_url,
        id_categoria: id_categoria,
        platillo_disponible: disponible
    };

    try {
        const respuesta = await fetch('/api/platillos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(nuevoPlatillo)
        });

        const datos = await respuesta.json();

        if (respuesta.ok) {
            alert("✅ Platillo creado correctamente");
            
            // Limpiar los campos del formulario
            document.getElementById('platillo_nombre').value = '';
            document.getElementById('platillo_descripcion').value = '';
            document.getElementById('platillo_precio').value = '';
            document.getElementById('platillo_imagen_url').value = '';
            document.getElementById('id_categoria').value = '1';
            document.getElementById('platillo_disponible').checked = true;
        } else {
            alert("❌ Error: " + (datos.error || "No se pudo crear el platillo"));
        }
    } catch (error) {
        console.error("Error en la petición:", error);
        alert("❌ Ocurrió un error al intentar crear el platillo. Revisa tu conexión al servidor.");
    }
}
