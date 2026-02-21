const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

// --- GPIO 設定 (參考你的 PIN_LOOKUP.hpp 與 mainwindow 用到的 LED) ---
// 請確認這些 GPIO 號碼對應到你的 LED 1, 2, 3, 4
const LED_PINS = {
    1: 396, // 假設 LED 1
    2: 397, // 假設 LED 2
    3: 255, // 假設 LED 3
    4: 296  // 假設 LED 4
};

// GPIO Helper Functions (模擬 C++ gpio_util)
function gpioExport(pin) {
    try {
        if (!fs.existsSync(`/sys/class/gpio/gpio${pin}`)) {
            fs.writeFileSync('/sys/class/gpio/export', pin.toString());
        }
    } catch (e) { console.error(`Error exporting GPIO ${pin}:`, e.message); }
}

function gpioSetDir(pin, dir) {
    try {
        fs.writeFileSync(`/sys/class/gpio/gpio${pin}/direction`, dir);
    } catch (e) { console.error(`Dir Error ${pin}:`, e.message); }
}

function gpioWrite(pin, value) {
    try {
        fs.writeFileSync(`/sys/class/gpio/gpio${pin}/value`, value ? '1' : '0');
    } catch (e) { console.error(`Write Error ${pin}:`, e.message); }
}

// 初始化所有 LED
Object.values(LED_PINS).forEach(pin => {
    gpioExport(pin);
    gpioSetDir(pin, 'out');
    gpioWrite(pin, 0); // 預設全關
});

// --- 系統狀態變數 ---
let state = {
    isLocked: false,       // Mutex 鎖
    isAlarm: false,        // 是否警報中
    isPaused: false,       // 是否暫停 (S鍵)
    currentTask: null,     // 目前執行的項目 (1-4)
    adcValue: 0,
    threshold: 800,        // 預設閾值
    mode: 'IDLE'           // IDLE, AUTO_RUN, MANUAL
};

// 自動執行相關變數
let autoSequence = [1, 2, 3, 4];
let autoIndex = 0;
let autoTimer = null;

// --- 核心邏輯函式 ---

// 控制單顆 LED
function setLed(ledNum, status) {
    const pin = LED_PINS[ledNum];
    if (pin) gpioWrite(pin, status ? 1 : 0);
    // 更新前端
    io.emit('led_update', { led: ledNum, status: status });
}

// 控制全部 LED
function setAllLeds(status) {
    for (let i = 1; i <= 4; i++) setLed(i, status);
}

// 警報閃爍 Timer
let alarmInterval = null;
function triggerAlarm() {
    if (state.isAlarm) return;
    
    console.log("!!! ALARM TRIGGERED !!!");
    state.isAlarm = true;
    state.isLocked = true; // 上鎖
    
    // 停止目前的所有任務
    clearTimeout(autoTimer);
    state.mode = 'ALARM';
    
    // 開始全燈閃爍
    let toggle = false;
    alarmInterval = setInterval(() => {
        toggle = !toggle;
        setAllLeds(toggle);
    }, 200); // 快速閃爍

    io.emit('status_update', state);
}

function clearAlarm() {
    if (!state.isAlarm) return;
    
    console.log("Alarm Cleared");
    clearInterval(alarmInterval);
    state.isAlarm = false;
    state.isLocked = false;
    state.mode = 'IDLE';
    setAllLeds(false);
    
    io.emit('status_update', state);
}

// 執行單一項目 (模擬工作 5秒)
async function executeItem(itemNum) {
    // 如果系統被鎖定或警報中，無法執行
    if (state.isLocked && state.mode !== 'AUTO_RUN') return; 

    console.log(`Starting Item ${itemNum}`);
    state.isLocked = true; // Mutex Lock
    state.currentTask = itemNum;
    io.emit('status_update', state);

    // 亮起該項目 LED
    setAllLeds(false);
    setLed(itemNum, true);

    return new Promise((resolve, reject) => {
        // 等待 5 秒
        autoTimer = setTimeout(() => {
            // 工作結束
            console.log(`Item ${itemNum} Finished`);
            setLed(itemNum, false);
            state.isLocked = false; // Mutex Unlock
            state.currentTask = null;
            io.emit('status_update', state);
            resolve();
        }, 5000);
    });
}

// 自動排程邏輯 (B鍵)
async function runAutoSequence() {
    if (state.isAlarm) return;
    
    // 如果暫停中，就不繼續執行
    if (state.isPaused) {
        console.log("Sequence Paused...");
        return;
    }

    if (autoIndex >= autoSequence.length) {
        console.log("Auto Sequence Complete");
        state.mode = 'IDLE';
        autoIndex = 0;
        io.emit('status_update', state);
        return;
    }

    // 執行當前項目
    const currentItem = autoSequence[autoIndex];
    try {
        await executeItem(currentItem);
        // 執行完畢後，增加索引並執行下一個
        autoIndex++;
        runAutoSequence(); // 遞迴呼叫
    } catch (err) {
        console.log("Sequence interrupted");
    }
}

// --- ADC 監控 (模擬 background thread) ---
setInterval(() => {
    const py = spawn('python3', ['read_adc.py']); // 使用你原本的 python script
    
    py.stdout.on('data', (data) => {
        let val = parseInt(data.toString().trim());
        if (!isNaN(val)) {
            state.adcValue = val;
            
            // 安全檢查邏輯
            if (val > state.threshold && !state.isAlarm) {
                triggerAlarm();
            }
            
            // 只有數值變化大才送出 socket，避免網路塞車
            // 這裡為了演示，每次都送 (你可以自行優化)
             io.emit('adc_data', val);
        }
    });

    py.stderr.on('data', (data) => {
        // 忽略一些警告
    });
}, 500); // 每 500ms 讀取一次

// --- Web Server & Socket.io ---
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', (socket) => {
    console.log('GUI Client Connected');
    
    // 初始化前端狀態
    socket.emit('status_update', state);

    // 接收前端指令
    socket.on('command', (cmd) => {
        console.log(`Received command: ${cmd}`);

        if (cmd === 'A') {
            // A: 解除警報 / 解鎖
            clearAlarm();
        } 
        else if (state.isAlarm) {
            // 警報中，忽略其他按鍵
            return;
        }
        else if (cmd === 'B') {
            // B: 待機3秒 -> 自動執行
            if (state.isLocked) return;
            
            state.mode = 'AUTO_RUN';
            state.isLocked = true; // 鎖定直到流程開始
            autoIndex = 0;
            state.isPaused = false;
            
            console.log("Enter Standby (3s)...");
            setAllLeds(true); // 全亮
            io.emit('status_update', state);

            setTimeout(() => {
                setAllLeds(false);
                runAutoSequence();
            }, 3000);
        }
        else if (cmd === 'S') {
            // S: 暫停 / 繼續
            if (state.mode === 'AUTO_RUN') {
                state.isPaused = !state.isPaused;
                console.log(`System ${state.isPaused ? 'Paused' : 'Resumed'}`);
                io.emit('status_update', state);
                
                // 如果是 Resume，要重新觸發序列
                if (!state.isPaused && !state.isLocked) {
                    runAutoSequence();
                }
            }
        }
        else if (['1', '2', '3', '4'].includes(cmd)) {
            // 單項執行
            executeItem(parseInt(cmd));
        }
    });
});

http.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
