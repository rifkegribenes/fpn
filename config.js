const ss = SpreadsheetApp.openById('1A5wqQoAZhgk6QLFB4_8stVZUMP7iHdTrQikEa4ur4go');
const locSheet = ss.getSheetByName('LocationLookup');
const membersSheet = ss.getSheetByName('MasterMembers');
const updatesSheet = ss.getSheetByName('TeamPageUpdateForm');

console.log(`ss: ${ss}`);
console.log(`locSheet: ${locSheet}`);
console.log(`membersSheet: ${membersSheet}`);
