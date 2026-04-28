import { Prisma } from "../generated/prisma/client";
import { prisma } from "./db";
import { generateSlug } from "./slug";

const MAX_SLUG_RETRIES = 5;

export class SlugGenerationError extends Error {
  constructor() {
    super("Could not generate a unique slug after multiple attempts");
    this.name = "SlugGenerationError";
  }
}

export async function createLink(url: string): Promise<{ slug: string; url: string }> {
  for (let attempt = 0; attempt < MAX_SLUG_RETRIES; attempt++) {
    const slug = generateSlug();
    try {
      const link = await prisma.link.create({ data: { slug, url } });
      return { slug: link.slug, url: link.url };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        continue;
      }
      throw err;
    }
  }
  throw new SlugGenerationError();
}

export async function findLinkBySlug(slug: string): Promise<{ url: string } | null> {
  const row = await prisma.link.findUnique({ where: { slug } });
  return row ? { url: row.url } : null;
}
