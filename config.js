const ss = SpreadsheetApp.openById('1A5wqQoAZhgk6QLFB4_8stVZUMP7iHdTrQikEa4ur4go');
const locSheet = ss.getSheetByName('LocationLookup');
const membersSheet = ss.getSheetByName('MasterMembers');
const updatesSheet = ss.getSheetByName('TeamPageUpdateForm');
const MINUTES_FOLDER_ID = '1Y2r6Ns7yWW8_A5hk2r7zXv550z7kiZLaeRF_ADahuzMkDjMA3g3p46vEyo-hxTMS4v4gmDwR';
const OPS_FOLDER_ID = '1G3y3ClhqKS7mN2FrJ5z-7LwSgJRI4vp2BF07TJ33xemrc-sCLCDLd4pxPM4Hj-oUL4biQVFX';

// console.log(`ss: ${ss}`);
// console.log(`locSheet: ${locSheet}`);
// console.log(`membersSheet: ${membersSheet}`);
