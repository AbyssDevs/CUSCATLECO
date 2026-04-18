const db = require("./server/db");

const verUsuarios = () => {
  const sql = `
    SELECT
      u.usuario_nombre,
      u.usuario_email,
      r.rol_nombre
    FROM usuarios u
    JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
    JOIN roles r ON ur.id_rol = r.id_rol
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error:", err);
    } else {
      console.log("Usuarios:");
      results.forEach(user => {
        console.log(`${user.usuario_nombre} (${user.usuario_email}) - ${user.rol_nombre}`);
      });
    }
    db.end();
  });
};

verUsuarios();