const TEAM_LEADS_GROUP_EMAIL = "team-leads@friendsofportlandnet.org"; 
const ADMIN_GROUP_EMAIL = "adminteam@friendsofportlandnet.org"; 
// console.log(`ss: ${ss}`);

function testGroupCheck() {
  const user = "admin@friendsofportlandnet.org";
  Logger.log(checkGroupMembership(user));
}

// function doGet(e) {
//   console.log(`doGet`);
//   // Load the base HTML template
//   // const team = e.parameter.team;
//   // console.log(`doGet team ${team}`);
//   const template = HtmlService.createTemplateFromFile("TeamPageTemplate");
//   // template.team = team;
//   return template.evaluate()
//     .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
// }

/// THIS ONE WORKS
// function doGet(e) {
//   console.log('doGet e.parameter:', e.parameter);
//   const team = e.parameter.team || 'defaultTeam';
//   const template = HtmlService.createTemplateFromFile('Minimal');
//   template.team = team;
//   return template.evaluate();
// }

function doGet(e) {
  const team = e.parameter.team || '';  // fallback to empty or logged-in user team
  const template = HtmlService.createTemplateFromFile('TeamPageTemplate');
  template.team = team;  // pass to template
  return template.evaluate()
                 .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}







// Called from client-side JS
function getTeamData(teamParam) {
  console.log('getTeamData');
  console.log(`teamParam: ${teamParam}`);
  const userEmail = Session.getActiveUser().getEmail();

  // If no team param, lookup user’s team
  let teamToShow = teamParam;
  if (!teamToShow) {
    console.log('no team param, checking if is team lead');
    const isTeamLead = checkGroupMembership(TEAM_LEADS_GROUP_EMAIL, userEmail);
    // console.log(`ss: ${ss}`);

    // if user is a team lead, extract team from email address
    if (isTeamLead) {
      teamToShow = tlTeamLookup(userEmail);
      console.log(`team lead teamToShow: ${teamToShow}`);
    } else {
      // if user is NOT a team lead, find user team based on personal email
      const neighborhood = neighborhoodLookup(userEmail);
      teamToShow = teamLookup(neighborhood);
      console.log(`non team lead neighborhood: ${neighborhood}, teamToShow: ${teamToShow}`);
    }
  }

  if (!teamToShow) teamToShow = "Unknown";

  return renderContent(teamToShow, userEmail);
}


function renderContent(userTeam, userEmail) {
  console.log('renderContent');
  const isTeamLead = checkGroupMembership(TEAM_LEADS_GROUP_EMAIL, userEmail);
  const isAdmin = checkGroupMembership(ADMIN_GROUP_EMAIL, userEmail);
  console.log(`ss: ${ss}`);

  let content = `
    <div padding: 20px; font-family: Lato, sans-serif;">
      ${showPublicContent(userTeam)}
    </div>
  `;

  // console.log('content');
  // console.log(content);

  return content;
}

function checkGroupMembership(groupEmail, userEmail) {
  try {
    const member = AdminDirectory.Members.get(groupEmail, userEmail);
    return member && member.status === "ACTIVE";
  } catch (e) {
    return false;
  }
}

function showPublicContent(userTeam) {
  console.log('showPublicContent');
  return `
    <div class="publicContent">
      <h2>${userTeam}</h2>
      <div class="pcContainer container" style="display:flex !important; flex-direction:row; flex-wrap:wrap;">
        <div class="announcements block" style="max-width: 400px;">
          <h3 class="blockhead">Announcements</h3>
          <div class="announcements cont" style="padding-right: 20px; margin-right: 20px; border-right: 1px dotted #ccc;">
            ${getRecentAnnouncements(userTeam).map(item => renderAnnouncement(item)).join('')}
          </div>
        </div>
        <div class="calendar block" style="max-width: 400px;">
          <h3 class="blockhead">Upcoming Events</h3>
          <div class="calendar cont" style="max-width: 400px; padding-right: 20px; margin-right: 20px; border-right: 1px dotted #ccc;">
            ${renderCalendar(userTeam)}
          </div>
        </div>
        <div class="pcColumnContainer container" style="display:flex !important; flex-direction:column; flex-wrap:wrap; max-width:200px;">
          <div class="minutes block" style="padding-bottom: 20px; margin-bottom: 20px; border-bottom: 1px dotted #ccc;">
            <h3 class="blockhead">Meeting Minutes</h3>
            <div class="minutes cont" style="">
              ${renderMinutesBlock(userTeam)}
            </div>
          </div>
          <div class="ops block" style="padding-bottom: 20px; margin-bottom: 20px; border-bottom: 1px dotted #ccc;">
            <h3 class="blockhead">Operations Plan</h3>
            <div class="ops cont" style="">
              ${renderOpsPlanBlock(userTeam)}
            </div>
          </div>
          <div class="grouplink block">
            <h3 class="blockhead">Google Group</h3>
            <div class="gGroup cont" style="">
              ${renderGoogleGroup(userTeam)}
            </div>
          </div>
      </div>
    </div>
  `;
}

function renderAnnouncement(obj) {
  return `<div class="announcement">
    <h4 class="aTitle" style="margin-bottom: 10px;">${obj.title}&#160;&#160;&#x7C;&#160;&#160;<span class="aDate" style="color:#333;font-weight:400;">${formatDate(obj.timestamp)}</span></h4>
    <p class="aBody">${obj.body}</p>
  </div>`
}

function renderCalendar(team) {
  console.log(`calendarLookup: ${team}`);
  console.log(calendarLookup(team))
  if (!!calendarLookup(team)) {
    return `<iframe style="width: 100%; min-height: 400px; max-width: 400px;" src="${calendarLookup(team)}">
    </iframe>`
  } else {
    return `<p>No calendar available for ${team}</p>`
  }
  
}

function getRecentAnnouncements(team = 'Test2') {
  const data = updatesSheet.getDataRange().getValues();

  // Get header indexes
  const headers = data[0];
  const TIMESTAMP_COL = headers.indexOf('Timestamp');
  const UPDATE_TYPE_COL = headers.indexOf('What do you want to update?');
  const TITLE_COL = headers.indexOf('Announcement Title');
  const BODY_COL = headers.indexOf('Announcement Body');
  const TEAM_COL = headers.indexOf('Your Team');

  if (TIMESTAMP_COL === -1 || UPDATE_TYPE_COL === -1 || TITLE_COL === -1 || BODY_COL === -1 || TEAM_COL === -1) {
    throw new Error("Required columns are missing from the sheet.");
  }

  // Filter rows where 'What do you want to update?' == 'Post announcement' and team matches function input
  const announcementRows = data.slice(1).filter(row => {
    return row[UPDATE_TYPE_COL] === 'Post announcement' && row[TEAM_COL] === team;
  });

  // Sort by Timestamp descending
  announcementRows.sort((a, b) => {
    return new Date(b[TIMESTAMP_COL]) - new Date(a[TIMESTAMP_COL]);
  });

  // Get the top 3 announcements
  const recentAnnouncements = announcementRows.slice(0, 3).map(row => {
    return {
      timestamp: new Date(row[TIMESTAMP_COL]),
      title: row[TITLE_COL],
      body: row[BODY_COL]
    };
  });
  // console.log(recentAnnouncements);
  return recentAnnouncements;
}

function renameFile(team, file, fileType, meetingDate) {
  
  // Only touch recently added files (e.g. last 60 seconds)
  const created = file.getDateCreated();
  const now = new Date();
  const ageInSeconds = (now - created) / 1000;
  // console.log(`ageInSeconds: ${ageInSeconds}`);

  const mtgDate = meetingDate ? formatDateFileName(new Date(meetingDate)) : null;
  console.log(`mtgDate: ${mtgDate}`);

  if (ageInSeconds < 60) {
    // console.log(`ageInSeconds < 60`);
    console.log('renameFile');
    const originalName = file.getName();
    let newName = '';
    if (mtgDate) {
      newName = `${team}_${fileType}_${mtgDate}_${originalName}`;
    } else {
      newName = `${team}_${fileType}_${originalName}`;
    }
    console.log(`originalName: ${originalName}`);
    console.log(`newName: ${newName}`);
    file.setName(newName);
    file.setDescription(team);
    console.log(`file description: *********************`);
    console.log(file.getDescription());
    console.log(`mtgDate: ${mtgDate}`);
    if (mtgDate) {
      let currentDesc = file.getDescription() || "";
      currentDesc = currentDesc += `,${mtgDate}`;
      file.setDescription(currentDesc);
      console.log(`file description with mtgDate:`);
      console.log(file.getDescription());
    }
  } else {
    // console.log(`skipping older file ${ageInSeconds}`);
  }
}


// prepends the team name to meeting minutes and ops plan files so they can be found later in the drive folder
function onFormSubmitHandler2(e) {
  console.log(`onFormSubmitHandler2`);
  const sheetName = e.range.getSheet().getName();
  console.log(`sheetName = ${sheetName}`);

  // Only run if the response is from the specific form tab
  if (sheetName !== "TeamPageUpdateForm") {
    return; // Exit early for other forms
  }

  // Proceed with your file upload logic
  const responses = e.namedValues;
  const team = responses["Your Team"][0]; 
  const fileType = responses["What do you want to update?"][0].includes('minutes') ? 'minutes' : responses["What do you want to update?"][0].includes('operations') ? 'ops' : '';
  const meetingDate = responses["Date of meeting"][0];
  console.log(`team: ${team}, fileType: ${fileType}`);

  const minutesFolder = DriveApp.getFolderById(MINUTES_FOLDER_ID);
  const opsFolder = DriveApp.getFolderById(OPS_FOLDER_ID);
  const minutesFiles = minutesFolder.getFiles();
  const opsFiles = opsFolder.getFiles();

  if (fileType === 'minutes') {
    while (minutesFiles.hasNext()) {
    const file = minutesFiles.next();
    // console.log('minutesFile');
    // console.log(file.getName());

    renameFile(team, file, fileType, meetingDate)
  }

  } else if (fileType === 'ops') {
    while (opsFiles.hasNext()) {
    const file = opsFiles.next();
    // console.log('opsFile');
    // console.log(file.getName());

    renameFile(team, file, fileType)
    
    }
  } else {
    console.log('no fileType found'
    )
  }
}


function renderMinutesBlock(team = 'Test2') {
  try {
    const folderId = MINUTES_FOLDER_ID; 
    const files = getLatestMinutesFiles(team, folderId, 10); //change to allow more files

    if (!!files && files.length) {
      let html = `<div style="font-family: Lato, sans-serif; font-size: 14px;"><ul>`;

      files.forEach(file => {
      // Try to get createdTime or fallback to createdDate or null
      const createdDateStr = file.createdTime || null;

      let formattedDate = 'Unknown date';
      let mtgDateParsed;
      console.log(`file.getDescription() ********************: ${file.getDescription()}`);
      if (file.getDescription()) {
        mtgDateParsed = file.getDescription().split(",")[1] || null;
        // console.log(`mtgDateParsed: ${mtgDateParsed}`);
      }
      if (mtgDateParsed) {
        // console.log(`mtgDateParsed: ${mtgDateParsed}`);
        formattedDate = formatDate(new Date(mtgDateParsed));
      } else if (createdDateStr) {
        const createdDate = new Date(createdDateStr);
        formattedDate = Utilities.formatDate(createdDate, Session.getScriptTimeZone(), "MMM d, yyyy");
      }

      const linkText = `${team} minutes ${formattedDate}`;

      const url = `https://drive.google.com/file/d/${file.id}/view`;
      html += `<li style="margin-bottom: 10px; list-style-type: none;"><a href="${url}" target="_blank">${linkText}</a></li>`;
    });
    html += `</ul></div>`
    console.log(html);
    return html;
    } else {
      return `<p>No meeting minutes available for ${team}</p>`
    }

    
  } catch (e) {
    return `<p>Error: ${e.message}</p><p>No meeting minutes available for ${team}</p>`;
  }
}

function renderOpsPlanBlock(team) {
  try {
    const folderId = OPS_FOLDER_ID; 
    const file = getLatestOpsFile(team, folderId); 
    console.log('renderOpsPlan');
    console.log(file);
    if (!!file) {
      console.log('310');
      let html = `<div style="font-family: Lato, sans-serif; font-size: 14px;">`;
      const createdDateStr = file.createdTime || null;
      let formattedDate = 'Unknown date';
      if (createdDateStr) {
        const createdDate = new Date(createdDateStr);
        formattedDate = Utilities.formatDate(createdDate, Session.getScriptTimeZone(), "MMM d, yyyy");
      }
      const linkText = `${team} Operations Plan`;
      const url = `https://drive.google.com/file/d/${file.id}/view`;
      html += `<p style="margin-bottom: 10px; list-style-type: none;"><a href="${url}" target="_blank">${linkText}</a> (${formattedDate})</p></div>`;
      return html;
    } else {
      return `<p>No operations plan available for ${team}</p>`;
    }
  } catch (e) {
    return `<p>Error: ${e.message}</p><p>No operations plan available for ${team}</p>`;
  }
}

function getLatestMinutesFiles(team, folderId, maxFiles) {
  // console.log(`getLatestMinutesFiles`);
  const teamPrefix = `${team}_minutes`;
  // console.log(`teamPrefix: ${teamPrefix}`);
  const response = Drive.Files.list({
    q: `'${folderId}' in parents and mimeType='application/pdf' and trashed=false and name contains '${teamPrefix}'`,
    orderBy: 'createdTime desc',
    maxResults: maxFiles,
    fields: 'files(id,name,createdTime,description)'
  });

  return response.files || response.items || [];
}

function getLatestOpsFile(team, folderId) {
  // console.log(`getLatestOpsFile`);
  const teamPrefix = `${team}_ops`;
  // console.log(`teamPrefix: ${teamPrefix}`);
  const response = Drive.Files.list({
    q: `'${folderId}' in parents and mimeType='application/pdf' and trashed=false and name contains '${teamPrefix}'`,
    orderBy: 'createdTime desc',
    maxResults: 10, // get a few in case of false positives
    fields: 'files(id,name,createdTime,description)'
  });

  // Filter to the most recently created ops file
  const matchingFile = response.files.find(file => file.name.startsWith(teamPrefix));
  // console.log(matchingFile);
  return matchingFile || null; // Return the matching file or null if none found
}

function renderGoogleGroup(team) {
  const groupAddress = `https://groups.google.com/a/friendsofportlandnet.org/g/${shortNameLookup(team)}`;
  return `<a href=${groupAddress}>${team} Google Group</a>`
}

