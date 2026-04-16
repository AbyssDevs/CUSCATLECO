# CUSCATLECO
Credenciales
admin@saborcuscatleco.com
Contraseña: 123

## API Endpoints

### Mesas

- **POST /api/mesas** - Crear una mesa individual
  - Body: `{ "mesa_numero": 1, "mesa_capacidad": 4, "mesa_estado": "Disponible" }`

- **POST /api/mesas/bulk** - Crear múltiples mesas (máximo 50)
  - Body: `{ "mesas": [{ "mesa_numero": 1, "mesa_capacidad": 4 }, { "mesa_numero": 2, "mesa_capacidad": 2 }] }`
  - El estado por defecto es "Disponible" si no se especifica.

---

## Requisitos

Antes de ejecutar el proyecto necesitas tener instalado:

- Node.js
- Git
- Mysql

---

## Instalación

1. Clonar el repositorio:

git clone  https://github.com/AbyssDevs/CUSCATLECO.git

2. Entrar a la carpeta del proyecto:

cd public

3. Instalar dependencias:

npm install

---

## Ejecución del proyecto

Para iniciar el proyecto ejecuta:

npm start

Luego abre en el navegador:

http://localhost:3000

---
