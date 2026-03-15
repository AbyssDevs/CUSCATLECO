const express = require("express");
const mysql = require("mysql2");
const session = require("express-session");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../public")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/views/index.html"));
});


app.use(
  session({
    secret: "clave-secreta-del-sistema",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { maxAge: 1000 * 60 * 30 }, // La sesión dura 30 minutos
  }),
);


const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "315412",
  database: "cuscatleco",
});


app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.get('/403', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/views/403.html'));
});

app.get("/403", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/views/403.html"));
});

db.connect((error) => {
  if (error) {
    console.error("Error al conectar a MySQL:", error.message);
    console.error("Verifica usuario, contraseña y que MySQL esté corriendo.");
  } else {
    console.log('Conectado exitosamente a la base de datos MySQL "cuscatleco"');
  }
});

//-------------------MENSAJE-------------------------------------------------------
//de momento no se usa, pero lo dejo para futuras rutas que requieran autenticación.
//-----------------------------------------------------------------------------------
//function requireLogin(req, res, next) {
//if (req.session && req.session.usuario) {
//next(); // El usuario está logueado → continúa normalmente
//} else {
// No está logueado → lo mandamos al login
//res.status(401).json({ error: 'No autorizado. Por favor inicia sesión.' });
//}
//}

function requireRole(...rolesPermitidos) {
  return (req, res, next) => {

    if (!req.session || !req.session.usuario) {
      return res.redirect("/");
    }

    if (!rolesPermitidos.includes(req.session.usuario.rol)) {
      return res.redirect("/403");
    }

    next();
  };
}



app.get("/admin", requireRole("Administrador"), (req, res) => {
  res.sendFile(path.join(__dirname, "../public/views/administrador.html"));
});

app.get("/mesero", requireRole("Mesero"), (req, res) => {
  res.sendFile(path.join(__dirname, "../public/views/mesero.html"));
});

app.get("/cocina", requireRole("Cocina"), (req, res) => {
  res.sendFile(path.join(__dirname, "../public/views/cocina.html"));
});

app.get("/cajero", requireRole("Cajero"), (req, res) => {
  res.sendFile(path.join(__dirname, "../public/views/cajero.html"));
});

app.post("/api/login", (req, res) => {
  const { usuario_email, usuario_password } = req.body;

  if (!usuario_email || !usuario_password) {
    return res.status(400).json({ error: "Email y contraseña requeridos" });
  }

  const sql = `
    SELECT 
      u.id_usuario,
      u.usuario_nombre,
      u.usuario_email,
      r.rol_nombre
    FROM usuarios u
    JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
    JOIN roles r ON ur.id_rol = r.id_rol
    WHERE u.usuario_email = ?
      AND u.usuario_password = ?
      AND u.usuario_activo = TRUE
    LIMIT 1
  `;

  db.query(sql, [usuario_email, usuario_password], (error, resultados) => {
    if (error) {
      console.error("Error en login:", error);
      return res.status(500).json({ error: "Error del servidor" });
    }

    if (resultados.length === 0) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    const usuario = resultados[0];

    req.session.usuario = {
      id: usuario.id_usuario,
      nombre: usuario.usuario_nombre,
      rol: usuario.rol_nombre,
    };

    console.log(
      `Login exitoso: ${usuario.usuario_nombre} (${usuario.rol_nombre})`
    );

    res.json({
      mensaje: "Login exitoso",
      rol: usuario.rol_nombre,
      usuario: usuario.usuario_nombre,
    });
  });
});

app.get("/api/usuario", (req, res) => {

  if (!req.session || !req.session.usuario) {
    return res.status(401).json({ error: "Sesión no válida" });
  }

  res.json(req.session.usuario);

});

app.post("/api/empleados", (req, res) => {
  const { nombre, email, password, telefono, rol } = req.body;

  const sqlUsuario = `
    INSERT INTO usuarios 
    (usuario_nombre, usuario_email, usuario_password, usuario_telefono)
    VALUES (?, ?, ?, ?)
  `;

  db.query(
    sqlUsuario,
    [nombre, email, password, telefono],
    (error, resultado) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ error: "Error al crear usuario" });
      }

      const idUsuario = resultado.insertId;

      // buscar id del rol
      const sqlRol = "SELECT id_rol FROM roles WHERE rol_nombre = ?";

      db.query(sqlRol, [rol], (error2, resultadoRol) => {
        if (error2 || resultadoRol.length === 0) {
          console.error(error2);
          return res.status(500).json({ error: "Rol no encontrado" });
        }

        const idRol = resultadoRol[0].id_rol;

        // insertar relación
        const sqlAsignar = `
          INSERT INTO usuario_rol (id_usuario, id_rol)
          VALUES (?, ?)
        `;

        db.query(sqlAsignar, [idUsuario, idRol], (error3) => {
          if (error3) {
            console.error(error3);
            return res.status(500).json({ error: "Error al asignar rol" });
          }

          res.json({ mensaje: "Empleado creado correctamente" });
        });
      });
    }
  );
});

app.get("/api/empleados", requireRole("Administrador"), (req, res) => {
  const sql = `
SELECT 
  u.id_usuario,
  u.usuario_nombre,
  u.usuario_email,
  u.usuario_telefono,
  r.rol_nombre,
  Date_Format(u.usuario_creado_en, '%Y-%m-%d') AS fecha_creacion
FROM usuarios u
JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
JOIN roles r ON ur.id_rol = r.id_rol
WHERE u.usuario_activo = TRUE
`;

  db.query(sql, (error, empleados) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Error del servidor" });
    }

    res.json(empleados);
  });
});

app.delete("/api/empleados/:id", requireRole("Administrador"), (req, res) => {
  const { id } = req.params;

  const sql = `UPDATE usuarios SET usuario_activo = FALSE WHERE id_usuario = ?`;

  db.query(sql, [id], (error, resultado) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Error del servidor" });
    }
    res.json({ mensaje: "Empleado eliminado correctamente" });
  });
});

app.put("/api/empleados/:id", requireRole("Administrador"), (req, res) => {
  const { id } = req.params;
  const { nombre, email, telefono, rol } = req.body;

  const sqlUsuario = `
    UPDATE usuarios
    SET usuario_nombre = ?, usuario_email = ?, usuario_telefono = ?
    WHERE id_usuario = ?
  `;

  db.query(sqlUsuario, [nombre, email, telefono, id], (error) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Error al actualizar usuario" });
    }

    // actualizar rol
    const sqlRol = `
      UPDATE usuario_rol ur
      JOIN roles r ON ur.id_rol = r.id_rol
      SET ur.id_rol = (
        SELECT id_rol FROM roles WHERE rol_nombre = ?
      )
      WHERE ur.id_usuario = ?
    `;

    db.query(sqlRol, [rol, id], (error2) => {
      if (error2) {
        console.error(error2);
        return res.status(500).json({ error: "Error al actualizar rol" });
      }

      res.json({ mensaje: "Empleado actualizado correctamente" });
    });
  });
});

app.listen(PORT, () => {
  console.log(` Servidor corriendo en http://localhost:${PORT}`);
  console.log(` Abre esa URL en tu navegador para ver el login`);
});
