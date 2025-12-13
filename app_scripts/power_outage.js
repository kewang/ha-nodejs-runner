const cheerio = require("cheerio");
const axios = require("axios").default;
const moment = require("moment");
const path = require("path");
const { sendToHA } = require("./mqtt_utils");
const POWER_STATIONS = require("./assets/power_station.json");

const POWER_STATION_NAME = process.env.POWER_STATION_NAME || "北市區營業處"; // 例如：基隆區營業處
const POWER_STATION_AREA = process.env.POWER_STATION_AREA || "臺北市中山區"; // 例如：基隆市中正區
const OUTAGE_KEYWORD = process.env.OUTAGE_KEYWORD || "南京西路"; // 例如：新豐街
const TW_YEAR_OFFSET = 1911;

// 正規化字串:移除空白、轉全形數字為半形、統一大小寫
const normalizeText = (text) => {
  return text
    .replace(/\s+/g, "") // 移除所有空白
    .replace(/[０-９]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xfee0)
    ) // 全形數字轉半形
    .toLowerCase();
};

// 根據名稱和地區查找營業處 URL
const findPowerStation = () => {
  if (!POWER_STATION_NAME || !POWER_STATION_AREA || !OUTAGE_KEYWORD) {
    throw new Error(
      `請同時設定 POWER_STATION_NAME、POWER_STATION_AREA、OUTAGE_KEYWORD 環境變數。\n` +
        `POWER_STATION_NAME=${POWER_STATION_NAME}\n` +
        `POWER_STATION_AREA=${POWER_STATION_AREA}\n` +
        `OUTAGE_KEYWORD=${OUTAGE_KEYWORD}`
    );
  }

  const station = POWER_STATIONS.find(
    (s) => s.name === POWER_STATION_NAME && s.area.includes(POWER_STATION_AREA)
  );

  if (!station) {
    throw new Error(
      `找不到符合的營業處。\n` +
        `POWER_STATION_NAME=${POWER_STATION_NAME}\n` +
        `POWER_STATION_AREA=${POWER_STATION_AREA}\n` +
        `OUTAGE_KEYWORD=${OUTAGE_KEYWORD}\n` +
        `請確認名稱、地區、關鍵字是否正確。`
    );
  }

  return station;
};

const station = findPowerStation();

const STATUS_CODE = {
  STATUS_NO_OUTAGE: 1,
  STATUS_OUTAGE: 2,
  STATUS_ERROR: 3,
};

const STATUS = {
  STATUS_NO_OUTAGE: "最近沒有停電",
  STATUS_OUTAGE: "有停電通知",
  STATUS_ERROR: "發生錯誤",
};

const DEVICE_NAME = "停電通知";

const SENSORS = [
  {
    sensorName: "營業處",
    stateName: "station",
    icon: "mdi:power-plug",
  },
  {
    sensorName: "聯絡電話",
    stateName: "phone",
    icon: "mdi:phone-outline",
  },
  {
    sensorName: "地址",
    stateName: "address",
    icon: "mdi:map-marker-outline",
  },
  {
    sensorName: "停電公告網址",
    stateName: "url",
    icon: "mdi:web",
  },
  {
    sensorName: "停電日期",
    stateName: "date",
    icon: "mdi:calendar-alert",
  },
  {
    sensorName: "狀態代碼",
    stateName: "statusCode",
    icon: "mdi:numeric",
  },
  {
    sensorName: "狀態",
    stateName: "status",
    icon: "mdi:information-outline",
  },
  {
    sensorName: "更新時間",
    stateName: "updatedAt",
    icon: "mdi:clock-outline",
  },
  {
    sensorName: "停電描述",
    stateName: "description",
    icon: "mdi:note-text-outline",
  }
];

const BASENAME = path.basename(__filename, ".js");

(async () => {
  try {
    const htmlBody = await axios.get(station.url);

    const $ = cheerio.load(htmlBody.data);

    let foundDate;
    let foundDescription;

    const normalizedKeyword = normalizeText(OUTAGE_KEYWORD);

    $(".ListTable").each((index, table) => {
      const text = $(table).text();
      const normalizedText = normalizeText(text);

      const found = normalizedText.includes(normalizedKeyword);

      if (!found) {
        return;
      }

      const outageDateRaw = $(table).find("caption").text(); // 工作停電日期 ( 非限電 )：114 年 11 月 07 日

      const outageDateParts = outageDateRaw
        .split("：")[1]
        .replace("年", "/")
        .replace("月", "/")
        .replace("日", "/")
        .split("/");

      const outageDate = moment(
        `${
          +outageDateParts[0].trim() + TW_YEAR_OFFSET
        }/${outageDateParts[1].trim()}/${outageDateParts[2].trim()}`,
        "YYYY/MM/DD"
      );

      if (outageDate.isSameOrAfter(moment(), "day")) {
        foundDate = outageDate;
        foundDescription = normalizeText;

        return false; // break loop
      }
    });

    if (foundDate) {
      await sendToHA(
        BASENAME,
        DEVICE_NAME,
        {
          station: station.name,
          phone: station.phone,
          address: station.address,
          url: station.url,
          status: STATUS.STATUS_OUTAGE,
          statusCode: STATUS_CODE.STATUS_OUTAGE,
          updatedAt: moment().format(),
          date: foundDate.format("YYYY/MM/DD"),
          description: foundDescription,
        },
        SENSORS
      );

      console.log(foundDate.format("YYYY/MM/DD"));
    } else {
      await sendToHA(
        BASENAME,
        DEVICE_NAME,
        {
          station: station.name,
          phone: station.phone,
          address: station.address,
          url: station.url,
          status: STATUS.STATUS_NO_OUTAGE,
          statusCode: STATUS_CODE.STATUS_NO_OUTAGE,
          updatedAt: moment().format(),
        },
        SENSORS
      );

      console.log("最近沒有停電");
    }
  } catch (error) {
    await sendToHA(
      BASENAME,
      DEVICE_NAME,
      {
        station: station.name,
        phone: station.phone,
        address: station.address,
        url: station.url,
        status: STATUS.STATUS_ERROR,
        statusCode: STATUS_CODE.STATUS_ERROR,
        updatedAt: moment().format(),
      },
      SENSORS
    );

    console.error(error);
    console.error("發生錯誤");
  }
})();
