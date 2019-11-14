const path = require('path');
const fs = require('fs');
// const MbScriptBody = require('./MbScriptBody.txt');

function writeMbScript() {

  fs.appendFileSync(path.join(__dirname, '/testing.sql'), path.join(__dirname, '/'), err => {
    console.log(`Error writing MbScript: `, err);
  });
};

module.exports = writeMbScript;