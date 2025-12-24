// onSubmit handler attached to team page update form, do not push to clasp, edit here:

// as of 12/23/2025 this is unused because form has been switched to firebase-hosted UI
// https://script.google.com/u/0/home/projects/1xWX3LCTgnR5oa0xSbH57MNif6BVLTtQnjpe7WmfSdcbstiXy6T5eCxoV/edit

const baseURL = 'https://script.google.com/macros/s/AKfycbzv51l398A1ZWWpxFpCZOeYwt6gYiBDZN3izI3lkejN7LT3IhSBw1TO0J0KQT7G1SFhRg/exec';
// const baseURL = 'https://friends-of-portland-net.web.app';

function logToSheet(entry) {
  try {
    const sheet = SpreadsheetApp.openById('1A5wqQoAZhgk6QLFB4_8stVZUMP7iHdTrQikEa4ur4go').getSheetByName('ServerLogs');
    sheet.appendRow([
      new Date(),
      entry.level || "",
      entry.where || "",
      entry.groupEmail || "",
      entry.userEmail || "",
      entry.message || "",
      entry.stack || ""
    ]);
  } catch (err) {
    Logger.log(`logToSheet() failed: ${err.message}`);
  }
}

function safeLog(where, level, message, extra = {}) {
    try {
      logToSheet({
        level,
        where,
        message,
        ...extra
      });
    } catch (err) {
      // swallow any logging errors
    }
  }

function onFormSubmitHandler(e) {
  var response = e.response;
  var editUrl = response.getEditResponseUrl();
  const responseId = response.getId();
  console.log(`responseId: ${responseId}`);
  safeLog('onFormSubmitHandler: Team Update Form', 'info', `responseId: ${responseId}, response: ${response}`);

  // Get the headers and find the columns labeled "Edit URL", "Delete URL", and "Id"
  var sheet = SpreadsheetApp.openById('1A5wqQoAZhgk6QLFB4_8stVZUMP7iHdTrQikEa4ur4go').getSheetByName('TeamPageUpdateForm');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var editUrlColIndex = headers.indexOf("Edit URL") + 1;
  var deleteUrlColIndex = headers.indexOf("Delete URL") + 1;
  var responseIdIndex = headers.indexOf("Id") + 1;
  

  // Generate a delete link using the response ID
  const deleteUrl = `${baseURL}?action=delete&id=${responseId}`;
  console.log(`deleteUrl: ${deleteUrl}`);


  if (editUrlColIndex === 0 || responseIdIndex === 0 || deleteUrlColIndex === 0) {
    throw new Error('Required columns not found in header row.');
  }
  // Get the last row that was just submitted
  var lastRow = sheet.getLastRow();
  console.log(`lastRow: ${lastRow}`);

  // Store the values in the correct columns
  sheet.getRange(lastRow, editUrlColIndex).setValue(editUrl);
  sheet.getRange(lastRow, responseIdIndex).setValue(responseId);
  sheet.getRange(lastRow, deleteUrlColIndex).setValue(deleteUrl);

  safeLog('onFormSubmitHandler: Team Update Form', 'check sheet, were values stored? formResponseHandler 66', `responseId: ${responseId}, editUrl: ${editUrl}, deleteUrl: ${deleteUrl}`);
  console.log(`check sheet, were values stored? formResponseHandler 67`);
}


