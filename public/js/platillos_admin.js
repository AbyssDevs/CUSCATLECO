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
        toast("error", "El nombre del platillo es obligatorio.");
        return;
    }
    if (isNaN(precio) || precio <= 0) {
        toast("error", "Ingresa un precio válido y mayor a 0.");
        return;
    }
    if (isNaN(id_categoria) || id_categoria <= 0) {
        toast("error", "Selecciona una categoría válida.");
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
                toast("success", "✅ Platillo actualizado correctamente");
                cancelarEdicionPlatillo();
                loadMenu();
                return;
            } else if (respuesta.status === 403) {
                toast("error", "Error: solo se pueden editar platillos activos");
                return;
            } else {
                toast("error", "❌ Error: " + (datos.error || "No se pudo actualizar el platillo"));
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
            toast("success", "Platillo creado correctamente");
            limpiarFormularioPlatillo();
        } else {
            toast("error", "❌ Error: " + (datos.error || "No se pudo crear el platillo"));
        }
    } catch (error) {
        console.error("Error en la petición:", error);
        toast("error", "❌ Ocurrió un error al intentar crear el platillo. Revisa tu conexión al servidor.");
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

    const disponibleWrapper = document.getElementById('wrapper_platillo_disponible');
    if (disponibleWrapper) disponibleWrapper.style.display = 'flex';

    const cancelBtn = document.getElementById('cancelarEdicionPlatillo');
    if (cancelBtn) cancelBtn.remove();

    mostrar('menuPlatillos');
}

function editarPlatillo(id) {
    const platillo = menuState.items.find(item => item.id_platillo === id);
    if (!platillo) return;

    // Los platillos inactivos no pueden ser editados
    const disponible = platillo.platillo_disponible === true || platillo.platillo_disponible === 1 || platillo.platillo_disponible === "1";
    if (!disponible) {
        toast("error", "Los platillos inactivos no pueden ser editados");
        return;
    }

    // Llenar formulario
    document.getElementById('platillo_nombre').value = platillo.platillo_nombre || '';
    document.getElementById('platillo_descripcion').value = platillo.platillo_descripcion || '';
    document.getElementById('platillo_precio').value = platillo.platillo_precio || '';
    document.getElementById('platillo_imagen_url').value = platillo.platillo_imagen_url || '';
    document.getElementById('id_categoria').value = platillo.id_categoria || '1';
    
    // Ocultamos el checkbox "Disponible" cuando estamos en modo edición
    const disponibleWrapper = document.getElementById('wrapper_platillo_disponible');
    if (disponibleWrapper) disponibleWrapper.style.display = 'none';

    window.platilloEditando = id;
    const btn = document.getElementById('btnRegistrarPlatillo');
    if (btn) btn.innerText = 'Actualizar Platillo';

    const titulo = document.querySelector('#registrarPlatillo h2');
    if (titulo) {
        titulo.innerHTML = `<i class="fas fa-edit"></i> Editando Platillo: <span style="color: #000; font-size: 1.2rem;">${platillo.platillo_nombre}</span>`;
        
        // Botón cancelar si no existe
        if (!document.getElementById('cancelarEdicionPlatillo')) {
            const cancelBtn = document.createElement('button');
            cancelBtn.id = 'cancelarEdicionPlatillo';
            cancelBtn.innerText = 'Cancelar edición';
            cancelBtn.style.marginLeft = '1rem';
            cancelBtn.style.padding = '0.3rem 1rem';
            cancelBtn.style.fontSize = '1rem';
            cancelBtn.style.background = '#dc3545';
            cancelBtn.style.color = 'white';
            cancelBtn.style.border = 'none';
            cancelBtn.style.borderRadius = '5px';
            cancelBtn.style.cursor = 'pointer';
            cancelBtn.onclick = cancelarEdicionPlatillo;
            titulo.appendChild(cancelBtn);
        }
    }

    mostrar('registrarPlatillo');
    document.getElementById('registrarPlatillo').scrollIntoView({ behavior: 'smooth' });
}

async function activarPlatillo(id) {
    const platillo = menuState.items.find(item => item.id_platillo === id);
    if (!platillo) return;

    const disponible = platillo.platillo_disponible === true || platillo.platillo_disponible === 1 || platillo.platillo_disponible === "1";
    
    if (disponible) {
        toast("error", "El platillo ya esta activo");
        return;
    }

    try {
        const respuesta = await fetch(`/api/platillos/${id}/estado`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ platillo_disponible: true })
        });

        const datos = await respuesta.json();

        if (respuesta.ok) {
            toast("success", "Platillo activado correctamente");
            loadMenu();
        } else {
            toast("error", "Error: " + (datos.error || "No se pudo activar el platillo"));
        }
    } catch (error) {
        console.error("Error activando platillo:", error);
        toast("error", "Error de conexión");
    }
}

async function desactivarPlatillo(id) {
    const platillo = menuState.items.find(item => item.id_platillo === id);
    if (!platillo) return;

    const disponible = platillo.platillo_disponible === true || platillo.platillo_disponible === 1 || platillo.platillo_disponible === "1";

    if (!disponible) {
        toast("error", "El platillo ya esta desactivado");
        return;
    }

    try {
        const respuesta = await fetch(`/api/platillos/${id}/estado`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ platillo_disponible: false })
        });

        const datos = await respuesta.json();

        if (respuesta.ok) {
            toast("success", "Platillo desactivado correctamente");
            loadMenu();
        } else {
            toast("error", "Error: " + (datos.error || "No se pudo desactivar el platillo"));
        }
    } catch (error) {
        console.error("Error desactivando platillo:", error);
        toast("error", "Error de conexión");
    }

}