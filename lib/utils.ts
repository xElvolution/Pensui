import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const numberFormatter = new Intl.NumberFormat("en-US");

export function formatNumber(n: number | bigint): string {
  return numberFormatter.format(typeof n === "bigint" ? n : Math.floor(Number(n)));
}

export function timeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 365) return `${Math.floor(days / 365)}y ago`;
  if (days > 30) return `${Math.floor(days / 30)}mo ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

export function extractPreview(content: string, maxLength = 150): string {
  try {
    const parsed = JSON.parse(content);
    const text = extractTextFromTipTap(parsed);
    return text.length > maxLength ? text.slice(0, maxLength) + "…" : text;
  } catch {
    return content.length > maxLength ? content.slice(0, maxLength) + "…" : content;
  }
}

function extractTextFromTipTap(node: Record<string, unknown>): string {
  if (node.type === "text" && typeof node.text === "string") return node.text;
  if (Array.isArray(node.content)) {
    return node.content.map((child: Record<string, unknown>) => extractTextFromTipTap(child)).join(" ");
  }
  return "";
}

export function readingTime(content: string): string {
  const text = extractPreview(content, 100000);
  const words = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 220));
  return `${minutes} min read`;
}
