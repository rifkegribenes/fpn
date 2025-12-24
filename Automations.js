/** onEditHandler triggers the processNewNET script when a row in the WorkspaceRegForm sheet is edited, IF the edit sets the 'Processed' checkbox to true */ 

// Installable onChange trigger
function onChangeHandler(e) {
  try {
    const sh = e.source.getActiveSheet();
    if (!sh) return;

    // Only handle TeamPageUpdateForm
    if (sh.getName() === 'TeamPageUpdateForm') {
      if (e.changeType === 'INSERT_ROW') {
        addTimestampTPU(e);                 // add timestamp
        handleBannerEditOnChange(sh);       // process banner on new row
      }
    }

    // WorkspaceRegForm checkbox edits only happen via onEdit
  } catch (err) {
    console.error('onChangeHandler error:', err);
  }
}



// Installable onEdit trigger
function onEditHandler(e) {
  safeLog('onEditHandler', 'info', 'Automations: 18: Function called');
  const sh = e.range.getSheet();
  if (!sh) return;

  if (sh.getName() === 'WorkspaceRegForm') {
    safeLog('onEditHandler', 'info', 'Automations: 23: WorkspaceRegForm');
    handleWorkspaceRegEdit(e);
  }
}



// adds timestamp to TeamPageUpdateForm sheet
function addTimestampTPU(e) {
  if (e.changeType !== 'INSERT_ROW') return;

  const SHEET_NAME = 'TeamPageUpdateForm'; 
  const sheet = e.source.getSheetByName(SHEET_NAME);
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const timestampCell = sheet.getRange(lastRow, 1); // column A

  if (!timestampCell.getValue()) {
    timestampCell.setValue(getFormattedTimestamp());
  }
}


function handleWorkspaceRegEdit(e) {
  safeLog('onEditHandler', 'info', 'WorkspaceRegForm');

  const ss = e.source;

  const sh = e.range.getSheet();
  const row = e.range.getRow();
  const col = e.range.getColumn();

  // Only react to column A (processed checkbox) after header
  if (col !== 1 || row < 2) return;
  if (e.value !== 'TRUE') return;

  try {
    processNewNET(row, ss, sh);
  } finally {
    // optional: reset checkbox
    // e.range.setValue(false);
  }
}

async function handleBannerEditOnChange(sheet) {
  safeLog('handleBannerEditOnChange', 'info', 'function called');
  try {
    Logger.log('handleBannerEditOnChange: 82')
    const sh = sheet;
    const lastRow = sh.getLastRow();
    if (lastRow < 2) return;

    Logger.log('handleBannerEditOnChange: 86')
    safeLog('handleBannerEditOnChange', 'info', '86');

    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const headerCol = name => headers.indexOf(name) + 1;

    const bannerCol = headerCol('Upload banner photo here');
    const publicUrlCol = headerCol('BannerPublicURL');
    const teamCol = headerCol('Your Team');

    Logger.log('handleBannerEditOnChange: 95')
    safeLog('handleBannerEditOnChange', 'info', '95');

    const bannerUrl = sh.getRange(lastRow, bannerCol).getValue();
    const existingPublicUrl = sh.getRange(lastRow, publicUrlCol).getValue();

    Logger.log('handleBannerEditOnChange: 100')
    safeLog('handleBannerEditOnChange', 'info', '100');

    if (!bannerUrl || existingPublicUrl) return;

    const team = sh.getRange(lastRow, teamCol).getValue();
    const teamSlug = globalLookup(team).shortName;

    Logger.log('handleBannerEditOnChange: 107')
    safeLog('handleBannerEditOnChange', 'info', '107');

    // Extract Drive file ID
    const match = bannerUrl.match(/(?:id=|\/d\/)([a-zA-Z0-9_-]+)/);
    if (!match) throw new Error('Cannot extract Drive file ID');

    const file = DriveApp.getFileById(match[1]);

    Logger.log('handleBannerEditOnChange: 115')
    safeLog('handleBannerEditOnChange', 'info', '115');

    // Rename
    const ext = file.getName().split('.').pop();
    const newName = `${teamSlug}-banner.${ext}`;
    file.setName(newName);

    Logger.log('handleBannerEditOnChange: 122')
    safeLog('handleBannerEditOnChange', 'info', '122');

    // Upload to GitHub
    const publicUrl = await uploadFileToGitHub(
      newName,
      file.getBlob(),
      `Upload banner for ${team}`
    );

    Logger.log('handleBannerEditOnChange: 131')
    safeLog('handleBannerEditOnChange', 'info', '131');

    // Write back to sheet to mark processed
    sh.getRange(lastRow, publicUrlCol).setValue(publicUrl);

    safeLog('handleBannerEditOnChange', 'info', `Banner processed for row ${lastRow}`);
  } catch (err) {
    Logger.log('Banner upload failed', err);
    safeLog('handleBannerEditOnChange', 'error', `Banner upload failed: ${err}`);
  }
}




/**  processNewNET does 3 things:
  1. copy row to master DB sheet (row containing the new record that has just been manually confirmed)
  2. trigger onboarding email to new member, cc-ing team lead 
  3. add member to appropriate google groups based on team */

function processNewNET(row, ss, sh) {
  console.log('processNewNET:')
  // this function is triggered when an admin clicks the checkbox in the 'Processed' column (column A)

  // step 1: copy values from the selected row in formResponses into the membersMaster sheet, matching on column headers
  // first function parameter = source sheet, second parameter = target sheet

  copyRowToAnotherSheet(sh, ss.getSheetByName('MasterMembers'));

  // step 2: trigger onboarding emails

  // gather data for inserting into template
  // find the row data from the newly-processed row
  const rowData = sh.getRange(row, 1, 1, sh.getLastColumn()).getValues()[0];

  // finding the headers for the form responses sheet
  const { headers } = readSheet_(ss.getSheetByName('WorkspaceRegForm'));

  // assign value to role variable
  const role = (rowData[headers.indexOf('Role')] || '').trim();

  // assign value to memberName variable
  const memberName = (rowData[headers.indexOf('First Name')] || '').trim();

  // assign value to memberEmail variable
  const memberEmail = (rowData[headers.indexOf('Email')] || '').trim();

  // assign value to neigbhorhood variable
  const neighborhood = (rowData[headers.indexOf('Neighborhood')] || '').trim();
  console.log(neighborhood);

  // declare variables (blank for now)
  let teamName = '';
  let teamLeadName = '';
  let teamLeadEmail = '';
  let teamPageURL = '';
  console.log('66');
  const teamObj = teamLookup(neighborhood, ss);
  console.log('68');
  console.log(teamObj);
  
  // use neighborhood value to lookup other values in the lookup sheet (team name, team page URL)
  if (neighborhood) {
   teamName = (teamObj.team || '').trim();
   teamLeadName = (teamObj.teamLeadName || '').trim();
   teamLeadEmail = (teamObj.teamLeadEmail || '').trim();
   teamPageURL = (teamObj.teamPageURL || '').trim();
  }

  console.log(`teamName: ${teamName}, teamLeadName: ${teamLeadName}, teamLeadEmail: ${teamLeadEmail}, teamPageURL: ${teamPageURL}`);

  // choose which template to send (team lead or regular member onboarding)
  if (role === 'Team leader') {
    sendEmail('teamLeadOnboardEmail', memberName, memberEmail, teamName, teamPageURL, teamLeadName, teamLeadEmail);
  } else {
    sendEmail('memberOnboardEmail2', memberName, memberEmail, teamName, teamPageURL, teamLeadName, teamLeadEmail);
  }

  console.log('83');

  // step 3: add member to appropriate google groups based on team
  addToGoogleGroups(teamObj, row, ss, sh);
  
}

/** Add new NET to appropriate Team group (idempotent) */
function addToGoogleGroups(teamObj, row, ss, sh) {
  console.log('addToGoogleGroups')
  const rowData = sh.getRange(row, 1, 1, sh.getLastColumn()).getValues()[0];
  const { headers } = readSheet_(ss.getSheetByName('WorkspaceRegForm'));
  const nIdx = headers.indexOf('Neighborhood');
  const eIdx = headers.indexOf('Email');
  const rIdx = headers.indexOf('Role');
  const email = (rowData[eIdx] || '').trim();
  const team = teamObj.team;
  const teamGroupEmail = teamObj.group;
  const teamLead = (rowData[rIdx].includes("leader"));

  if (!email || !/@/.test(email)) {
    Logger.log(`SKIP: invalid/missing email. Row: ${JSON.stringify(row)}`);
    return;
  }

  // 1) All‑Member group
  // console.log('skipping add to all-members; only adding individuals to team groups');
  addToGroupIdempotent_('all-members@friendsofportlandnet.org', email);
  console.log(`added ${email} to all-members@friendsofportlandnet.org`);

  // 2) Team group
  if (!teamGroupEmail) {
    Logger.log(`SKIP team group: cannot resolve for team="${team}" email="${email}"`);
    return;
  }
 
  addToGroupIdempotent_(teamGroupEmail, email);
  console.log(`added ${email} to ${teamGroupEmail}`);

  // 3) Team leads group (if applicable)
  // if (teamLead) {
  //   Logger.log(`${email} is a team Lead for ${team}, adding to team leads group`);
  //   addToGroupIdempotent_('team-leads@friendsofportlandnet.org', email);
  //   return;
  // }
 
  addToGroupIdempotent_(teamGroupEmail, email);
  console.log(`added ${email} to ${teamGroupEmail}`);
}

/** send member onboarding email template */
function sendEmail(templateName, memberName, memberEmail, teamName, teamPageURL, teamLeadName, teamLeadEmail) {
  console.log('sendEmail');
  const data = {
    memberName,
    memberEmail,
    teamName,
    teamLeadName,
    teamLeadEmail,
    teamPageURL
  };
  console.log(data);

  // Render HTML from the template
  let html;
  try {
    html = renderTemplate_(templateName, data);
  } catch(err) {
    console.log(`Automations 144: ${err}`);
  }
  console.log('Automations 146');
  console.log('html');
  console.log(html);
  const logoBlob = DriveApp.getFileById('1fnUYmb2be1YYd1HZAh97pzUlW4jHeK5A').getBlob();
  // console.log('logoBlob');
  // console.log(logoBlob);

try {
  GmailApp.sendEmail(
    memberEmail,
    'Welcome to the Portland NET Google Workspace',
    'This email requires an HTML-capable client.',
    {
      htmlBody: html,
      name: 'Friends of Portland NET',
      cc: teamLeadEmail || '',
      inlineImages: { logo: logoBlob } // matches cid:logo in template
    }
  );
} catch (err) {
  console.log(`sendEmail error: ${err}`)
}
  
}


// ARRAY FORMULAS

// TEAM (M2): =ARRAYFORMULA(IF(F2:F="", "", VLOOKUP(F2:F, NeighborhoodLookup!A:B, 2, FALSE)))

// DISTRICT (N2): =ARRAYFORMULA(IF(M2:M="", "", VLOOKUP(M2:M, TeamLookup!A:E, 5, FALSE)))   

// FULL NAME (O2): =ARRAYFORMULA(IF(C2:C="", "", C2:C & " " & D2:D))





