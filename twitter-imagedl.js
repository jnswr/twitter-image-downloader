const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const axios = require("axios");
// const { argv } = require("process");
const Oauth1Helper = require("./oauth1helper.js");

class TwitterImageDownloader {

  static latestTweetsPath = path.normalize(__dirname + '/downloaded_images/latestTweetIds.json');
  static imagesPath = path.normalize(__dirname + '/downloaded_images/');

  constructor(screenName) {
    this.screenName = screenName;
    this.auth = new Oauth1Helper();
    this.latestTweetId = this.getLatestTweetIdList()[screenName] || null;
  }

  //#region classmethods

  async getImageUrls() {

    const imageUrlList = [];
    const endpoint = "https://api.twitter.com/1.1/statuses/user_timeline.json";
    const params = {
      screen_name: this.screenName,
      count: 200,
      include_rts: false,
      trim_user: true,
      since_id: this.latestTweetId
    };

    const req = {
      url: "",
      method: "GET",
      body: null,
    }

    let header;
    let res;

    do {
      req.url = this.getUrlWithParams(endpoint, params);
      header = this.auth.getAuthHeaderForRequest(req);

      // calls to API can be done when:
      // - next cursor doesn't exist
      // - there is no data in the response
      // - there's an error
      try {
        res = await axios.get(req.url, { headers: header });

        if (!Array.isArray(res.data)) break;
        if (res.data.length === 0) break;

        if (this.compareTwoStringNumbers(this.latestTweetId, res.data[0].id_str) === 1 ||
            this.latestTweetId === null) {
          this.latestTweetId = res.data[0].id_str;
        }

        res.data.forEach(details => {
          // console.log("images for tweet id ", details.id_str);

          // retrieve images if applicable
          if (details.extended_entities) { // multiple images 
            details.extended_entities.media.forEach(media => {
              imageUrlList.push(media.media_url_https);
            });
          } else if (details.entities.media) { // single image
            imageUrlList.push(details.entities.media[0].media_url_https);
          } else { /* no media, so do nothing */ }
        });

        params.max_id = res.data.next_cursor_str;

      } catch (error) {
        console.error(error);
        break;
      }

    } while (res.data.next_cursor_str);

    return imageUrlList;
  }

  async saveImageAsFile(screenName, url) {
    const savedImagesDirectory = path.normalize(TwitterImageDownloader.imagesPath + screenName);
    if (!fs.existsSync(savedImagesDirectory)) {
      fs.mkdirSync(savedImagesDirectory);
    }

    // example:
    // https://pbs.twimg.com/media/abcd.jpg -->
    // ['https://pbs.twimg.com/media', '/abcd.jpg']
    let fileName = url.match(/.+(\/.+)$/);

    try {
      let res = await axios.get(url + ':orig', { responseType: 'arraybuffer' });
      let fd = await fsp.open(savedImagesDirectory + fileName[1], 'w');
      await fd.writeFile(res.data);
      await fd.close();

    } catch (err) {
      console.error(err);
    }


  }

  async getUserImages() {
    const imageUrlList = await this.getImageUrls();
    if (imageUrlList.length === 0) {
      console.log('no images retrieved. (you are likely up to date)');
      return;
    }

    process.stdout.write('retrieved URL of ' + imageUrlList.length + ' images. Downloading now.\n');

    let count = 0;
    for (const url of imageUrlList) {
      await this.saveImageAsFile(this.screenName, url);
      process.stdout.write('Downloaded ' + ++count + ' of ' + imageUrlList.length + ' images...\r');
    }

    process.stdout.write('\n');

    this.updateLatestTweetIdList();
  }

  //#endregion classmethods

  //#region utilities

  getLatestTweetIdList() {
    try {
      if (!fs.existsSync(TwitterImageDownloader.imagesPath)) {
        fs.mkdirSync(TwitterImageDownloader.imagesPath, { recursive: false });
      }

      if (!fs.existsSync(TwitterImageDownloader.latestTweetsPath)) {
        let fd = fs.openSync(TwitterImageDownloader.latestTweetsPath, 'a');
        fs.writeFileSync(fd, '{}');
        fs.closeSync(fd);
      }

      let latestTweetIdList = JSON.parse(fs.readFileSync(TwitterImageDownloader.latestTweetsPath, 'utf8'));

      return latestTweetIdList;

    } catch (err) {
      console.error(err);
    }

    return null;

  }

  updateLatestTweetIdList() {
    try {
      if (!fs.existsSync(TwitterImageDownloader.latestTweetsPath)) {
        console.error('updateLatestTweetIdList: latestTweetIds.json file has not been created yet.');
        return false;
      }

      let latestTweetIdList = JSON.parse(fs.readFileSync(TwitterImageDownloader.latestTweetsPath, 'utf8'));
      latestTweetIdList[this.screenName] = this.latestTweetId;
      fs.writeFileSync(TwitterImageDownloader.latestTweetsPath, JSON.stringify(latestTweetIdList, null, 2));

    } catch (err) {
      console.error(err);
      return false;
    }

    return true;

  }

  getUrlWithParams(baseUrl, params) {
    let fullUrl = baseUrl + '?';

    for (const key in params) {
      if (params[key]) fullUrl += key + '=' + params[key] + '&';
    }

    return fullUrl.slice(0, -1);
  }

  // return -1 for left (first) larger
  // return  1 for right (second) larger
  // return  0 for equal
  // for other scenarios (e.g. NaN) return null
  compareTwoStringNumbers(first, second) {
    if (!/^\d+$/.test(first) || !/^\d+$/.test(second)) return null;

    if (first.length > second.length) return -1;
    if (first.length < second.length) return 1

    let firstArrayNumbers = first.split('').map(digit => parseInt(digit));
    let secondArrayNumbers = second.split('').map(digit => parseInt(digit));

    for (let i = 0; i < firstArrayNumbers.length; i++) {
      if (firstArrayNumbers[i] > secondArrayNumbers[i]) return -1;
      if (firstArrayNumbers[i] < secondArrayNumbers[i]) return 1;
    }

    return 0;
  }

  //#endregion utilities

}

function printUsage() {
  console.log(
    "usage: node twitter-imagedl.js <option> <args>\n",
    "  option/args:\n",
    "  - getimages <screen_name>: gets images from specified user's timeline\n",
  );
}

const main = async () => {
  let myArgs = process.argv.slice(2);
  // console.log('myArgs: ', myArgs);

  if (myArgs.length === 0) {
    printUsage();
  } else {
    if (myArgs.length === 2 && myArgs[0].toLowerCase() === "getimages") {
      const dl = new TwitterImageDownloader(myArgs[1]);
      await dl.getUserImages();
    }
    else {
      printUsage();
    }
  }
}

main();

