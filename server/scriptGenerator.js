const path = require('path');
const fs = require('fs');

function scriptGenerator(data) {

  let startDate = formatDate(data.startDate);
  let endDate = formatDate(data.endDate);
  let testID = data.testID;

  let scriptVariables = 

  // console.log(`Start Date: `, data.startDate);

  fs.writeFile(path.join(__dirname, '/testing.sql'), `test test`, err => {
    if (err) {
      console.log(`Error: `, err);
    };
  });
};

function formatDate(date) {
  let year = date.slice(0, 4);
  let month = date.slice(5, 7);
  let day = date.slice(8, 10);
  return `${year}-${month}-${day}`;
};

module.exports = scriptGenerator;