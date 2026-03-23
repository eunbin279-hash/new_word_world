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
let isGenerating = false;

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
    ctx.globalCompositeOperation = 'multiply';
    
    // Alpha for rendering text
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = color;
    ctx.font = '100 10px Outfit';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Overlapping text-circles instead of stroke
    // Optimized r step to reduce lag
    for(let r = radius * 0.3; r <= radius; r += 25) {
        // circumference roughly
        const charCount = Math.floor((2 * Math.PI * r) / 10); 
        if(charCount > 0) {
            for(let i=0; i<charCount; i++) {
                const theta = (i / charCount) * Math.PI * 2 + age * 0.0005 * (r % 2 === 0 ? 1 : -1);
                const char = word[i % word.length];
                const cx = Math.cos(theta) * r;
                const cy = Math.sin(theta) * r;
                
                // For dotted circle effect, skip some
                if(r % 50 !== 0 || i % 2 === 0) {
                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.rotate(theta + Math.PI/2);
                    ctx.fillText(char, 0, 0);
                    ctx.restore();
                }
            }
        }
    }

    // Genetic Spokes (no stroke line, only letters!)
    alphabetSpokesData.spokes.forEach(spoke => {
        ctx.save();
        ctx.rotate(spoke.angle + Math.sin(age*0.001 + spoke.offset)*0.1);
        
        spoke.sequence.forEach((letter, index) => {
            const dist = radius * 0.5 + index * 14;
            ctx.fillText(letter, dist, 0);
        });
        ctx.restore();
    });

    // Nucleus Text (colored with cell color)
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = color;
    ctx.font = '300 ' + Math.max(14, radius * 0.25) + 'px Outfit';
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
        // Linear interpolation (straight line)
        const t = this.progress;
        this.x = this.startX + (this.targetX - this.startX) * t;
        this.y = this.startY + (this.targetY - this.startY) * t;
    }
    draw(ctx) {
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = Math.sin(this.progress * Math.PI);
        ctx.fillStyle = this.color;
        ctx.font = '100 18px Outfit';
        ctx.fillText(this.letter, this.x, this.y);
    }
}

// Scrambles the string and ensures it's different if possible
function getChaoticAnagram(word) {
    let arr = word.split('');
    let attempt = word;
    let tries = 0;
    while (attempt === word && tries < 10) {
        // shuffle
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        attempt = arr.join('');
        tries++;
    }
    return attempt;
}

function selectTheOther(candidates, previousWord) {
    const availableChars = new Set(previousWord.split(''));
    let valid = candidates.filter(w => {
        if (w === previousWord) return false;
        for(let i=0; i<w.length; i++) {
            if(!availableChars.has(w[i])) return false;
        }
        return true;
    });
    
    if(valid.length === 0) {
        return getChaoticAnagram(previousWord);
    }
    return valid[Math.floor(Math.random() * valid.length)];
}

function deconstruct(word) {
    const newWord = selectTheOther(SECULAR_WORDS, word);
    return newWord;
}

function createCellData(word, x, y, color) {
    // Optimized spokes count
    const numSpokes = 15 + Math.floor(Math.random() * 20);
    const spokes = [];
    for(let i=0; i<numSpokes; i++) {
        const angle = (Math.PI * 2 / numSpokes) * i;
        let sequence = [];
        const dashCount = word.length + Math.floor(Math.random()*2) + 1;
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
        alphabetSpokesData: { radius: 60 + Math.random() * 80, creationTime: Date.now(), spokes, color }
    };
}

function animate() {
    if (!isGenerating) {
        animationId = requestAnimationFrame(animate);
        return; // Freeze the canvas and state completely
    }

    // White background fade
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(0, 0, width, height);
    
    const time = Date.now();
    cellsData.forEach(c => renderCell(c.word, c.isNewGod, c.position, c.alphabetSpokesData, ctx, time));
    
    particles = particles.filter(p => !p.completed);
    particles.forEach(p => { p.update(); p.draw(ctx); });
    
    // Connect nearby cells with a faint text line! (instead of stroke)
    ctx.globalCompositeOperation = 'multiply';
    ctx.font = '100 8px Outfit';
    ctx.globalAlpha = 0.3;
    ctx.textAlign = 'center';
    
    for(let i=0; i<cellsData.length; i++) {
        for(let j=i+1; j<cellsData.length; j++) {
            const dx = cellsData[i].position.x - cellsData[j].position.x;
            const dy = cellsData[i].position.y - cellsData[j].position.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if(dist < 300) {
                const angle = Math.atan2(dy, dx);
                const bridgeWord = cellsData[i].word + cellsData[j].word;
                const charCount = Math.floor(dist / 12); // Optimized
                
                ctx.save();
                ctx.translate(cellsData[j].position.x, cellsData[j].position.y);
                ctx.rotate(angle);
                ctx.fillStyle = cellsData[i].color;
                
                for(let k=1; k<charCount; k++) {
                    const char = bridgeWord[k % bridgeWord.length];
                    ctx.fillText(char, k*12, 0); // Spaced out slightly more
                }
                ctx.restore();
            }
        }
    }
    animationId = requestAnimationFrame(animate);
}

function infiniteCycle(startWord) {
    if(!isGenerating) return;
    
    // Reduce max cells to prevent lag
    if(cellsData.length > 15) cellsData.shift();
    
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
    const lettersToSpawn = newWord.length; // 1:1 mapped to avoid spamming
    
    for(let i=0; i<lettersToSpawn; i++) {
        const letter = newWord[i % newWord.length];
        const p = new FixedParticle(letter, parent.position.x, parent.position.y, newX, newY, newColor, () => {
            particlesCompleted++;
            if(particlesCompleted === lettersToSpawn && isGenerating) {
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
    document.getElementById('toggle-btn').classList.remove('hidden');
    
    cellsData.push(createCellData(startWord, width/2, height/2, COLORS[0]));
    isGenerating = true;
    animate();
    cycleInterval = setInterval(() => infiniteCycle(startWord), 2000);
});

document.getElementById('toggle-btn').addEventListener('click', (e) => {
    const btn = e.target;
    if(isGenerating) {
        isGenerating = false;
        btn.innerText = "Resume Generation";
        btn.style.background = "#fff";
        btn.style.color = "#000";
        btn.style.border = "1px solid #FF69B4";
    } else {
        isGenerating = true;
        btn.innerText = "Stop Generation";
        btn.style.background = "linear-gradient(45deg, #FF69B4, #FFA500)";
        btn.style.color = "#000";
        btn.style.border = "none";
    }
});
