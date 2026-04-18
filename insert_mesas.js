const db = require("./server/db");

const insertarMesas = () => {
  const mesas = [
    { numero: 1, capacidad: 4, ubicacion: "Terraza", estado: "Disponible" },
    { numero: 2, capacidad: 2, ubicacion: "Interior", estado: "Disponible" },
    { numero: 3, capacidad: 6, ubicacion: "Terraza", estado: "Ocupada" },
  ];

  mesas.forEach(mesa => {
    const sql = `INSERT INTO mesas (mesa_numero, mesa_capacidad, mesa_ubicacion, mesa_estado) VALUES (?, ?, ?, ?)`;
    db.query(sql, [mesa.numero, mesa.capacidad, mesa.ubicacion, mesa.estado], (err, result) => {
      if (err) {
        console.error("Error insertando mesa:", err);
      } else {
        console.log("Mesa insertada:", result.insertId);
      }
    });
  });
};

insertarMesas();