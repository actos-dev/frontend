import { redirect } from "next/navigation";

interface FollowingPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function FollowingPage(props: FollowingPageProps) {
  const rawParams = props.searchParams ? await props.searchParams : {};
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(rawParams)) {
    if (key === "tab" || value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else {
      params.set(key, value);
    }
  }

  params.set("tab", "following");
  redirect(`/?${params.toString()}`);
}
