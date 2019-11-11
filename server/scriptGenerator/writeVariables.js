const path = require('path');
const fs = require('fs');

function writeVariables(data) {
  console.log(data);
  let startDate = formatDate(data.startDate);
  let endDate = formatDate(data.endDate);
  let scriptVariables = `settarget webvertica;`
  scriptVariables = scriptVariables + `\nmeta SET SessDateFilter = (sessionstartDate between '${startDate}' and '${endDate}');`
  if (data.testID) scriptVariables = scriptVariables + `\nmeta SET testFilter = (${data.testID});`;
  if (data.platforms.length > 0) scriptVariables = scriptVariables + `\nmeta SET platformFilter = (${data.platforms});`;
  if (data.stores.length > 0) scriptVariables = scriptVariables + `\nmeta SET storeFilter = (${data.stores});`
  if (data.devices.length > 0) scriptVariables = scriptVariables + `\nmeta SET deviceFilter = (${data.devices});`;
  if (data.OS.length > 0) scriptVariables = scriptVariables + `\nmeta SET osFilter = (${data.OS});`;
  scriptVariables = scriptVariables + `\n\nBEGIN;\n\n`;

  fs.writeFileSync(path.join(__dirname, '/testing.sql'), scriptVariables, err => {
    if (err) {
      console.log(`Error writing script variables: `, err);
    };
  });
};

function formatDate(date) {
  let year = date.slice(0, 4);
  let month = date.slice(5, 7);
  let day = date.slice(8, 10);
  return `${year}-${month}-${day}`;
};

module.exports = writeVariables;