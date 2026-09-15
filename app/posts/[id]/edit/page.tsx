import type { Post } from "actos";
import { GoneError, NotFoundError } from "actos";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditPostForm } from "@/components/editor/edit-post-form";
import { ErrorStateRetry } from "@/components/ui/error-state-retry";
import { Gone } from "@/components/ui/gone";
import { getServerClient } from "@/lib/actos";
import { describeError } from "@/lib/errors";

interface EditPostPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata(props: EditPostPageProps): Promise<Metadata> {
  const { id } = await props.params;
  return {
    title: `Gönderiyi Düzenle (${id}) — Actos`,
    robots: { index: false, follow: false },
  };
}

export default async function EditPostPage(props: EditPostPageProps) {
  const { id } = await props.params;

  let post: Post | null = null;
  try {
    const client = await getServerClient();
    post = (await client.posts.get(id)) as Post;
  } catch (err: unknown) {
    if (err instanceof GoneError || describeError(err).status === 410) {
      return (
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
          <Gone />
        </div>
      );
    }
    if (err instanceof NotFoundError || describeError(err).status === 404) {
      notFound();
    }
    // A real backend failure (500, 429, timeout, connection): render an
    // error state, never fabricated post content (ROADMAP.md P0-02).
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        <ErrorStateRetry {...describeError(err)} />
      </div>
    );
  }

  if (!post || post.deleted) {
    notFound();
  }

  return <EditPostForm post={post} />;
}
