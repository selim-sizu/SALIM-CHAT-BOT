const express = require("express");
const app = express();

module.exports = function keepAlive() {
  // 🌟 YouTube link hear 
  const youtubeLink = "https://www.youtube.com/@Selim_sizu"; 

  app.get("/", (req, res) => {
    // UptimeRobot-এর রিকোয়েস্ট হলে শুধু "Bot is alive" দেখাবে
    const userAgent = req.headers['user-agent'] || "";
    if (userAgent.includes("UptimeRobot")) {
      return res.status(200).send("Bot is alive!");
    }
    
    // সাধারণ মানুষের ব্রাউজার হলে সরাসরি ইউটিউবে পাঠিয়ে দেবে
    return res.redirect(youtubeLink);
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🌐 Keep-alive সার্ভার পোর্ট ${PORT}-এ চলছে`);
    console.log(`🔗 YouTube Redirect: ${youtubeLink}`);
  });
};
