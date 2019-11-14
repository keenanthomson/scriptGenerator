settarget webvertica;
meta SET SessDateFilter = (sessionstartDate between '2019-10-31' and '2019-11-08');
meta SET testFilter = (1234);
meta SET osFilter = (1);
meta SET matchbackDays = 14;
meta SET tblMbOutcomes = csn_junk.tblMb14Day_kdt_mweb;
meta SET tblSessOutcomes = csn_junk.tblSess_kdt_mweb;
meta SET tblGRSVCD_store = csn_junk.tblGRSVCDstore_kdt_mweb;
meta SET tblGRSVCD_storeXvisitor = csn_junk.tblGRSVCDstoreXvisitor_kdt_mweb;

BEGIN;

