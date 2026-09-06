/**
 * Reference implementation for the service endpoints consumed by pagewrite-astro.
 * This file is documentation only and is not exported by the package.
 */

interface MdxFileRecord {
  path: string;
  content: string;
  collection: string;
  updatedAt: string;
  size: number;
}

async function getFilesForToken(token: string, collections?: string[]): Promise<MdxFileRecord[]> {
  const allFiles: MdxFileRecord[] = [
    {
      path: "blog/hello-world.mdx",
      collection: "blog",
      content: "---\ntitle: Hello World\n---\n\n# Hello!\n",
      updatedAt: "2024-06-01T12:00:00Z",
      size: 512,
    },
  ];

  if (!token.startsWith("rmx_")) {
    return [];
  }

  if (!collections?.length) {
    return allFiles;
  }

  return allFiles.filter((file) => collections.includes(file.collection));
}

function extractToken(request: Request): string | null {
  const auth = request.headers.get("Authorization") ?? "";
  const [scheme, token] = auth.split(" ");
  return scheme === "Bearer" && token ? token : null;
}

export async function handleListFiles(request: Request): Promise<Response> {
  const token = extractToken(request);

  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const collectionsParam = url.searchParams.get("collections");
  const collections = collectionsParam
    ? collectionsParam.split(",").map((collection) => collection.trim())
    : undefined;
  const files = await getFilesForToken(token, collections);

  return Response.json({
    files: files.map(({ path, updatedAt, size }) => ({
      path,
      updatedAt,
      size,
    })),
    total: files.length,
  });
}

export async function handleFetchFiles(request: Request): Promise<Response> {
  const token = extractToken(request);

  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { paths?: unknown };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 422 });
  }

  if (!Array.isArray(body.paths) || body.paths.some((path) => typeof path !== "string")) {
    return Response.json({ error: "paths must be an array of strings" }, { status: 422 });
  }

  const allFiles = await getFilesForToken(token);
  const allowed = new Map(allFiles.map((file) => [file.path, file]));

  return Response.json({
    files: body.paths
      .map((path) => allowed.get(path))
      .filter((file): file is MdxFileRecord => Boolean(file))
      .map((file) => ({ path: file.path, content: file.content })),
    fetchedAt: new Date().toISOString(),
  });
}
