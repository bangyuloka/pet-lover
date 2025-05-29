const express = require('express');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const { connect: connectTikTok, onGift } = require('./tiktok'); // Import tiktok.js

const app = express();
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

const raceFile = path.join(__dirname, 'race.json');

// Mapping gift TikTok ke pet
const giftMap = {
  5655: 'kucing',
  5827: 'anjing',
  6064: 'ayam',
  5269: 'burung',
  5778: 'ikan'
};

// Load data dari JSON
function loadRaceData() {
  if (!fs.existsSync(raceFile)) {
    fs.writeFileSync(raceFile, JSON.stringify({
      positions: { kucing: 0, anjing: 0, ayam: 0, burung: 0, ikan: 0 },
      steps: { kucing: 0, anjing: 0, ayam: 0, burung: 0, ikan: 0 },
      scores: { kucing: 0, anjing: 0, ayam: 0, burung: 0, ikan: 0 },
      status: "idle"
    }, null, 2));
  }
  return JSON.parse(fs.readFileSync(raceFile));
}

// Save data ke JSON
function saveRaceData(data) {
  fs.writeFileSync(raceFile, JSON.stringify(data, null, 2));
}

// Serve file static
app.use(express.static(path.join(__dirname, 'public')));
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});
app.get('/koneksi', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/koneksi.html'));
});

// WebSocket logic
wss.on('connection', (ws) => {
  console.log('🟢 Client terhubung.');

  ws.on('message', async (message) => {
    const text = message.toString();
    console.log('Pesan diterima:', text);
    const data = JSON.parse(text);
    const race = loadRaceData();

    // Handle input username TikTok
    if (data.action === 'connect' && data.username) {
      await connectTikTok(data.username);
      ws.send(JSON.stringify({ message: `✅ Terkoneksi dengan TikTok: ${data.username}` }));
      return;
    }

    // Handle simulasi manual (opsional)
    if (data.pet && race.positions.hasOwnProperty(data.pet)) {
      processGift(data.pet);
    }
  });

  const race = loadRaceData();
  race.winner = null;
  race.reset = false;
  ws.send(JSON.stringify(race));
});

// Fungsi proses gift
function processGift(pet) {
  const race = loadRaceData();

  if (race.status === "finished") {
    race.status = "running";
  }

  race.positions[pet] += 1;
  race.steps[pet] += 1;

  let winner = null;
  let resetTriggered = false;

  // Cek skor 10 - Prioritas
  for (let p in race.scores) {
    if (race.scores[p] >= 10) {
      for (let x in race.scores) {
        race.scores[x] = 0;
        race.positions[x] = 0;
        race.steps[x] = 0;
      }
      race.status = "reset";
      resetTriggered = true;
      break;
    }
  }

  if (!resetTriggered) {
    const maxSteps = 12;
    if (race.positions[pet] >= maxSteps) {
      race.scores[pet] += 1;
      race.positions[pet] = 0;
      race.steps[pet] = 0;
      race.status = "finished";
      winner = pet;
    }
  }

  saveRaceData(race);

  const broadcast = {
    ...race,
    winner: !resetTriggered ? winner : null,
    reset: resetTriggered
  };

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(broadcast));
    }
  });
}

// Integrasi TikTok Gift ke Pet Race
onGift((gift) => {
  const pet = giftMap[gift.gift_id];
  if (pet) {
    console.log(`🎁 Gift diterima: ${gift.giftName} (${gift.gift_id}) dari ${gift.nickname} → ${pet}`);
    processGift(pet);
  } else {
    console.log(`🎁 Gift tidak terdaftar: ${gift.giftName} (${gift.gift_id}) dari ${gift.nickname}`);
  }
});

// Start server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`✅ Server berjalan di http://localhost:${PORT}`);
});
