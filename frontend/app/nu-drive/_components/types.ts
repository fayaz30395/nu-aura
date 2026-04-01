// Shared types for nu-drive components

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  starred?: boolean;
  shared?: boolean;
  webViewLink?: string;
  webContentLink?: string;
  sharingUser?: { displayName: string; emailAddress?: string };
  owners?: { displayName: string; emailAddress?: string; photoLink?: string }[];
  iconLink?: string;
}

export interface DriveFileMetadata {
  name: string;
  mimeType: string;
  parents?: string[];
  modifiedTime?: string;
  iconLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  owners?: { displayName: string; emailAddress?: string; photoLink?: string }[];
  shared?: boolean;
  starred?: boolean;
  sharingUser?: { displayName: string; emailAddress?: string };
  permissions?: { type: string; role: string; emailAddress?: string }[];
}

export interface DriveStats {
  used: number;
  limit: number;
  usedInDrive: number;
  usedInTrash: number;
}

export type ViewTab = 'my-drive' | 'shared' | 'starred' | 'recent';
