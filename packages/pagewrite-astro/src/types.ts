export interface RemoteMdxOptions {
  siteId: string;
  token?: string;
  tokenEnvVar?: string;
  outputDir?: string;
  clean?: boolean;
  verbose?: boolean;
}

export interface SchemaField {
  id: string;
  name: string;
  type: string;
  required?: boolean;
  [key: string]: unknown;
}

export interface SiteSchema {
  id: string;
  name?: string;
  fields: SchemaField[];
}

export interface StaticTreeChild {
  id: string;
  title?: string;
  isFolder: boolean;
  children?: StaticTreeChild[];
  databaseType?: string;
  lang?: string;
  schemaId?: string;
}

export interface PageTreeFolderNode {
  id: string;
  type: "folder";
  title: string;
  path: string;
  databaseType?: string;
  lang?: string;
  schemaId?: string;
  children: PageTreeNode[];
}

export interface PageTreeFileNode {
  id: string;
  type: "file";
  title: string;
  path: string;
  storageFile: string;
  parentFolderId?: string;
}

export type PageTreeNode = PageTreeFolderNode | PageTreeFileNode;

export interface PageMapNode {
  id: string;
  title: string;
  slug: string;
  children?: PageMapNode[];
}

export interface SitePages {
  siteId: string;
  rootFolderId: string;
  rootSchemaId?: string;
  pages: PageTreeNode[];
  tags: Record<string, unknown>;
}

export interface FileDocument {
  id: string;
  mdxString?: string;
  parentFolderId?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface StagedSiteContentFile {
  id: string;
  relPath: string;
  absolutePath: string;
}

export interface StagedSiteContent {
  sitePages: SitePages;
  files: StagedSiteContentFile[];
}

export interface RemoteMdxLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}
