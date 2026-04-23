import express from "express";
const router = express.Router();
import {
    login, 
    getUsuario,
} from "../controllers/auth.controller.js";

router.post("/login", login);
router.get("/usuario", getUsuario);

export default router;
