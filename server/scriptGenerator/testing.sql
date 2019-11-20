settarget webvertica;
meta SET SessDateFilter = (sessionstartDate between '2019-10-31' and '2019-11-14');
meta SET matchbackDays = 14;
meta SET tblMbOutcomes = csn_junk.tblMb14Day_noInitials_noTestName;
meta SET tblSessOutcomes = csn_junk.tblSess_noInitials_noTestName;
meta SET tblGRSVCD_store = csn_junk.tblGRSVCDstore_noInitials_noTestName;
meta SET tblGRSVCD_storeXvisitor = csn_junk.tblGRSVCDstoreXvisitor_noInitials_noTestName;

BEGIN;


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
WHERE {{SessDateFilter}}
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

/* MATCHBACK BREAKPOINT IDENTIFICATION */--------------------------------------------------------------------------------
-- Keeps stores independent of one another
-- Identify breakpoints between customer sessions
DROP TABLE IF EXISTS tmpMatchbackBreakpoint; 
CREATE LOCAL TEMPORARY TABLE tmpMatchbackBreakpoint ON COMMIT PRESERVE ROWS AS /*+ direct */
SELECT Event_SoID
	,CuID
	,MinTimeStamp
	,SessionStartDate
	,Event_SessionKey
	,TestGroupName
	,isControlGroup
	,CASE WHEN SessionStartDate > 
		ISNULL(LAG(SessionStartDate, 1, NULL) OVER (PARTITION BY Event_SoID, CuID ORDER BY MinTimeStamp ASC), SessionStartDate) + {{ matchbackDays }}
		THEN 0 END AS BreakPoint --Establishes independance by store
FROM tmpSessionSet
ORDER BY 1,2,3
Encoded BY
	SessionStartDate ENCODING RLE,
	Event_SoID ENCODING RLE
SEGMENTED BY 
	hash(Event_SessionKey) ALL NODES
;
SELECT ANALYZE_STATISTICS('tmpMatchbackBreakpoint');

--Produce Matchback Period ID by cumulative count of matchback breakpoints
--Maintain Session Level table for easy join
DROP TABLE IF EXISTS tmpMbSessLookup; 
CREATE LOCAL TEMPORARY TABLE tmpMbSessLookup ON COMMIT PRESERVE ROWS AS /*+ direct */
SELECT SessionStartDate
	,Event_SoID
	,Event_SessionKey
	,count(BreakPoint) OVER (PARTITION BY Event_SoID, CuID ORDER BY MinTimeStamp ASC) AS BreakPointCount --Cumulative count of breakpoints
	,MinTimeStamp
	,CuID
	,TestGroupName
	,isControlGroup
FROM tmpMatchbackBreakpoint
ORDER BY 1,2,3
Encoded BY
	SessionStartDate ENCODING RLE,
	Event_SoID ENCODING RLE
SEGMENTED BY 
	hash(Event_SessionKey) ALL NODES
;
SELECT ANALYZE_STATISTICS('tmpMbSessLookup');

/* PDP SESSION ADDITIONS */--------------------------------------------------------------------------------
--Pull in supplimental session level segment information 
DROP TABLE IF EXISTS tmpSessOutcomes; 
CREATE LOCAL TEMPORARY TABLE tmpSessOutcomes ON COMMIT PRESERVE ROWS AS /*+ direct */
SELECT a.SessionStartDate
	,a.Event_SoID
	,a.Event_SessionKey
	,HASH(a.Event_SoId, a.CuID, a.BreakPointCount) AS MbId
	,a.BreakPointCount + 1 AS MbRank -- Change Index to start at 1 instead of 0
	,ROW_NUMBER() OVER (PARTITION BY a.Event_SoID, a.CuID, a.BreakPointCount ORDER BY a.MinTimeStamp ASC) AS MbSessionRank --Identify first Session of matchback period
	,a.CuID
	,a.TestGroupName
	,a.isControlGroup
	,b.VisitorTypeID
	,b.MarketingVisitorTypeID
	,b.PlatformID
	,b.DeviceTypeID
	,b.OperatingSystemID
	,b.BrowserID
	,b.Channel
	,b.B2BSession
	,b.ProductAddToCart
	,b.ProductPlacedOrder
	,b.PDPExit
	,NVL(b.GrossRevenueStable,0)::FLOAT AS GrossRevenueStable
FROM tmpMbSessLookup AS a
INNER JOIN csn_warp.tblPDP_Session AS b --Do not do this join earlier as it requires more fields in the group by statements
	ON a.SessionStartDate = b.SessionStartDate
	AND a.Event_SoID = b.Event_SoId
	AND a.Event_SessionKey = b.Event_SessionKey
ORDER BY 1,2,3
Encoded BY
	SessionStartDate ENCODING RLE,
	Event_SoID ENCODING RLE
SEGMENTED BY 
	hash(Event_SessionKey) ALL NODES
;
SELECT ANALYZE_STATISTICS('tmpSessOutcomes');

/* MATCHBACK FACT TABLE */--------------------------------------------------------------------------------
--Aggregate to Matchback Granularity
--Remove Matchback that experience multiple test groups
DROP TABLE IF EXISTS tmpMatchbackRollup;
CREATE LOCAL TEMPORARY TABLE tmpMatchbackRollup ON COMMIT PRESERVE ROWS AS /*+ direct */
SELECT Event_SoID
	,CuID
	,MbId
	,MAX(CASE WHEN MbSessionRank = 1 THEN Event_SessionKey ELSE NULL END) AS Mb_FirstSessionKey --Single value per MbId where MbSessionRank = 1
	,MAX(TestGroupName) AS TestGroupName --Required because matchback group could experience multiple variations by accident; if multple then removed in HAVING clause
	,MAX(isControlGroup) AS isControlGroup --Required because matchback group could experience multiple variations by accident; if multple then removed in HAVING clause
	,MIN(SessionStartDate) AS MinSessionStartDate
	,MAX(SessionStartDate) AS MaxSessionStartDate
FROM tmpSessOutcomes
GROUP BY 1,2,3
HAVING COUNT(DISTINCT TestGroupName) = 1 --Remove Matchback periods with experiences in multiple test groups
ORDER BY 1,2,3
Encoded BY
	Event_SoID ENCODING RLE
	,CuID ENCODING RLE
SEGMENTED BY 
	hash(MbId) ALL NODES
;
SELECT ANALYZE_STATISTICS('tmpMatchbackRollup');

-- All Sessions by Cu near matchback group
DROP TABLE IF EXISTS tmpMbOutcomes;
CREATE LOCAL TEMPORARY TABLE tmpMbOutcomes ON COMMIT PRESERVE ROWS AS /*+ direct */
--explain
SELECT a.Event_SoID
	,a.CuID
	,a.MbId
	,MAX(a.Mb_FirstSessionKey) AS Mb_FirstSessionKey
	,MAX(a.TestGroupName) AS TestGroupName
	,MAX(a.isControlGroup) AS isControlGroup
	,MIN(a.MinSessionStartDate) AS MinSessionStartDate
	,MAX(a.MaxSessionStartDate) AS MaxSessionStartDate
	,MAX(b.AddedToCart) AS Mb_AnyStoreATC
	,MAX(b.Converted) AS Mb_AnyStoreCVR
	,MAX(CASE WHEN a.Event_SoID = b.Event_SoID THEN b.AddedToCart ELSE 0 END) AS Mb_SameStoreATC
	,MAX(CASE WHEN a.Event_SoID = b.Event_SoID THEN b.Converted ELSE 0 END) AS Mb_SameStoreCVR
FROM tmpMatchbackRollup AS a
INNER JOIN csn_clickstream.tblDashVisits_data AS b --Need to pull in complete list of sessions for each CuID to determine complete set of sessions
	ON b.SessionStartDate BETWEEN a.MinSessionStartDate AND a.MaxSessionStartDate + {{ matchbackDays }}::INT -- Join table not constrained by test period
	AND a.cuid = b.cuid
	--Exclude store condition to account for cross store conversions
GROUP BY 1,2,3
ORDER BY 1,2,3
Encoded BY
	Event_SoID ENCODING RLE
	,CuID ENCODING RLE
SEGMENTED BY 
	hash(MbId) ALL NODES
;
SELECT ANALYZE_STATISTICS('tmpMbOutcomes');

-- Aggregate Revenue -------------------------------------------------------------------
DROP TABLE IF EXISTS tmpMbOrders;
CREATE LOCAL TEMPORARY TABLE tmpMbOrders ON COMMIT PRESERVE ROWS AS /*+ direct */
--explain
SELECT a.Event_SoID
	,a.MbId
	,b.OrID
FROM tmpMatchbackRollup AS a
INNER JOIN csn_clickstream.tblDashClicks_data AS b --Need to pull in complete list of OrIDs for each CuID to determine entire revenue impact
	ON b.SessionStartDate BETWEEN a.MinSessionStartDate AND a.MaxSessionStartDate + {{ matchbackDays }}::INT -- Join table not constrained by test period
	AND a.cuid = b.cuid
	AND b.OrID IS NOT NULL
	--Exclude store condition to account for cross store conversions
GROUP BY 1,2,3
ORDER BY 1,2,3
Encoded BY
	Event_SoID ENCODING RLE
SEGMENTED BY 
	hash(OrID) ALL NODES
;
SELECT ANALYZE_STATISTICS('tmpMbOrders');

-- Pull in Revenue
DROP TABLE IF EXISTS tmpMbRevenue;
CREATE LOCAL TEMPORARY TABLE tmpMbRevenue ON COMMIT PRESERVE ROWS AS /*+ direct */
--explain
SELECT a.Event_SoID
	,a.MbId
	,SUM(b.GrossRevenueStable) AS GrossRevenueStable
	,SUM(b.ExpectedVariableContribution) AS VariableContribution
FROM tmpMbOrders AS a
INNER JOIN csn_reporting.tblOrderProductMetrics AS b
	ON a.OrID = b.OrID
	--Exclude store condition to account for cross store conversions
GROUP BY 1,2
ORDER BY 1,2
Encoded BY
	Event_SoID ENCODING RLE
SEGMENTED BY 
	hash(MbId) ALL NODES
;
SELECT ANALYZE_STATISTICS('tmpMbRevenue');

-- Assign matchback acquisition characteristics --------------------------------------------
DROP TABLE IF EXISTS {{ tblMbOutcomes }};
CREATE TABLE {{ tblMbOutcomes }} AS /*+ direct */
--explain
SELECT a.MinSessionStartDate
	,a.MaxSessionStartDate
	,a.Event_SoID
	,a.MbId
	,a.CuID
	,a.Mb_FirstSessionKey
	,a.TestGroupName
	,a.isControlGroup
	,a.Mb_AnyStoreATC
	,a.Mb_AnyStoreCVR
	,a.Mb_SameStoreATC
	,a.Mb_SameStoreCVR
	,b.VisitorTypeID
	,NVL(c.GrossRevenueStable,0)::FLOAT AS MB_GrossRevenueStable --Cannot aggregate across stores as revenue is duplicated
	,NVL(c.VariableContribution,0)::FLOAT AS MB_VariableContribution
FROM tmpMbOutcomes AS a
INNER JOIN tmpSessOutcomes AS b
	ON a.MinSessionStartDate = b.SessionStartDate 
	AND a.Event_SoID = b.Event_SoID
	AND a.Mb_FirstSessionKey = b.Event_SessionKey
LEFT JOIN tmpMbRevenue AS c --Left join as not all matchback periods contain an order
	ON a.Event_SoID = c.Event_SoID
	AND a.MbID = c.MbID
ORDER BY 1,2,3,4
Encoded BY
	MinSessionStartDate ENCODING RLE
	,MaxSessionStartDate ENCODING RLE
	,Event_SoID ENCODING RLE
	,CuID ENCODING RLE
SEGMENTED BY 
	hash(MbId) ALL NODES
;
SELECT ANALYZE_STATISTICS('{{ tblMbOutcomes }}');

--------------------------------------------------------------------------------------------------------------
/* Produce Junk Tables to Run GRS/VCD Significance Calcs in Jupyter Test Analyzer */--------------------------

DROP TABLE IF EXISTS tmp30DayGRSVCD;
CREATE LOCAL TEMPORARY TABLE tmp30DayGRSVCD ON COMMIT PRESERVE ROWS AS /*+ direct */
SELECT
	CuID
,	csn_warp.fntblplwebstore(Event_SoID) AS Store
,	TestGroupName
,	isControlGroup
,	VisitorTypeID
,	sum(MB_GrossRevenueStable) GrossRevenueStable
,	sum(MB_VariableContribution) VariableContribution
FROM {{ tblMbOutcomes }}
GROUP BY 1,2,3,4,5
;
SELECT ANALYZE_STATISTICS('tmp30DayGRSVCD');

DROP TABLE IF EXISTS {{ tblGRSVCD_store }};
CREATE TABLE {{ tblGRSVCD_store }} AS /*+ direct */
SELECT
	CuID
,	Store
,	TestGroupName
,	isControlGroup
,	GrossRevenueStable
,	VariableContribution
FROM tmp30DayGRSVCD
where GrossRevenueStable > 0
GROUP BY 1,2,3,4,5,6
;
SELECT ANALYZE_STATISTICS('{{ tblGRSVCD_store }}');

DROP TABLE IF EXISTS {{ tblGRSVCD_storeXvisitor }};
CREATE TABLE {{ tblGRSVCD_storeXvisitor }} AS /*+ direct */
SELECT
	CuID
,	Store
,	TestGroupName
,	isControlGroup
,	csn_warp.fntblplVisitorType(VisitorTypeID) AS VisitorType
,	GrossRevenueStable
,	VariableContribution
FROM tmp30DayGRSVCD
where GrossRevenueStable > 0
GROUP BY 1,2,3,4,5,6,7
;
SELECT ANALYZE_STATISTICS('{{ tblGRSVCD_storeXvisitor }}');

--------------------------------------------------------------------------------------------------------------
/* SESSION LEVEL FACT TABLE */--------------------------------------------------------------------------------
-- Matchback included here for secondary segment KPI calculation
DROP TABLE IF EXISTS {{ tblSessOutcomes }};
CREATE TABLE {{ tblSessOutcomes }} AS /*+ direct */
SELECT a.SessionStartDate
	,a.Event_SoID
	,a.Event_SessionKey
	,a.CuID
	,a.TestGroupName
	,a.isControlGroup
	,a.VisitorTypeID
	,a.MarketingVisitorTypeID
	,a.PlatformID
	,a.DeviceTypeID
	,a.OperatingSystemID
	,a.BrowserID
	,a.Channel
	,a.B2BSession
	,a.ProductAddToCart
	,a.ProductPlacedOrder
	,a.PDPExit
	,a.GrossRevenueStable
	,a.MbId
	,a.MbRank
	,a.MbSessionRank
	,b.Mb_AnyStoreATC
	,b.Mb_AnyStoreCVR
	,b.Mb_SameStoreATC
	,b.Mb_SameStoreCVR
FROM tmpSessOutcomes AS a
LEFT JOIN {{ tblMbOutcomes }} AS b -- Left join because we may drop sessions due to matchback exposure to multiple variations
	ON a.SessionStartDate BETWEEN b.MinSessionStartDate AND b.MaxSessionStartDate 
	AND a.Event_SoID = b.Event_SoID
	AND a.MbId = b.MbId
ORDER BY 1,2,3
Encoded BY
	SessionStartDate ENCODING RLE,
	Event_SoID ENCODING RLE
SEGMENTED BY 
	hash(Event_SessionKey) ALL NODES
;
SELECT ANALYZE_STATISTICS('{{ tblSessOutcomes }}')
;

/* MATCHBACK & SESSION KPI AGGREGATION */--------------------------------------------------------------------------------

--- Aggregate Matchback KPIs ---------------------------------------------------
SELECT
	csn_warp.fntblplwebstore(Event_SoID) AS Store
	,'' AS Platform
	,'' AS Segment
	,TestGroupName
	,COUNT(*) AS Cnt
	,SUM(Mb_AnyStoreATC) AS AddedToCart
	,SUM(Mb_AnyStoreCVR) AS Converted
	,SUM(MB_GrossRevenueStable) AS GrossRevenueStable
	,SUM(MB_VariableContribution) AS VariableContribution
FROM {{ tblMbOutcomes }}
GROUP BY 1,2,3,4
ORDER BY 1,2,3,4
;

SELECT
	csn_warp.fntblplwebstore(Event_SoID) AS Store
	,'' AS Platform
	,'' AS Segment
	,TestGroupName
	,COUNT(*) AS Cnt
	,SUM(Mb_SameStoreATC) AS AddedToCart
	,SUM(Mb_SameStoreCVR) AS Converted
FROM {{ tblMbOutcomes }}
GROUP BY 1,2,3,4
ORDER BY 1,2,3,4
;

SELECT
	csn_warp.fntblplwebstore(Event_SoID) AS Store
	,'' AS Platform
	,csn_warp.fntblplVisitorType(VisitorTypeID) AS Segment
	,TestGroupName
	,COUNT(*) AS Cnt
	,SUM(Mb_AnyStoreATC) AS AddedToCart -- May want to make this same store since visitor type is defined at the store level
	,SUM(Mb_AnyStoreCVR) AS Converted -- May want to make this same store since visitor type is defined at the store level
	,SUM(MB_GrossRevenueStable) AS GrossRevenueStable
	,SUM(MB_VariableContribution) AS VariableContribution
FROM {{ tblMbOutcomes }}
GROUP BY 1,2,3,4
ORDER BY 1,2,3,4
;

SELECT
	csn_warp.fntblplwebstore(Event_SoID) AS Store
	,csn_warp.fntblPlPlatform(PlatformID) AS Platform
	,'' AS Segment
	,TestGroupName
	,COUNT(DISTINCT MbID) AS Cnt
	,COUNT(DISTINCT CASE WHEN Mb_AnyStoreATC = 1 THEN MbID ELSE NULL END) AS AddedToCart
	,COUNT(DISTINCT CASE WHEN Mb_AnyStoreCVR = 1 THEN MbID ELSE NULL END) AS Converted
	-- ,SUM(MB_GrossRevenueStable) AS GrossRevenueStable -- make adjustments in parent tables ^^
	-- ,SUM(MB_VariableContribution) AS VariableContribution
FROM {{ tblSessOutcomes }}
WHERE MbID IS NOT NULL -- Not all sessions are assigned an MbID
GROUP BY 1,2,3,4
ORDER BY 1,2,3,4
;


--Aggregated Session KPIs ----------------------------------------------------------------------
SELECT
	csn_warp.fntblplwebstore(Event_SoID) AS Store
	,csn_warp.fntblPlPlatform(PlatformID) AS Platform
	,'' AS Segment
	,TestGroupName
	,count(*) AS Cnt
	,sum(ProductAddToCart) AS AddedToCart
	,SUM(ProductPlacedOrder) AS PlacedOrder
	,SUM(PDPExit) AS PDPExit
	,SUM(GrossRevenueStable) AS GrossRevenueStable
FROM {{ tblSessOutcomes }}
GROUP BY 1,2,3,4
ORDER BY 1,2,3,4
;

SELECT
	csn_warp.fntblplwebstore(Event_SoID) AS Store
	,csn_warp.fntblPlPlatform(PlatformID) AS Platform
	,csn_warp.fntblplDeviceType(DeviceTypeID)
		AS Segment
	,TestGroupName
	,count(*) AS Cnt
	,sum(ProductAddToCart) AS AddedToCart
	,SUM(ProductPlacedOrder) AS PlacedOrder
	,SUM(PDPExit) AS PDPExit
	,SUM(GrossRevenueStable) AS GrossRevenueStable
FROM {{ tblSessOutcomes }}
GROUP BY 1,2,3,4
ORDER BY 1,2,3,4
;

SELECT
	csn_warp.fntblplwebstore(Event_SoID) AS Store
	,csn_warp.fntblPlPlatform(PlatformID) AS Platform
	,csn_warp.fntblplVisitorType(VisitorTypeID)
		AS Segment
	,TestGroupName
	,count(*) AS Cnt
	,sum(ProductAddToCart) AS AddedToCart
	,SUM(ProductPlacedOrder) AS PlacedOrder
	,SUM(PDPExit) AS PDPExit
	,SUM(GrossRevenueStable) AS GrossRevenueStable
FROM {{ tblSessOutcomes }}
GROUP BY 1,2,3,4
ORDER BY 1,2,3,4
;

SELECT
	csn_warp.fntblplwebstore(Event_SoID) AS Store
	,csn_warp.fntblPlPlatform(PlatformID) AS Platform
	,csn_clickstream.fntblplMarketingVisitorType(MarketingVisitorTypeID)
		AS Segment
	,TestGroupName
	,count(*) AS Cnt
	,sum(ProductAddToCart) AS AddedToCart
	,SUM(ProductPlacedOrder) AS PlacedOrder
	,SUM(PDPExit) AS PDPExit
	,SUM(GrossRevenueStable) AS GrossRevenueStable
FROM {{ tblSessOutcomes }}
GROUP BY 1,2,3,4
ORDER BY 1,2,3,4
;

SELECT
	csn_warp.fntblplwebstore(Event_SoID) AS Store
	,csn_warp.fntblPlPlatform(PlatformID) AS Platform
	,csn_reporting.fndimChannel(Channel)
		AS Segment
	,TestGroupName
	,count(*) AS Cnt
	,sum(ProductAddToCart) AS AddedToCart
	,SUM(ProductPlacedOrder) AS PlacedOrder
	,SUM(PDPExit) AS PDPExit
	,SUM(GrossRevenueStable) AS GrossRevenueStable
FROM {{ tblSessOutcomes }}
GROUP BY 1,2,3,4
ORDER BY 1,2,3,4
;

SELECT
	csn_warp.fntblplwebstore(Event_SoID) AS Store
	,csn_warp.fntblPlPlatform(PlatformID) AS Platform
	,csn_warp.fntblplDeviceType(DeviceTypeID)
		|| ' - ' || csn_warp.fntblplOperatingSystem(OperatingSystemID)
		AS Segment
	,TestGroupName
	,count(*) AS Cnt
	,sum(ProductAddToCart) AS AddedToCart
	,SUM(ProductPlacedOrder) AS PlacedOrder
	,SUM(PDPExit) AS PDPExit
	,SUM(GrossRevenueStable) AS GrossRevenueStable
FROM {{ tblSessOutcomes }}
GROUP BY 1,2,3,4
ORDER BY 1,2,3,4
;

SELECT
	csn_warp.fntblplwebstore(Event_SoID) AS Store
	,csn_warp.fntblPlPlatform(PlatformID) AS Platform
	,csn_warp.fntblplDeviceType(DeviceTypeID)
		|| ' - ' || csn_warp.fntblplbrowser(BrowserID)
		AS Segment
	,TestGroupName
	,count(*) AS Cnt
	,sum(ProductAddToCart) AS AddedToCart
	,SUM(ProductPlacedOrder) AS PlacedOrder
	,SUM(PDPExit) AS PDPExit
	,SUM(GrossRevenueStable) AS GrossRevenueStable
FROM {{ tblSessOutcomes }}
GROUP BY 1,2,3,4
ORDER BY 1,2,3,4
;

SELECT
	csn_warp.fntblplwebstore(Event_SoID) AS Store
	,csn_warp.fntblPlPlatform(PlatformID) AS Platform
	,CASE WHEN B2BSession = 1 THEN 'B2B' ELSE 'B2C' END
		AS Segment
	,TestGroupName
	,count(*) AS Cnt
	,sum(ProductAddToCart) AS AddedToCart
	,SUM(ProductPlacedOrder) AS PlacedOrder
	,SUM(PDPExit) AS PDPExit
	,SUM(GrossRevenueStable) AS GrossRevenueStable
FROM {{ tblSessOutcomes }}
GROUP BY 1,2,3,4
ORDER BY 1,2,3,4
;

/* PRODUCT VIEW LEVEL FACT TABLE */---------------------------------------------------------------------------------
DROP TABLE IF EXISTS tmpProductViewOutcomes; 
CREATE LOCAL TEMPORARY TABLE tmpProductViewOutcomes ON COMMIT PRESERVE ROWS AS /*+ direct */
SELECT
	a.SessionStartDate
	,a.Event_SoID
	,a.Event_SessionKey
	,a.TestGroupName
	,b.PlatformID
	,b.ExpTypeId
	,b.ExpSubTypeID
	,b.Event_MkcID
	,b.ClId
	,b.Event_PageType
	,b.ProductAddToCart
	,b.ProductPlacedOrder
	,b.PDPExit
	,NVL(b.GrossRevenueStable, 0)::FLOAT AS GrossRevenueStable
FROM {{ tblSessOutcomes }} AS a
INNER JOIN csn_warp.tblPDP_ProductView AS b -------------------should this remove QuickView Only????
	ON a.SessionStartDate = b.SessionStartDate
	AND a.event_soid = b.event_soid
	AND a.event_sessionkey = b.event_sessionkey
WHERE b.hasWaymore = 1
ORDER BY 1,2,3,4
Encoded BY
	SessionStartDate ENCODING RLE,
	Event_SoID ENCODING RLE
SEGMENTED BY 
	hash(Event_SessionKey) ALL NODES
;
SELECT ANALYZE_STATISTICS('tmpProductViewOutcomes');

--Aggregate Product View Outcomes ---------------------------------------------------------------------
SELECT 
	csn_warp.fntblplwebstore(Event_SoID) AS Store
	,csn_warp.fntblPlPlatform(PlatformID) AS Platform
	,csn_warp.fntblplexptype(ExpTypeID)
		AS Segment
	,TestGroupName
	,count(*) AS Cnt
	,sum(ProductAddToCart) AS AddedToCart
	,SUM(ProductPlacedOrder) AS PlacedOrder
	,SUM(PDPExit) AS PDPExit
	,SUM(GrossRevenueStable) AS GrossRevenueStable
FROM tmpProductViewOutcomes
GROUP BY 1,2,3,4
ORDER BY 1,2,3,4
;

SELECT 
	csn_warp.fntblplwebstore(Event_SoID) AS Store
	,csn_warp.fntblPlPlatform(PlatformID) AS Platform
	,csn_warp.fntblplexptype(ExpTypeID)
		|| ' - ' || csn_warp.fntblplexpsubtype(ExpSubTypeID)
		AS Segment
	,TestGroupName
	,count(*) AS Cnt
	,sum(ProductAddToCart) AS AddedToCart
	,SUM(ProductPlacedOrder) AS PlacedOrder
	,SUM(PDPExit) AS PDPExit
	,SUM(GrossRevenueStable) AS GrossRevenueStable
FROM tmpProductViewOutcomes
GROUP BY 1,2,3,4
ORDER BY 1,2,3,4
;

SELECT 
	csn_warp.fntblplwebstore(Event_SoID) AS Store
	,csn_warp.fntblPlPlatform(PlatformID) AS Platform
	,Event_PageType
		AS Segment
	,TestGroupName
	,count(*) AS Cnt
	,sum(ProductAddToCart) AS AddedToCart
	,SUM(ProductPlacedOrder) AS PlacedOrder
	,SUM(PDPExit) AS PDPExit
	,SUM(GrossRevenueStable) AS GrossRevenueStable
FROM tmpProductViewOutcomes
GROUP BY 1,2,3,4
ORDER BY 1,2,3,4
;

--NOTE: There is some duplication of PVs as classes can be assigned to multiple clusters
SELECT 	
	csn_warp.fntblplwebstore(a.Event_SoID) AS Store
	,csn_warp.fntblPlPlatform(a.PlatformID) AS Platform
	,b.cluster_name
		AS Segment
	,a.TestGroupName
	,count(*) AS Cnt
	,sum(a.ProductAddToCart) AS AddedToCart
	,SUM(a.ProductPlacedOrder) AS PlacedOrder
	,SUM(a.PDPExit) AS PDPExit
	,SUM(a.GrossRevenueStable) AS GrossRevenueStable
FROM tmpProductViewOutcomes AS a
INNER JOIN (SELECT a.clid, b.cluster_name FROM csn_warp.tblcategorycluster AS a 
			INNER JOIN csn_warp.tblplcluster AS b ON a.cluster = b.cluster
			WHERE a.FilteredClass = 0 AND a.CaType = 'Superbrowse' GROUP BY 1,2 ORDER BY 1,2) AS b
	ON a.clid = b.clid
GROUP BY 1,2,3,4
ORDER BY 1,2,3,4
;

SELECT 
	csn_warp.fntblplwebstore(Event_SoID) AS Store
	,csn_warp.fntblPlPlatform(PlatformID) AS Platform
	,csn_order.fntblMarketingCategory(Event_MkcID)
		AS Segment
	,TestGroupName
	,count(*) AS Cnt
	,sum(ProductAddToCart) AS AddedToCart
	,SUM(ProductPlacedOrder) AS PlacedOrder
	,SUM(PDPExit) AS PDPExit
	,SUM(GrossRevenueStable) AS GrossRevenueStable
FROM tmpProductViewOutcomes
GROUP BY 1,2,3,4
ORDER BY 1,2,3,4
;

SELECT 
	csn_warp.fntblplwebstore(a.Event_SoID) AS Store
	,csn_warp.fntblPlPlatform(a.PlatformID) AS Platform
	,csn_order.fntblMarketingCategory(a.Event_MkcID)
		|| ' - ' || b.ClName
		AS Segment
	,a.TestGroupName
	,count(*) AS Cnt
	,sum(a.ProductAddToCart) AS AddedToCart
	,SUM(a.ProductPlacedOrder) AS PlacedOrder
	,SUM(a.PDPExit) AS PDPExit
	,SUM(a.GrossRevenueStable) AS GrossRevenueStable
FROM tmpProductViewOutcomes AS a
INNER JOIN csn_product.tblclass AS b
	ON a.ClId = b.ClId
GROUP BY 1,2,3,4
ORDER BY 1,2,3,4
;


/* EXIT RATE SHIFTS FACT TABLE */---------------------------------------------------------------------------------
DROP TABLE IF EXISTS tmpExitPageOutcomes; 
CREATE LOCAL TEMPORARY TABLE tmpExitPageOutcomes ON COMMIT PRESERVE ROWS AS /*+ direct */
SELECT
	a.SessionStartDate
	,a.Event_SoID
	,a.Event_SessionKey
	,a.TestGroupName
	,b.PlatformID
	,c.PageTypeGroup
	,MAX(b.Exit) AS Exit
FROM {{ tblSessOutcomes }} AS a
INNER JOIN csn_clickstream.tblDashClicks_Data AS b
	ON a.SessionStartDate = b.SessionStartDate
	AND a.event_soid = b.event_soid
	AND a.event_sessionkey = b.event_sessionkey
LEFT JOIN csn_clickstream.tblPageTypeGroups AS c
	ON b.PageTypeID = c.PageTypeID
GROUP BY 1,2,3,4,5,6
ORDER BY 1,2,3,4
Encoded BY
	SessionStartDate ENCODING RLE,
	Event_SoID ENCODING RLE
SEGMENTED BY 
	hash(Event_SessionKey) ALL NODES
;
SELECT ANALYZE_STATISTICS('tmpExitPageOutcomes');

--Aggregated Exit Rate Shifts ------------------------------------------------------------------
SELECT
	csn_warp.fntblplwebstore(Event_SoID) AS Store
	,csn_warp.fntblPlPlatform(PlatformID) AS Platform
	,PageTypeGroup
	,TestGroupName
	,count(*) AS Cnt
	,sum(Exit) AS Exit
FROM tmpExitPageOutcomes
GROUP BY 1,2,3,4
ORDER BY 1,2,3,4
;