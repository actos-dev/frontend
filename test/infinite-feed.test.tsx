// @vitest-environment happy-dom

import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useInfiniteSentinel } from "@/components/pagination/use-infinite-sentinel";

let observerCallback: IntersectionObserverCallback;
const observe = vi.fn();
const disconnect = vi.fn();

class IntersectionObserverMock {
  constructor(callback: IntersectionObserverCallback) {
    observerCallback = callback;
  }

  observe = observe;
  disconnect = disconnect;
  unobserve = vi.fn();
  takeRecords = vi.fn(() => []);
  root = null;
  rootMargin = "600px 0px";
  thresholds = [0];
}

function Sentinel({
  enabled,
  onIntersect,
}: {
  enabled: boolean;
  onIntersect: () => Promise<void>;
}) {
  const ref = useInfiniteSentinel({ enabled, onIntersect });
  return <div ref={ref} data-testid="sentinel" />;
}

describe("Phase 3 infinite feed sentinel", () => {
  beforeEach(() => {
    observe.mockClear();
    disconnect.mockClear();
    vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads when the sentinel approaches the viewport and disconnects on unmount", async () => {
    const onIntersect = vi.fn().mockResolvedValue(undefined);
    const view = render(<Sentinel enabled={true} onIntersect={onIntersect} />);

    expect(observe).toHaveBeenCalledWith(view.getByTestId("sentinel"));
    await act(async () => {
      observerCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });
    expect(onIntersect).toHaveBeenCalledTimes(1);

    view.unmount();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it("does not create an observer while automatic loading is disabled", () => {
    const onIntersect = vi.fn().mockResolvedValue(undefined);
    render(<Sentinel enabled={false} onIntersect={onIntersect} />);

    expect(observe).not.toHaveBeenCalled();
    expect(onIntersect).not.toHaveBeenCalled();
  });
});
