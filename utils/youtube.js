const ytdl = require("ytdl-core");
const fs = require("fs");
const path = require("path");

module.exports = async function downloadAudio(url) {
  const info = await ytdl.getInfo(url);
  const title = info.videoDetails.title.replace(/[^\w\s]/gi, "");
  const filePath = path.join(__dirname, "..", "temp", `${title}.mp3`);

  // temp ফোল্ডার না থাকলে তৈরি
  if (!fs.existsSync(path.join(__dirname, "..", "temp"))) {
    fs.mkdirSync(path.join(__dirname, "..", "temp"));
  }

  const stream = ytdl(url, { filter: "audioonly", quality: "highestaudio" });
  await new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(filePath);
    stream.pipe(writeStream);
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });

  return { filePath, title };
};
