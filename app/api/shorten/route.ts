import { getBaseUrl } from "../../lib/config";
import { createLink, SlugGenerationError } from "../../lib/links";
import { InvalidUrlError, validateUrl } from "../../lib/url";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "request body must be valid JSON" }, { status: 400 });
  }

  const candidate =
    body && typeof body === "object" && "url" in body
      ? (body as { url: unknown }).url
      : undefined;

  let url: string;
  try {
    url = validateUrl(candidate);
  } catch (err) {
    if (err instanceof InvalidUrlError) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  let slug: string;
  try {
    ({ slug } = await createLink(url));
  } catch (err) {
    if (err instanceof SlugGenerationError) {
      return Response.json({ error: err.message }, { status: 500 });
    }
    throw err;
  }

  return Response.json(
    { slug, shortUrl: `${getBaseUrl()}/${slug}` },
    { status: 201 },
  );
}
