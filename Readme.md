# Twitter Image Downloader
A simple utility that downloads images from the specified Twitter user.<br><br>
Some quirks:
- It will attempt to download all of the user's posted images to the extent that it can. No parameter is there for specifying the number of images you wish to get.
- It downloads the "original" version of the image.
- It keeps track of the most recent tweet of the user the utility crawled through, so that for subsequent download sessions it avoids unnecessary API calls.

# Usage
```sh
# command format and example output
> node twitter-imagedl.js <screen_name>
retrieved URL of 42 images. Downloading now.
Downloaded 5 of 42 images...
```

Downloaded images and metadata are included in `/downloaded_images/`.

# Prerequisites

## Token
You will need a [Twitter developer account](https://developer.twitter.com/).

Enter the token information of the developer app in the file `token.json` with the following format:

```json
{
    "consumer_key": "<key>",
    "consumer_secret": "<secret>",
    "token": "<token>",
    "token_secret": "<token_secret>"
}
```

## Node packages
This project uses these external packages:

- [oauth-1.0a](https://www.npmjs.com/package/oauth-1.0a)
- [axios](https://www.npmjs.com/package/axios)

# Limitation
## Range of obtainable images
Twitter API only allows retrieval of up to the most recent 3200 tweets (and RTs) of a specified user.<br>
[GET statuses/user_timeline](https://developer.twitter.com/en/docs/twitter-api/v1/tweets/timelines/api-reference/get-statuses-user_timeline)
>This method can only return up to 3,200 of a user's most recent Tweets. Native retweets of other statuses by the user is included in this total, regardless of whether include_rts is set to false when requesting this resource.

Because of this, if the specified user has over 3200 tweets (and RTs), and additional tweets and media are out of reach, you are not able to obtain *all* of the images that user has posted.

## Screen name changes of user
Specified users may change their screen name between occasions of download sessions using this tool. Consistency of the targeted user can theoretically be tracked using the "User ID" of the Twitter API, but this tool does not take such scenarios into account (as screen names are easier to understand from a user's perspective). <br>
As such, if multiple occasions of image download are run towards an account *whose screen name has changed in the meanwhile*, duplicates in downloaded images may exist. 