const UI = {
    exerciseInput: document.getElementById('exerciseTime'),
    gapInput: document.getElementById('gapTime'),
    startBtn: document.getElementById('startBtn'),
    stopBtn: document.getElementById('stopBtn'),
    timeText: document.getElementById('timeText'),
    statusText: document.getElementById('statusText'),
    progressPath: document.getElementById('progressPath')
};

const AudioElements = {
    relax: document.getElementById('relaxAudio'),
    exercise: [
        document.getElementById('exAudio1'),
        document.getElementById('exAudio2'),
        document.getElementById('exAudio3'),
        document.getElementById('exAudio4'),
        document.getElementById('exAudio5'),
        document.getElementById('exAudio6')
    ]
};

let state = 'IDLE'; // IDLE, EXERCISE, GAP
let currentInterval = null;
let remainingTime = 0;
let totalPhaseTime = 0;
let currentAudio = null;

// Initialize circle logic
const radius = UI.progressPath.r.baseVal.value;
const circumference = radius * 2 * Math.PI;
UI.progressPath.style.strokeDasharray = `${circumference} ${circumference}`;
UI.progressPath.style.strokeDashoffset = 0;

function setProgress(percent) {
    const offset = circumference - (percent / 100) * circumference;
    UI.progressPath.style.strokeDashoffset = offset;
}

function updateDisplay() {
    const min = Math.floor(remainingTime / 60);
    const sec = remainingTime % 60;
    UI.timeText.textContent = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;

    if (totalPhaseTime > 0) {
        const percent = (remainingTime / totalPhaseTime) * 100;
        setProgress(percent);
    } else {
        setProgress(0);
    }
}

function stopAllAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
    }
    AudioElements.relax.pause();
    AudioElements.relax.currentTime = 0;
    AudioElements.exercise.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
    });
}

function playRandomExerciseAudio() {
    stopAllAudio();
    const randomIndex = Math.floor(Math.random() * AudioElements.exercise.length);
    currentAudio = AudioElements.exercise[randomIndex];

    // Explicitly set loop for exercise tracks
    if (currentAudio) {
        currentAudio.loop = true;
        currentAudio.play().catch(e => console.error("Audio playback failed (interaction required?):", e));
    }
}

function playRelaxAudio() {
    stopAllAudio();
    currentAudio = AudioElements.relax;
    if (currentAudio) {
        currentAudio.loop = false; // Play only once
        currentAudio.play().catch(e => console.error("Audio playback failed:", e));
    }
}

function tick() {
    if (remainingTime > 0) {
        remainingTime--;
        updateDisplay();
    } else {
        switchPhase();
    }
}

function switchPhase() {
    if (state === 'EXERCISE') {
        // Switch to GAP
        state = 'GAP';
        UI.statusText.textContent = 'REST';

        // CSS Custom Property Switch
        document.documentElement.style.setProperty('--primary-color', '#3b82f6');
        document.documentElement.style.setProperty('--primary-glow', 'rgba(59, 130, 246, 0.4)');

        remainingTime = parseInt(UI.gapInput.value) || 10;
        totalPhaseTime = remainingTime;

        playRelaxAudio();

    } else if (state === 'GAP') {
        // Switch to EXERCISE
        state = 'EXERCISE';
        UI.statusText.textContent = 'WORKOUT';

        // CSS Custom Property Switch back to green
        document.documentElement.style.setProperty('--primary-color', '#10b981');
        document.documentElement.style.setProperty('--primary-glow', 'rgba(16, 185, 129, 0.4)');

        remainingTime = parseInt(UI.exerciseInput.value) || 30;
        totalPhaseTime = remainingTime;

        playRandomExerciseAudio();
    }
    updateDisplay();
}

UI.startBtn.addEventListener('click', () => {
    if (state !== 'IDLE') return; // Prevent multiple starts

    state = 'EXERCISE';
    UI.statusText.textContent = 'WORKOUT';

    // Reset to green in case it was stopped during gap
    document.documentElement.style.setProperty('--primary-color', '#10b981');
    document.documentElement.style.setProperty('--primary-glow', 'rgba(16, 185, 129, 0.4)');

    UI.startBtn.disabled = true;
    UI.stopBtn.disabled = false;
    UI.exerciseInput.disabled = true;
    UI.gapInput.disabled = true;

    remainingTime = parseInt(UI.exerciseInput.value) || 30;
    totalPhaseTime = remainingTime;

    updateDisplay();
    playRandomExerciseAudio();

    currentInterval = setInterval(tick, 1000);
});

UI.stopBtn.addEventListener('click', () => {
    if (currentInterval) clearInterval(currentInterval);
    state = 'IDLE';

    UI.statusText.textContent = 'IDLE';
    document.documentElement.style.setProperty('--primary-color', '#10b981');
    document.documentElement.style.setProperty('--primary-glow', 'rgba(16, 185, 129, 0.4)');

    remainingTime = 0;
    totalPhaseTime = 0;
    setProgress(100);
    UI.timeText.textContent = '00:00';

    UI.startBtn.disabled = false;
    UI.stopBtn.disabled = true;
    UI.exerciseInput.disabled = false;
    UI.gapInput.disabled = false;

    stopAllAudio();
});
