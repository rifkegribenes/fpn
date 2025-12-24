function uploadFileToGitHub(fileName, fileBlob, commitMessage) {
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_PAT');
  const user = PropertiesService.getScriptProperties().getProperty('GITHUB_USER');
  const repo = PropertiesService.getScriptProperties().getProperty('GITHUB_REPO');

  const path = encodeURIComponent(fileName);
  const content = Utilities.base64Encode(fileBlob.getBytes());

  // Check if file exists to get SHA
  let sha;
  try {
    const getResponse = UrlFetchApp.fetch(`https://api.github.com/repos/${user}/${repo}/contents/${path}`, {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
      muteHttpExceptions: true
    });
    const data = JSON.parse(getResponse.getContentText());
    if (data.sha) sha = data.sha;
  } catch (err) {}

  const payload = { message: commitMessage, content: content };
  if (sha) payload.sha = sha;

  const options = {
    method: 'put',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(`https://api.github.com/repos/${user}/${repo}/contents/${path}`, options);
  const json = JSON.parse(response.getContentText());

  if (json.content && json.content.path) {
    return `https://${user}.github.io/${repo}/${fileName}`;
  } else {
    throw new Error('Failed to upload file to GitHub: ' + response.getContentText());
  }
}

function onBannerEdit(e) {
  safeLog('onBannerEdit', 'info', 'Function called (banner edit)');
  try {
    const range = e.range;
    const sheet = range.getSheet();

    // Only run on TeamPageUpdate sheet
    if (sheet.getName() !== 'TeamPageUpdate') return;

    const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
    const col = name => headers.indexOf(name) + 1;

    const bannerCol = col('Upload banner photo here');
    const publicUrlCol = col('BannerPublicURL');
    const teamCol = col('Your Team');

    // Only react when banner upload column changes
    if (range.getColumn() !== bannerCol) return;

    safeLog('onBannerEdit', 'info', 'Function called (banner edit)');

    const row = range.getRow();
    if (row === 1) return;

    const bannerUrl = sheet.getRange(row, bannerCol).getValue();
    const existingPublicUrl = sheet.getRange(row, publicUrlCol).getValue();

    // Already processed → exit
    if (!bannerUrl || existingPublicUrl) return;

    const team = sheet.getRange(row, teamCol).getValue();
    const teamSlug = globalLookup(team).shortName;

    // Extract Drive file ID
    const match = bannerUrl.match(/(?:id=|\/d\/)([a-zA-Z0-9_-]+)/);
    if (!match) throw new Error('Cannot extract Drive file ID');

    const file = DriveApp.getFileById(match[1]);

    // Rename
    const ext = file.getName().split('.').pop();
    const newName = `${teamSlug}-banner.${ext}`;
    file.setName(newName);

    // Upload to GitHub
    const publicUrl = uploadFileToGitHub(
      newName,
      file.getBlob(),
      `Upload banner for ${team}`
    );

    // Write back — THIS PREVENTS RETRIGGER
    sheet.getRange(row, publicUrlCol).setValue(publicUrl);

  } catch (err) {
    console.error('Banner upload failed', err);
  }
}