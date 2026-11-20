<div align="center">

<img src="https://i.imgur.com/8Km9tLL.png" width="120" alt="SALIM CHAT BOT"/>

# 🤖 𝐒𝐀𝐋𝐈𝐌 𝐂𝐇𝐀𝐓 𝐁𝐎𝐓

### Messenger Group Chat Bot · Powered by Node.js

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Render](https://img.shields.io/badge/Hosted%20on-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![Owner](https://img.shields.io/badge/Owner-Selim%20Sizu-1877F2?style=for-the-badge&logo=facebook&logoColor=white)](https://facebook.com/100075452558091)

**A fun, feature-rich Messenger bot with auto-reply, admin tools, YouTube audio download, video-to-MP3 converter, and a beautiful owner card.**

</div>

---

## ✨ Features

| 🎯 Feature | 📝 Description |
|---|---|
| 💬 **Custom Auto-Reply** | ৮০+ ট্রিগার — `hi`, `boss`, `jan`, `💋`, `salam`, `miss you` ইত্যাদি |
| 👑 **Owner Card** | `admin` লিখলেই স্টাইলিশ OWNER DETAILS কার্ড + লাইভ সময় |
| 🛡️ **Admin System** | অ্যাডমিন যোগ/বাদ/লিস্ট — mention, reply বা UID দিয়ে |
| 🆔 **UID Finder** | কারো UID বের করুন mention/reply করে |
| 🎵 **YouTube Audio** | `/download <url>` — যেকোনো YouTube ভিডিওর MP3 |
| 🎬 **Video → MP3** | ভিডিওতে reply দিয়ে `/mp3` — সাথে সাথে অডিও |
| 🎉 **Welcome Video** | গ্রুপে নতুন সদস্য এলে ভিডিওসহ স্বাগতম |
| 😂 **Funny Reply** | মজার জোকস ও রিপ্লাই |
| 📜 **Styled Help Menu** | Pagination + কমান্ড ডিটেইলস |
| 🔄 **Auto Reconnect** | MQTT বিচ্ছিন্ন হলে স্বয়ংক্রিয় পুনঃসংযোগ |
| 🌐 **Keep-Alive Server** | UptimeRobot দিয়ে ২৪/৭ অনলাইন |

---

## 📁 Project Structure

SALIM-CHAT-BOT/
├── index.js                 # Main entry point
├── config.json              # Bot configuration
├── appstate.json            # Facebook session (NEVER commit!)
├── package.json
├── .gitignore
├── README.md
│
├── utils/
│   ├── keep_alive.js        # Express server for UptimeRobot
│   └── youtube.js           # YouTube audio downloader
│
├── commands/
│   ├── admin.js             # Admin management + owner card
│   ├── help.js              # Styled help menu
│   ├── uid.js               # UID finder
│   ├── owner.js             # Owner info
│   ├── funny.js             # Funny replies
│   ├── welcome.js           # Welcome message
│   ├── download.js          # YouTube audio
│   └── mp3.js               # Video to MP3
│
└── events/
└── autoreply.js         # Auto-reply triggers

```

---

## ⚙️ Configuration

### `config.json`

```json
{
  "botName": "SALIM-CHAT-BOT",
  "prefix": "/",
  "ownerID": "100075452558091",
  "adminIDs": ["100075452558091"],
  "welcomeVideoURL": "https://example.com/welcome.mp4",
  "helpImageURL": "https://i.imgur.com/xxxxxx.jpg"
}
Key Description
botName বটের নাম (help menu-তে দেখা যাবে)
prefix কমান্ড প্রিফিক্স (ডিফল্ট /)
ownerID মালিকের Facebook UID
adminIDs অ্যাডমিনদের UID অ্যারে
welcomeVideoURL গ্রুপে ওয়েলকাম ভিডিওর লিঙ্ক (ঐচ্ছিক)
helpImageURL help মেসেজে ছবি (ঐচ্ছিক)
