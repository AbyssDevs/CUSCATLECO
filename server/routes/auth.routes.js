import express from "express";
const router = express.Router();
import {
    login, 
    getUsuario,
} from "../controllers/auth.controller.js";

import{
    isAuthenticated
} from "../middlewares/auth.middleware.js";

router.post("/login", login);
router.get("/usuario", isAuthenticated, getUsuario);

export default router;
