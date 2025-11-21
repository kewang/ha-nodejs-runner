const fs = require("fs");

console.log("Hello from HA Addon!");
console.log("Current Time:", new Date().toISOString());
console.log("Environment Variable API_KEY:", process.env.API_KEY);

// 測試寫入檔案 (證明可以與 HA 共用檔案)
fs.writeFileSync("/config/node_scripts/test.txt", new Date().toISOString());
