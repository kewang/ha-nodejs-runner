const cheerio = require("cheerio");
const axios = require("axios").default;
const moment = require("moment");
const fs = require("fs").promises;
const path = require("path");

const URL =
  "https://service.taipower.com.tw/branch/d101/xcnotice?xsmsid=0M242581316312033070";

const OUTAGE_KEYWORD = process.env.OUTAGE_KEYWORD || "和豐街";
const TW_YEAR_OFFSET = 1911;

const STATUS = {
  STATUS_NO_OUTAGE: 1,
  STATUS_OUTAGE: 2,
  STATUS_ERROR: 3,
};

const BASENAME = path.basename(__filename, ".js");
const OUTPUT_PATH = "/config/node_scheduler_outputs";
const OUTPUT_FILE = `${OUTPUT_PATH}/${BASENAME}.json`;

(async () => {
  const fileWrite = async (data) => {
    try {
      await fs.writeFile(OUTPUT_FILE, JSON.stringify(data));
    } catch (error) {
      console.error("寫入檔案失敗，直接顯示原資料", error);

      console.log(`data: ${JSON.stringify(data)}`);
    }
  };

  try {
    const htmlBody = await axios.get(URL);

    const $ = cheerio.load(htmlBody.data);

    let foundDate;

    $(".ListTable").each((index, table) => {
      const text = $(table).text();

      const found = text.includes(OUTAGE_KEYWORD);

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

        return false; // break loop
      }
    });

    if (foundDate) {
      await fileWrite({
        status: STATUS.STATUS_OUTAGE,
        updatedAt: moment().format(),
        date: foundDate.format("YYYY/MM/DD"),
      });

      console.log(foundDate.format("YYYY/MM/DD"));
    } else {
      await fileWrite({
        status: STATUS.STATUS_NO_OUTAGE,
        updatedAt: moment().format(),
      });

      console.log("最近沒有停電");
    }
  } catch (error) {
    await fileWrite({
      status: STATUS.STATUS_ERROR,
      updatedAt: moment().format(),
    });

    console.error(error);
    console.error("發生錯誤");
  }
})();
