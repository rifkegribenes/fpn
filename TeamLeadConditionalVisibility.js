const TEAM_LEADS_GROUP_EMAIL = "team-leads@friendsofportlandnet.org"; 
const ADMIN_GROUP_EMAIL = "adminteam@friendsofportlandnet.org"; 
const ss = 

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
function getTeamData(teamParam, userEmail) {
  // Simulate team lookup in Google Sheet
  const sheet = SpreadsheetApp.openById('YOUR_SHEET_ID').getSheetByName('Teams');
  const data = sheet.getDataRange().getValues();

  // If no team param, lookup user’s team
  let teamToShow = teamParam;
  if (!teamToShow) {
    const isTeamLead = checkGroupMembership(TEAM_LEADS_GROUP_EMAIL, userEmail);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    console.log(`ss: ${ss}`);

    // if user is a team lead, extract team from email address
    if (isTeamLead) {
      teamToShow = tlTeamLookup(userEmail, ss);
      console.log(`team lead teamToShow: ${teamToShow}`);
    } else {
      // if user is NOT a team lead, find user team based on personal email
      const neighborhood = neighborhoodLookup(userEmail, ss);
      teamToShow = teamLookup(neighborhood, ss);
      console.log(`non team lead neighborhood: ${neighborhood}, teamToShow: ${teamToShow}`);
    }
  }

  if (!teamToShow) teamToShow = "Unknown";

  // Simulate content per team
  const content = `<h3>Showing data for <strong>${teamToShow}</strong></h3>${renderContent(teamToShow, userEmail)}`;
  return content;
}


function renderContent(team, userEmail) {
  const isTeamLead = checkGroupMembership(TEAM_LEADS_GROUP_EMAIL, userEmail);
  const isAdmin = checkGroupMembership(ADMIN_GROUP_EMAIL, userEmail);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  console.log(`ss: ${ss}`);

  let content = `
    <div style="font-family: sans-serif; padding: 20px;">
      ${showPublicContent()}
      ${isTeamLead ? showTeamLeadContent() : ""}
      ${isAdmin ? showAdminContent() : ""}
    </div>
  `;

  return HtmlService.createHtmlOutput(content)
           .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function checkGroupMembership(groupEmail, userEmail) {
  try {
    const member = AdminDirectory.Members.get(groupEmail, userEmail);
    return member && member.status === "ACTIVE";
  } catch (e) {
    return false;
  }
}

function showPublicContent() {
  return `
    <h2>Public content: ${userTeam}</h2>
  `;
}

function showTeamLeadContent() {
  return `
    <h3>Team Lead Resources</h3>
    <iframe src="https://docs.google.com/forms/d/e/1FAIpQLSe9TU8URPswEVELyy9jOImY2_2vJ9OOE7O8L5JlNUuiJzPQYQ/viewform?embedded=true" width="640" height="800" frameborder="0">Loading…</iframe>
  `;
}

function showAdminContent() {
  return `
    <h3>Admin only content</h3>
    <p>Here's some text or another form.</p>
  `;
}
