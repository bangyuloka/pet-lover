const socket = io();

const pets = {
  kucing: document.getElementById('pet-kucing'),
  anjing: document.getElementById('pet-anjing'),
  ayam: document.getElementById('pet-ayam'),
  burung: document.getElementById('pet-burung'),
  ikan: document.getElementById('pet-ikan')
};

const maxSteps = 12;

function getStepPx() {
  const track = document.getElementById('race-track');
  const finishLine = document.getElementById('finish-line');
  const trackWidth = finishLine.getBoundingClientRect().left - track.getBoundingClientRect().left;
  return trackWidth / maxSteps;
}

let raceFinished = false;
let lastWinner = null;

socket.on('raceData', (data) => {
  // Update posisi hewan
  for (let pet in data.positions) {
    const px = data.positions[pet] * getStepPx();
    pets[pet].style.left = `${px}px`;
  }

  // Update klasemen
  const tableBody = document.getElementById('score-table');
  tableBody.innerHTML = '';

  const sorted = Object.entries(data.scores).sort((a, b) => b[1] - a[1]);
  let rank = 1;
  for (let [pet, score] of sorted) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${rank}</td>
      <td><img src="images/${pet}.png" alt="${pet}" class="pet-icon"></td>
      <td>${score}</td>
    `;
    tableBody.appendChild(row);
    rank++;
  }

  // Cek trigger reset
  if (data.reset) {
    showResetAnimation();
    raceFinished = true;

    setTimeout(() => {
      raceFinished = false;
    }, 5000); // Reset cooldown

  } else if (data.winner && !raceFinished) {
    showWinner(data.winner);
    raceFinished = true;

    setTimeout(() => {
      raceFinished = false;
    }, 3000);
  }
});

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function showWinner(pet) {
  const video = document.getElementById('winner-video');
  video.classList.remove('hidden');
  video.currentTime = 0;
  video.play();

  video.onended = () => {
    video.classList.add('hidden');
  };

  // Update Last Winner di lintasan
  if (lastWinner) {
    document.querySelector(`#lane-${lastWinner} .last-winner`).classList.add('hidden');
  }
  document.querySelector(`#lane-${pet} .last-winner`).classList.remove('hidden');
  lastWinner = pet;
}

function showResetAnimation() {
  const resetVideo = document.getElementById('reset-video');
  resetVideo.classList.remove('hidden');
  resetVideo.currentTime = 0;
  resetVideo.play();

  resetVideo.onended = () => {
    resetVideo.classList.add('hidden');
  };

  // Reset Last Winner di lintasan (opsional, jika mau hilangkan teks)
  if (lastWinner) {
    document.querySelector(`#lane-${lastWinner} .last-winner`).classList.add('hidden');
    lastWinner = null;
  }
}
