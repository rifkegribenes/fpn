const TEAM_LEADS_GROUP_EMAIL = "team-leads@friendsofportlandnet.org"; 
const ADMIN_GROUP_EMAIL = "adminteam@friendsofportlandnet.org"; 
// console.log(`ss: ${ss}`);

function testGroupCheck() {
  const user = "admin@friendsofportlandnet.org";
  Logger.log(checkGroupMembership(user));
}

function doGet() {
  // Load the base HTML template
  const template = HtmlService.createTemplateFromFile("TeamPageTemplate");
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
      ${isTeamLead ? showTeamLeadContent(userTeam) : ""}
      ${isAdmin ? showAdminContent(userTeam) : ""}
    </div>
  `;

  console.log('content');
  console.log(content);

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
        <div class="pcColumnContainer container" style="display:flex !important; flex-direction:column; flex-wrap:wrap;">
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
          </div>
      </div>
    </div>
  `;
}

function showTeamLeadContent() {
  console.log('showTeamLeadContent');
  return `
    <h3>Team Lead Resources</h3>
    <iframe src="https://docs.google.com/forms/d/e/1FAIpQLSe9TU8URPswEVELyy9jOImY2_2vJ9OOE7O8L5JlNUuiJzPQYQ/viewform?embedded=true" width="640" height="800" frameborder="0">Loading…</iframe>
  `;
}

function showAdminContent() {
  console.log('showAdminContent');
  return `
    <h3>Admin only content</h3>
    <p>Here's some text or another form.</p>
  `;
}

function renderAnnouncement(obj) {
  return `<div class="announcement">
    <h4 class="aTitle" style="margin-bottom: 10px;">${obj.title}&#160;&#160;&#8226;&#160;&#160;<span class="aDate" style="color:#333;font-weight:300;">${formatDate(obj.timestamp)}</span></h4>
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
  console.log(recentAnnouncements);
  return recentAnnouncements;
}

// this prepends the team name to meeting minutes and ops plan files so they can be found later in the drive folder
function onFormSubmit(e) {
  const sheetName = e.range.getSheet().getName();

  // Only run if the response is from the specific form tab
  if (sheetName !== "TeamPageUpdateForm") {
    return; // Exit early for other forms
  }

  // Proceed with your file upload logic
  const responses = e.namedValues;
  const team = responses["Your Team"][0]; 
  const fileType = responses["What do you want to update?"][0].contains('minutes') ? 'minutes' : responses["What do you want to update?"][0].contains('operations') ? 'ops' : '';
  console.log(`team: ${team}, fileType: ${fileType}`);

  const folder = DriveApp.getFolderById("1a-u90x4-GjhzyoiscckMvYx6Q1K8vAQZ"); // the folder where file uploads go
  const files = folder.getFiles();

  while (files.hasNext()) {
    const file = files.next();

    // Only touch recently added files (e.g. last 60 seconds)
    const created = file.getDateCreated();
    const now = new Date();
    const ageInSeconds = (now - created) / 1000;

    if (ageInSeconds < 60) {
      const originalName = file.getName();
      const newName = `${team}_${fileType}_${originalName}`;
      file.setName(newName);
      file.setDescription(`Team: ${team}`);
    }
  }
}


function renderMinutesBlock(team) {
  try {
    const folderId = '1a-u90x4-GjhzyoiscckMvYx6Q1K8vAQZ'; 
    const files = getLatestMinutesFiles(team, folderId, 10); //change to allow more files

    let html = `<div style="font-family: Lato, sans-serif; font-size: 14px;">`;

    files.forEach(file => {
    // Try to get createdTime or fallback to createdDate or null
    const createdDateStr = file.createdTime || null;

    let formattedDate = 'Unknown date';
    if (createdDateStr) {
      const createdDate = new Date(createdDateStr);
      formattedDate = Utilities.formatDate(createdDate, Session.getScriptTimeZone(), "MMM d, yyyy");
    }

    const url = `https://drive.google.com/file/d/${file.id}/view`;
    html += `<li style="margin-bottom: 10px;"><a href="${url}" target="_blank">${file.name}</a> (${formattedDate})</li>`;
  });

    return html;
  } catch (e) {
    return `<p>Error: ${e.message}</p>`;
  }
}

function renderOpsPlanBlock(team) {
  try {
    const folderId = '1a-u90x4-GjhzyoiscckMvYx6Q1K8vAQZ'; 
    const files = getLatestOpsFile(team, folderId); //change to allow more files

    let html = `<div style="font-family: Lato, sans-serif; font-size: 14px;">`;

    files.forEach(file => {
    // Try to get createdTime or fallback to createdDate or null
    const createdDateStr = file.createdTime || null;

    let formattedDate = 'Unknown date';
    if (createdDateStr) {
      const createdDate = new Date(createdDateStr);
      formattedDate = Utilities.formatDate(createdDate, Session.getScriptTimeZone(), "MMM d, yyyy");
    }

    const url = `https://drive.google.com/file/d/${file.id}/view`;
    html += `<li style="margin-bottom: 10px;"><a href="${url}" target="_blank">${file.name}</a> (${formattedDate})</li>`;
  });

    return html;
  } catch (e) {
    return `<p>Error: ${e.message}</p>`;
  }
}

function getLatestMinutesFiles(team, folderId, maxFiles) {
  console.log(`getLatestMinutesFiles`);
  const teamPrefix = `${team}_minutes`;
  console.log(`teamPrefix: ${teamPrefix}`);
  const response = Drive.Files.list({
    q: `'${folderId}' in parents and mimeType='application/pdf' and trashed=false and name contains '${teamPrefix}'`,
    orderBy: 'createdTime desc',
    maxResults: maxFiles,
    fields: 'files(id,name,createdTime)'
  });

  return response.files || response.items || [];
}

function getLatestOpsFile(team, folderId) {
  console.log(`getLatestOpsFile`);
  const teamPrefix = `${team}_ops`;
  console.log(`teamPrefix: ${teamPrefix}`);
  const response = Drive.Files.list({
    q: `'${folderId}' in parents and mimeType='application/pdf' and trashed=false and name contains '${teamPrefix}'`,
    orderBy: 'createdTime desc',
    maxResults: 10, // get a few in case of false positives
    fields: 'files(id,name,createdTime)'
  });

  // Filter to the most recently created ops file
  const matchingFile = response.files.find(file => file.name.startsWith('teamName_ops'));
  console.log(matchingFile);
  return matchingFile || null; // Return the matching file or null if none found
}

