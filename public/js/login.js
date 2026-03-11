
document.addEventListener('DOMContentLoaded', () => {

  const btnLogin       = document.getElementById('btnLogin');
  const inputUsuario   = document.getElementById('usuario_email');
  const inputContrasena = document.getElementById('usuario_password');
  const mensajeError   = document.getElementById('mensajeError');

  
  btnLogin.addEventListener('click', async () => {

   
    const usuario_email = inputUsuario.value.trim();
    const usuario_password = inputContrasena.value.trim();

    // Validación del lado del cliente (rápida, antes de ir al servidor)
    if (!usuario_email || !usuario_password) {
      mostrarError('Por favor completa todos los campos.');
      return;
    }

    // Desactivamos el botón mientras esperamos respuesta
    btnLogin.disabled    = true;
    btnLogin.textContent = 'Verificando...';
    ocultarError();

    try {
      const respuesta = await fetch('/api/login', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({
          usuario_email : usuario_email,
          usuario_password : usuario_password
        }) 
      });

      
      const datos = await respuesta.json();

      if (respuesta.ok) {
        
        if (datos.rol === 'Administrador') {
          window.location.href = '/admin';
        } else if (datos.rol === 'Mesero') {
          window.location.href = '/mesero';
        }else if (datos.rol === 'Cocina') {
          window.location.href = '/cocina';
        }else if (datos.rol === 'Cajero') {
          window.location.href = '/cajero';
        }
      } else {
        mostrarError(datos.error || 'Credenciales inválidas');
      }

    } catch (err) {
      
      mostrarError('No se pudo conectar al servidor. ¿Está corriendo Node.js?');
      console.error(err);
    }

    btnLogin.disabled    = false;
    btnLogin.textContent = 'Ingresar';
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnLogin.click();
  });

  function mostrarError(msg) {
    mensajeError.textContent = msg;
    mensajeError.style.display = 'block';
  }
  function ocultarError() {
    mensajeError.style.display = 'none';
  }
});

