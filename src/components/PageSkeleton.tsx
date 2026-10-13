import React from "react";
import { SMS_RADIUS_SURFACE, SMS_SHADOW_SURFACE } from "./ui/tokens";

interface PageSkeletonProps {
  type?: "dashboard" | "table" | "detail" | "form" | "grid";
}

const cardNested = `bg-white border border-slate-200 p-6 rounded-2xl space-y-3 ${SMS_SHADOW_SURFACE}`;
const cardPrimary = `bg-white border border-slate-200 p-8 ${SMS_RADIUS_SURFACE} ${SMS_SHADOW_SURFACE}`;

export const PageSkeleton: React.FC<PageSkeletonProps> = ({ type = "dashboard" }) => {
  switch (type) {
    case "dashboard":
      return (
        <div className="space-y-8 animate-pulse p-2">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={cardNested}>
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-slate-200 rounded-lg w-2/3" />
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl" />
                </div>
                <div className="h-8 bg-slate-300 rounded-lg w-1/2" />
                <div className="h-3 bg-slate-200 rounded-lg w-3/4" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className={`${cardNested} space-y-4`}>
                <div className="flex justify-between items-center">
                  <div className="h-5 bg-slate-300 rounded-lg w-1/3" />
                  <div className="h-4 bg-slate-200 rounded-lg w-20" />
                </div>
                <div className="h-64 bg-slate-100 rounded-xl w-full" />
              </div>

              <div className={`${cardNested} space-y-4`}>
                <div className="h-5 bg-slate-300 rounded-lg w-1/4" />
                <div className="space-y-3">
                  {[1, 2, 3].map((j) => (
                    <div
                      key={j}
                      className="flex items-center justify-between p-3 border-b border-slate-50 last:border-0"
                    >
                      <div className="flex items-center gap-3 w-1/2">
                        <div className="w-10 h-10 bg-slate-200 rounded-xl shrink-0" />
                        <div className="space-y-2 w-full">
                          <div className="h-4 bg-slate-200 rounded-lg w-3/4" />
                          <div className="h-3 bg-slate-100 rounded-lg w-1/2" />
                        </div>
                      </div>
                      <div className="h-4 bg-slate-200 rounded-lg w-16" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className={`${cardNested} space-y-4`}>
                <div className="h-5 bg-slate-300 rounded-lg w-1/2" />
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((k) => (
                    <div key={k} className="flex gap-3">
                      <div className="w-8 h-8 bg-slate-200 rounded-full shrink-0" />
                      <div className="space-y-2 flex-1">
                        <div className="h-3 bg-slate-200 rounded-lg w-5/6" />
                        <div className="h-3 bg-slate-100 rounded-lg w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`${cardNested} space-y-4`}>
                <div className="h-5 bg-slate-300 rounded-lg w-1/3" />
                <div className="h-32 bg-slate-100 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      );

    case "table":
      return (
        <div className="space-y-6 animate-pulse p-2">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
            <div className="h-10 bg-slate-200 rounded-xl w-full sm:w-80" />
            <div className="flex gap-2">
              <div className="h-10 bg-slate-200 rounded-xl w-24" />
              <div className="h-10 bg-slate-200 rounded-xl w-32" />
            </div>
          </div>

          <div
            className={`bg-white border border-slate-200 rounded-2xl ${SMS_SHADOW_SURFACE} overflow-hidden`}
          >
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between">
              {[1, 2, 3, 4, 5].map((h) => (
                <div key={h} className="h-4 bg-slate-300 rounded-lg w-24" />
              ))}
            </div>
            <div className="divide-y divide-slate-100">
              {[1, 2, 3, 4, 5, 6, 7].map((row) => (
                <div key={row} className="p-4 flex justify-between items-center">
                  <div className="flex items-center gap-3 w-1/4">
                    <div className="w-10 h-10 bg-slate-200 rounded-xl shrink-0" />
                    <div className="space-y-1.5 w-full">
                      <div className="h-4 bg-slate-200 rounded-lg w-5/6" />
                      <div className="h-3 bg-slate-100 rounded-lg w-1/2" />
                    </div>
                  </div>
                  <div className="h-4 bg-slate-200 rounded-lg w-20" />
                  <div className="h-4 bg-slate-200 rounded-lg w-24" />
                  <div className="h-4 bg-slate-200 rounded-lg w-20" />
                  <div className="flex gap-1.5">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg" />
                    <div className="w-8 h-8 bg-slate-100 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case "detail":
      return (
        <div className="space-y-8 animate-pulse p-2">
          <div className="flex justify-between items-center">
            <div className="h-4 bg-slate-200 rounded-lg w-28" />
            <div className="h-10 bg-slate-200 rounded-xl w-24" />
          </div>

          <div className={`${cardPrimary} flex flex-col md:flex-row gap-6 items-start md:items-center`}>
            <div className="w-20 h-20 bg-slate-200 rounded-2xl shrink-0" />
            <div className="space-y-3 flex-1">
              <div className="h-7 bg-slate-300 rounded-lg w-1/3" />
              <div className="flex flex-wrap gap-2">
                <div className="h-5 bg-slate-200 rounded-full w-20" />
                <div className="h-5 bg-slate-200 rounded-full w-24" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className={`${cardNested} space-y-4`}>
                <div className="h-5 bg-slate-300 rounded-lg w-1/4" />
                <div className="space-y-3">
                  <div className="h-4 bg-slate-200 rounded-lg w-full" />
                  <div className="h-4 bg-slate-200 rounded-lg w-5/6" />
                  <div className="h-4 bg-slate-200 rounded-lg w-11/12" />
                </div>
              </div>
              <div className={`${cardNested} space-y-4`}>
                <div className="h-5 bg-slate-300 rounded-lg w-1/3" />
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((f) => (
                    <div key={f} className="p-4 border border-slate-50 rounded-xl space-y-2">
                      <div className="h-3 bg-slate-200 rounded-lg w-1/3" />
                      <div className="h-5 bg-slate-300 rounded-lg w-2/3" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={`${cardNested} space-y-6`}>
              <div className="h-5 bg-slate-300 rounded-lg w-1/2" />
              {[1, 2, 3].map((s) => (
                <div key={s} className="space-y-2">
                  <div className="h-3 bg-slate-100 rounded-lg w-1/4" />
                  <div className="h-4 bg-slate-200 rounded-lg w-3/4" />
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case "form":
      return (
        <div className={`${cardPrimary} max-w-2xl mx-auto space-y-6 animate-pulse`}>
          <div className="h-6 bg-slate-300 rounded-lg w-1/3" />
          <div className="space-y-4">
            {[1, 2, 3, 4].map((f) => (
              <div key={f} className="space-y-2">
                <div className="h-4 bg-slate-200 rounded-lg w-20" />
                <div className="h-11 bg-slate-100 rounded-xl w-full" />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <div className="h-10 bg-slate-200 rounded-xl w-24" />
            <div className="h-10 bg-slate-300 rounded-xl w-32" />
          </div>
        </div>
      );

    case "grid":
      return (
        <div className="space-y-6 animate-pulse p-2">
          <div className="flex justify-between items-center">
            <div className="h-10 bg-slate-200 rounded-xl w-64" />
            <div className="h-10 bg-slate-200 rounded-xl w-28" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((g) => (
              <div key={g} className={`${cardNested} space-y-4`}>
                <div className="w-12 h-12 bg-slate-200 rounded-xl" />
                <div className="space-y-2">
                  <div className="h-5 bg-slate-300 rounded-lg w-2/3" />
                  <div className="h-3 bg-slate-200 rounded-lg w-5/6" />
                </div>
                <div className="h-8 bg-slate-100 rounded-lg w-full" />
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return null;
  }
};

export const SlickLoader: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-md flex items-center justify-center z-50 transition-all">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
          <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
          <div className="absolute inset-2 bg-indigo-50 rounded-full flex items-center justify-center">
            <span className="text-indigo-600 font-bold text-lg select-none">S</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-slate-700 tracking-wider">SMS Loading</span>
          <span className="inline-flex gap-1">
            <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce delay-100" />
            <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce delay-200" />
            <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce delay-300" />
          </span>
        </div>
      </div>
    </div>
  );
};
