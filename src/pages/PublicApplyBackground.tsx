import React from "react";

/** Student group photo for public student registration (/apply/:slug). */
export const STUDENT_REGISTRATION_BG = "/marketing/student-registration-campus.png";

/** School onboarding photo for /register-school. */
export const SCHOOL_REGISTRATION_BG = "/marketing/school-registration-bg.png";

type PublicPortalBackgroundProps = {
  className?: string;
  imageSrc?: string;
  imageClassName?: string;
};

function PublicPortalBackground({
  className,
  imageSrc,
  imageClassName = "h-full w-full object-cover object-center",
  imageWidth,
  imageHeight,
}: PublicPortalBackgroundProps & { imageWidth?: number; imageHeight?: number }) {
  return (
    <div className={className} aria-hidden>
      <div className="absolute inset-0 overflow-hidden bg-white">
        <img
          src={imageSrc}
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

export function PublicApplyBackground(props: Omit<PublicPortalBackgroundProps, "imageSrc">) {
  return (
    <PublicPortalBackground
      {...props}
      imageSrc={STUDENT_REGISTRATION_BG}
      imageWidth={1920}
      imageHeight={1280}
    />
  );
}

export function RegisterSchoolBackground(props: Omit<PublicPortalBackgroundProps, "imageSrc">) {
  return (
    <PublicPortalBackground
      {...props}
      imageSrc={SCHOOL_REGISTRATION_BG}
      imageWidth={1024}
      imageHeight={805}
      imageClassName="h-full w-full object-cover object-[center_58%] sm:object-[center_52%]"
    />
  );
}
