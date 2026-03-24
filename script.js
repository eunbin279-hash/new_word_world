const SECULAR_WORDS = [
    "FLESH", "DUST", "VOID", "RUST", "BONE", "ASH", "EMPTY", "NULL", "DECAY",
    "RUIN", "LOSS", "DEBT", "PAIN", "FALL", "SIN", "BASE", "DIRT", "RAW", "LIE",
    "MUD", "SCAB", "TEAR", "CUT", "ROT", "END", "FAT", "EGO", "GREED", "LUST",
    "LACK", "HOLE", "BLIND", "DEAF", "NUMB", "COLD", "DARK", "DEAD", "HELL"
];

// Expanded organic and vivid color palette based on new references (BRIGHT NEON ONLY)
const COLORS = [
    '#ff6284ff', // Deep Pink
    '#ffb159ff', // Orange Red
    '#006effff', // Deep Sky Blue
    '#fcff67ff', // Gold
    '#00FA9A', // Medium Spring Green
    '#FF00FF', // Magenta
    '#00FFFF', // Cyan
    '#a2ff91ff'  // Neon Green
];

const canvas = document.getElementById('network-canvas');
const ctx = canvas.getContext('2d');

let width, height;
let cellsData = [];
let particles = [];
let animationId;
let cycleInterval;
let isGenerating = false;
let currentBlendMode = 'multiply';
let cellCount = 0;

const VALID_BLEND_MODES = [
    'multiply', 'screen', 'overlay', 'color-dodge', 
    'color-burn', 'difference', 'exclusion'
];

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}
window.addEventListener('resize', resize);
resize();

// Helper to get actual blend mode
function getActiveBlendMode() {
    if (currentBlendMode === 'random') {
        const timeOffset = Math.floor(Date.now() / 3000); // Change random mode every 3 seconds
        return VALID_BLEND_MODES[timeOffset % VALID_BLEND_MODES.length];
    }
    return currentBlendMode;
}

// renderCell Function
function renderCell(word, isNewGod, position, cellData, ctx, time) {
    const age = time - cellData.creationTime;
    const radius = cellData.radius;
    const color = cellData.color;

    ctx.save();
    ctx.translate(position.x, position.y);
    ctx.rotate(age * 0.0002);
    
    // Apply the cell's specific blend mode (or global if not random)
    ctx.globalCompositeOperation = cellData.blendMode;

    ctx.globalAlpha = 0.8;
    ctx.fillStyle = color;
    ctx.font = '100 10px Outfit';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Organic wavy concentric text circles
    for (let r = radius * 0.2; r <= radius; r += 20) {
        const charCount = Math.floor((2 * Math.PI * r) / 10);
        if (charCount > 0) {
            for (let i = 0; i < charCount; i++) {
                const baseTheta = (i / charCount) * Math.PI * 2 + age * 0.0005 * (r % 2 === 0 ? 1 : -1);

                // Add organic irregularity based on angle and time
                const organicOffset = Math.sin(baseTheta * cellData.nodes + age * 0.002) * cellData.waviness * (r / radius);
                const organicR = r + organicOffset;

                const char = word[i % word.length];
                const cx = Math.cos(baseTheta) * organicR;
                const cy = Math.sin(baseTheta) * organicR;

                // For dotted circle effect, skip some
                if (r % 40 !== 0 || i % 2 === 0) {
                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.rotate(baseTheta + Math.PI / 2);
                    ctx.fillText(char, 0, 0);
                    ctx.restore();
                }
            }
        }
    }

    // Outer spikes/tendrils (Organic radiating letters)
    cellData.spokes.forEach(spoke => {
        ctx.save();

        // Organic wiggle for the spoke
        const currentAngle = spoke.angle + Math.sin(age * 0.001 + spoke.offset) * 0.15;
        ctx.rotate(currentAngle);

        spoke.sequence.forEach((letter, index) => {
            const baseDist = radius * 0.8 + index * 14;
            // Spoke contraction/expansion
            const dist = baseDist + Math.sin(age * 0.003 + index) * 5;
            ctx.fillText(letter, dist, 0);
        });
        ctx.restore();
    });

    // Nucleus Text
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = color;
    ctx.font = '300 ' + Math.max(14, radius * 0.25) + 'px Outfit';
    ctx.fillText(word, 0, 0);
    ctx.restore();
}

// FixedParticle now draws as a continuous solid beam of light that grows, then fades out
class LightBeam {
    constructor(startX, startY, targetX, targetY, color, blendMode, onComplete) {
        this.startX = startX;
        this.startY = startY;
        this.targetX = targetX;
        this.targetY = targetY;
        this.color = color;
        this.blendMode = blendMode; // specific to the beam generating the next cell
        this.progress = 0;
        this.speed = 0.02 + Math.random() * 0.02; // Faster
        this.onComplete = onComplete;
        this.completed = false;
        this.holdTime = 0;
    }
    update() {
        if (this.completed) return;

        if (this.progress < 1) {
            this.progress += this.speed;
            if (this.progress >= 1) {
                this.progress = 1;
                if (this.onComplete) this.onComplete();
            }
        } else {
            // Fade out phase
            this.holdTime += 0.02;
            if (this.holdTime >= 1) {
                this.completed = true;
            }
        }
    }
    draw(ctx) {
        const t = this.progress;
        const currentX = this.startX + (this.targetX - this.startX) * t;
        const currentY = this.startY + (this.targetY - this.startY) * t;

        ctx.globalCompositeOperation = this.blendMode;

        let alpha = 0.6;
        if (this.holdTime > 0) {
            alpha = (1 - this.holdTime) * 0.6;
        }

        ctx.globalAlpha = alpha;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 0.5; // Thinner line

        ctx.beginPath();
        ctx.moveTo(this.startX, this.startY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
    }
}

// Scrambles the string and ensures it's different if possible
function getChaoticAnagram(word) {
    let arr = word.split('');
    let attempt = word;
    let tries = 0;
    while (attempt === word && tries < 10) {
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
        for (let i = 0; i < w.length; i++) {
            if (!availableChars.has(w[i])) return false;
        }
        return true;
    });

    if (valid.length === 0) {
        return getChaoticAnagram(previousWord);
    }
    return valid[Math.floor(Math.random() * valid.length)];
}

function deconstruct(word) {
    const newWord = selectTheOther(SECULAR_WORDS, word);
    return newWord;
}

function createCellData(word, x, y, color) {
    const numSpokes = 8 + Math.floor(Math.random() * 15);
    const spokes = [];
    for (let i = 0; i < numSpokes; i++) {
        const angle = (Math.PI * 2 / numSpokes) * i + (Math.random() * 0.5 - 0.25); // Irregular spacing
        let sequence = [];
        const dashCount = word.length + Math.floor(Math.random() * 4); // Variable tendril length
        for (let j = 0; j < dashCount; j++) {
            sequence.push(word[j % word.length]);
        }
        spokes.push({ angle, sequence, offset: Math.random() * Math.PI * 2 });
    }

    // Determine cell's specific blend mode
    let cellBlendMode = currentBlendMode;
    if (currentBlendMode === 'random') {
        cellBlendMode = VALID_BLEND_MODES[Math.floor(Math.random() * VALID_BLEND_MODES.length)];
    }

    return {
        word,
        position: { x, y },
        color,
        blendMode: cellBlendMode,
        isNewGod: false,
        alphabetSpokesData: {
            radius: 50 + Math.random() * 70,
            creationTime: Date.now(),
            spokes,
            color,
            nodes: 3 + Math.floor(Math.random() * 5), // Number of "bumps" or organic shapes
            waviness: 5 + Math.random() * 20 // How deep the organic deformations go
        }
    };
}

function animate() {
    if (!isGenerating) {
        animationId = requestAnimationFrame(animate);
        return;
    }

    // Gentle white background fade
    ctx.globalCompositeOperation = 'source-over';
    
    // Evaluate if any current cell needs a darker trail background
    const anyInvertingModes = cellsData.some(c => c.blendMode === 'difference' || c.blendMode === 'exclusion');
    if (anyInvertingModes) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    }
    
    ctx.fillRect(0, 0, width, height);

    const time = Date.now();

    // Draw cells
    cellsData.forEach(c => renderCell(c.word, c.isNewGod, c.position, c.alphabetSpokesData, ctx, time));

    // Draw beams
    particles = particles.filter(p => !p.completed);
    particles.forEach(p => { p.update(); p.draw(ctx); });

    // Cell to cell bridges
    ctx.lineWidth = 0.2; // Much thinner network connection line

    for (let i = 0; i < cellsData.length; i++) {
        for (let j = i + 1; j < cellsData.length; j++) {
            const dx = cellsData[i].position.x - cellsData[j].position.x;
            const dy = cellsData[i].position.y - cellsData[j].position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 300) {
                // Determine bridge blend mode. Average or pick one. We'll use child cell's blend mode for its bridges.
                ctx.globalCompositeOperation = cellsData[j].blendMode;
                
                // Mix colors for the connecting bridge
                ctx.globalAlpha = (300 - dist) / 300 * 0.2;
                const grad = ctx.createLinearGradient(cellsData[i].position.x, cellsData[i].position.y, cellsData[j].position.x, cellsData[j].position.y);
                grad.addColorStop(0, cellsData[i].color);
                grad.addColorStop(1, cellsData[j].color);

                ctx.strokeStyle = grad;
                ctx.beginPath();
                ctx.moveTo(cellsData[i].position.x, cellsData[i].position.y);
                ctx.lineTo(cellsData[j].position.x, cellsData[j].position.y);
                ctx.stroke();
            }
        }
    }

    animationId = requestAnimationFrame(animate);
}

function infiniteCycle(startWord) {
    if (!isGenerating) return;

    if (cellsData.length > 20) cellsData.shift();

    const parentIndex = Math.floor(Math.random() * cellsData.length * 0.5) + Math.floor(cellsData.length * 0.5);
    const parent = cellsData[Math.min(parentIndex, cellsData.length - 1) || 0];

    const newWord = deconstruct(parent.word);

    // Irregular distance (INCREASED for wider spread)
    const angle = Math.random() * Math.PI * 2;
    const distance = 200 + Math.random() * 300; // was 100 + 250

    let newX = parent.position.x + Math.cos(angle) * distance;
    let newY = parent.position.y + Math.sin(angle) * distance;

    if (newX < 100 || newX > width - 100) newX = width / 2;
    if (newY < 100 || newY > height - 100) newY = height / 2;

    const newColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    
    // Determine beam blend mode up-front so it matches generated cell
    let beamBlendMode = currentBlendMode;
    if (currentBlendMode === 'random') {
         beamBlendMode = VALID_BLEND_MODES[Math.floor(Math.random() * VALID_BLEND_MODES.length)];
    }

    // Draw exactly one light beam from parent to child
    const beam = new LightBeam(parent.position.x, parent.position.y, newX, newY, newColor, beamBlendMode, () => {
        if (isGenerating) {
            // Reconstruct creation with same blend mode
            const newCell = createCellData(newWord, newX, newY, newColor);
            
            // Override with locked-in initial beam blend mode
            newCell.blendMode = beamBlendMode;
            
            newCell.isNewGod = true;
            cellsData.push(newCell);
        }
    });

    particles.push(beam);
}

document.getElementById('start-btn').addEventListener('click', () => {
    const input = document.getElementById('start-word');
    const modeSelect = document.getElementById('blend-mode');
    
    let startWord = input.value.trim().toUpperCase() || "TEMPLE";
    currentBlendMode = modeSelect.value;
    
    document.getElementById('ui').classList.add('hidden');
    document.getElementById('controls').classList.remove('hidden');

    cellsData.push(createCellData(startWord, width / 2, height / 2, COLORS[0]));
    isGenerating = true;
    animate();
    cycleInterval = setInterval(() => infiniteCycle(startWord), 2000);
});

document.getElementById('toggle-btn').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    const icon = btn.querySelector('i');
    
    if (isGenerating) {
        isGenerating = false;
        icon.classList.remove('fa-pause');
        icon.classList.add('fa-play');
        btn.title = "Resume Generation";
        btn.style.background = "#fff";
        clearInterval(cycleInterval);
    } else {
        isGenerating = true;
        icon.classList.remove('fa-play');
        icon.classList.add('fa-pause');
        btn.title = "Pause Generation";
        btn.style.background = "rgba(255, 105, 180, 0.3)";
        cycleInterval = setInterval(() => infiniteCycle(cellsData[cellsData.length - 1].word), 2000);
    }
});

document.getElementById('capture-btn').addEventListener('click', () => {
    // 1. Hide UI
    const controls = document.getElementById('controls');
    controls.classList.add('hidden');
    
    // 2. Wait a tick for UI to disappear, then capture
    setTimeout(() => {
        // Create an image from the canvas
        const dataURL = canvas.toDataURL('image/png');
        
        // Create a temporary link to download
        const link = document.createElement('a');
        link.download = `deconstructive_theocentrism_${Date.now()}.png`;
        link.href = dataURL;
        link.click();
        
        // 3. Show UI again
        controls.classList.remove('hidden');
    }, 100);
});
