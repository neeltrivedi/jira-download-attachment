const fs = require('fs');
const request = require('request')
const bluebird = require('bluebird');
const path = require('path');


function getAttachments(issues, config) {
 const dataPath = path.join(__dirname, "data");
  const username = config.user,
    password = config.password,
    auth = "Basic " + new Buffer(username + ":" + password).toString("base64");

  const allAttachmentsToDownload = [];
  for (let issue of issues) {
    if (!fs.existsSync(`${dataPath}/${issue.key}`)) {
      fs.mkdirSync(`${dataPath}/${issue.key}`);
    }
    const directorypath = `${dataPath}/${issue.key}`;
    for (let attachment of issue.fields.attachment) {
      allAttachmentsToDownload.push({
        attachment,
        auth,
        directorypath
      });
    }
  }


  return bluebird.map(allAttachmentsToDownload, (attachmentToDownload) => {
    return downloadAttachment(attachmentToDownload)
  }, {
    concurrency: 5
  });


}

function downloadAttachment(attachmentToDownload) {
  const {
    attachment,
    auth,
    directorypath
  } = attachmentToDownload;
  // console.log(`Downloading ${attachment.filename}...`);
  return new Promise((resolve, reject) => {
    const url = attachment.content;
    request({
          url,
          headers: {
            "Authorization": auth
          }
        },
        () => {
          // response.pipe(file);
          console.log(`Downloaded ${url}`);
          // Do more stuff with 'body' here
        }
      )
      .on('error', (error) => {
        console.error(`Error downloading ${url}`, error);
        resolve(false)
      })
      .pipe(fs.createWriteStream(`${directorypath}/${attachment.filename}`))
      .on('error', reject)
      .on('finish', () => {
        resolve({
          converted: true
        });
      })
  });
}



module.exports = getAttachments;
