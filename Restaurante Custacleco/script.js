const usuarios = [
  { usuario: "admin", password: "123", rol: "administrador" },
  { usuario: "mesero1", password: "123", rol: "mesero" }
];

let pedidos = [];
let ventas = 0;

function login(){
  const usuarioInput = document.getElementById("usuario").value;
  const passwordInput = document.getElementById("password").value;

  if(usuarioInput === "" || passwordInput === ""){
    alert("Complete todos los campos");
    return;
  }

  const usuarioEncontrado = usuarios.find(
    u => u.usuario === usuarioInput && u.password === passwordInput
  );

  if(!usuarioEncontrado){
    alert("Usuario o contraseña incorrectos");
    return;
  }

  const rol = usuarioEncontrado.rol;

  document.getElementById("login").classList.add("hidden");
  document.getElementById("dashboard").classList.remove("hidden");
  document.getElementById("rolTitulo").innerText = rol.toUpperCase();

  cargarVista(rol);
}

function cargarVista(rol){
  const contenido = document.getElementById("contenido");

  if(rol === "administrador"){
    contenido.innerHTML = `
      <div class="card">
        <h2>Panel Administrador</h2>
        <p>Total ventas: $${ventas}</p>
        <p>Total pedidos: ${pedidos.length}</p>
      </div>
    `;
  }

  if(rol === "mesero"){
    contenido.innerHTML = `
      <div class="card">
        <h2>Crear Pedido</h2>
        <input type="text" id="mesa" placeholder="Mesa">
        <input type="text" id="detalle" placeholder="Detalle del pedido">
        <input type="number" id="precio" placeholder="Precio" min="0">
        <button onclick="agregarPedido()">Enviar Pedido</button>
      </div>
      <h2>Pedidos Activos</h2>
      <div id="listaPedidos" class="contenedor-pedidos"></div>
    `;
  }
}

function agregarPedido(){
  const mesa = document.getElementById("mesa").value;
  const detalle = document.getElementById("detalle").value;
  const precio = document.getElementById("precio").value;

  if(mesa === "" || detalle === "" || precio === ""){
    alert("Complete todos los campos");
    return;
  }

  if(precio <= 0){
    alert("El precio debe ser mayor a 0");
    return;
  }

  pedidos.push({ 
    mesa: mesa, 
    detalle: detalle, 
    precio: precio 
  });
  
  mostrarPedidos();

  document.getElementById("mesa").value = "";
  document.getElementById("detalle").value = "";
  document.getElementById("precio").value = "";
}

function mostrarPedidos(){
  const contenedor = document.getElementById("listaPedidos");
  
  if(!contenedor) return;
  
  contenedor.innerHTML = "";

  pedidos.forEach((pedido, index) => {
    contenedor.innerHTML += `
      <div class="pedido-card">
        <h3>Mesa ${pedido.mesa}</h3>
        <p>${pedido.detalle}</p>
        <p>$${pedido.precio}</p>
        <button onclick="cancelarPedido(${index})" style="background:crimson; color:white; border:none; padding:8px 12px; margin-top:10px; border-radius:4px; cursor:pointer; width:100%;">
          Cancelar pedido
        </button>
      </div>
    `;
  });
}

function cancelarPedido(index){
  if(confirm("¿Seguro que deseas cancelar este pedido?")){
    pedidos.splice(index, 1);
    mostrarPedidos();
    alert("Pedido cancelado");
  }
}

function cerrarSesion(){
  document.getElementById("dashboard").classList.add("hidden");
  document.getElementById("login").classList.remove("hidden");
}