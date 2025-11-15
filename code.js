const baseURL = 'https://script.google.com/macros/s/AKfycbzv51l398A1ZWWpxFpCZOeYwt6gYiBDZN3izI3lkejN7LT3IhSBw1TO0J0KQT7G1SFhRg/exec';
// const baseURL = 'https://friends-of-portland-net.web.app';


// onSubmit handler attached to team page update form, do not push to clasp

function onFormSubmitHandler(e) {
  var response = e.response;
  var editUrl = response.getEditResponseUrl();
  const responseId = response.getId();
  console.log(`responseId: ${responseId}`);

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

  console.log(`check sheet, were values stored? formResponseHandler 32`);
}


