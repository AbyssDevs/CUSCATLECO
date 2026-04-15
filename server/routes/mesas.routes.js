const express = require('express');
const router = express.Router();
const { 
    crearMesa, 
    crearMesas
} = require('../controllers/mesas.controller');
const { requirePermission, auditoriaMiddleware } = require('../middlewares/auth.middleware')

router.post('/', auditoriaMiddleware, requirePermission('gestionar_mesas'), crearMesa);
router.post('/bulk', auditoriaMiddleware, requirePermission('gestionar_mesas'), crearMesas);

module.exports = router;