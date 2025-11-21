const fs = require('fs');
const cron = require('node-cron');
const { spawn } = require('child_process');
const path = require('path');

// Home Assistant Add-on 的設定檔路徑是固定的
const OPTIONS_PATH = '/data/options.json';
// 我們將使用者的腳本預設放在 /config 底下
const CONFIG_BASE_PATH = '/config';

console.log('Starting Node.js Script Scheduler...');

let options;

try {
    const rawData = fs.readFileSync(OPTIONS_PATH);
    options = JSON.parse(rawData);
} catch (error) {
    console.error('Error reading options.json:', error);
    process.exit(1);
}

if (!options.scripts || !Array.isArray(options.scripts)) {
    console.log('No scripts configured.');
} else {
    options.scripts.forEach((scriptConfig, index) => {
        const scriptName = scriptConfig.path;
        const schedule = scriptConfig.cron;
        
        // 解析環境變數 (JSON 字串轉物件)
        let customEnv = {};
        if (scriptConfig.env_vars) {
            try {
                // 支援使用者輸入 JSON 格式字串，例如: "{\"TOKEN\": \"123\"}"
                // 如果在 YAML UI 輸入，通常只寫: {"TOKEN": "123"}
                const envString = scriptConfig.env_vars.toString();
                customEnv = JSON.parse(envString);
            } catch (e) {
                console.error(`[${scriptName}] Failed to parse env_vars JSON:`, e.message);
            }
        }

        // 完整路徑
        const fullPath = path.join(CONFIG_BASE_PATH, scriptName);

        if (!cron.validate(schedule)) {
            console.error(`[${scriptName}] Invalid cron syntax: ${schedule}`);
            return;
        }

        console.log(`[${scriptName}] Scheduled: ${schedule}`);

        cron.schedule(schedule, () => {
            console.log(`[${scriptName}] Executing...`);

            // 執行腳本
            const child = spawn('node', [fullPath], {
                env: { ...process.env, ...customEnv } // 合併系統環境變數與自訂變數
            });

            child.stdout.on('data', (data) => {
                console.log(`[${scriptName} OUTPUT] ${data.toString().trim()}`);
            });

            child.stderr.on('data', (data) => {
                console.error(`[${scriptName} ERROR] ${data.toString().trim()}`);
            });

            child.on('close', (code) => {
                console.log(`[${scriptName}] Finished with code ${code}`);
            });
        });
    });
}

// 保持主程序不結束
setInterval(() => {}, 1000 * 60 * 60);