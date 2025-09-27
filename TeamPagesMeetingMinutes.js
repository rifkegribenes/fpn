function doGet() {
  try {
    const folderId = '1a-u90x4-GjhzyoiscckMvYx6Q1K8vAQZ'; 
    const files = getLatestPdfFiles(folderId, 10); //change to allow more files

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

    return HtmlService.createHtmlOutput(html)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (e) {
    return HtmlService.createHtmlOutput(`Error: ${e.message}`);
  }
}

function getLatestPdfFiles(folderId, maxFiles) {
  const response = Drive.Files.list({
    q: `'${folderId}' in parents and mimeType='application/pdf' and trashed=false`,
    orderBy: 'createdTime desc',
    maxResults: maxFiles,
    fields: 'files(id,name,createdTime)'
  });
  return response.items || response.files || [];
}

