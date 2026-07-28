/* ==========================================================================
   PHYSICS QUEST: ESCAPE THE LAB - Main Engine & Physics Logic
   ========================================================================== */

// --- 1. AUDIO SYNTHESIZER (Web Audio API - No External Files) ---
const Sound = {
    ctx: null,
    muted: false,

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    },

    playTone(freq, type, duration) {
        if (this.muted || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },

    correct() {
        this.playTone(523.25, 'sine', 0.15); // C5
        setTimeout(() => this.playTone(659.25, 'sine', 0.3), 150); // E5
    },

    wrong() {
        this.playTone(220, 'sawtooth', 0.2); // A3
        setTimeout(() => this.playTone(185, 'sawtooth', 0.3), 200); // F#3
    },

    complete() {
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
            setTimeout(() => this.playTone(freq, 'triangle', 0.3), idx * 150);
        });
    }
};

// --- 2. DYNAMIC BACKGROUND PARTICLES ---
const ParticleBg = {
    canvas: null,
    ctx: null,
    particles: [],

    init() {
        this.canvas = document.getElementById('bg-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());

        for (let i = 0; i < 60; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                radius: Math.random() * 2 + 1,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                alpha: Math.random() * 0.5 + 0.2
            });
        }
        this.animate();
    },

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#00f3ff';

        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0 || p.x > this.canvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > this.canvas.height) p.vy *= -1;

            this.ctx.globalAlpha = p.alpha;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });

        requestAnimationFrame(() => this.animate());
    }
};

// --- 3. AI ASSISTANT (PIXY) ---
const PIXY = {
    speak(message) {
        const dialog = document.getElementById('pixy-text');
        dialog.innerText = message;
        const bubble = document.getElementById('pixy-dialog');
        bubble.style.transform = 'scale(1.05)';
        setTimeout(() => bubble.style.transform = 'scale(1)', 200);
    }
};

// --- 4. GAME STATE & MAIN CONTROLLER ---
const Game = {
    currentRoom: 1,
    score: 0,
    lives: 3,
    timeSeconds: 0,
    timerInterval: null,
    hintsUsed: 0,
    roomData: {},

    init() {
        ParticleBg.init();
        this.simulateLoading();
        this.bindEvents();
    },

    simulateLoading() {
        let progress = 0;
        const progressBar = document.getElementById('loading-progress');
        const interval = setInterval(() => {
            progress += 5;
            progressBar.style.width = `${progress}%`;
            if (progress >= 100) {
                clearInterval(interval);
                UI.switchScreen('screen-menu');
            }
        }, 50);
    },

    bindEvents() {
        document.getElementById('btn-sound').addEventListener('click', () => {
            Sound.init();
            Sound.muted = !Sound.muted;
            document.getElementById('btn-sound').innerText = Sound.muted ? '🔇' : '🔊';
        });

        document.getElementById('btn-reset').addEventListener('click', () => this.restart());
    },

    startNewGame() {
        Sound.init();
        this.currentRoom = 1;
        this.score = 0;
        this.lives = 3;
        this.timeSeconds = 0;
        this.hintsUsed = 0;

        document.getElementById('stats-bar').style.display = 'flex';
        document.getElementById('btn-reset').style.display = 'block';
        
        this.startTimer();
        this.loadRoom(1);
        UI.switchScreen('screen-game');
    },

    startTimer() {
        clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.timeSeconds++;
            const mins = String(Math.floor(this.timeSeconds / 60)).padStart(2, '0');
            const secs = String(this.timeSeconds % 60).padStart(2, '0');
            document.getElementById('timer').innerText = `${mins}:${secs}`;
        }, 1000);
    },

    updateUI() {
        document.getElementById('score').innerText = String(this.score).padStart(4, '0');
        document.getElementById('lives').innerText = '❤️'.repeat(this.lives);
        document.getElementById('level-progress').style.width = `${(this.currentRoom / 5) * 100}%`;
    },

    loadRoom(roomNum) {
        this.currentRoom = roomNum;
        this.updateUI();
        const container = document.getElementById('room-canvas-container');
        container.innerHTML = '';

        document.getElementById('room-badge').innerText = `PHÒNG 0${roomNum}/05`;

        switch (roomNum) {
            case 1:
                document.getElementById('room-name').innerText = 'LỰC VÀ ĐỘNG HỌC';
                PIXY.speak('Hãy chọn lực đúng hướng đẩy xe về phía trước!');
                Rooms.renderRoom1(container);
                break;
            case 2:
                document.getElementById('room-name').innerText = 'CHUYỂN ĐỘNG ĐỀU';
                PIXY.speak('Tính toán vận tốc v = s / t để xe đến đúng đích!');
                Rooms.renderRoom2(container);
                break;
            case 3:
                document.getElementById('room-name').innerText = 'MẠCH ĐIỆN BẢO MẬT';
                PIXY.speak('Kéo công tắc vào mạch để tạo mạch kín thắp sáng bóng đèn!');
                Rooms.renderRoom3(container);
                break;
            case 4:
                document.getElementById('room-name').innerText = 'PHẢN XẠ ÁNH SÁNG';
                PIXY.speak('Nhấp vào gương để xoay góc sao cho tia Laser phản xạ trúng cảm biến!');
                Rooms.renderRoom4(container);
                break;
            case 5:
                document.getElementById('room-name').innerText = 'CHUỖI NĂNG LƯỢNG';
                PIXY.speak('Sắp xếp chuỗi chuyển hóa năng lượng từ Mặt Trời đến Bóng đèn!');
                Rooms.renderRoom5(container);
                break;
        }
    },

    requestHint() {
        if (this.score >= 5) {
            this.score -= 5;
            this.hintsUsed++;
            this.updateUI();
            const hints = [
                'Lực đẩy phải cùng chiều với hướng chuyển động mong muốn.',
                'Công thức v = s / t. Lấy quãng đường chia cho thời gian.',
                'Mạch điện kín là mạch không bị ngắt đoạn.',
                'Góc phản xạ luôn bằng góc tới (i = i\').',
                'Quang năng -> Hóa năng -> Điện năng -> Quang năng.'
            ];
            PIXY.speak(`GỢI Ý: ${hints[this.currentRoom - 1]}`);
        } else {
            PIXY.speak('Bạn không đủ điểm để lấy gợi ý!');
        }
    },

    checkCurrentRoom() {
        const isCorrect = Rooms.validateRoom(this.currentRoom);
        if (isCorrect) {
            Sound.correct();
            this.score += 100;
            PIXY.speak('Tuyệt vời! Giải mã thành công. Cửa đã mở!');
            
            setTimeout(() => {
                if (this.currentRoom < 5) {
                    this.loadRoom(this.currentRoom + 1);
                } else {
                    this.finishGame();
                }
            }, 1500);
        } else {
            Sound.wrong();
            this.score = Math.max(0, this.score - 10);
            this.lives--;
            this.updateUI();

            if (this.lives <= 0) {
                PIXY.speak('Hệ thống khóa hoàn toàn! Bạn đã hết mạng.');
                setTimeout(() => this.startNewGame(), 2000);
            } else {
                PIXY.speak('Thử thách thất bại! Kiểm tra lại thông số.');
            }
        }
    },

    finishGame() {
        clearInterval(this.timerInterval);
        Sound.complete();

        document.getElementById('cert-score').innerText = this.score;
        document.getElementById('cert-time').innerText = document.getElementById('timer').innerText;
        document.getElementById('cert-rank').innerText = this.score >= 400 ? 'S CLASS (XUẤT SẮC)' : 'A CLASS (ĐẠT)';

        UI.switchScreen('screen-ending');
    },

    restart() {
        this.startNewGame();
    }
};

// --- 5. PUZZLE ROOMS LOGIC ---
const Rooms = {
    selectedForce: null,
    mirrorAngle: 0,

    renderRoom1(container) {
        container.innerHTML = `
            <div class="room1-container">
                <div class="force-arrows">
                    <button class="arrow-btn" onclick="Rooms.selectForce('left')">⬅️ Lực kéo trái (50N)</button>
                    <button class="arrow-btn" onclick="Rooms.selectForce('right')">➡️ Lực đẩy phải (50N)</button>
                </div>
                <div id="demo-car" class="car">XE LAB</div>
                <div class="track-line"></div>
            </div>
        `;
    },

    selectForce(dir) {
        this.selectedForce = dir;
        document.querySelectorAll('.arrow-btn').forEach(btn => btn.classList.remove('selected'));
        event.target.classList.add('selected');
    },

    renderRoom2(container) {
        container.innerHTML = `
            <div class="room2-container">
                <div class="info-card">
                    <p>Quãng đường (s): <strong>120 m</strong></p>
                    <p>Thời gian tối đa (t): <strong>6 giây</strong></p>
                </div>
                <label>Nhập Vận tốc phù hợp (m/s):</label>
                <input type="number" id="velocity-input" class="sci-input" placeholder="0">
            </div>
        `;
    },

    renderRoom3(container) {
        container.innerHTML = `
            <div class="room3-container">
                <div class="components-palette">
                    <p>Linh kiện:</p>
                    <div class="draggable-item" draggable="true" ondragstart="event.dataTransfer.setData('text', 'switch')">🔌 Công Tắc Kín</div>
                </div>
                <div class="circuit-board" ondragover="event.preventDefault()" ondrop="Rooms.dropComponent(event)">
                    <div id="bulb" class="bulb-indicator"></div>
                    <p style="position:absolute; bottom:10px;">Thả linh kiện vào đây để nối mạch</p>
                </div>
            </div>
        `;
    },

    dropComponent(e) {
        e.preventDefault();
        const data = e.dataTransfer.getData('text');
        if (data === 'switch') {
            document.getElementById('bulb').classList.add('lit');
            this.circuitClosed = true;
        }
    },

    renderRoom4(container) {
        this.mirrorAngle = 0;
        container.innerHTML = `
            <div class="room4-container">
                <div id="mirror" class="mirror" onclick="Rooms.rotateMirror()"></div>
                <div id="sensor" class="sensor"></div>
                <p style="position:absolute; bottom:10px; width:100%; text-align:center;">Click vào gương để xoay góc phản xạ (Góc hiện tại: <span id="angle-display">0</span>°)</p>
            </div>
        `;
    },

    rotateMirror() {
        this.mirrorAngle = (this.mirrorAngle + 45) % 180;
        document.getElementById('mirror').style.transform = `translate(-50%, -50%) rotate(${this.mirrorAngle}deg)`;
        document.getElementById('angle-display').innerText = this.mirrorAngle;
        if (this.mirrorAngle === 45) {
            document.getElementById('sensor').classList.add('active');
        } else {
            document.getElementById('sensor').classList.remove('active');
        }
    },

    renderRoom5(container) {
        container.innerHTML = `
            <div class="room5-container">
                <p>Kéo các dạng năng lượng vào đúng thứ tự chuyển hóa:</p>
                <div class="energy-slots">
                    <div class="slot" id="slot-1">1. Quang năng</div>
                    <div class="slot" id="slot-2" ondragover="event.preventDefault()" ondrop="Rooms.dropEnergy(event, 2)">???</div>
                    <div class="slot" id="slot-3" ondragover="event.preventDefault()" ondrop="Rooms.dropEnergy(event, 3)">???</div>
                </div>
                <div class="energy-pool">
                    <div class="energy-chip" draggable="true" ondragstart="event.dataTransfer.setData('text', 'Điện năng')">⚡ Điện năng</div>
                    <div class="energy-chip" draggable="true" ondragstart="event.dataTransfer.setData('text', 'Hóa năng')">🧪 Hóa năng</div>
                </div>
            </div>
        `;
        this.energyChain = [];
    },

    dropEnergy(e, slotNum) {
        e.preventDefault();
        const type = e.dataTransfer.getData('text');
        e.target.innerText = type;
        this.energyChain[slotNum] = type;
    },

    validateRoom(roomNum) {
        switch (roomNum) {
            case 1:
                if (this.selectedForce === 'right') {
                    document.getElementById('demo-car').style.left = ' calc(100% - 150px)';
                    return true;
                }
                return false;
            case 2:
                const val = parseFloat(document.getElementById('velocity-input').value);
                return val === 20; // 120 / 6 = 20
            case 3:
                return this.circuitClosed === true;
            case 4:
                return this.mirrorAngle === 45;
            case 5:
                return this.energyChain[2] === 'Hóa năng' && this.energyChain[3] === 'Điện năng';
            default:
                return false;
        }
    }
};

// --- 6. UI MANAGER ---
const UI = {
    switchScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    },

    showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    },

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }
};

// Start Game Engine on Load
window.addEventListener('DOMContentLoaded', () => Game.init());