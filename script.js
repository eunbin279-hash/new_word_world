const SECULAR_WORDS = [
    "FLESH", "DUST", "VOID", "RUST", "BONE", "ASH", "EMPTY", "NULL", "DECAY",
    "RUIN", "LOSS", "DEBT", "PAIN", "FALL", "SIN", "BASE", "DIRT", "RAW", "LIE",
    "MUD", "SCAB", "TEAR", "CUT", "ROT", "END", "FAT", "EGO", "GREED", "LUST",
    "LACK", "HOLE", "BLIND", "DEAF", "NUMB", "COLD", "DARK", "DEAD", "HELL"
];

const COLORS = [
    '#FF69B4', '#FFA500', '#39FF14', '#FF3366', '#FFD700', '#00FFCC'
];

const canvas = document.getElementById('network-canvas');
const ctx = canvas.getContext('2d');

let width, height;
let cellsData = [];
let particles = [];
let animationId;
let cycleInterval;

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}
window.addEventListener('resize', resize);
resize();

// renderCell Function
function renderCell(word, isNewGod, position, alphabetSpokesData, ctx, time) {
    const age = time - alphabetSpokesData.creationTime;
    const radius = alphabetSpokesData.radius;
    const color = alphabetSpokesData.color;
    
    ctx.save();
    ctx.translate(position.x, position.y);
    ctx.rotate(age * 0.0002);
    ctx.globalCompositeOperation = 'screen';
    
    // Nucleus glow
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.4);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Overlapping circles
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    for(let r=radius*0.2; r<=radius; r+=15) {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
        if (Math.random() > 0.8) {
            ctx.setLineDash([2, 5]);
            ctx.beginPath();
            ctx.arc(0, 0, r + 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    // Genetic Spokes
    ctx.globalAlpha = 0.6;
    ctx.font = '10px Outfit';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    alphabetSpokesData.spokes.forEach(spoke => {
        ctx.save();
        ctx.rotate(spoke.angle + Math.sin(age*0.001 + spoke.offset)*0.1);
        ctx.beginPath();
        ctx.moveTo(radius * 0.3, 0);
        ctx.lineTo(radius * 1.5, 0);
        ctx.stroke();
        spoke.sequence.forEach((letter, index) => {
            const dist = radius * 0.4 + index * 15;
            ctx.fillStyle = color;
            ctx.fillText(letter, dist, 0);
        });
        ctx.restore();
    });

    // Nucleus Text
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + Math.max(12, radius * 0.2) + 'px Outfit';
    ctx.fillText(word, 0, 0);
    ctx.restore();
}

class FixedParticle {
    constructor(letter, startX, startY, targetX, targetY, color, onComplete) {
        this.letter = letter;
        this.startX = startX;
        this.startY = startY;
        this.targetX = targetX;
        this.targetY = targetY;
        this.x = startX;
        this.y = startY;
        this.color = color;
        this.progress = 0;
        this.speed = 0.01 + Math.random() * 0.01;
        this.controlX = (startX + targetX)/2 + (Math.random() - 0.5) * 400;
        this.controlY = (startY + targetY)/2 + (Math.random() - 0.5) * 400;
        this.onComplete = onComplete;
        this.completed = false;
    }
    update() {
        if(this.completed) return;
        this.progress += this.speed;
        if(this.progress >= 1) {
            this.progress = 1;
            this.completed = true;
            if(this.onComplete) this.onComplete();
        }
        const t = this.progress;
        const mt = 1 - t;
        this.x = mt * mt * this.startX + 2 * mt * t * this.controlX + t * t * this.targetX;
        this.y = mt * mt * this.startY + 2 * mt * t * this.controlY + t * t * this.targetY;
    }
    draw(ctx) {
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = Math.sin(this.progress * Math.PI);
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.font = 'bold 18px Outfit';
        ctx.fillText(this.letter, this.x, this.y);
        ctx.shadowBlur = 0;
    }
}

function selectTheOther(candidates, previousWord) {
    const availableChars = new Set(previousWord.split(''));
    let valid = candidates.filter(w => {
        for(let i=0; i<w.length; i++) {
            if(!availableChars.has(w[i])) return false;
        }
        return true;
    });
    
    if(valid.length === 0) {
        let chaotic = "";
        const len = 3 + Math.floor(Math.random()*4);
        for(let i=0; i<len; i++) {
            chaotic += previousWord[Math.floor(Math.random() * previousWord.length)];
        }
        return chaotic;
    }
    return valid[Math.floor(Math.random() * valid.length)];
}

function deconstruct(word) {
    const newWord = selectTheOther(SECULAR_WORDS, word);
    return newWord;
}

function createCellData(word, x, y, color) {
    const numSpokes = 30 + Math.floor(Math.random() * 50);
    const spokes = [];
    for(let i=0; i<numSpokes; i++) {
        const angle = (Math.PI * 2 / numSpokes) * i;
        let sequence = [];
        const dashCount = word.length + Math.floor(Math.random()*3);
        for(let j=0; j<dashCount; j++) {
            sequence.push(word[j % word.length]);
        }
        spokes.push({ angle, sequence, offset: Math.random() * Math.PI });
    }
    return {
        word,
        position: { x, y },
        color,
        isNewGod: false,
        alphabetSpokesData: { radius: 80 + Math.random() * 100, creationTime: Date.now(), spokes, color }
    };
}

function animate() {
    ctx.fillStyle = 'rgba(5, 5, 5, 0.4)';
    ctx.fillRect(0, 0, width, height);
    
    const time = Date.now();
    cellsData.forEach(c => renderCell(c.word, c.isNewGod, c.position, c.alphabetSpokesData, ctx, time));
    
    particles = particles.filter(p => !p.completed);
    particles.forEach(p => { p.update(); p.draw(ctx); });
    
    ctx.globalCompositeOperation = 'screen';
    ctx.lineWidth = 0.5;
    for(let i=0; i<cellsData.length; i++) {
        for(let j=i+1; j<cellsData.length; j++) {
            const dx = cellsData[i].position.x - cellsData[j].position.x;
            const dy = cellsData[i].position.y - cellsData[j].position.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if(dist < 350) {
                ctx.beginPath();
                ctx.moveTo(cellsData[i].position.x, cellsData[i].position.y);
                ctx.lineTo(cellsData[j].position.x, cellsData[j].position.y);
                const grad = ctx.createLinearGradient(cellsData[i].position.x, cellsData[i].position.y, cellsData[j].position.x, cellsData[j].position.y);
                grad.addColorStop(0, cellsData[i].color);
                grad.addColorStop(1, cellsData[j].color);
                ctx.strokeStyle = grad;
                ctx.globalAlpha = (350 - dist) / 350 * 0.5;
                ctx.stroke();
            }
        }
    }
    animationId = requestAnimationFrame(animate);
}

function infiniteCycle(startWord) {
    if(cellsData.length > 25) cellsData.shift();
    
    const parentIndex = Math.floor(Math.random() * cellsData.length * 0.5) + Math.floor(cellsData.length * 0.5);
    const parent = cellsData[Math.min(parentIndex, cellsData.length-1) || 0];
    
    const newWord = deconstruct(parent.word);
    
    const angle = Math.random() * Math.PI * 2;
    const distance = 150 + Math.random() * 200;
    let newX = parent.position.x + Math.cos(angle) * distance;
    let newY = parent.position.y + Math.sin(angle) * distance;
    
    if(newX < 100 || newX > width-100) newX = width/2;
    if(newY < 100 || newY > height-100) newY = height/2;
    
    const newColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    let particlesCompleted = 0;
    const lettersToSpawn = newWord.length * 3;
    
    for(let i=0; i<lettersToSpawn; i++) {
        const letter = newWord[i % newWord.length];
        const p = new FixedParticle(letter, parent.position.x, parent.position.y, newX, newY, newColor, () => {
            particlesCompleted++;
            if(particlesCompleted === lettersToSpawn) {
                const newCell = createCellData(newWord, newX, newY, newColor);
                newCell.isNewGod = true;
                cellsData.push(newCell);
            }
        });
        particles.push(p);
    }
}

document.getElementById('start-btn').addEventListener('click', () => {
    const input = document.getElementById('start-word');
    let startWord = input.value.trim().toUpperCase() || "TEMPLE";
    document.getElementById('ui').classList.add('hidden');
    
    cellsData.push(createCellData(startWord, width/2, height/2, COLORS[0]));
    animate();
    setInterval(() => infiniteCycle(startWord), 2000);
});
