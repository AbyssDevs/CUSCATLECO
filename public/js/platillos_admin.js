window.platilloEditando = null;

//POR FAOR COMENTEN EL CODIGO DE AQUI EN ADELANTE. O SEA CUANDO HAGAN MAS FUNCIONES Y ASI, NO QUE COMENTEN TODO EL CODIGO, SINO SOLO LAS FUNCIONES NUEVAS O COSAS QUE HAYAN CAMBIADO, PARA QUE SEA MAS FACIL DE REVISAR LOS CAMBIOS. GRACIAS :) 👍
async function registrarPlatillo() {
    const nombre = document.getElementById('platillo_nombre').value.trim();
    const descripcion = document.getElementById('platillo_descripcion').value.trim();
    const precio = parseFloat(document.getElementById('platillo_precio').value);
    const id_categoria = parseInt(document.getElementById('id_categoria').value);
    const disponible = document.getElementById('platillo_disponible').checked;
    const imagenFile = document.getElementById('platillo_imagen').files[0];

    // Validaciones
    if (!nombre) {
        toast("error", "El nombre del platillo es obligatorio.");
        return;
    }
    if (isNaN(precio) || precio <= 0) {
        toast("error", "Ingresa un precio válido.");
        return;
    }
    if (isNaN(id_categoria) || id_categoria <= 0) {
        toast("error", "Selecciona una categoría válida.");
        return;
    }

    if (imagenFile && !imagenFile.type.startsWith('image/')) {
        toast("error", "El archivo seleccionado no es una imagen.");
        return;
    }
    

    const formData = new FormData();
    formData.append('platillo_nombre', nombre);
    formData.append('platillo_descripcion', descripcion);
    formData.append('platillo_precio', precio);
    formData.append('id_categoria', id_categoria);
    formData.append('platillo_disponible', 1);

    if (imagenFile) {
        formData.append('imagen', imagenFile);
    }

    try {
        let respuesta;
        let mensaje;

        if (window.platilloEditando) {
            // ACTUALIZAR
            respuesta = await fetch(`/api/platillos/${window.platilloEditando}`, {
                method: 'PUT',
                body: formData
            });
            mensaje = "Platillo actualizado correctamente";
        } else {
            // CREAR
            respuesta = await fetch('/api/platillos', {
                method: 'POST',
                body: formData
            });
            mensaje = "Platillo creado correctamente";
        }

        const datos = await respuesta.json();

        if (respuesta.ok) {
            toast("success", mensaje);
            limpiarFormularioPlatillo();
            cancelarEdicionPlatillo();
            loadMenu();
        } else {
            toast("error", "❌ Error: " + (datos.error || "No se pudo guardar"));
        }

    } catch (error) {
        console.error(error);
        toast("error", "Error de conexión");
    }
}

document.getElementById('platillo_imagen').addEventListener('change', function(e) {
  const file = e.target.files[0];
  const fileName = document.getElementById('fileName');
  const preview = document.getElementById('previewImagen');
  const container = document.getElementById('previewImagenContainer');

  if (file) {
    fileName.textContent = file.name;

    const reader = new FileReader();
    reader.onload = function(event) {
      preview.src = event.target.result;
      container.style.display = 'block';
    };
    reader.readAsDataURL(file);
  } else {
    fileName.textContent = "Ningún archivo seleccionado";
    container.style.display = 'none';
  }

});

const dropZone = document.getElementById('dropZone');
const inputFile = document.getElementById('platillo_imagen');

dropZone.addEventListener('click', () => {
  inputFile.click();
});

// Drag over
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

// Drag leave
dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

// Drop
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');

  const file = e.dataTransfer.files[0];
  if (file) {
    inputFile.files = e.dataTransfer.files; // 👈 clave
    manejarArchivo(file);
  }
});

// Cuando selecciona manual
inputFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) manejarArchivo(file);
});

// Función reutilizable
function manejarArchivo(file) {
  const fileName = document.getElementById('fileName');
  const preview = document.getElementById('previewImagen');
  const container = document.getElementById('previewImagenContainer');

  fileName.textContent = file.name;

  const reader = new FileReader();
  reader.onload = function (e) {
    preview.src = e.target.result;
    container.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function limpiarFormularioPlatillo() {
    document.getElementById('platillo_nombre').value = '';
    document.getElementById('platillo_descripcion').value = '';
    document.getElementById('platillo_precio').value = '';
    document.getElementById('id_categoria').value = '1';
    document.getElementById('platillo_disponible').checked = true;
    document.getElementById('platillo_imagen').value = '';
    
    // Limpiar preview
    const previewContainer = document.getElementById('previewImagenContainer');
    const preview = document.getElementById('previewImagen');
    if (previewContainer) previewContainer.style.display = 'none';
    if (preview) preview.src = '';
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

    // Validar si está disponible
    const disponible =
        platillo.platillo_disponible === true ||
        platillo.platillo_disponible === 1 ||
        platillo.platillo_disponible === "1";

    if (!disponible) {
        toast("error", "Los platillos inactivos no pueden ser editados");
        return;
    }

    //  Llenar campos normales
    document.getElementById('platillo_nombre').value = platillo.platillo_nombre || '';
    document.getElementById('platillo_descripcion').value = platillo.platillo_descripcion || '';
    document.getElementById('platillo_precio').value = platillo.platillo_precio || '';
    document.getElementById('id_categoria').value = platillo.id_categoria || '1';

    //  IMPORTANTE: limpiar input file (no se puede setear)
    const inputImagen = document.getElementById('platillo_imagen');
    if (inputImagen) inputImagen.value = '';

    // Mostrar preview de imagen
    const previewContainer = document.getElementById('previewImagenContainer');
    const preview = document.getElementById('previewImagen');
    if (preview && previewContainer) {
        if (platillo.platillo_imagen_url) {
            preview.src = `http://localhost:3000${platillo.platillo_imagen_url}`;
            previewContainer.style.display = 'block';
        } else {
            previewContainer.style.display = 'none';
        }
    }

    // Ocultar checkbox disponible en edición
    const disponibleWrapper = document.getElementById('wrapper_platillo_disponible');
    if (disponibleWrapper) disponibleWrapper.style.display = 'none';

    // Guardar estado de edición
    window.platilloEditando = id;

    // Cambiar texto botón
    const btn = document.getElementById('btnRegistrarPlatillo');
    if (btn) btn.innerText = 'Actualizar Platillo';

    // Cambiar título + botón cancelar
    const titulo = document.querySelector('#registrarPlatillo h2');
    if (titulo) {
        titulo.innerHTML = `
            <i class="fas fa-edit"></i> Editando Platillo: 
            <span style="color: #000; font-size: 1.2rem;">
                ${platillo.platillo_nombre}
            </span>
        `;

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

    // Mostrar formulario
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