"use client";

import { useEffect } from "react";

/**
 * Removes `notice` and `tone` from the address bar after the notice has been rendered, keeping every
 * other parameter (tab, filters, search). history.replaceState is used deliberately: router.replace
 * would re-run the server component and make the message disappear while the user is still reading it.
 */
export function NoticeUrlCleanup() {
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (!url.searchParams.has("notice") && !url.searchParams.has("tone")) return;
      url.searchParams.delete("notice");
      url.searchParams.delete("tone");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    } catch {
      // A malformed URL is not worth breaking the page over; the notice stays in the address bar.
    }
  }, []);
  return null;
}
