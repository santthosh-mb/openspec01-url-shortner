import { findLinkBySlug } from "../lib/links";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await ctx.params;
  const link = await findLinkBySlug(slug);
  if (!link) {
    return new Response("Not Found", { status: 404 });
  }
  return Response.redirect(link.url, 308);
}
