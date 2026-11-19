'use strict';

// মেসেজ ও ট্রিগার একই নিয়মে সাজানো: ছোট হাতের অক্ষর, বাড়তি স্পেস বাদ
function normalizeText(text) {
  return String(text === undefined || text === null ? '' : text)
    .normalize('NFC')
    .toLowerCase()
    .replace(/[\uFE0E\uFE0F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// বাংলা, ইংরেজি, Banglish ও ইমোজি আলাদা শব্দে ভাগ করে
function tokenize(text) {
  return (
    normalizeText(text).match(/[\p{L}\p{M}\p{N}_]+|\p{Extended_Pictographic}/gu) || []
  );
}

module.exports = { normalizeText, tokenize };
