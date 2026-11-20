const express = require("express");
const app = express();

module.exports = function keepAlive() {
  app.get("/", (req, res) => {
    res.send("🤖 SALIM-CHAT-BOT চলছে!");
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🌐 Keep-alive সার্ভার পোর্ট ${PORT}-এ চলছে`);
  });
};
