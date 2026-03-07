import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SiteContentMap = Record<string, string>;

export function useSiteContent() {
  const [content, setContent] = useState<SiteContentMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_content")
        .select("key, value");
      const map: SiteContentMap = {};
      (data || []).forEach((row: any) => {
        map[row.key] = row.value;
      });
      setContent(map);
      setLoading(false);
    })();
  }, []);

  const get = (key: string, fallback: string = "") => content[key] ?? fallback;

  return { content, get, loading };
}
