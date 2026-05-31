import mysql from "mysql2/promise";
//NOTA: Cambiar la contraseña por la suya propia
const db = mysql.createPool({
  host: "bonknhnhqfe8wgynsewv-mysql.services.clever-cloud.com",
  port: 3306,
  user: "u6adl69crwijaeit",
  password: "u6adl69crwijaeit",
  database: "bonknhnhqfe8wgynsewv",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

console.log('Conectado a MySQL (pool activo)');

export default db;