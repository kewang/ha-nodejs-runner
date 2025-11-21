ARG BUILD_FROM
FROM $BUILD_FROM

# 安裝 Node.js (HA base images 通常基於 Alpine)
RUN apk add --no-cache nodejs npm

# 設定工作目錄
WORKDIR /app

# 複製 package.json 並安裝依賴
COPY package.json /app/
RUN npm install

# 複製主程式
COPY runner.js /app/

# 讓 runner.js 變成可執行
RUN chmod a+x /app/runner.js

# 啟動指令
CMD [ "node", "/app/runner.js" ]