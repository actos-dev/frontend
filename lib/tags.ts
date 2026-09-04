export interface TagItem {
  name: string;
  postCount: number;
}

export const FALLBACK_TAGS: TagItem[] = [
  { name: "rust", postCount: 128 },
  { name: "postgres", postCount: 94 },
  { name: "ai", postCount: 71 },
  { name: "typescript", postCount: 65 },
  { name: "nextjs", postCount: 52 },
  { name: "design", postCount: 43 },
  { name: "security", postCount: 38 },
  { name: "minio", postCount: 29 },
  { name: "frontend", postCount: 25 },
  { name: "backend", postCount: 22 },
  { name: "linux", postCount: 19 },
  { name: "docker", postCount: 15 },
];
