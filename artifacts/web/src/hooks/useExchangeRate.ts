import { useQuery } from "@tanstack/react-query";

const FALLBACK_RATE = 70; // 1 USD ≈ 70 GMD (admin-configurable)

export function useExchangeRate(): number {
  const { data } = useQuery({
    queryKey: ["exchange-rate"],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}api/settings/exchange-rate`);
      if (!res.ok) return FALLBACK_RATE;
      const json = await res.json();
      return typeof json.usdToGmd === "number" ? json.usdToGmd : FALLBACK_RATE;
    },
    staleTime: 5 * 60 * 1000, // cache 5 minutes
    gcTime: 10 * 60 * 1000,
    initialData: FALLBACK_RATE,
  });
  return data ?? FALLBACK_RATE;
}
