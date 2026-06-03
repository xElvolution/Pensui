import Link from "next/link";
import { formatSui } from "@/lib/constants";
import { timeAgo } from "@/lib/utils";
import { Mono } from "@/components/ui/mono";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

export interface ArticleCardProps {
  id: string;
  title: string;
  description?: string;
  creator: string;
  createdAt: number;
  mintPrice: number;
  readPrice: number;
  totalMints: number;
  subscriptionRequired: boolean;
  blobId: string;
}

export function ArticleCard({ article }: { article: ArticleCardProps }) {
  const isFree = article.readPrice === 0 && !article.subscriptionRequired;
  const isMintable = article.mintPrice > 0;

  return (
    <Link href={`/article/${article.id}`} className="block card card-hover group h-full">
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {isFree && <Badge tone="success">Free</Badge>}
        {article.subscriptionRequired && <Badge tone="warning">Subscribers</Badge>}
        {!isFree && !article.subscriptionRequired && article.readPrice > 0 && (
          <Badge tone="neutral">{formatSui(article.readPrice)}</Badge>
        )}
        {isMintable && (
          <Badge tone="accent">
            <Sparkles className="w-3 h-3" strokeWidth={2} />
            Mintable
          </Badge>
        )}
      </div>

      <h3 className="text-[17px] font-semibold leading-snug tracking-tight mb-2 line-clamp-2 group-hover:text-[color:var(--accent-hover)] transition-colors duration-200">
        {article.title}
      </h3>

      {article.description && (
        <p className="text-[14px] text-[color:var(--fg-muted)] leading-relaxed line-clamp-3 mb-6">
          {article.description}
        </p>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-[color:var(--border)] text-[12px]">
        <Mono value={article.creator} truncate={4} />
        <div className="flex items-center gap-4 text-[color:var(--fg-muted)]">
          {isMintable && article.totalMints > 0 && (
            <span className="mono">{article.totalMints} mints</span>
          )}
          <span className="mono">{timeAgo(article.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}
