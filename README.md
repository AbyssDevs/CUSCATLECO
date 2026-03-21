# CUSCATLECO

Sistema de Punto de Venta (POS) para el **Restaurante Sabor Cuscatleco**.  
Gestión de pedidos, roles de usuario diferenciados (**Administrador, Mesero, Cajero, Cocina**) y facturación electrónica básica.  

Desarrollado bajo metodología **Scrum** durante el ciclo I-2026 en la **Universidad de Oriente (UNIVO)** – Facultad de Ingeniería y Arquitectura.




## Características principales

- Autenticación y roles de usuario (Administrador, Mesero, Cajero, Cocina)
- Toma de pedidos por mesa
- Envío de pedidos a cocina en tiempo real
- Cobro y generación de facturas
- Gestión de productos y usuarios (solo administrador)
- Conexión segura a base de datos MySQL
- 
-
-
- **Autenticación con JWT** y roles diferenciados:
- **Administrador**: gestiona usuarios, productos, categorías y ve reportes básicos.
- **Mesero**: toma pedidos por mesa, agrega observaciones y envía a cocina.
- **Cajero**: cobra cuentas, genera facturas y cierra mesas.
- **Cocina**: recibe pedidos en tiempo real y marca su estado (en preparación / listo).

## Tecnologías utilizadas

- **Frontend**: HTML5 • CSS3 • JavaScript 
- **Backend**: Node.js • Express.js
- **Base de datos**: MySQL
- **Autenticación**: JWT (JSON Web Tokens) 
- **Gestión de dependencias**: npm

## Requisitos previos

- Node.js (versión 18 o superior recomendada)
- MySQL (versión 8.0 o superior)
- Git

## Instalación paso a paso

1. **Clonar el repositorio**

   ```bash
   git clone https://github.com/AbyssDevs/CUSCATLECO.git
   cd CUSCATLECO
