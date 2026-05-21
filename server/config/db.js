import mysql from "mysql2/promise";
//NOTA: Cambiar la contraseña por la suya propia
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "12345",
  database: "cuscatleco",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

console.log('Conectado a MySQL (pool activo)');

export default db;