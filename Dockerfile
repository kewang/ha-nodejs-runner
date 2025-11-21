ARG BUILD_FROM
FROM $BUILD_FROM

# 安裝 Node.js
RUN apk add --no-cache nodejs npm

# 設定工作目錄
WORKDIR /app

# 複製 package.json 並安裝依賴
COPY package.json /app/
RUN npm install

# 複製主程式
COPY runner.js /app/

# --- 關鍵修改開始 ---
# 複製啟動腳本到 S6 的服務目錄
COPY run /etc/services.d/scheduler/run

# 給予執行權限
RUN chmod a+x /etc/services.d/scheduler/run
# --- 關鍵修改結束 ---

# 注意：這裡不需要 CMD，因為 Base Image 的 Entrypoint 會自動掃描 /etc/services.d