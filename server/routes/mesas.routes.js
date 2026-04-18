const express = require('express');
const router = express.Router();
const { 
    crearMesa, 
    crearMesas,
    listarMesas,
    cambiarEstadoMesa
} = require('../controllers/mesas.controller');
const { requirePermission, auditoriaMiddleware } = require('../middlewares/auth.middleware')

router.post('/', auditoriaMiddleware, requirePermission('gestionar_mesas'), crearMesa);

router.post('/bulk', auditoriaMiddleware, requirePermission('gestionar_mesas'), crearMesas);

router.get('/', requirePermission('ver_mesas'), listarMesas);

router.patch('/:id/estado', auditoriaMiddleware, requirePermission('actualizar_estado_mesa'), cambiarEstadoMesa);

module.exports = router;