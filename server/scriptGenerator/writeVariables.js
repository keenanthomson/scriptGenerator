const path = require('path');
const fs = require('fs');

function writeVariableData(data) {
  let startDate = formatDate(data.startDate);
  let endDate = formatDate(data.endDate);
  let script = `settarget webvertica;`
  script = script + `\nmeta SET SessDateFilter = (sessionstartDate between '${startDate}' and '${endDate}');`
  if (data.testID) script = script + `\nmeta SET testFilter = (${data.testID});`;
  if (data.platforms.length > 0) script = script + `\nmeta SET platformFilter = (${data.platforms});`;
  if (data.stores.length > 0) script = script + `\nmeta SET storeFilter = (${data.stores});`
  if (data.devices.length > 0) script = script + `\nmeta SET deviceFilter = (${data.devices});`;
  if (data.OS.length > 0) script = script + `\nmeta SET osFilter = (${data.OS});`;
  script = script + `\nmeta SET matchbackDays = 14;`;
  script = script + `\nmeta SET tblMbOutcomes = csn_junk.tblMb14Day_${data.initials || 'noInitials'}_${data.testName || 'noTestName'};`;
  script = script + `\nmeta SET tblSessOutcomes = csn_junk.tblSess_${data.initials || 'noInitials'}_${data.testName || 'noTestName'};`;
  script = script + `\nmeta SET tblGRSVCD_store = csn_junk.tblGRSVCDstore_${data.initials || 'noInitials'}_${data.testName || 'noTestName'};`;
  script = script + `\nmeta SET tblGRSVCD_storeXvisitor = csn_junk.tblGRSVCDstoreXvisitor_${data.initials || 'noInitials'}_${data.testName || 'noTestName'};`;
  script = script + `\n\nBEGIN;\n\n`;
  script = script + `
DROP TABLE IF EXISTS tmpSessionSet; 
CREATE LOCAL TEMPORARY TABLE tmpSessionSet ON COMMIT PRESERVE ROWS AS /*+ direct */
SELECT
  a.SessionStartDate
  ,a.Event_SoID
  ,a.Event_SessionKey
  ,a.TestGroupName
  ,a.ControlGroup AS isControlGroup
  ,a.CuID
  ,MIN(a.Event_Timestamp) AS MinTimeStamp
FROM csn_clickstream.tblDashClicks_Libra AS a
INNER JOIN csn_warp.tblPDP_ProductView AS b
  ON a.SessionStartDate = b.SessionStartDate
  AND a.Event_SoID = b.Event_SoID
  AND a.Event_SessionKey = b.Event_SessionKey
  AND a.Event_PrSKU = b.Event_PrSKU
WHERE ${renderConditionals(data)}
  AND a.ModalClick = 0 --Do not need individual eventTypes
  AND a.Event_Pagetype IN (
    'PRODUCTSIMPLESKU'
    ,'PRODUCTSIMPLESKUPDX'
    ,'PRODUCTOPTIONSKU'
    ,'PRODUCTOPTIONSKUPDX'
    ,'PRODUCTKIT'
    ,'PRODUCTKITPDX'
    ,'SALECLEARANCEPRODUCTPAGE'
    ,'SALECLEARANCEPRODUCTPAGEPDX'
    ,'DAILYSALESPRODUCTPAGE')
  AND a.VisitHasLibraAction = 1
GROUP BY 1,2,3,4,5,6
ORDER BY 1,2,3,4
Encoded BY
  SessionStartDate ENCODING RLE,
  Event_SoID ENCODING RLE
SEGMENTED BY 
  hash(Event_SessionKey) ALL NODES
;
SELECT ANALYZE_STATISTICS('tmpSessionSet');
`

  fs.writeFile(path.join(__dirname, '/testing.sql'), script, err => {
    if (err) {
      console.log(`Error writing script variables: `, err);
    }
  });
};

function formatDate(date) {
  let year = date.slice(0, 4);
  let month = date.slice(5, 7);
  let day = date.slice(8, 10);
  return `${year}-${month}-${day}`;
};

function renderConditionals(data) {
  let script = `{{SessDateFilter}}`;
  if (data.testID) script = script + `\n  AND a.TestID IN {{ testFilter }}`;
  if (data.platforms.length > 0) script = script + `\n  AND b.PlatformID IN {{platformFilter}}`;
  if (data.stores.length > 0) script = script + `\n  AND a.Event_SoID IN {{soidFilter}}`;
  if (data.devices.length > 0) script = script + `\n  AND b.DeviceTypeID IN {{deviceFilter}}`;
  // if (data.OS.length > 0) script = script + `\n  AND **PENDING**`
  return script;
}

module.exports = writeVariableData;