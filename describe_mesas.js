const db = require("./server/db");

const describeMesas = () => {
  const sql = "DESCRIBE mesas";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error:", err);
    } else {
      console.log("Estructura de mesas:");
      results.forEach(col => {
        console.log(`${col.Field}: ${col.Type}`);
      });
    }
    db.end();
  });
};

describeMesas();