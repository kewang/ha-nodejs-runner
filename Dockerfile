# 不再使用 BUILD_FROM (HA Base Image)，直接鎖定官方 Node.js 映像檔
FROM node:20-alpine

# 設定環境變數 (確保 Log 能夠即時輸出)
ENV FORCE_COLOR=1

# 設定工作目錄
WORKDIR /app

# 複製 package.json 並安裝依賴
COPY package.json /app/
RUN npm install

# 複製主程式
COPY runner.js /app/

# 新增：複製內建腳本資料夾到容器內
COPY app_scripts /app/app_scripts/

# 直接啟動 Node (跳過 S6 init 系統)
CMD [ "node", "runner.js" ]