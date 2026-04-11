-- ============================================================
-- SCHEMA COMPLETO - RESTAURANTE SABOR CUSCATLECO
-- Equipo: Abyss | Sprint 1
-- Fecha: 2026
-- ============================================================
CREATE DATABASE IF NOT EXISTS cuscatleco;
USE cuscatleco;
-- ============================================================
-- 1. ROLES Y PERMISOS
-- ============================================================
CREATE TABLE roles (
    id_rol INT PRIMARY KEY AUTO_INCREMENT,
    rol_nombre VARCHAR(50) NOT NULL UNIQUE,
    rol_descripcion VARCHAR(200),
    rol_activo BOOLEAN DEFAULT TRUE,
    rol_creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE permisos (
    id_permiso INT PRIMARY KEY AUTO_INCREMENT,
    permiso_nombre VARCHAR(100) NOT NULL UNIQUE,
    permiso_modulo VARCHAR(50) NOT NULL,
    permiso_descripcion VARCHAR(200),
    permiso_creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Relacion N:M entre roles y permisos
CREATE TABLE rol_permiso (
    id_rol INT NOT NULL,
    id_permiso INT NOT NULL,
    PRIMARY KEY (id_rol, id_permiso),
    FOREIGN KEY (id_rol) REFERENCES roles(id_rol) ON DELETE CASCADE,
    FOREIGN KEY (id_permiso) REFERENCES permisos(id_permiso) ON DELETE CASCADE
);
-- ============================================================
-- 2. USUARIOS Y CLIENTES
-- ============================================================
CREATE TABLE usuarios (
    id_usuario INT PRIMARY KEY AUTO_INCREMENT,
    usuario_nombre VARCHAR(100) NOT NULL,
    usuario_email VARCHAR(100) NOT NULL UNIQUE,
    usuario_password VARCHAR(255) NOT NULL,
    usuario_telefono VARCHAR(15),
    usuario_activo BOOLEAN DEFAULT TRUE,
    usuario_creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    usuario_actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE usuario_rol (
    id_usuario INT NOT NULL,
    id_rol INT NOT NULL,
    usuario_rol_fecha_asignacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_usuario, id_rol),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_rol) REFERENCES roles(id_rol) ON DELETE CASCADE
);
-- Rangos de fidelidad para clientes (Bronce/Plata/Oro)
CREATE TABLE rangos_cliente (
    id_rango INT PRIMARY KEY AUTO_INCREMENT,
    rango_cliente_nombre ENUM('Bronce', 'Plata', 'Oro') NOT NULL UNIQUE,
    rango_cliente_descuento DECIMAL(5, 2) NOT NULL,
    rango_cliente_min_pedidos INT DEFAULT 0,
    rango_cliente_min_consumo DECIMAL(10, 2) DEFAULT 0.00,
    rango_cliente_descripcion VARCHAR(200)
);
-- Clientes del restaurante (pueden hacer reservaciones y pedidos en linea)
CREATE TABLE clientes (
    id_cliente INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT NOT NULL,
    id_rango INT DEFAULT 1,
    cliente_consumo_acumulado DECIMAL(10, 2) DEFAULT 0.00,
    cliente_total_pedidos INT DEFAULT 0,
    cliente_creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_rango) REFERENCES rangos_cliente(id_rango)
);
-- ============================================================
-- 3. MESAS
-- ============================================================
CREATE TABLE mesas (
    id_mesa INT PRIMARY KEY AUTO_INCREMENT,
    mesa_numero INT NOT NULL UNIQUE,
    mesa_capacidad INT NOT NULL,
    mesa_estado ENUM('Disponible', 'Ocupada', 'Reservada') DEFAULT 'Disponible',
    mesa_creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- ============================================================
-- 4. RESERVACIONES
-- ============================================================
CREATE TABLE reservaciones (
    id_reservacion INT PRIMARY KEY AUTO_INCREMENT,
    id_cliente INT NOT NULL,
    id_mesa INT,
    reservacion_fecha DATETIME NOT NULL,
    reservacion_num_personas INT NOT NULL,
    reservacion_preferencias TEXT,
    reservacion_estado ENUM('Pendiente', 'Confirmada', 'Cancelada') DEFAULT 'Pendiente',
    reservacion_creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    reservacion_actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente),
    FOREIGN KEY (id_mesa) REFERENCES mesas(id_mesa)
);
-- ============================================================
-- 5. MENU Y PLATILLOS
-- ============================================================
CREATE TABLE categorias (
    id_categoria INT PRIMARY KEY AUTO_INCREMENT,
    categoria_nombre VARCHAR(100) NOT NULL UNIQUE,
    categoria_descripcion VARCHAR(200),
    categoria_activo BOOLEAN DEFAULT TRUE
);
CREATE TABLE platillos (
    id_platillo INT PRIMARY KEY AUTO_INCREMENT,
    id_categoria INT NOT NULL,
    platillo_nombre VARCHAR(100) NOT NULL,
    platillo_descripcion TEXT,
    platillo_precio DECIMAL(10, 2) NOT NULL,
    platillo_imagen_url VARCHAR(255),
    platillo_disponible BOOLEAN DEFAULT TRUE,
    platillo_creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    platillo_actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    platillo_actualizado_por INT,
    FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria),
    FOREIGN KEY (platillo_actualizado_por) REFERENCES usuarios(id_usuario)
);
-- ============================================================
-- 6. PEDIDOS
-- ============================================================
CREATE TABLE pedidos (
    id_pedido INT PRIMARY KEY AUTO_INCREMENT,
    id_mesa INT NOT NULL,
    id_mesero INT NOT NULL,
    id_cliente INT NOT NULL,
    pedido_estado ENUM(
        'Pendiente',
        'EnPreparacion',
        'Listo',
        'Entregado',
        'Cerrado',
        'Cancelado'
    ) DEFAULT 'Pendiente',
    pedido_tipo ENUM(
        'Salon',
        'Llevar',
    ) DEFAULT 'Salon',
    pedido_observaciones TEXT,
    pedido_total DECIMAL(10, 2) DEFAULT 0.00,
    pedido_fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    pedido_actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_mesa) REFERENCES mesas(id_mesa),
    FOREIGN KEY (id_mesero) REFERENCES usuarios(id_usuario),
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente)

);
CREATE TABLE detalle_pedido (
    id_detalle INT PRIMARY KEY AUTO_INCREMENT,
    id_pedido INT NOT NULL,
    id_platillo INT NOT NULL,
    detalle_pedido_cantidad INT NOT NULL DEFAULT 1,
    detalle_pedido_precio_unitario DECIMAL(10, 2) NOT NULL,
    detalle_pedido_subtotal DECIMAL(10, 2) NOT NULL,
    detalle_pedido_notas VARCHAR(200),
    FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido) ON DELETE CASCADE,
    FOREIGN KEY (id_platillo) REFERENCES platillos(id_platillo)
);
-- ============================================================
-- 7. FACTURACION ELECTRONICA
-- (Estructura preparada para sprints futuros)
-- ============================================================
CREATE TABLE facturas (
    id_factura INT PRIMARY KEY AUTO_INCREMENT,
    id_pedido INT NOT NULL,
    id_cajero INT NOT NULL,
    factura_correlativo VARCHAR(20) UNIQUE NOT NULL,
    factura_tipo ENUM('ConsumidorFinal', 'CreditoFiscal') NOT NULL,
    factura_nombre_cliente VARCHAR(100),
    factura_dui_nit VARCHAR(20),
    factura_nrc VARCHAR(20),
    factura_direccion VARCHAR(200),
    factura_subtotal DECIMAL(10, 2) NOT NULL,
    factura_iva DECIMAL(10, 2) NOT NULL,
    factura_total DECIMAL(10, 2) NOT NULL,
    factura_fecha_emision DATETIME DEFAULT CURRENT_TIMESTAMP,
    factura_enviada_correo BOOLEAN DEFAULT FALSE,
    factura_anulada BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido),
    FOREIGN KEY (id_cajero) REFERENCES usuarios(id_usuario)
);
CREATE TABLE detalle_factura (
    id_detalle INT PRIMARY KEY AUTO_INCREMENT,
    id_factura INT NOT NULL,
    detalle_factura_descripcion VARCHAR(200) NOT NULL,
    detalle_factura_cantidad INT NOT NULL,
    detalle_factura_precio_unitario DECIMAL(10, 2) NOT NULL,
    detalle_factura_subtotal DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (id_factura) REFERENCES facturas(id_factura) ON DELETE CASCADE
);
-- ============================================================
-- 8. NOTIFICACIONES
-- (Preparada para confirmaciones de reservaciones y pedidos)
-- ============================================================
CREATE TABLE notificaciones (
    id_notificacion INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT NOT NULL,
    notificacion_tipo ENUM('Reservacion', 'Pedido', 'Factura') NOT NULL,
    notificacion_asunto VARCHAR(200),
    notificacion_mensaje TEXT,
    notificacion_enviada BOOLEAN DEFAULT FALSE,
    notificacion_fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);
-- ============================================================
-- 9. DATOS INICIALES (SEED)
-- ============================================================
-- Roles del sistema
INSERT INTO roles (rol_nombre, rol_descripcion)
VALUES (
        'Administrador', 
        'Acceso total al sistema'
    ),
    (
        'Mesero', 
        'Gestión de pedidos por mesa'
    ),
    (
        'Cajero',
        'Control de pagos y facturación'
    ),
    (
        'Cocina',
        'Visualización y gestión de pedidos en cocina'
    ),
    (
        'Cliente',
        'Acceso al portal de clientes'
    );
-- Permisos del sistema
INSERT INTO permisos (
        permiso_nombre,
        permiso_modulo,
        permiso_descripcion
    )
VALUES (
        'ver_dashboard',
        'General',
        'Ver panel principal'
    ),
    (
        'gestionar_usuarios',
        'Usuarios',
        'Crear, editar y eliminar usuarios'
    ),
    (
        'gestionar_roles',
        'Usuarios',
        'Asignar roles a usuarios'
    ),
    (
        'ver_menu',
        'Menu',
        'Ver el menú del restaurante'
    ),
    (
        'gestionar_menu',
        'Menu',
        'Crear, editar y eliminar platillos'
    ),
    (
        'crear_pedido',
        'Pedidos',
        'Registrar nuevos pedidos'
    ),
    (
        'ver_pedidos',
        'Pedidos',
        'Ver listado de pedidos'
    ),
    (
        'actualizar_estado_pedido',
        'Pedidos',
        'Cambiar estado de pedidos'
    ),
    (
        'generar_factura',
        'Facturacion',
        'Generar facturas electrónicas'
    ),
    (
        'ver_reportes',
        'Reportes',
        'Ver reportes y estadísticas'
    ),
    (
        'gestionar_reservaciones',
        'Reservaciones',
        'Crear y gestionar reservaciones'
    ),
    (
        'gestionar_clientes',
        'Clientes',
        'Ver y gestionar clientes y rangos'
    );
-- Permisos por rol
-- Administrador (todos los permisos)
INSERT INTO rol_permiso (id_rol, id_permiso)
VALUES (1, 1),
    (1, 2),
    (1, 3),
    (1, 4),
    (1, 5),
    (1, 6),
    (1, 7),
    (1, 8),
    (1, 9),
    (1, 10),
    (1, 11),
    (1, 12);
-- Mesero
INSERT INTO rol_permiso (id_rol, id_permiso)
VALUES (2, 1),
    (2, 4),
    (2, 6),
    (2, 7),
    (2, 11);
-- Cajero
INSERT INTO rol_permiso (id_rol, id_permiso)
VALUES (3, 1),
    (3, 7),
    (3, 9),
    (3, 12);
-- Cocina
INSERT INTO rol_permiso (id_rol, id_permiso)
VALUES (4, 1),
    (4, 7),
    (4, 8);
-- Rangos de cliente
INSERT INTO rangos_cliente (
        rango_cliente_nombre,
        rango_cliente_descuento,
        rango_cliente_min_pedidos,
        rango_cliente_min_consumo,
        rango_cliente_descripcion
    )
VALUES (
        'Bronce',
        5.00,
        1,
        0.00,
        'Descuento del 5% desde el primer pedido'
    ),
    (
        'Plata',
        10.00,
        5,
        100.00,
        'Descuento del 10% con 5 pedidos o $100 acumulados'
    ),
    (
        'Oro',
        15.00,
        15,
        300.00,
        'Descuento del 15% con 15 pedidos o $300 acumulados'
    );
-- IMPORTANTE: En producción reemplazar con hash bcrypt real
-- Password por defecto: 123
INSERT INTO usuarios (
        usuario_nombre,
        usuario_email,
        usuario_password,
        usuario_telefono
    )
VALUES (
        'Administrador',
        'admin@saborcuscatleco.com',
        '123',
        '77777777'
    );
-- Asignar rol administrador
INSERT INTO usuario_rol (id_usuario, id_rol)
VALUES (1, 1);
-- Categorías del menú
INSERT INTO categorias (categoria_nombre, categoria_descripcion)
VALUES ('Entradas', 'Platillos para comenzar'),
    ('Platos Fuertes', 'Platos principales'),
    ('Bebidas', 'Bebidas frías y calientes'),
    ('Postres', 'Dulces y postres');
-- Mesas del restaurante
INSERT INTO mesas (mesa_numero, mesa_capacidad)
VALUES (1, 4),
    (2, 4),
    (3, 6),
    (4, 6),
    (5, 2),
    (6, 2),
    (7, 8),
    (8, 8);