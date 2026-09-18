"use client";

/**
 * Chart wrappers. Recharts is pulled in with next/dynamic (ssr: false) so the chart
 * bundle stays off the critical path; a skeleton holds the space while it loads.
 */
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui";
import type { PostsRow, RevenueRow, ViewsRow } from "@/components/admin/analytics/chart-impl";

function ChartSkeleton() {
  return <Skeleton className="h-full w-full rounded-sm" />;
}

function EmptyBox({ text }: { text: string }) {
  return <div className="flex h-full items-center justify-center text-sm text-muted">{text}</div>;
}

const ViewsByDayImpl = dynamic(() => import("@/components/admin/analytics/chart-impl").then((m) => m.ViewsByDayImpl), { ssr: false, loading: () => <ChartSkeleton /> });
const RevenueImpl = dynamic(() => import("@/components/admin/analytics/chart-impl").then((m) => m.RevenueImpl), { ssr: false, loading: () => <ChartSkeleton /> });
const PostsImpl = dynamic(() => import("@/components/admin/analytics/chart-impl").then((m) => m.PostsImpl), { ssr: false, loading: () => <ChartSkeleton /> });

/** `w-full min-w-0` so the chart fills its panel instead of being floored by a sibling's min-content. */
const BOX = "w-full min-w-0";

/** Page views / unique visitors / form submits per day. */
export function ViewsByDayChart({ data, labels }: { data: ViewsRow[]; labels: { views: string; visitors: string; submits: string; empty: string } }) {
  return <div className={`h-64 ${BOX}`}>{data.length === 0 ? <EmptyBox text={labels.empty} /> : <ViewsByDayImpl data={data} labels={labels} />}</div>;
}

/** Quoted vs paid amounts per month (last 6 months). */
export function RevenueChart({ data, labels }: { data: RevenueRow[]; labels: { quoted: string; paid: string; empty: string } }) {
  const empty = data.every((r) => r.quoted === 0 && r.paid === 0);
  return <div className={`h-56 ${BOX}`}>{empty ? <EmptyBox text={labels.empty} /> : <RevenueImpl data={data} labels={labels} />}</div>;
}

/** Posts created vs published per month. */
export function PostsChart({ data, labels }: { data: PostsRow[]; labels: { created: string; published: string; empty: string } }) {
  const empty = data.every((r) => r.created === 0 && r.published === 0);
  return <div className={`h-56 ${BOX}`}>{empty ? <EmptyBox text={labels.empty} /> : <PostsImpl data={data} labels={labels} />}</div>;
}
