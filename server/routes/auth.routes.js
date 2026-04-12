const express = require("express");
const router = express.Router();
const path = require("path");
const { login, getUsuario } = require("../controllers/auth.controller");

router.post("/login", login);

router.get("/usuario", getUsuario);

module.exports = router;
