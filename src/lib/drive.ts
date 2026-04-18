import { google } from 'googleapis';

export function getDriveClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth });
}

export async function getOrCreateFolder(
  drive: ReturnType<typeof google.drive>,
  name: string,
  parentId: string
): Promise<string> {
  const res = await drive.files.list({
    q: `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
    fields: 'files(id)',
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  const folder = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  });

  return folder.data.id!;
}

export async function uploadFileToDrive(
  accessToken: string,
  file: Buffer,
  fileName: string,
  mimeType: string,
  tipo: 'guias' | 'facturas'
): Promise<string> {
  const drive = getDriveClient(accessToken);
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID!;
  const subFolderId = await getOrCreateFolder(drive, tipo, rootFolderId);

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [subFolderId],
    },
    media: {
      mimeType,
      body: require('stream').Readable.from(file),
    },
    fields: 'id',
  });

  return res.data.id!;
}

export async function getFileUrl(accessToken: string, fileId: string): Promise<string> {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

export async function deleteFileFromDrive(accessToken: string, fileId: string): Promise<void> {
  const drive = getDriveClient(accessToken);
  await drive.files.delete({ fileId });
}
