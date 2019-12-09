function writeScript2(data) {
  return new Promise((resolve, reject) => {
    let script = `/* Page View Set */----------------------------------------------------------------------------------
DROP TABLE IF EXISTS tmpPageViewSet; 
CREATE LOCAL TEMPORARY TABLE tmpPageViewSet ON COMMIT PRESERVE ROWS AS /*+ direct */
SELECT
  a.SessionStartDate
  ,a.Event_SoID
  ,a.Event_SessionKey
  ,c.Event_PrSKU
  ,c.DeviceGuidHash
  ,c.SessionRankNoModals
  ,c.PageRequestTransactionID
  ,c.ClickLocation
  ,a.TestGroupName
  ,a.isControlGroup
FROM csn_junk.tblSess_${data.initials || 'noInitials'}_${data.testName || 'noTestName'} AS a
LEFT JOIN csn_warp.tblPDP_PageView AS c
  ON a.SessionStartDate = c.SessionStartDate
  AND a.event_soid = c.event_soid
  AND a.event_sessionkey = c.event_sessionkey
ORDER BY 1,2,3,4
Encoded BY
  SessionStartDate ENCODING RLE,
  Event_SoID ENCODING RLE
SEGMENTED BY 
  hash(Event_SessionKey) ALL NODES
;
SELECT ANALYZE_STATISTICS('tmpPageViewSet');

-- Aggregate Session table to PV Level -------------------------
-- Only used in final join
DROP TABLE IF EXISTS tmpProductViewSet; 
CREATE LOCAL TEMPORARY TABLE tmpProductViewSet ON COMMIT PRESERVE ROWS AS /*+ direct */
SELECT
  SessionStartDate
  ,Event_SoID
  ,Event_SessionKey
  ,Event_PrSKU
  ,TestGroupName
  ,isControlGroup
/* PDP NAVIGATION ARRIVAL FLAGS GO HERE */ --<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
  --None relevant to this test
FROM tmpPageViewSet
INNER JOIN csn_warp.tblPDP_ProductView AS b
  ON a.SessionStartDate = b.SessionStartDate
  AND a.event_soid = b.event_soid
  AND a.event_sessionkey = b.event_sessionkey
  AND a.Event_PrSKU = b.Event_PrSKU
GROUP BY 1,2,3,4,5,6
ORDER BY 1,2,3,4
Encoded BY
  SessionStartDate ENCODING RLE,
  Event_SoID ENCODING RLE
SEGMENTED BY 
  hash(Event_SessionKey) ALL NODES
;
SELECT ANALYZE_STATISTICS('tmpProductViewSet');

-- Capture Following Page ClickLocations -----------------------
DROP TABLE IF EXISTS tmpClickThroughFlags; 
CREATE LOCAL TEMPORARY TABLE tmpClickThroughFlags ON COMMIT PRESERVE ROWS AS /*+ direct */
SELECT
  a.SessionStartDate
  ,a.Event_SoID
  ,a.Event_SessionKey
  ,a.Event_PrSKU
  ,a.DeviceGuIDHash
  ,a.PageRequestTransactionID
/* ADD CLICKLOCATION CONDITIONS YOU WANT TO ATTRIBUTE TO THE PRIOR PDP PAGE HERE */ --<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
${data.ClickLocation ? renderTracking(data.ClickLocation, 'clicklocation').join('') : '  --No ClickLocation tracking submitted'}
FROM tmpPageViewSet AS a
INNER JOIN csn_clickstream.tblDashClicks_Data AS b
  ON a.SessionStartDate = b.SessionStartDate
  AND a.event_soid = b.event_soid
  AND a.event_sessionkey = b.event_sessionkey
  AND a.SessionRankNoModals = b.NavigationPriorRank
  AND b.ModalClick = 0
GROUP BY 1,2,3,4,5,6
ORDER BY 1,2,3,4,5,6
Encoded BY
  SessionStartDate ENCODING RLE,
  Event_SoID ENCODING RLE
SEGMENTED BY 
  hash(Event_SessionKey) ALL NODES
;
SELECT ANALYZE_STATISTICS('tmpClickThroughFlags');

-- Capture PDP Click Engagement -----------------------
DROP TABLE IF EXISTS tmpEventTypeFlags; 
CREATE LOCAL TEMPORARY TABLE tmpEventTypeFlags ON COMMIT PRESERVE ROWS AS /*+ direct */
SELECT
  a.SessionStartDate
  ,a.Event_SoID
  ,a.Event_SessionKey
  ,a.Event_PrSKU
/* ADD EVENTTYPE CONDITIONS YOU WANT TO ATTRIBUTE TO THE CURRENT PDP PAGE HERE */ --<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
${data.WebAction ? renderTracking(data.WebAction, 'eventtype').join(''): '  --No WebAction tracking submitted'}
FROM tmpPageViewSet AS a
INNER JOIN csn_clickstream.tblDashClicks_Data AS b
  ON a.SessionStartDate = b.SessionStartDate
  AND a.event_soid = b.event_soid
  AND a.event_sessionkey = b.event_sessionkey
  AND a.PageRequestTransactionID = b.PageRequestTransactionID
GROUP BY 1,2,3,4
ORDER BY 1,2,3,4
Encoded BY
  SessionStartDate ENCODING RLE,
  Event_SoID ENCODING RLE
SEGMENTED BY 
  hash(Event_SessionKey) ALL NODES
;
SELECT ANALYZE_STATISTICS('tmpEventTypeFlags');


-- Capture PDP InView Engagement -----------------------
DROP TABLE IF EXISTS tmpInViewFlags; 
CREATE LOCAL TEMPORARY TABLE tmpInViewFlags ON COMMIT PRESERVE ROWS AS /*+ direct */
SELECT
  a.SessionStartDate
  ,a.Event_SoID
  ,a.Event_SessionKey
  ,a.Event_PrSKU
  /* INVIEW EVENTS */
${data.InView ? renderTracking(data.InView, 'clicklocation').join('') : '  --No InView tracking submitted'}
FROM tmpPageViewSet a
LEFT JOIN csn_scribedash.tblScribeInView AS b
  ON b.EventDate between a.SessionStartDate and a.SessionStartDate + 1
  AND a.event_soid = b.StoreID
  AND a.DeviceGuIDHash = b.DeviceGuIDHash
  AND a.PageRequestTransactionID = b.PageRequestTransactionID
GROUP BY 1,2,3,4
ORDER BY 1,2,3,4
Encoded BY
  SessionStartDate ENCODING RLE,
  Event_SoID ENCODING RLE
SEGMENTED BY 
  hash(Event_SessionKey) ALL NODES
;
SELECT ANALYZE_STATISTICS('tmpInViewFlags');


-- Capture Sandbox Tracking of Interest ------------------------
-- DROP TABLE IF EXISTS tmpSandboxFilter; 
-- CREATE LOCAL TEMPORARY TABLE tmpSandboxFilter ON COMMIT PRESERVE ROWS AS /*+ direct */
-- SELECT
-- 	 a.SessionStartDate
-- 	,a.Event_SoID
-- 	,a.Event_SessionKey
-- 	,a.Event_PrSKU
-- 	,a.PageRequestTransactionID
-- 	,b.SandboxEventName
-- 	,b.SandboxEventValues
-- FROM tmpPageViewSet AS a
-- INNER JOIN csn_scribedash.tblScribeSandbox AS b
-- 		ON  b.EventDate BETWEEN a.SessionStartDate AND a.Sessionstartdate + 1 
-- 		AND a.Event_SoID = b.StoreID 
-- 		AND a.DeviceGuIDHash = b.DeviceGuIDHash
-- 		AND a.PageRequestTransactionID = b.PageRequestTransactionID
-- /* FILTER TO SANDBOX EVENTS OF INTEREST HERE */ --<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
-- WHERE b.SandboxEventName LIKE 'PDP_MORELIKETHISTAGS%'
-- ORDER BY 1,2,3,4
-- Encoded BY
-- 	SessionStartDate ENCODING RLE,
-- 	Event_SoID ENCODING RLE
-- SEGMENTED BY 
-- 	hash(Event_SessionKey) ALL NODES
-- ;
-- SELECT ANALYZE_STATISTICS('tmpSandboxFilter');

/* CUSTOM SCRIPT TO INCORPORATE SANDBOX TRACKING HERE */ --<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
--FINAL TABLE SHOULD BE NAMED tmpSandboxFlags
-- DROP TABLE IF EXISTS tmpSandboxFlags; 
-- CREATE LOCAL TEMPORARY TABLE tmpSandboxFlags ON COMMIT PRESERVE ROWS AS /*+ direct */
-- SELECT
-- 	 SessionStartDate
-- 	,Event_SoID
-- 	,Event_SessionKey
-- 	,Event_PrSKU
-- 	,MAX(CASE WHEN SandboxEventName = 'PDP_MORELIKETHISTAGS_50INVIEW' THEN 1 ELSE 0 END) AS FeatureInView
-- FROM tmpSandboxFilter
-- GROUP BY 1,2,3,4
-- ORDER BY 1,2,3,4
-- Encoded BY
-- 	SessionStartDate ENCODING RLE,
-- 	Event_SoID ENCODING RLE
-- SEGMENTED BY 
-- 	hash(Event_SessionKey) ALL NODES
-- ;
-- SELECT ANALYZE_STATISTICS('tmpSandboxFlags');

-- FINAL TABLE JOIN PV ---------------------------------------
DROP TABLE IF EXISTS tmpProductViewBehavior; 
CREATE LOCAL TEMPORARY TABLE tmpProductViewBehavior ON COMMIT PRESERVE ROWS AS /*+ direct */
SELECT
    a.SessionStartDate
  ,a.Event_SoID
  ,a.Event_SessionKey
  ,a.Event_PrSKU
  ,a.TestGroupName
  ,a.isControlGroup
  ,pv.PlatformID
  ,pv.VisitorTypeID
/* CUSTOM TEST FLAGS HERE */ --<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
${data.ClickLocation ? renderPVFlags(data.ClickLocation, 'cl').join('') : '-- No InView tracking submitted'}
${data.WebAction ? renderPVFlags(data.WebAction, 'et').join('') : '-- No WebAction tracking submitted'}
${data.InView ? renderPVFlags(data.InView, 'iv').join('') : '-- No InView tracking submitted'}
/* catch all flags */
 -- *flag logic TBD*
/* OTHER PDP FLAGS HERE */ --<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
  ,pv.ProductAddToCart
  ,pv.ProductPlacedOrder
  ,pv.HasWaymore
  ,pv.EngageCompare
  ,pv.SawCUB
  ,pv.EngageCUB
  ,pv.EngageWeights_and_Dimensions
  ,pv.EngageReviews
FROM tmpProductViewSet AS a
INNER JOIN csn_warp.tblPDP_ProductView AS pv -- filter exclusively to SKUs with Waymore
  ON a.SessionStartDate = pv.SessionStartDate
  AND a.Event_SoID = pv.Event_SoID
  AND a.Event_SessionKey = pv.Event_SessionKey
  AND a.Event_PrSKU = pv.Event_PrSKU
LEFT JOIN tmpClickThroughFlags AS cl
  ON a.SessionStartDate = cl.SessionStartDate
  AND a.Event_SoID = cl.Event_SoID
  AND a.Event_SessionKey = cl.Event_SessionKey
  AND a.Event_PrSKU = cl.Event_PrSKU
LEFT JOIN tmpEventTypeFlags AS et
  ON a.SessionStartDate = et.SessionStartDate
  AND a.Event_SoID = et.Event_SoID
  AND a.Event_SessionKey = et.Event_SessionKey
  AND a.Event_PrSKU = et.Event_PrSKU
LEFT JOIN tmpInViewFlags AS iv
  ON a.SessionStartDate = iv.SessionStartDate
  AND a.Event_SoID = iv.Event_SoID
  AND a.Event_SessionKey = iv.Event_SessionKey
  AND a.Event_PrSKU = iv.Event_PrSKU
-- LEFT JOIN tmpSandboxFlags AS sb
-- 	ON a.SessionStartDate = sb.SessionStartDate
-- 	AND a.Event_SoID = sb.Event_SoID
-- 	AND a.Event_SessionKey = sb.Event_SessionKey
-- 	AND a.Event_PrSKU = sb.Event_PrSKU	
ORDER BY 1,2,3,4
Encoded BY
  SessionStartDate ENCODING RLE,
  Event_SoID ENCODING RLE
SEGMENTED BY 
  hash(Event_SessionKey) ALL NODES
;
SELECT ANALYZE_STATISTICS('tmpProductViewBehavior');

-- FINAL SESSION TABLE --------------------------------------
DROP TABLE IF EXISTS tmpSessionBehavior; 
CREATE LOCAL TEMPORARY TABLE tmpSessionBehavior ON COMMIT PRESERVE ROWS AS /*+ direct */
SELECT
  SessionStartDate
  ,Event_SoID
  ,Event_SessionKey
  ,TestGroupName
  ,isControlGroup
  ,PlatformID
  ,VisitorTypeID
/* UNIVERSAL FLAGS HERE */ --<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
  ,COUNT(*) AS PVcnt
/* CUSTOM TEST FLAGS HERE */ --<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
${data.ClickLocation ? renderSessFlags(data.ClickLocation).join('') : '-- No InView tracking submitted'}
${data.WebAction ? renderSessFlags(data.WebAction).join('') : '-- No WebAction tracking submitted'}
${data.InView ? renderSessFlags(data.InView).join('') : '-- No InView tracking submitted'}
/* OTHER PDP FLAGS HERE */ --<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
  ,MAX(ProductAddToCart) AS ProductAddToCart
  ,MAX(ProductPlacedOrder) AS ProductPlacedOrder
  ,MAX(HasWaymore) AS HasWaymore
  ,MAX(EngageCompare) AS EngageCompare
  ,MAX(SawCUB) AS SawCUB
  ,MAX(EngageCUB) AS EngageCUB
  ,MAX(EngageWeights_and_Dimensions) AS EngageWeights_and_Dimensions
  ,MAX(EngageReviews) AS EngageReviews
FROM tmpProductViewBehavior AS a
GROUP BY 1,2,3,4,5,6,7
ORDER BY 1,2,3,4
Encoded BY
  SessionStartDate ENCODING RLE,
  Event_SoID ENCODING RLE
SEGMENTED BY 
  hash(Event_SessionKey) ALL NODES
;
SELECT ANALYZE_STATISTICS('tmpSessionBehavior');


/* ADD AGGREGATION METRICS BELOW AS SUM() */ --<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
-- Summary TABLE Exports -------------------------------------
--General Engagement Session
SELECT csn_warp.fntblplwebstore(Event_SoID) AS Store
  ,csn_warp.fntblPlPlatform(PlatformID) AS Platform
  ,csn_warp.fntblplVisitorType(VisitorTypeID) AS VisitorType
  ,TestGroupName
  ,COUNT(*) AS Cnt
  ,SUM(PVcnt) AS PVcnt
${data.ClickLocation ? renderAggregation(data.ClickLocation).join('') : '-- No InView tracking submitted'}
${data.WebAction ? renderAggregation(data.WebAction).join('') : '-- No WebAction tracking submitted'}
${data.InView ? renderAggregation(data.InView).join('') : '-- No InView tracking submitted'}
  ,SUM(ProductAddToCart) AS ProductAddToCart
  ,SUM(ProductPlacedOrder) AS ProductPlacedOrder
  ,SUM(HasWaymore) AS HasWaymore
  ,SUM(EngageCompare) AS EngageCompare
  ,SUM(SawCUB) AS SawCUB
  ,SUM(EngageCUB) AS EngageCUB
  ,SUM(EngageWeights_and_Dimensions) AS EngageWeights_and_Dimensions
  ,SUM(EngageReviews) AS EngageReviews
FROM tmpSessionBehavior
GROUP BY 1,2,3,4
ORDER BY 1,2,3,4
;


--General Engagement PV
SELECT csn_warp.fntblplwebstore(Event_SoID) AS Store
  ,csn_warp.fntblPlPlatform(PlatformID) AS Platform
  ,csn_warp.fntblplVisitorType(VisitorTypeID) AS VisitorType
  ,TestGroupName
  ,COUNT(*) AS Cnt
${data.ClickLocation ? renderAggregation(data.ClickLocation).join('') : '-- No InView tracking submitted'}
${data.WebAction ? renderAggregation(data.WebAction).join('') : '-- No WebAction tracking submitted'}
${data.InView ? renderAggregation(data.InView).join('') : '-- No InView tracking submitted'}
  ,SUM(ProductAddToCart) AS ProductAddToCart
  ,SUM(ProductPlacedOrder) AS ProductPlacedOrder
  ,SUM(HasWaymore) AS HasWaymore
  ,SUM(EngageCompare) AS EngageCompare
  ,SUM(SawCUB) AS SawCUB
  ,SUM(EngageCUB) AS EngageCUB
  ,SUM(EngageWeights_and_Dimensions) AS EngageWeights_and_Dimensions
  ,SUM(EngageReviews) AS EngageReviews
FROM tmpProductViewBehavior
GROUP BY 1,2,3,4
ORDER BY 1,2,3,4
;
`
  resolve(script);
  });
};

function renderTracking(trackingData, column) {
    let arr = trackingData.split(",").map(elem => {
      if (elem.includes('%'))
        return `  ,MAX(CASE WHEN b.${column} LIKE '${elem}' THEN 1 ELSE 0 END) AS f${elem.toLowerCase()}\n`;
      else
        return `  ,MAX CASE WHEN b.${column} = '${elem}' THEN 1 ELSE 0 END) AS f${elem.toLowerCase()}\n`;
    });
    let lastElem = arr.pop().replace('\n', '');
    arr.push(lastElem);
    return arr;
};

function renderPVFlags(trackingData, prefix) {
  let arr = trackingData.split(",").map(elem => {
      return `  ,${prefix}.f${elem.toLowerCase()}\n`;
  });
  let lastElem = arr.pop().replace('\n', '');
  arr.push(lastElem);
  return arr;
};

function renderSessFlags(trackingData) {
  let arr = trackingData.split(",").map(elem => {
    return `  ,MAX(f${elem.toLowerCase()}) AS f${elem.toLowerCase()}\n`;
  });
  let lastElem = arr.pop().replace('\n', '');
  arr.push(lastElem);
  return arr;
};

function renderAggregation(trackingData) {
  let arr = trackingData.split(",").map(elem => {
    return `  ,SUM(f${elem.toLowerCase()}) AS f${elem.toLowerCase()}\n`;
  });
  let lastElem = arr.pop().replace('\n', '');
  arr.push(lastElem);
  return arr;
};

module.exports = writeScript2;