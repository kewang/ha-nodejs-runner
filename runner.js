const fs = require('fs');
const cron = require('node-cron');
const { spawn } = require('child_process');
const path = require('path');

const OPTIONS_PATH = '/data/options.json';
const CONFIG_BASE_PATH = '/config';

console.log('Starting Node.js Script Scheduler (v1.0.1)...');

let options;

try {
    const rawData = fs.readFileSync(OPTIONS_PATH);
    options = JSON.parse(rawData);
} catch (error) {
    console.error('Error reading options.json:', error);
    process.exit(1);
}

if (!options.scripts || !Array.isArray(options.scripts) || options.scripts.length === 0) {
    console.log('No scripts configured in options. Please edit the Add-on configuration.');
} else {
    options.scripts.forEach((scriptConfig, index) => {
        const scriptName = scriptConfig.path;
        const schedule = scriptConfig.cron;
        
        if (!scriptName || !schedule) {
            console.warn(`[Script #${index}] Skipped: Missing path or cron settings.`);
            return;
        }

        // 解析環境變數 (支援 Object 或 JSON String)
        let customEnv = {};
        if (scriptConfig.env_vars) {
            try {
                if (typeof scriptConfig.env_vars === 'object') {
                    // 如果使用者在 YAML 直接寫物件格式
                    customEnv = scriptConfig.env_vars;
                } else if (typeof scriptConfig.env_vars === 'string') {
                    // 如果使用者寫的是 JSON 字串
                    customEnv = JSON.parse(scriptConfig.env_vars);
                }
            } catch (e) {
                console.error(`[${scriptName}] Failed to parse env_vars:`, e.message);
            }
        }

        // 完整路徑
        const fullPath = path.join(CONFIG_BASE_PATH, scriptName);

        // 檢查檔案是否存在
        if (!fs.existsSync(fullPath)) {
            console.warn(`[${scriptName}] WARNING: File not found at ${fullPath}`);
        }

        if (!cron.validate(schedule)) {
            console.error(`[${scriptName}] Invalid cron syntax: ${schedule}`);
            return;
        }

        console.log(`[${scriptName}] Scheduled: ${schedule}`);

        cron.schedule(schedule, () => {
            console.log(`[${scriptName}] Executing...`);

            const child = spawn('node', [fullPath], {
                env: { ...process.env, ...customEnv },
                cwd: path.dirname(fullPath) // 設定工作目錄為腳本所在資料夾
            });

            child.stdout.on('data', (data) => {
                console.log(`[${scriptName}] ${data.toString().trim()}`);
            });

            child.stderr.on('data', (data) => {
                console.error(`[${scriptName} ERR] ${data.toString().trim()}`);
            });

            child.on('close', (code) => {
                // 只有非 0 結束才顯示這行，保持 log 乾淨
                if (code !== 0) {
                    console.log(`[${scriptName}] Exited with code ${code}`);
                }
            });
        });
    });
}

// 保持主程序不結束
setInterval(() => {}, 1000 * 60 * 60);