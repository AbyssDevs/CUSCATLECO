const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "1234",
  database: "cuscatleco",
});

db.connect((error) => {
  if (error) {
    console.error("Error al conectar a MySQL:", error.message);
    console.error("Verifica usuario, contraseña y que MySQL esté corriendo.");
  } else {
    console.log('Conectado exitosamente a la base de datos MySQL "cuscatleco"');
  }
});

module.exports = db;
