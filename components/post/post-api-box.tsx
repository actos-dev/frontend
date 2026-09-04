"use client";

import { ApiCornerBox } from "@/components/api/api-corner-box";

export interface PostApiBoxProps {
  postId: string;
  apiUrl?: string;
  className?: string;
  defaultOpen?: boolean;
}

/**
 * PostApiBox (Plan §10.1)
 * Wrapper around the generic ApiCornerBox for post detail pages.
 */
export function PostApiBox({ postId, apiUrl, className, defaultOpen = true }: PostApiBoxProps) {
  return (
    <div data-testid="post-api-box">
      <ApiCornerBox
        endpoint={`/posts/${postId}`}
        apiUrl={apiUrl}
        className={className}
        variant="inline"
        defaultOpen={defaultOpen}
      />
    </div>
  );
}
