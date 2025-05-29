const express = require('express');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const { createServer } = require('http');
const { connect: connectTikTok, onGift } = require('./tiktok');

const app = express();
const server = createServer(app);
const io = new Server(server);

const raceFile = path.join(__dirname, 'race.json');

const giftMap = {
  5655: 'kucing',
  5827: 'anjing',
  6064: 'ayam',
  5269: 'burung',
  5778: 'ikan'
};

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

function saveRaceData(data) {
  fs.writeFileSync(raceFile, JSON.stringify(data, null, 2));
}

app.use(express.static(path.join(__dirname, 'public')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/koneksi', (req, res) => res.sendFile(path.join(__dirname, 'public/koneksi.html')));

io.on('connection', (socket) => {
  console.log('🟢 Client terhubung.');

  const race = loadRaceData();
  socket.emit('raceData', { ...race, winner: null, reset: false });

  socket.on('connectTikTok', async (username) => {
    await connectTikTok(username);
    socket.emit('status', `✅ Terkoneksi dengan TikTok: ${username}`);
  });

  socket.on('simulasiGift', (pet) => {
    processGift(pet);
  });
});

function processGift(pet) {
  const race = loadRaceData();

  if (race.status === "finished") race.status = "running";

  race.positions[pet] += 1;
  race.steps[pet] += 1;

  let winner = null;
  let resetTriggered = false;

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

  io.emit('raceData', { ...race, winner: !resetTriggered ? winner : null, reset: resetTriggered });
}

onGift((gift) => {
  const pet = giftMap[gift.gift_id];
  if (pet) {
    console.log(`🎁 Gift diterima: ${gift.giftName} (${gift.gift_id}) dari ${gift.nickname} → ${pet}`);
    processGift(pet);
  } else {
    console.log(`🎁 Gift tidak terdaftar: ${gift.giftName} (${gift.gift_id}) dari ${gift.nickname}`);
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`✅ Server berjalan di http://localhost:${PORT}`);
});
