import React from "react";

/** Student group photo for public student registration (/apply/:slug). */
export const STUDENT_REGISTRATION_BG = "/marketing/optimized/apply-students-1280.webp";
const STUDENT_REGISTRATION_SRCSET =
  "/marketing/optimized/apply-students-640.webp 640w, /marketing/optimized/apply-students-1280.webp 1280w";

/** School onboarding photo for /register-school. */
export const SCHOOL_REGISTRATION_BG = "/marketing/optimized/register-school-1920.webp";
const SCHOOL_REGISTRATION_SRCSET =
  "/marketing/optimized/register-school-640.webp 640w, /marketing/optimized/register-school-1280.webp 1280w, /marketing/optimized/register-school-1920.webp 1920w";

type PublicPortalBackgroundProps = {
  className?: string;
  imageSrc?: string;
  imageSrcSet?: string;
  imageClassName?: string;
};

function PublicPortalBackground({
  className,
  imageSrc,
  imageSrcSet,
  imageClassName = "h-full w-full object-cover object-center",
  imageWidth,
  imageHeight,
}: PublicPortalBackgroundProps & { imageWidth?: number; imageHeight?: number }) {
  return (
    <div className={className} aria-hidden>
      <div className="absolute inset-0 overflow-hidden bg-white">
        <img
          src={imageSrc}
          srcSet={imageSrcSet}
          sizes={imageSrcSet ? "100vw" : undefined}
          alt=""
          width={imageWidth}
          height={imageHeight}
          fetchPriority="high"
          decoding="async"
          className={imageClassName}
        />
      </div>
      {/* Left scrim — form column sits on the left */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/92 via-slate-950/70 to-slate-950/35" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-transparent to-slate-950/70" />
    </div>
  );
}

export function PublicApplyBackground(props: Omit<PublicPortalBackgroundProps, "imageSrc"> & { imageSrc?: string }) {
  return (
    <PublicPortalBackground
      {...props}
      imageSrc={props.imageSrc || STUDENT_REGISTRATION_BG}
      imageSrcSet={props.imageSrc ? undefined : STUDENT_REGISTRATION_SRCSET}
      imageWidth={1280}
      imageHeight={960}
    />
  );
}

export function RegisterSchoolBackground(props: Omit<PublicPortalBackgroundProps, "imageSrc">) {
  return (
    <PublicPortalBackground
      {...props}
      imageSrc={SCHOOL_REGISTRATION_BG}
      imageSrcSet={SCHOOL_REGISTRATION_SRCSET}
      imageWidth={1920}
      imageHeight={1280}
      imageClassName="h-full w-full object-cover object-[center_58%] sm:object-[center_52%]"
    />
  );
}
