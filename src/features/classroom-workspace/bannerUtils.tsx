import React from "react";

/** Solid palette for teacher banner picker (stored as hex). Legacy Tailwind classes still render. */
export const BANNER_SOLID_COLORS = [
  "#4f46e5", // indigo
  "#2563eb", // blue
  "#0d9488", // teal
  "#16a34a", // green
  "#ca8a04", // yellow
  "#ea580c", // orange
  "#dc2626", // red
  "#db2777", // pink
  "#7c3aed", // violet
  "#334155", // slate
  "#0f172a", // near-black
];

type BannerFields = {
  bannerColor?: string | null;
  bannerImageUrl?: string | null;
};

export function classroomBannerClass(bannerColor?: string | null) {
  if (!bannerColor) return "bg-indigo-600";
  if (bannerColor.startsWith("#") || bannerColor.startsWith("rgb")) return "";
  return bannerColor;
}

export function classroomBannerStyle(fields: BannerFields): React.CSSProperties | undefined {
  if (fields.bannerImageUrl) {
    return {
      backgroundImage: `url(${fields.bannerImageUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  const color = fields.bannerColor;
  if (color?.startsWith("#") || color?.startsWith("rgb")) {
    return { backgroundColor: color };
  }
  return undefined;
}

export function ClassroomBannerStrip({
  classroom,
  className = "h-28",
  children,
  dimImage = true,
}: {
  classroom: BannerFields;
  className?: string;
  children?: React.ReactNode;
  dimImage?: boolean;
}) {
  const hasImage = Boolean(classroom.bannerImageUrl);
  return (
    <div
      className={`${className} relative ${classroomBannerClass(classroom.bannerColor)}`}
      style={classroomBannerStyle(classroom)}
    >
      {hasImage && dimImage ? <div className="absolute inset-0 bg-slate-950/20 pointer-events-none" /> : null}
      {children}
    </div>
  );
}
