async function uploadFileToGitHub(fileName, fileBlob, commitMessage) {
  safeLog('uploadFileToGitHub', 'info', `${fileName}`);
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
  } catch (err) {
    safeLog('uploadFileToGitHub', 'error', `${err}`);
  }

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
    const msg = response.getContentText();
    safeLog('uploadFileToGitHub', 'error', `${msg}`);
    throw new Error(`Failed to upload file to GitHub: ${msg}`);
  }
}