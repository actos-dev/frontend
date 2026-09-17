"use client";

import type { Actor, Post } from "actos";
import { Search, SearchX, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { PostCard } from "@/components/feed/post-card";
import { LoadMore } from "@/components/pagination/load-more";
import { ActorSearchCard } from "@/components/search/actor-search-card";
import { CommentSearchCard } from "@/components/search/comment-search-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton, SkeletonPostCard } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { useSessionStore } from "@/lib/stores/session-store";
import { fetchVoteMapClient, type VoteMap } from "@/lib/votes";

export type SearchTabType = "post" | "comment" | "actor";

export function SearchView() {
  const searchParams = useSearchParams();

  const urlQ = searchParams.get("q") || "";
  const urlType = (searchParams.get("type") as SearchTabType) || "post";

  const [inputQuery, setInputQuery] = useState(urlQ);
  const [submittedQuery, setSubmittedQuery] = useState(urlQ);
  const [activeTab, setActiveTab] = useState<SearchTabType>(urlType);

  const [results, setResults] = useState<Array<Post | Actor>>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [votes, setVotes] = useState<VoteMap>({});
  const [votesPrincipalId, setVotesPrincipalId] = useState<string | null>(null);
  const authStatus = useSessionStore((state) => state.status);
  const sessionUserId = useSessionStore((state) => state.user?.id ?? null);
  const viewerId = authStatus === "authenticated" ? sessionUserId : null;

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const prevParamsRef = useRef(searchParams.toString());

  // Sync state only when URL searchParams changes externally (e.g. back/forward navigation)
  useEffect(() => {
    const currentStr = searchParams.toString();
    if (currentStr !== prevParamsRef.current) {
      prevParamsRef.current = currentStr;
      const q = searchParams.get("q") || "";
      const type = (searchParams.get("type") as SearchTabType) || "post";
      setInputQuery(q);
      setSubmittedQuery(q);
      setActiveTab(type);
    }
  }, [searchParams]);

  // Execute search request with AbortController
  const performSearch = useCallback(
    async (queryText: string, tab: SearchTabType) => {
      const trimmed = queryText.trim();
      if (!trimmed) {
        setResults([]);
        setNextCursor(null);
        setIsLoading(false);
        return;
      }

      // 1. İptal edilebilir istek: Abort previous request (Plan §Faz 12)
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);

      try {
        const params = new URLSearchParams();
        params.set("q", trimmed);
        params.set("type", tab);
        params.set("limit", "25");

        const res = await fetch(`/api/search?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = await res.json();

        if (!res.ok || !data.ok) {
          if (!controller.signal.aborted) {
            toast.error(data.detail || data.title || "Arama gerçekleştirilemedi.");
          }
          return;
        }

        if (!controller.signal.aborted) {
          const items: Array<Post | Actor> = data.items || [];
          setResults(items);
          setNextCursor(data.nextCursor ?? null);
          setSubmittedQuery(trimmed);

          // P0-06: a fresh search replaces the vote map wholesale rather than
          // merging, since the previous results are gone. Anonymous viewers
          // never trigger this request.
          if (tab === "post" && viewerId && useSessionStore.getState().user?.id === viewerId) {
            const ids = (items as Post[]).map((post) => post.id);
            const newVotes = await fetchVoteMapClient(ids);
            if (!controller.signal.aborted && useSessionStore.getState().user?.id === viewerId) {
              setVotes(newVotes);
              setVotesPrincipalId(viewerId);
            }
          } else if (tab !== "post") {
            setVotes({});
            setVotesPrincipalId(null);
          }
        }
      } catch (err: unknown) {
        if ((err as Error).name !== "AbortError") {
          toast.error("Bağlantı hatası: Arama tamamlanamadı.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [viewerId],
  );

  // Initial load if query is in URL
  useEffect(() => {
    if (urlQ) {
      performSearch(urlQ, activeTab);
    }
  }, [urlQ, activeTab, performSearch]);

  // Update URL helper (uses history.replaceState to prevent flooding browser history)
  const syncUrl = (q: string, type: SearchTabType) => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (type !== "post") params.set("type", type);
    const newUrl = `/search${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState(null, "", newUrl);
  };

  // Handle Input Typing: Instant Skeleton + Cancel + 300ms Debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputQuery(value);

    // Cancel pending timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Cancel any active inflight request immediately
    abortControllerRef.current?.abort();

    if (!value.trim()) {
      setIsLoading(false);
      setSubmittedQuery("");
      setResults([]);
      setNextCursor(null);
      setVotes({});
      syncUrl("", activeTab);
      return;
    }

    // Kritik Kural: Arama kutusuna yazılırken anında Skeleton yükleme durumu gösterilmeli
    setIsLoading(true);

    // Kritik Kural: 300ms debounce ile sunucuya gereksiz istek engellenmeli
    debounceTimerRef.current = setTimeout(() => {
      syncUrl(value, activeTab);
      performSearch(value, activeTab);
    }, 300);
  };

  // Handle Clear Button (x)
  const handleClear = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    abortControllerRef.current?.abort();

    setInputQuery("");
    setSubmittedQuery("");
    setResults([]);
    setNextCursor(null);
    setVotes({});
    setIsLoading(false);
    syncUrl("", activeTab);
  };

  // Handle Tab Switch
  const handleTabChange = (value: string) => {
    const newTab = value as SearchTabType;
    setActiveTab(newTab);
    syncUrl(inputQuery, newTab);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    abortControllerRef.current?.abort();

    if (inputQuery.trim()) {
      setIsLoading(true);
      performSearch(inputQuery, newTab);
    }
  };

  // Keyset Cursor Pagination
  const handleLoadMore = async (cursor: string) => {
    if (isLoadingMore || !submittedQuery.trim()) return;
    setIsLoadingMore(true);

    try {
      const params = new URLSearchParams();
      params.set("q", submittedQuery.trim());
      params.set("type", activeTab);
      params.set("cursor", cursor);
      params.set("limit", "25");

      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.ok) {
        toast.error(data.detail || data.title || "Daha fazla sonuç yüklenemedi.");
        return;
      }

      const newItems: Array<Post | Actor> = data.items || [];
      const newNextCursor = data.nextCursor ?? null;

      setResults((prev) => {
        const existingIds = new Set(prev.map((item) => item.id));
        const filtered = newItems.filter((item: { id: string }) => !existingIds.has(item.id));
        return [...prev, ...filtered];
      });

      setNextCursor(newNextCursor);

      // P0-06: fetch the viewer's votes for the newly appended post results.
      if (activeTab === "post" && useSessionStore.getState().status === "authenticated") {
        const newVotes = await fetchVoteMapClient((newItems as Post[]).map((post) => post.id));
        setVotes((prev) => ({ ...prev, ...newVotes }));
      }
    } catch {
      toast.error("Bağlantı hatası: Sonraki sayfa yüklenemedi.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Arama Çubuğu */}
      <div className="relative max-w-2xl">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          value={inputQuery}
          onChange={handleInputChange}
          placeholder="Gönderiler, yorumlar ve aktörlerde ara..."
          className="pl-10 pr-10 h-11 text-base sm:text-sm rounded-xl bg-surface-2 border-border/70 focus-visible:ring-primary shadow-xs"
          aria-label="Arama kutusu"
          autoFocus
        />
        {inputQuery && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Aramayı temizle"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Sekmeler (Tabs: post | comment | actor) */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex rounded-xl bg-surface-2 p-1">
          <TabsTrigger
            value="post"
            onClick={() => handleTabChange("post")}
            className="rounded-lg text-xs sm:text-sm"
          >
            Gönderiler
          </TabsTrigger>
          <TabsTrigger
            value="comment"
            onClick={() => handleTabChange("comment")}
            className="rounded-lg text-xs sm:text-sm"
          >
            Yorumlar
          </TabsTrigger>
          <TabsTrigger
            value="actor"
            onClick={() => handleTabChange("actor")}
            className="rounded-lg text-xs sm:text-sm"
          >
            Aktörler
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Sonuç Alanı */}
      <div className="pt-2">
        {/* 1. Yükleme Durumu: Skeleton */}
        {isLoading ? (
          <div data-testid="search-loading" className="space-y-4">
            {activeTab === "actor" ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                <SkeletonPostCard />
                <SkeletonPostCard />
                <SkeletonPostCard />
              </div>
            )}
          </div>
        ) : !inputQuery.trim() ? (
          /* 2. Boş Durum: Arama yapılmadığında */
          <div className="py-12 px-4 sm:px-6">
            <EmptyState
              icon={Search}
              title="Aramak istediğiniz terimi yazın; gönderiler, yorumlar ve aktörler arasında arayın."
              description="İçerik başlıkları, metinler, etiketler veya kullanıcı adları arasında anında filtreleme yapabilirsiniz."
            />
          </div>
        ) : results.length === 0 ? (
          /* 3. Boş Durum: Sıfır sonuç */
          <div className="py-12 px-4 sm:px-6">
            <EmptyState
              icon={SearchX}
              title={`‘${submittedQuery || inputQuery}’ için hiçbir sonuç bulunamadı.`}
              description="Farklı anahtar kelimeler deneyebilir veya etiketler sayfasına göz atabilirsiniz."
              action={{
                label: "Etiketlere Göz At",
                href: "/tags",
                variant: "outline",
              }}
            />
          </div>
        ) : (
          /* 4. Sonuç Listesi */
          <div data-testid="search-results">
            {activeTab === "post" && (
              <div className="divide-y divide-border/40 -mx-4 sm:-mx-6">
                {(results as Post[]).map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    initialUserVote={votesPrincipalId === viewerId ? (votes[post.id] ?? 0) : 0}
                    initialViewerId={viewerId}
                    highlightQuery={submittedQuery || inputQuery}
                  />
                ))}
              </div>
            )}

            {activeTab === "comment" && (
              <div className="divide-y divide-border/40 -mx-4 sm:-mx-6">
                {(results as Post[]).map((comment) => (
                  <CommentSearchCard
                    key={comment.id}
                    comment={comment}
                    highlightQuery={submittedQuery || inputQuery}
                  />
                ))}
              </div>
            )}

            {activeTab === "actor" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {(results as Actor[]).map((actor) => (
                  <ActorSearchCard
                    key={actor.id || actor.username}
                    actor={actor}
                    highlightQuery={submittedQuery || inputQuery}
                  />
                ))}
              </div>
            )}

            <LoadMore
              nextCursor={nextCursor}
              onLoadMore={handleLoadMore}
              isLoading={isLoadingMore}
              label="Daha fazla sonuç yükle"
              loadingLabel="Sonuçlar yükleniyor..."
            />
          </div>
        )}
      </div>
    </div>
  );
}
