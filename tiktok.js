const { WebcastPushConnection } = require('tiktok-live-connector');

let tiktok = null;
let giftCallback = () => {};

function onGift(callback) {
  giftCallback = callback;
}

async function connect(username) {
  if (tiktok) {
    try {
      await tiktok.disconnect();
    } catch (_) {}
  }

  tiktok = new WebcastPushConnection(username);

  tiktok.on('gift', (data) => {
    giftCallback({
      uniqueId: data.uniqueId || 'unknown',
      nickname: data.nickname || 'anonymous',
      profilePictureUrl: data.profilePictureUrl || '',
      gift_id: data.giftId || 0,
      giftName: data.giftName || 'Unknown',
      diamondCount: data.diamondCount || 1,
      repeat_count: data.repeatCount || 1,
      repeat_end: data.repeatEnd || false,
      timestamp: Date.now()
    });
  });

  try {
    await tiktok.connect();
    console.log(`✅ Berhasil terkoneksi dengan akun TikTok: ${username}`);
  } catch (err) {
    console.error(`❌ Gagal koneksi ke akun TikTok "${username}":`, err.message || err);
  }
}

module.exports = { onGift, connect };
