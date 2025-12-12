const axios = require("axios").default;
const moment = require("moment");
const cheerio = require("cheerio");
const path = require("path");
const { sendToHA } = require("./mqtt_utils");
const STATIONS = require("./assets/water_quality_station.json");

const URL =
  "https://www.water.gov.tw/ch/WaterQuality/Detail/{stationId}?nodeId=4631";

const DEVICE_NAME = "水質檢測";

const SENSORS = [
  {
    sensorName: "淨水場名稱",
    stateName: "name",
    icon: "mdi:water",
  },
  {
    sensorName: "淨水場地址",
    stateName: "address",
    icon: "mdi:map-marker-radius",
  },
  {
    sensorName: "自由有效餘氯",
    stateName: "freeChlorine",
    icon: "mdi:water-check",
  },
  {
    sensorName: "濁度",
    stateName: "turbidity",
    icon: "mdi:water-opacity",
  },
  {
    sensorName: "pH值",
    stateName: "phValue",
    icon: "mdi:ph",
  },
  {
    sensorName: "總硬度",
    stateName: "totalHardness",
    icon: "mdi:water-plus",
  },
  {
    sensorName: "硝酸鹽氮",
    stateName: "nitrateNitrogen",
    icon: "mdi:molecule",
  },
  {
    sensorName: "總菌落數",
    stateName: "totalBacteria",
    icon: "mdi:bacteria",
  },
  {
    sensorName: "大腸桿菌群",
    stateName: "coliformBacteria",
    icon: "mdi:bacteria-outline",
  },
  {
    sensorName: "發布日期",
    stateName: "publishDate",
    icon: "mdi:calendar-clock",
  },
];

const findStation = (stationId) => {
  const found = STATIONS.find((station) => station.id === stationId);

  if (!found) {
    return STATIONS[0];
  }

  return found;
};

const BASENAME = path.basename(__filename, ".js");

(async () => {
  try {
    const station = findStation(process.env.STATION_ID);

    const url = URL.replace("{stationId}", station.id);

    const htmlBody = await axios.get(url);

    const $ = cheerio.load(htmlBody.data);

    const { name, address } = station;

    // 裝置類別：自來水、狀態類別：測量、測量單位：mg/L
    const freeChlorine = +$(
      "#main_content > div.main_page > div.main_page_content > div.table-responsive > table > tbody > tr:nth-child(1) > td:nth-child(2)"
    ).text();
    // 裝置類別：自來水、狀態類別：測量、測量單位：NTU
    const turbidity = +$(
      "#main_content > div.main_page > div.main_page_content > div.table-responsive > table > tbody > tr:nth-child(2) > td:nth-child(2)"
    ).text();
    // 裝置類別：自來水、狀態類別：測量、測量單位：無
    const phValue = +$(
      "#main_content > div.main_page > div.main_page_content > div.table-responsive > table > tbody > tr:nth-child(6) > td:nth-child(2)"
    ).text();
    // 裝置類別：自來水、狀態類別：測量、測量單位：mg/L
    const totalHardness = +$(
      "#main_content > div.main_page > div.main_page_content > div.table-responsive > table > tbody > tr:nth-child(14) > td:nth-child(2)"
    ).text();
    // 裝置類別：自來水、狀態類別：測量、測量單位：mg/L
    const nitrateNitrogen = +$(
      "#main_content > div.main_page > div.main_page_content > div.table-responsive > table > tbody > tr:nth-child(12) > td:nth-child(2)"
    ).text();
    const totalBacteria = $(
      "#main_content > div.main_page > div.main_page_content > div.table-responsive > table > tbody > tr:nth-child(19) > td:nth-child(2)"
    ).text();
    const coliformBacteria = $(
      "#main_content > div.main_page > div.main_page_content > div.table-responsive > table > tbody > tr:nth-child(20) > td:nth-child(2)"
    ).text();
    const publishDate = moment(
      $("#main_content > div.main_page > p")
        .text()
        .replace("發布日期：", "")
        .trim(),
      "YYYY/MM/DD"
    ).format("YYYY-MM-DD");

    const stateObj = {
      name,
      address,
      freeChlorine,
      turbidity,
      phValue,
      totalHardness,
      nitrateNitrogen,
      totalBacteria,
      coliformBacteria,
      publishDate,
    };

    console.log(`[${BASENAME}] Fetched data:`, stateObj);

    await sendToHA(BASENAME, DEVICE_NAME, stateObj, SENSORS);
  } catch (error) {
    console.error(`[${BASENAME}] Error:`, error);
  }
})();
