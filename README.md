# 📌 CUSCATLECO

# Sistema web para la gestión de pedidos en restaurante, que permite administrar órdenes, estados y usuarios (mesero y cocina).

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
