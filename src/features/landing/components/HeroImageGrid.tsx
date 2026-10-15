import React from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Reveal } from "./Reveal";
import { fadeUp, revealViewport, landingSpring } from "../motion";

const MOSAIC_SRC = "/marketing/front-images/split-grid-image.jpg";
const DETAIL_SRC = "/marketing/front-images/split-grid-image.jpg";

type MosaicTile = {
  /** Position/size as % of mosaic box */
  x: number;
  y: number;
  w: number;
  h: number;
  z?: number;
  rotate?: number;
  /** Independent photo inset (like the beauty-site palette tile) */
  detail?: boolean;
  radius?: string;
};

/**
 * Asymmetric “shattered pane” layout — one photo continuous across gutters.
 * Inspired by beauty-site mosaic heroes; SMS uses blue/slate accents.
 */
const MOSAIC_TILES: MosaicTile[] = [
  { x: 0, y: 10, w: 16, h: 36, z: 2, radius: "rounded-2xl" },
  { x: 18, y: 0, w: 30, h: 28, z: 3, radius: "rounded-[1.35rem]" },
  { x: 50, y: 4, w: 24, h: 30, z: 2, radius: "rounded-2xl" },
  { x: 76, y: 12, w: 24, h: 40, z: 3, radius: "rounded-[1.25rem]" },
  { x: 18, y: 30, w: 38, h: 40, z: 4, radius: "rounded-[1.5rem]" },
  { x: 58, y: 36, w: 20, h: 28, z: 3, radius: "rounded-2xl" },
  { x: 2, y: 52, w: 20, h: 30, z: 5, rotate: -7, detail: true, radius: "rounded-2xl" },
  { x: 22, y: 72, w: 34, h: 26, z: 3, radius: "rounded-[1.35rem]" },
  { x: 70, y: 68, w: 22, h: 24, z: 2, radius: "rounded-2xl" },
];

const THUMBS = [
  { src: "/marketing/grid/thumb-01.jpg", altKey: "landing.galleryAlt2" },
  { src: "/marketing/grid/thumb-02.jpg", altKey: "landing.galleryAlt3" },
  { src: "/marketing/grid/thumb-03.jpg", altKey: "landing.galleryAlt5" },
] as const;

function ThumbLink({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = React.useState(false);
  return (
    <Link
      to="/register-school"
      className="group relative block aspect-square overflow-hidden rounded-2xl border border-slate-100 bg-slate-100 shadow-[0_6px_20px_rgb(15,23,42,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:ring-offset-2"
    >
      {!loaded ? <div className="absolute inset-0 animate-pulse bg-slate-200/80" aria-hidden /> : null}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`h-full w-full object-cover transition-[transform,opacity] duration-500 ease-out group-hover:scale-[1.05] ${loaded ? "opacity-100" : "opacity-0"}`}
      />
      <span className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-600/25 transition-transform duration-200 group-hover:scale-105">
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
      </span>
    </Link>
  );
}

function MosaicPane({ tile }: { tile: MosaicTile }) {
  const [loaded, setLoaded] = React.useState(false);

  if (tile.detail) {
    return (
      <div
        className={`absolute overflow-hidden border border-white/80 bg-slate-100 shadow-[0_10px_28px_rgb(15,23,42,0.12)] ${tile.radius || "rounded-2xl"}`}
        style={{
          left: `${tile.x}%`,
          top: `${tile.y}%`,
          width: `${tile.w}%`,
          height: `${tile.h}%`,
          zIndex: tile.z ?? 1,
          transform: tile.rotate ? `rotate(${tile.rotate}deg)` : undefined,
        }}
      >
        {!loaded ? <div className="absolute inset-0 animate-pulse bg-slate-200/80" aria-hidden /> : null}
        <img
          src={DETAIL_SRC}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={`h-full w-full object-cover object-center transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      </div>
    );
  }

  return (
    <div
      className={`absolute overflow-hidden border border-white/90 bg-slate-100 shadow-[0_8px_24px_rgb(15,23,42,0.1)] ${tile.radius || "rounded-2xl"}`}
      style={{
        left: `${tile.x}%`,
        top: `${tile.y}%`,
        width: `${tile.w}%`,
        height: `${tile.h}%`,
        zIndex: tile.z ?? 1,
        transform: tile.rotate ? `rotate(${tile.rotate}deg)` : undefined,
      }}
    >
      {!loaded ? <div className="absolute inset-0 animate-pulse bg-slate-200/80" aria-hidden /> : null}
      {/* Same photo sized to the mosaic parent so panes align across gutters */}
      <div
        className="pointer-events-none absolute"
        style={{
          width: `${(100 / tile.w) * 100}%`,
          height: `${(100 / tile.h) * 100}%`,
          left: `${(-tile.x / tile.w) * 100}%`,
          top: `${(-tile.y / tile.h) * 100}%`,
        }}
      >
        <img
          src={MOSAIC_SRC}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={`h-full w-full object-cover object-center transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      </div>
    </div>
  );
}

/**
 * Beauty-style two-column band: copy + thumbs | shattered campus mosaic.
 * Plan: docs/LANDING_PAGE_OVERHAUL_PLAN.md Appendix A
 */
export function HeroImageGrid() {
  const { t } = useTranslation("public");

  return (
    <section
      id="gallery"
      className="relative overflow-hidden bg-white pb-12 pt-4 sm:pb-24 sm:pt-10"
      aria-labelledby="gallery-heading"
    >
      {/* Soft brand glows (blue/slate stand-in for beauty pink) */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-blue-400/15 blur-3xl" />
        <div className="absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-indigo-300/20 blur-3xl" />
        <div className="absolute left-1/3 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-sky-200/25 blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-5 sm:gap-12 sm:px-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-10 xl:gap-14">
        <Reveal className="max-w-xl">
          <h2
            id="gallery-heading"
            className="font-landing-display text-[1.75rem] leading-[1.15] tracking-tight text-slate-950 sm:text-4xl lg:text-[2.65rem]"
          >
            {t("landing.galleryTitleBefore")}{" "}
            <em className="font-landing-display italic text-blue-600">
              {t("landing.galleryTitleAccent")}
            </em>{" "}
            {t("landing.galleryTitleAfter")}
          </h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-500 sm:text-base">
            {t("landing.galleryBody")}
          </p>

          <motion.div
            className="mt-8"
            whileHover={{ x: 2 }}
            transition={landingSpring}
          >
            <Link
              to="/register-school"
              className="group inline-flex items-center gap-3 text-sm font-bold uppercase tracking-[0.14em] text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:ring-offset-2"
            >
              {t("landing.galleryCta")}
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:bg-blue-500">
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </span>
            </Link>
          </motion.div>

          <ul className="mt-10 grid grid-cols-3 gap-3 sm:gap-4">
            {THUMBS.map((thumb) => (
              <li key={thumb.src}>
                <ThumbLink src={thumb.src} alt={t(thumb.altKey)} />
              </li>
            ))}
          </ul>
        </Reveal>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={revealViewport}
          className="relative mx-auto w-full max-w-lg lg:max-w-none"
        >
          <div
            className="relative aspect-[1/1.05] w-full sm:aspect-[1/1]"
            role="img"
            aria-label={t("landing.galleryMosaicAlt")}
          >
            {MOSAIC_TILES.map((tile, i) => (
              <MosaicPane key={i} tile={tile} />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
