import { useRef, useState } from "react";
import { Check, ClipboardCopy, Download, RotateCcw, Upload } from "lucide-react";
import type { CostSummary, Currency, PricingData, Resource } from "../types";
import { buildMarkdownReport, copyText, downloadJson, parseImportedResources } from "../lib/export";
import { NumberField, cn } from "./Primitives";
import type { ToastTone } from "../hooks/useToast";

interface ExportPanelProps {
  resources: Resource[];
  summary: CostSummary;
  pricing: PricingData;
  currency: Currency;
  fx: number;
  onFxChange: (fx: number) => void;
  onImport: (resources: Resource[]) => void;
  onReset: () => void;
  pushToast: (message: string, options?: { tone?: ToastTone; duration?: number }) => number;
}

export function ExportPanel({
  resources,
  summary,
  pricing,
  currency,
  fx,
  onFxChange,
  onImport,
  onReset,
  pushToast,
}: ExportPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleCopy = async () => {
    if (!resources.length) {
      pushToast("복사할 리소스가 없습니다. 먼저 구성을 추가해 주세요.", { tone: "warn" });
      return;
    }
    try {
      await copyText(buildMarkdownReport(resources, summary, currency, fx, pricing));
      pushToast("Markdown 리포트를 클립보드에 복사했습니다.", { tone: "success" });
    } catch {
      pushToast("클립보드에 접근할 수 없습니다.", { tone: "warn" });
    }
  };

  const handleDownload = () => {
    if (!resources.length) {
      pushToast("내보낼 리소스가 없습니다.", { tone: "warn" });
      return;
    }
    downloadJson(resources, currency, fx, summary);
    pushToast("JSON 파일을 저장했습니다.", { tone: "success" });
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 2_000_000) {
      pushToast("2MB 이하의 JSON 파일만 불러올 수 있습니다.", { tone: "warn" });
      return;
    }
    setBusy(true);
    try {
      const text = await file.text();
      const imported = parseImportedResources(JSON.parse(text));
      onImport(imported);
      pushToast(`${imported.length}개 리소스를 불러왔습니다.`, { tone: "success" });
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "JSON 파일을 읽을 수 없습니다.", { tone: "warn" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      id="export"
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-card dark:border-white/[0.08] dark:bg-white/[0.035] dark:shadow-none"
    >
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-white">내보내기 & 설정</h2>
          <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-500">리포트 공유, 백업, 환율 조정</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/[0.07] px-2 py-0.5 text-[9px] font-bold tracking-wide text-emerald-600 dark:text-emerald-400">
          <Check size={10} strokeWidth={3} /> 자동 저장
        </span>
      </div>

      <div className="space-y-3 px-5 pt-4 pb-5">
        <NumberField
          label="KRW 기준 환율"
          hint="1 USD 기준"
          value={fx}
          onChange={onFxChange}
          min={800}
          max={2500}
          step={1}
          unit="KRW"
        />

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-900 px-3 py-2.5 text-[11px] font-semibold text-white transition hover:bg-zinc-800 dark:border-transparent dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <ClipboardCopy size={13} />
            Markdown 리포트 복사
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[11px] font-semibold text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:border-white/20 dark:hover:text-white"
          >
            <Download size={13} />
            JSON 저장
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[11px] font-semibold text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:border-white/20 dark:hover:text-white",
            )}
          >
            <Upload size={13} />
            JSON 불러오기
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={handleFile}
          className="hidden"
          aria-label="JSON 파일 선택"
        />

        <div className="flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-white/[0.06]">
          <p className="text-[10px] leading-relaxed text-zinc-400 dark:text-zinc-600">
            브라우저 로컬에만 저장 · 외부 전송 없음
          </p>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-[10px] font-semibold text-zinc-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
          >
            <RotateCcw size={11} />
            초기화
          </button>
        </div>
      </div>
    </section>
  );
}
