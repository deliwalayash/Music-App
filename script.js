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
    silent: document.getElementById('silentAudio'),
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
let remainingTime = 0;
let totalPhaseTime = 0;
let phaseEndTime = 0;
let currentAudio = null;

// Persist state to localStorage
function saveState() {
    if (state === 'IDLE') {
        localStorage.removeItem('gymTimerState');
        return;
    }
    localStorage.setItem('gymTimerState', JSON.stringify({
        state,
        phaseEndTime,
        totalPhaseTime,
        exerciseTime: UI.exerciseInput.value,
        gapTime: UI.gapInput.value
    }));
}

// Load state on startup
function loadState() {
    const saved = localStorage.getItem('gymTimerState');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            const now = Date.now();

            // If timer was active and hasn't completely expired yet (giving a few minutes leeway for missed intervals)
            if (parsed.state !== 'IDLE' && parsed.phaseEndTime > now - 5000) {
                state = parsed.state;
                totalPhaseTime = parsed.totalPhaseTime;
                phaseEndTime = parsed.phaseEndTime;
                UI.exerciseInput.value = parsed.exerciseTime;
                UI.gapInput.value = parsed.gapTime;

                UI.startBtn.disabled = true;
                UI.stopBtn.disabled = false;
                UI.exerciseInput.disabled = true;
                UI.gapInput.disabled = true;

                if (state === 'EXERCISE') {
                    UI.statusText.textContent = 'WORKOUT';
                    document.documentElement.style.setProperty('--primary-color', '#10b981');
                    document.documentElement.style.setProperty('--primary-glow', 'rgba(16, 185, 129, 0.4)');
                } else if (state === 'GAP') {
                    UI.statusText.textContent = 'REST';
                    document.documentElement.style.setProperty('--primary-color', '#3b82f6');
                    document.documentElement.style.setProperty('--primary-glow', 'rgba(59, 130, 246, 0.4)');
                }

                timerWorker.postMessage('start');
                updateDisplay();
                // Note: Can't automatically play audio here without user interaction due to browser policies.
                // It will play on the next phase switch, or we could require a click to resume fully.
            } else {
                localStorage.removeItem('gymTimerState');
            }
        } catch (e) {
            console.error(e);
            localStorage.removeItem('gymTimerState');
        }
    }
}

// Web Worker for background ticking
const workerCode = `
    let timerId = null;
    self.onmessage = function(e) {
        if (e.data === 'start') {
            if (!timerId) timerId = setInterval(() => self.postMessage('tick'), 200);
        } else if (e.data === 'stop') {
            if (timerId) clearInterval(timerId);
            timerId = null;
        }
    };
`;
const blob = new Blob([workerCode], { type: 'application/javascript' });
const timerWorker = new Worker(URL.createObjectURL(blob));

timerWorker.onmessage = function (e) {
    if (e.data === 'tick') {
        tick();
    }
};

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
    if (state === 'IDLE') return;

    let now = Date.now();
    remainingTime = Math.ceil((phaseEndTime - now) / 1000);

    if (remainingTime > 0) {
        updateDisplay();
    } else {
        remainingTime = 0;
        updateDisplay();
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
        phaseEndTime = Date.now() + remainingTime * 1000;

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
        phaseEndTime = Date.now() + remainingTime * 1000;

        playRandomExerciseAudio();
    }
    updateDisplay();
    saveState();
}

let audioUnlocked = false;

function unlockAudio() {
    if (audioUnlocked) return;

    // Play and immediately pause to unlock audio on mobile
    if (AudioElements.silent) AudioElements.silent.play().catch(() => { });
    AudioElements.relax.play().catch(() => { });
    AudioElements.relax.pause();
    AudioElements.relax.currentTime = 0;

    AudioElements.exercise.forEach(a => {
        a.play().catch(() => { });
        a.pause();
        a.currentTime = 0;
    });

    audioUnlocked = true;
}

UI.startBtn.addEventListener('click', () => {
    if (state !== 'IDLE') return; // Prevent multiple starts

    // Unlock audio elements to allow programmatic playback on mobile
    unlockAudio();

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
    phaseEndTime = Date.now() + remainingTime * 1000;

    updateDisplay();
    playRandomExerciseAudio();

    timerWorker.postMessage('start');
    saveState();
});

UI.stopBtn.addEventListener('click', () => {
    timerWorker.postMessage('stop');
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
    saveState();
});

// Initialize from localStorage if exists
loadState();
