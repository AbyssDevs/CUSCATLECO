# 📌 CUSCATLECO

## Sistema POS para Restaurante Sabor Cuscatleco | Gestión de pedidos, roles de usuario (Administrador, Mesero, Cajero, Cocina) y facturación electrónica. Desarrollado bajo metodología Scrum durante el ciclo I-2026 en la Universidad de Oriente (UNIVO) – Facultad de Ingeniería y Arquitectura
---


## ⚙️ Características principales

- Autenticación y roles de usuario (Administrador, Mesero, Cajero, Cocina)
- Toma de pedidos por mesa
- Envío de pedidos a cocina en tiempo real
- Cobro y generación de facturas
- Gestión de productos y usuarios (solo administrador)
- Conexión segura a base de datos MySQL
- **Autenticación con JWT** y roles diferenciados:
- **Administrador**: gestiona usuarios, productos, categorías y ve reportes básicos.
- **Mesero**: toma pedidos por mesa, agrega observaciones y envía a cocina.
- **Cajero**: cobra cuentas, genera facturas y cierra mesas.
- **Cocina**: recibe pedidos en tiempo real y marca su estado (en preparación / listo).
---
 
## ⚙️ Tecnologías utilizadas

- **Frontend**: HTML5 • CSS3 • JavaScript 
- **Backend**: Node.js • Express.js
- **Base de datos**: MySQL
- **Autenticación**: JWT (JSON Web Tokens) 
- **Gestión de dependencias**: npm

---

## ⚙️ Requisitos previos

- Node.js (versión 18 o superior recomendada)
- MySQL (versión 8.0 o superior)
- Git

---
## 🚀 Instalación

### 1. Clonar repositorio
git clone https://github.com/AbyssDevs/CUSCATLECO.git  
cd CUSCATLECO  

---

### 2. Instalar dependencias
npm install  

---

### 3. Instalar dependencias adicionales necesarias
npm install bcrypt multer  

Estas librerías son necesarias para el funcionamiento del sistema:

- bcrypt → Encriptación de contraseñas  
- multer → Manejo de subida de archivos (ej: imágenes)

---

## ⚙️ Configuración de la base de datos

### IMPORTANTE  
Debes configurar tu propia contraseña de MySQL.

---

### 1. Crear base de datos
CREATE DATABASE cuscatleco;

---

### 2. Importar el script SQL  
Busca el archivo `.sql` dentro del proyecto e impórtalo en MySQL Workbench o phpMyAdmin.

---

### 3. Configurar conexión  

Ubica el archivo donde se conecta la base de datos (db.js) y cambia:

  host: "localhost",
  user: "root",
  password: "TU_PASSWORD",
  database: "cuscatleco", 

Reemplaza `TU_PASSWORD` por tu contraseña real de MySQL.

---

## ▶️ Ejecución del proyecto

npm run dev  

Si no funciona:

node server/server.js  

---

---
