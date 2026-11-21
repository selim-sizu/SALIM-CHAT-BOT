

```markdown
<div align="center">

# 🤖 𝐒𝐀𝐋𝐈𝐌 𝐂𝐇𝐀𝐓 𝐁𝐎𝐓

### Messenger Group Chat Bot · Powered by Node.js

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Render](https://img.shields.io/badge/Hosted%20on-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![Owner](https://img.shields.io/badge/Owner-Selim%20Sizu-1877F2?style=for-the-badge&logo=facebook&logoColor=white)](https://facebook.com/100075452558091)

**A feature-rich Messenger bot with auto-reply, admin tools, anti-bad words, YouTube audio download, video-to-MP3 converter, and random welcome/leave GIFs.**

</div>

---

## ✨ Features

| 🎯 Feature | 📝 Description |
|---|---|
| 💬 **Custom Auto-Reply** | ৮০+ ট্রিগার — `hi`, `boss`, `jan`, `💋`, `salam`, `miss you` ইত্যাদি |
| 🤖 **Bot Call Reply** | `bot`, `babu`, `jan`, `xan` লিখলে র‍্যান্ডম মজার রিপ্লাই |
| 👑 **Owner Card** | `admin` বা `owner` লিখলে স্টাইলিশ OWNER DETAILS কার্ড |
| 🛡️ **Admin System** | অ্যাডমিন যোগ/বাদ/লিস্ট — mention, reply বা UID দিয়ে |
| 🚫 **Auto-Kick (Anti-Gali)** | গালি দিলে সাথে সাথে ওয়ার্নিং এবং কিক |
| 🎉 **Welcome & Leave GIF** | কেউ জয়েন/লিভ নিলে র‍্যান্ডমলি ১টি GIF বা ভিডিও পাঠায় |
| 🖼️ **UID & PP Finder** | `/pp` দিয়ে কারো UID, প্রোফাইল লিঙ্ক ও প্রোফাইল পিকচার বের করা |
| 🎵 **YouTube Audio** | `/download <url>` — যেকোনো YouTube ভিডিওর MP3 |
| 🎬 **Video → MP3** | ভিডিওতে reply দিয়ে `/mp3` — সাথে সাথে অডিও |
| 🎂 **Birthday Wish** | `/wish @user` দিয়ে ছবিসহ জন্মদিনের শুভেচ্ছা (Canvas) |
| 🏓 **Ping System** | `/ping` দিয়ে বটের রেসপন্স টাইম ও আপটাইম চেক |
| 🔄 **Auto Reconnect** | MQTT বিচ্ছিন্ন হলে স্বয়ংক্রিয় পুনঃসংযোগ |
| 🌐 **Keep-Alive Server** | UptimeRobot দিয়ে ২৪/৭ অনলাইন |

---

## 📁 Project Structure

```text
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
│   ├── pp.js                # Profile picture & UID finder
│   ├── owner.js             # Owner info with random photo/video
│   ├── prefix.js            # Show bot prefix & group info
│   ├── rules.js             # Group rules
│   ├── pending.js           # Pending group management
│   ├── funny.js             # Funny replies
│   ├── ping.js              # Response time & uptime
│   ├── wish.js              # Birthday wish with canvas
│   ├── wish2.js             # Text-only birthday wish
│   ├── download.js          # YouTube audio
│   └── mp3.js               # Video to MP3
│
└── events/
    ├── autoreply.js         # Auto-reply triggers
    ├── bot.js               # Bot call (babu, jan, bot) replies
    ├── antigali.js          # Bad word detection & auto-kick
    ├── welcome.js           # Welcome message + random GIF
    ├── leave.js             # Leave message + random GIF
    ├── welcome/             # Folder for welcome GIFs (3+ files)
    └── leave/               # Folder for leave GIFs (3+ files)
```

---

⚙️ Configuration

config.json

```json
{
  "botName": "SALIM-CHAT-BOT",
  "prefix": "/",
  "ownerID": "100075452558091",
  "ownerName": "Selim Sizu",
  "adminIDs": [
    "100075452558091",
    "100044713412032"
  ],
  "welcomeVideoURL": "",
  "leaveVideoURL": "",
  "helpImageURL": ""
}
```

Key Description
botName বটের নাম (help menu-তে দেখা যাবে)
prefix কমান্ড প্রিফিক্স (ডিফল্ট /)
ownerID মালিকের Facebook UID
ownerName মালিকের নাম
adminIDs অ্যাডমিনদের UID অ্যারে
welcomeVideoURL গ্রুপে ওয়েলকাম ভিডিওর লিঙ্ক (ঐচ্ছিক)
leaveVideoURL লিভ নিলে ভিডিওর লিঙ্ক (ঐচ্ছিক)
helpImageURL help মেসেজে ছবি (ঐচ্ছিক)

---

🚀 Setup

1️⃣ Prerequisites

· Node.js ≥ 20
· FFmpeg (mp3 কমান্ডের জন্য — ffmpeg-static অটো ইনস্টল হয়)
· একটি Facebook অ্যাকাউন্ট (বটের জন্য স্পেয়ার আইডি সুপারিশ)

2️⃣ Install

```bash
git clone https://github.com/selim-sizu/SALIM-CHAT-BOT.git
cd SALIM-CHAT-BOT
npm install
```

3️⃣ Get appstate.json

1. ব্রাউজারে Facebook-এ লগইন করুন
2. C3C FbState বা CookieEditor এক্সটেনশন ইনস্টল করুন
3. কুকি এক্সপোর্ট করে appstate.json নামে সেভ করুন
4. ফাইলটি প্রজেক্টের রুটে রাখুন

⚠️ সতর্কতা: appstate.json কখনো GitHub-এ পুশ করবেন না। এটি .gitignore-এ রাখুন এবং Render-এ Secret File হিসেবে যোগ করুন।

4️⃣ Run Locally

```bash
npm start
```

লগে ✅ XX টি কমান্ড লোড হয়েছে ও 🤖 বট অনলাইন! দেখলেই সফল।

---

☁️ Deploy on Render

ধাপ ১: GitHub-এ পুশ করুন

```bash
git add .
git commit -m "Initial deploy"
git push origin main
```

ধাপ ২: Render Web Service তৈরি

1. render.com → New → Web Service
2. আপনার GitHub রিপো সিলেক্ট করুন
3. সেটিংস:
   · Runtime: Node
   · Build Command: npm install
   · Start Command: npm start
   · Instance: Free

ধাপ ৩: Environment Variables

Render ড্যাশবোর্ড → Environment →

Key Value
NODE_VERSION 20
PORT (Render অটো দেয়)

ধাপ ৪: Secret File (appstate.json)

1. Environment → Secret Files → Add Secret File
2. Filename: appstate.json
3. Contents: আপনার পুরো appstate.json পেস্ট করুন
4. Save → Redeploy

index.js-এ পাথ লজিক:

```javascript
const appStatePath = "/etc/secrets/appstate.json";
const appState = JSON.parse(fs.readFileSync(appStatePath, "utf8"));
```

ধাপ ৫: UptimeRobot (২৪/৭ চালু রাখতে)

1. uptimerobot.com → Free account
2. Add New Monitor → HTTP(s)
3. URL: https://your-app.onrender.com
4. Interval: 5 minutes
5. Save

এটি Render-কে ১৫ মিনিট নিষ্ক্রিয়তার পর ঘুমিয়ে পড়া থেকে রক্ষা করবে।

---

📖 Commands

🔹 For Everyone

Command Description
/help কমান্ড লিস্ট (paginated)
/help <name> নির্দিষ্ট কমান্ডের ডিটেইলস
/uid নিজের UID
/uid @user অন্যের UID
/pp নিজের UID + প্রোফাইল পিকচার
/pp @user অন্যের UID + প্রোফাইল পিকচার
/admin 👑 OWNER DETAILS কার্ড
/owner মালিকের তথ্য (র‍্যান্ডম ছবি/ভিডিও সহ)
/prefix বটের প্রিফিক্স ও গ্রুপের নাম
/rules গ্রুপের নিয়মাবলী
/funny মজার জোক
/ping বটের রেসপন্স টাইম ও আপটাইম
/wish @user জন্মদিনের শুভেচ্ছা (ছবিসহ)
/wish2 @user জন্মদিনের শুভেচ্ছা (শুধু টেক্সট)
/download <url> YouTube অডিও
/mp3 ভিডিওতে reply → অডিও

🔸 For Admins Only

Command Description
/admin list অ্যাডমিন লিস্ট
/admin add @user নতুন অ্যাডমিন
/admin add + reply Reply করা ইউজার অ্যাডমিন
/admin remove @user অ্যাডমিন বাদ
/pending list পেন্ডিং গ্রুপ লিস্ট
/pending approve all সব গ্রুপ অ্যাপ্রুভ
/pending reject all সব গ্রুপ রিজেক্ট

---

💬 Auto-Reply Triggers

prefix ছাড়াই লিখলেই রিপ্লাই আসবে:

Trigger Reply
hi, hello, hey র‍্যান্ডম গ্রিটিং
boss, বস বসের স্টাইলিশ রিপ্লাই
jan, xan, xanu বসের ইনবক্সে যাওয়ার টিপস 💋
💋 চুলকায় নাকি 😒
salam, assalamualaikum ওয়ালাইকুম আসসালাম 🌸
miss you রোমান্টিক রিপ্লাই
owner, admin OWNER কার্ড
fork GitHub রিপো লিঙ্ক
pagol, chup, bc মজার ইনসাল্ট রিপ্লাই
good morning, gm শুভ সকাল ☀️
good night, gn Sweet dreams 🌙
i love you বসের ইনবক্সে যাওয়ার নিমন্ত্রণ
bot, babu, jan বটের মজার র‍্যান্ডম রিপ্লাই

সম্পূর্ণ লিস্ট: events/autoreply.js এবং events/bot.js দেখুন

---

🛡️ Security Notes

· ✅ appstate.json → Render Secret File, কখনো GitHub-এ নয়
· ✅ config.json → GitHub-এ রাখা যাবে (গোপন কিছু না থাকলে)
· ✅ .env → সবসময় ignore
· ✅ UptimeRobot → ৫ মিনিট interval
· ❌ সেশন লগে শেয়ার করবেন না
· ❌ Raw log পাবলিকলি পোস্ট করবেন না

যদি appstate.json লিক হয়ে যায়

1. Facebook → Settings → Security → Where you're logged in
2. সব সেশন Log out
3. পাসওয়ার্ড পরিবর্তন + 2FA চালু
4. নতুন appstate.json এক্সপোর্ট করে Render-এ আপডেট

---

⚠️ Disclaimer

এই বট আনঅফিসিয়াল FCA লাইব্রেরি (biar-fca) ব্যবহার করে, যা Meta-সমর্থিত নয়।

· 🔴 অ্যাকাউন্ট ব্যান বা লক হওয়ার ঝুঁকি আছে
· 🔴 ২৪/৭ স্থিতিশীলতার গ্যারান্টি নেই
· 🔴 শুধুমাত্র শিক্ষা ও ব্যক্তিগত ব্যবহারের জন্য
· 🔴 স্পেয়ার আইডি ব্যবহার করুন, মূল অ্যাকাউন্ট নয়

প্রোডাকশনের জন্য Meta-এর Official Messenger Platform ব্যবহার করুন।

---

🤝 Contributing

Pull request স্বাগতম! বড় পরিবর্তনের জন্য আগে issue খুলুন।

---

📞 Contact

<div align="center">

👑 Owner: Selim Sizu

https://img.shields.io/badge/Facebook-1877F2?style=for-the-badge&logo=facebook&logoColor=white
https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white
https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white

</div>

---

<div align="center">

⭐ যদি ভালো লাগে, Star দিন!

Made with ❤️ by 𝗦𝗲𝗹𝗶𝗺 𝗦𝗶𝘇𝘂 🦋

</div>
```

---
