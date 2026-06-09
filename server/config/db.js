import mysql from "mysql2/promise";
//NOTA: Cambiar la contraseña por la suya propia
const db = mysql.createPool({
  host: "localhost",
  port: 3306,
  user: "root",
  password: "1234",
  database: "cuscatleco",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

console.log('Conectado a MySQL (pool activo)');

export default db;