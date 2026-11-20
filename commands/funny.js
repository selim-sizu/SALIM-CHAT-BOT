module.exports = {
  config: {
    name: "funny",
    aliases: ["মজা", "joke"],
    description: "ফানি রিপ্লাই দেয়"
  },
  run: async ({ api, event }) => {
    const jokes = [
      "😄 শিক্ষক: তোমার বাড়ির কাজ কোথায়? ছাত্র: স্যার, বাড়ি তো দূরে, তাই কাজ করতে পারিনি!",
      "🤣 ডাক্তার: আপনি প্রতিদিন ব্যায়াম করেন? রোগী: স্যার, প্রতিদিন রিমোট দিয়ে টিভি চালাই!",
      "😆 বন্ধু: তুই এত মোটা হলি কেমনে? আমি: চিন্তা করিস না, এটা আমার ইনভেস্টমেন্ট!",
      "😂 মা: পরীক্ষায় কী লিখলি? ছেলে: স্যার যা বলেছিলেন, তাই লিখেছি—'আমি জানি না'!"
    ];
    const random = jokes[Math.floor(Math.random() * jokes.length)];
    api.sendMessageMqtt(random, event.threadID)
  .catch(err => console.error("❌ send failed:", err.message));
  }
};
