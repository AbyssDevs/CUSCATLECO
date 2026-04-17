const express = require('express');
const router = express.Router();
const { 
    crearMesa, 
    crearMesas,
    listarMesas,
    eliminarMesa
} = require('../controllers/mesas.controller');
const { requirePermission, auditoriaMiddleware } = require('../middlewares/auth.middleware')

router.post('/', auditoriaMiddleware, requirePermission('gestionar_mesas'), crearMesa);

router.post('/bulk', auditoriaMiddleware, requirePermission('gestionar_mesas'), crearMesas);

router.get('/', requirePermission('ver_mesas'), listarMesas);

router.delete('/:id', requirePermission('gestionar_mesas'), eliminarMesa);

module.exports = router;