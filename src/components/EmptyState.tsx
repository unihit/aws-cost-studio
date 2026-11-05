import { Boxes, Plus, Wand2 } from "lucide-react";

interface EmptyStateProps {
  onAdd: () => void;
  onPreset: () => void;
}

export function EmptyState({ onAdd, onPreset }: EmptyStateProps) {
  return (
    <div className="relative col-span-full overflow-hidden rounded-2xl border border-dashed border-zinc-300 bg-white/60 px-6 py-12 text-center dark:border-white/15 dark:bg-white/[0.02]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.10),transparent_65%)]" />
      <div className="relative mx-auto flex max-w-md flex-col items-center">
        <div className="relative">
          <span className="absolute -inset-3 rounded-2xl bg-indigo-500/10 blur-xl" />
          <span className="relative grid h-14 w-14 place-items-center rounded-2xl border border-zinc-200 bg-white text-indigo-500 shadow-card dark:border-white/10 dark:bg-white/[0.05] dark:shadow-none">
            <Boxes size={24} strokeWidth={1.6} />
          </span>
          <span className="absolute -top-1 -right-2 grid h-6 w-6 place-items-center rounded-full bg-indigo-600 text-white shadow-lg">
            <Plus size={12} strokeWidth={3} />
          </span>
        </div>

        <h3 className="mt-5 text-base font-bold tracking-tight text-zinc-900 dark:text-white">
          아직 구성이 비어 있습니다
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-500">
          서비스 카탈로그에서 리소스를 추가하거나, 프리셋으로 검증된 아키텍처에서 시작해 보세요.
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-[0_8px_24px_-10px_rgba(79,70,229,.9)] transition hover:bg-indigo-500"
          >
            <Plus size={14} strokeWidth={2.4} />
            서비스 둘러보기
          </button>
          <button
            type="button"
            onClick={onPreset}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:border-white/20 dark:hover:text-white"
          >
            <Wand2 size={14} />
            프리셋 보기
          </button>
        </div>

        <p className="mt-4 font-mono text-[10px] tracking-[0.12em] text-zinc-400 uppercase dark:text-zinc-600">
          EC2 · RDS · S3 · EBS · NAT · ALB · Data Transfer
        </p>
      </div>
    </div>
  );
}
