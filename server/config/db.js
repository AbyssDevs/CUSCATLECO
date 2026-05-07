import mysql from "mysql2/promise";

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "315412",
  database: "cuscatleco",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

console.log('Conectado a MySQL (pool activo)');

export default db;