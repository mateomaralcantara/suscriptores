export type OrderService = {
  id: string;
  platform: string;
  icon: string;
  name: string;
  description: string;
  category: string;
  type: string;
  rate: number;
  min: number;
  max: number;
  refill: boolean;
  cancel: boolean;
};

export const orderPlatforms = [
  "All",
  "Instagram",
  "TikTok",
  "YouTube",
  "Facebook",
  "Spotify",
  "Telegram",
  "Twitter",
  "WhatsApp",
  "Traffic",
  "Twitch",
  "Other",
] as const;

export function inferPlatform(text: string) {
  const value = text.toLowerCase();
  if (value.includes("instagram")) return "Instagram";
  if (value.includes("tiktok")) return "TikTok";
  if (value.includes("youtube")) return "YouTube";
  if (value.includes("facebook")) return "Facebook";
  if (value.includes("spotify")) return "Spotify";
  if (value.includes("telegram")) return "Telegram";
  if (value.includes("twitter") || /(^|\s)x(\s|$)/.test(value)) return "Twitter";
  if (value.includes("whatsapp")) return "WhatsApp";
  if (value.includes("traffic") || value.includes("website")) return "Traffic";
  if (value.includes("twitch")) return "Twitch";
  return "Other";
}

export function iconForPlatform(platform: string) {
  switch (platform) {
    case "Instagram": return "◎";
    case "TikTok": return "♪";
    case "YouTube": return "▶";
    case "Facebook": return "f";
    case "Spotify": return "●";
    case "Telegram": return "✈";
    case "Twitter": return "𝕏";
    case "WhatsApp": return "◉";
    case "Traffic": return "↗";
    case "Twitch": return "▣";
    default: return "◇";
  }
}
