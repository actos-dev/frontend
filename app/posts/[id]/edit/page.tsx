import type { Post } from "actos";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditPostForm } from "@/components/editor/edit-post-form";
import { getServerClient } from "@/lib/actos";
import { MOCK_FEED_POSTS } from "@/lib/feed-mock";

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
  } catch (_err: unknown) {
    post = MOCK_FEED_POSTS.find((p) => p.id === id) || null;
  }

  if (!post || post.deleted) {
    notFound();
  }

  return <EditPostForm post={post} />;
}
