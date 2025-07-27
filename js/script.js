// flower data
const flowers = [
  {
    img: 'assets/images/rosa.jpeg',
    color: '#f8c1d1',
    poem: `Una rosa igual que tus labios florece  
cada vez que sonríes. No dejes de sonreír,  
pues embelleces con tu risa este mundo.`
  },
  {
    img: 'assets/images/Flor1.jpeg',
    color: '#991632ff',
    poem: `Ninguna flor rivaliza con la fuente  
de donde nace su hermosura, porque tu encanto  
y tu sonrisa son el origen de cada capullo.`
  },
  {
    img: 'assets/images/campo de flores.jpeg',
    color: '#c0392b',
    poem: `Por ti plantaría un jardín de estrellas  
si fueran tan pocas para expresar  
todo lo que anhelo ofrecerte cada día.`
  }
];

// emoji rain
const emojis = ['😍','💖','😘','🌹','💕'];
const rainContainer = document.getElementById('emoji-rain');
function createEmoji() {
  const span = document.createElement('span');
  span.className = 'emoji';
  span.textContent = emojis[Math.floor(Math.random()*emojis.length)];
  span.style.left = `${Math.random()*100}vw`;
  const duration = 5 + Math.random()*5;
  span.style.animationDuration = `${duration}s`;
  rainContainer.appendChild(span);
  setTimeout(() => span.remove(), duration*1000);
}

// music & toggle
const tracks = [
  'assets/sonido/musica1.mp3',
  'assets/sonido/musica2.mp3'
];
let currentTrack = 0;
const audio = document.getElementById('audio');
const btn = document.getElementById('music-toggle');
function playNextTrack() {
  audio.src = tracks[currentTrack];
  audio.play();
  currentTrack = (currentTrack + 1) % tracks.length;
}
audio.addEventListener('ended', playNextTrack);
btn.addEventListener('click', playNextTrack);

// cycle flowers
let idx = 0;
const imgEl = document.getElementById('flower-img');
const poemEl = document.getElementById('poem-text');
function showFlower() {
  const f = flowers[idx];
  document.documentElement.style.setProperty('--bg-color', f.color);
  imgEl.src = f.img;
  poemEl.textContent = f.poem;
  // retrigger poem fade
  poemEl.style.opacity = 0;
  poemEl.offsetHeight;
  poemEl.style.animation = 'fadeInText 2s 1s forwards';
  idx = (idx + 1) % flowers.length;
}

// kickoff on load
window.addEventListener('load', () => {
  playNextTrack();
  showFlower();
  setInterval(showFlower, 30000);    // change every 30s
  setInterval(createEmoji, 300);     // new emoji every 0.3s
});