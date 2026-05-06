// Este archivo es solo para pruebas rápidas, no forma parte de la aplicación
// Puedes ejecutarlo con `node server/archivo.js` para ver resultados rápidos
//Crea un hash de contraseña para probar el login con bcrypt

import bcrypt from "bcryptjs";

const password = "123";

const hash = await bcrypt.hash(password, 10);
console.log(hash);