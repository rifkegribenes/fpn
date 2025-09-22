// run this function from the script editor to grant oAuth scopes for different GWS assets (sendMail, access drive, groups, etc.)
function authorizeOnce() {
  GmailApp.getAliases();
}

function showLinkedFormUrl() {
  const ss = SpreadsheetApp.getActive();
  const url = ss.getFormUrl(); // null if no assigned form
  Logger.log(url || 'No form assigned to this spreadsheet.');
}

function getEditUrlFromSheet() {
  const ss = SpreadsheetApp.getActive();
  const editUrl = ss.getFormUrl(); // null if no assigned form
  Logger.log(editUrl || 'No form assigned');
}


function teamLookup(neighborhood, ss) {
  console.log('teamLookup');
  // console.log(`neighborhood: ${neighborhood}`);
  /** takes a neighborhood and sheet as inputs,
   * returns an object containing a group name and team page URL, and an array of team lead names and emails as output 
   * 
   * returnObj: {
   *  group: 'testteam@friendsofportlandnet.org',
   *  team: 'teamName',
   *  teamPageURL: 'https://sites.google.com/view/fpn/testteam',
   *  leadsArray: [
   *    {
   *      teamLeadName: 'firstName1 lastName1',
   *      teamLeadEmai: 'teamLeadEmail1@friendsofportlandnet.org',
   *    },
   *    {
   *      teamLeadName: 'firstName2 lastName2',
   *      teamLeadEmai: 'teamLeadEmail2@friendsofportlandnet.org',
   *    }
   *  ]
   * }
   * 
   * */

    // if there's no neighborhood input, the function doesn't run
    if (!neighborhood) {
      console.log('no neighborhood provided');
      return null;
    }
      // find location lookup sheet
      const locSheet = ss.getSheetByName('LocationLookup');

      // find master members sheet
      const membersSheet = ss.getSheetByName('MasterMembers');

      // find header and rows in location lookup sheet
      const locHeaders = [ ...readSheet_(locSheet).headers ];
      const locRows = [ ...readSheet_(locSheet).rows ];

      // find header and rows in master members sheet
      const mbrHeaders = [ ...readSheet_(membersSheet).headers ];
      const mbrRows = [ ...readSheet_(membersSheet).rows ];

      // identify the indices (position in the row array) for each of the field names we care about in the location lookup sheet
      const nIdxL = locHeaders.indexOf('Neighborhood');
      const tIdxL = locHeaders.indexOf('Team');
      const gIdx = locHeaders.indexOf('Team Group Email');
      const tpIdx = locHeaders.indexOf('Team page');

      // if those field headers don't exist, the function doesn't work; throw error
      if (tIdxL === -1 || gIdx === -1 || nIdxL === -1, tpIdx === -1) {
        throw new Error(`LocationLookup must have headers "Neighborhood", "Team", "Team page", and "Team Group Email"`);
      }

      // declare the return object and leads array as empty variables
      const returnObj = {};
      const leadsArray = [];

      // loop through the rows in the location lookup sheet
      // in each row, check to see if the neighborhood value passed to this function
      // matches the neighborhood value in that row
      for (let r of locRows) {
        if (String(r[nIdxL]).trim() === neighborhood) {

          // if we find a match, gather the group email, team name, and team page URL from that row
          const group = String(r[gIdx] || '').trim();
          const team = String(r[tIdxL] || '').trim();
          const teamPageURL = String(r[tpIdx] || '').trim();

          // store those values in the return object
          returnObj.group = group;
          returnObj.team = team;
          returnObj.teamPageURL = teamPageURL;
        }
      }

      // identify the indices (position in the row array) for each of the field names we care about in the members master sheet
      const tIdxM = mbrHeaders.indexOf('Team');
      const rIdxM = mbrHeaders.indexOf('Role');
      const fIdxM = mbrHeaders.indexOf('First Name');
      const lIdxM = mbrHeaders.indexOf('Last Name');
      const eIdxM = mbrHeaders.indexOf('Email');
      // console.log(`looking for team leads for ${returnObj.team}`);

      // loop through the rows in the members master sheet
      // in each row, check to see if the team value we got from the lookup sheet
      // matches the team value in that row, AND the person is a 'Team Leader'
      for (let r of mbrRows ) {
        // look for team leads for the member's team
        if (String(r[tIdxM]).trim() === returnObj.team && (String(r[rIdxM]).trim().includes( 'Team Leader') || String(r[rIdxM]).trim().includes( 'Team leader'))) {

          // if we find a match, gather the team lead name and team lead email from that row
          // TODO -- only collect this value if the teamLeadEmail field is populated --
          // set some other fallback if there is only a personal email
          const teamLeadName = `${String(r[fIdxM]).trim()} ${String(r[lIdxM]).trim()}` || '';
          const teamLeadEmail = String(r[eIdxM] || '').trim();
          // console.log(`team lead of ${returnObj.team} team is ${teamLeadName}`);

          // store these values in an object and store the object as one record in the teamLeadsArray
          // then continue looping through to see if there are other team leads for this team
          leadsArray.push({
            teamLeadName,
            teamLeadEmail
          });
        }
      }

      // if there are no team leads for this team, the array will be empty
      if (!leadsArray.length) {
        console.log(`no team leads found for ${returnObj.team}`);
      }
      returnObj.leadsArray = [... leadsArray];
      return returnObj;

    } 


function readSheet_(sheet) {
  const rng = sheet.getDataRange();
  const values = rng.getValues();
  if (values.length === 0) return { headers: [], rows: [] };
  const headers = values[0].map(v => String(v).trim());
  const rows = values.slice(1);
  return { headers, rows };
}

/** Idempotent add: checks membership first; uses AdminDirectory for reliability */
function addToGroupIdempotent_(groupEmail, userEmail) {
  const groupKey  = (groupEmail  || '').trim();
  const memberKey = (userEmail || '').trim();
  if (!groupKey || !memberKey) throw new Error('groupKey and memberKey are required');

  // Check membership (Admin SDK returns 404 if not found)
  let isMember = false;
  try {
    AdminDirectory.Members.get(groupKey, memberKey);
    isMember = true;
  } catch (err) {
    if (err && err.message && err.message.indexOf('Not Found') >= 0) {
      isMember = false;
    } else {
      // If it's a different error (e.g., forbidden), surface it
      Logger.log(err);
    }
  }

  if (isMember) {
    Logger.log(`OK: ${userEmail} already in ${groupEmail}`);
    return;
  }

  // Insert as MEMBER (not OWNER/MANAGER)
  const member = {
    email: userEmail,
    role: 'MEMBER',   // MEMBER | MANAGER | OWNER
    delivery_settings: 'ALL_MAIL' // optional
  };

  const res = AdminDirectory.Members.insert(member, groupEmail);
  Logger.log(`ADDED: ${userEmail} → ${groupEmail} (${res.status || 'ok'})`);
}

/** now idempotent: checks for matching email address in target sheet and updates existing if finds match */
function copyRowToAnotherSheet(sourceSheet, targetSheet) {

  console.log(`copyRowToAnotherSheet`);
  
  // Get the header row from the source sheet (assuming headers are in the first row)
  const sourceHeaders = sourceSheet.getRange(1, 1, 1, sourceSheet.getLastColumn()).getValues()[0];
  
  // Get the active row number in the source sheet (the row you want to copy)
  const activeRow = sourceSheet.getActiveCell().getRow();
  
  // Get the data from the active row in the source sheet
  const sourceRowData = sourceSheet.getRange(activeRow, 1, 1, sourceSheet.getLastColumn()).getValues()[0];
  
  // Get the header row from the target sheet (assuming headers are also in the first row of the target sheet)
  const targetHeaders = targetSheet.getRange(1, 1, 1, targetSheet.getLastColumn()).getValues()[0];
  
  // Create an empty array to store the row data in the order of the target sheet headers
  const targetRowData = new Array(targetHeaders.length).fill(""); // Empty array to match the number of target columns
  
  // identify the index (position in the row array) of the email column in each sheet
  const eIdxT = targetHeaders.indexOf('Email');
  const eIdxS = sourceHeaders.indexOf('Email');

  // save the email from the source row to a variable
  const sourceEmail = sourceRowData[eIdxS];
  console.log(`sourceEmail: ${sourceEmail}`);

  // Loop through the source headers and match with the target headers
  for (var i = 0; i < sourceHeaders.length; i++) {
    const sourceHeader = sourceHeaders[i];
    
    // Check if the source header matches any header in the target sheet
    const targetIndex = targetHeaders.indexOf(sourceHeader);
    
    // If there's a match, copy the source row data to the correct column in the target row
    if (targetIndex !== -1) {
      targetRowData[targetIndex] = sourceRowData[i];
    }
  }

  // Before adding the row, search the target sheet for a record matching the new row on email address
  const targetRows = [ ...readSheet_(targetSheet).rows ];

  let match = false; // setting this variable so we can test whether a match was found later

  // loop through the rows in the target sheet
      // in each row, check to see if the email matches the email in the form submission
      for (const [rIdxT, r] of targetRows.entries() ) {
        if (String(r[eIdxT]).trim() === sourceEmail) {
          console.log(`match found: row ${rIdxT + 2}, ${r[eIdxT]}`);
          // if we find a match, UPDATE this row with values from the form submission instead of adding a new row
          // Set the target row data in the next available row in the target sheet
          // add two to index because array is zero-indexed and we exclude the header row
          targetSheet.getRange(rIdxT + 2, 1, 1, targetRowData.length).setValues([targetRowData]);
          console.log('found match, aborting loop and returning');
          match = true;
          break;
        }
      }
  console.log(`match: ${match}`);
  if (!match) {
    console.log('no match; adding new row');
    // If no match, find the next empty row in the target sheet to paste the data
    const nextRow = targetSheet.getLastRow() + 1;
    
    // Set the target row data in the next available row in the target sheet
    targetSheet.getRange(nextRow, 1, 1, targetRowData.length).setValues([targetRowData]);
  }
  
}

function whoRunsMe() {
  Logger.log('Effective user: ' + Session.getEffectiveUser().getEmail());
}

function testHasMember() {
  const group = 'all-members@friendsofportlandnet.org';
  const user  = 'sarah1@friendsofportlandnet.org';
  // Optional third arg to include nested (derived) membership
  const res = AdminDirectory.Members.hasMember(group, user, {
    includeDerivedMembership: true
  });
  Logger.log(res.isMember); // true/false
}

function renderTemplate_(fileName, obj) {
  const t = HtmlService.createTemplateFromFile(fileName);
  Object.assign(t, obj);
  return t.evaluate().getContent(); // full HTML string
}