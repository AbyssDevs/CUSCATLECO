const express        = require('express');
const mysql          = require('mysql2');
const session        = require('express-session');
const path           = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/views/index.html'));
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.use(session({
  secret: 'clave-secreta-del-sistema',
  resave: false,
  saveUninitialized: false,
  rolling: true,
   cookie: { maxAge: 1000 * 60 * 30 }  // La sesión dura 30 minutos
}));

app.get('/403', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/views/403.html'));
});

const db = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '315412',          
  database : 'cuscatleco'
});

db.connect((error) => {
  if (error) {
    console.error('Error al conectar a MySQL:', error.message);
    console.error('Verifica usuario, contraseña y que MySQL esté corriendo.');
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

function requireRole(rolPermitido) {
  return (req, res, next) => {

    if (!req.session || !req.session.usuario) {
      return res.redirect('/');
    }

    if (req.session.usuario.rol !== rolPermitido) {
      return res.redirect('/403');
    }

    next();
  };
}

app.get('/admin', requireRole('Administrador'), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/views/administrador.html'));
});

app.get('/mesero', requireRole('Mesero'), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/views/mesero.html'));
});

app.get('/cocina', requireRole('Cocina'), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/views/cocina.html'));
});

app.get('/cajero', requireRole('Cajero'), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/views/cajero.html'));
});

app.post('/api/login', (req, res) => {

  const { usuario_email, usuario_password } = req.body;

  if (!usuario_email || !usuario_password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
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
      console.error('Error en login:', error);
      return res.status(500).json({ error: 'Error del servidor' });
    }

    if (resultados.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const usuario = resultados[0];

    req.session.usuario = {
      id     : usuario.id_usuario,
      nombre : usuario.usuario_nombre,
      rol    : usuario.rol_nombre
    };

    console.log(`Login exitoso: ${usuario.usuario_nombre} (${usuario.rol_nombre})`);

    res.json({
      mensaje : 'Login exitoso',
      rol     : usuario.rol_nombre,
      usuario : usuario.usuario_nombre
    });

  });

});


app.listen(PORT, () => {
  console.log(` Servidor corriendo en http://localhost:${PORT}`);
  console.log(` Abre esa URL en tu navegador para ver el login`);
});