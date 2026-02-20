const express = require("express");
const router = express.Router();

router.post("/analyze", (req, res) => {
  res.json({ message: "Resume route working" });
});

module.exports = router;
