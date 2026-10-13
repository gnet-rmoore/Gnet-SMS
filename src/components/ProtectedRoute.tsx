import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { hasCapability, isKnownCapability, navCapabilityKey } from "../lib/capabilities";
import { entitlementForPath } from "../lib/routeEntitlements";
import { hasPlanAccess } from "../lib/entitlements";
import {
  buildSchoolUnavailableUrl,
  isSchoolLoginAllowed,
  isTrialExpired,
  rememberSchoolUnavailable,
} from "../lib/schoolUnavailable";

const CHANGE_PASSWORD_PATH = "/change-password-required";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  /** When set, also require this capability (after role check). */
  requiredCapability?: string;
}

/** Map a school SPA path to a nav capability, or null when the route is not capability-gated. */
export function pathCapabilityFromLocation(
  pathname: string,
  slug: string | undefined
): string | null {
  if (!slug) return null;
  const prefix = `/${slug}/`;
  if (!pathname.startsWith(prefix) && pathname !== `/${slug}`) return null;
  const rest = pathname.slice(prefix.length).split("/").filter(Boolean);
  if (rest.length === 0) return "nav.dashboard";
  // Personal account routes are not feature-nav capabilities — never gate them.
  if (rest[0] === "profile") return null;
  if (rest.length >= 2) {
    const two = navCapabilityKey(`${rest[0]}/${rest[1]}`);
    if (isKnownCapability(two)) return two;
  }
  const one = navCapabilityKey(rest[0]);
  // Unknown segments must not redirect to dashboard (e.g. profile before catalog entry).
  return isKnownCapability(one) ? one : null;
}

export const ProtectedRoute = ({
  children,
  allowedRoles,
  requiredCapability,
}: ProtectedRouteProps) => {
  const { accessToken, user, school, capabilities, entitlements, logout, impersonation } = useAuthStore();
  const location = useLocation();
  const onChangePasswordRoute = location.pathname === CHANGE_PASSWORD_PATH;

  const schoolBlocked =
    Boolean(accessToken) &&
    user?.role !== "SUPER_ADMIN" &&
    Boolean(school) &&
    !isSchoolLoginAllowed(school?.status, school?.trialEndsAt ?? null);

  React.useEffect(() => {
    if (!schoolBlocked || !school) return;
    rememberSchoolUnavailable({
      schoolStatus:
        school.status === "TRIAL" && isTrialExpired(school.status, school.trialEndsAt ?? null)
          ? "TRIAL_EXPIRED"
          : school.status || "SUSPENDED",
      schoolName: school.name,
      schoolSlug: school.slug,
      trialEndsAt: school.trialEndsAt ?? null,
    });
    logout();
  }, [schoolBlocked, school, logout]);

  if (!accessToken && !schoolBlocked) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (schoolBlocked && school) {
    return (
      <Navigate
        to={buildSchoolUnavailableUrl({
          schoolStatus: school.status || "SUSPENDED",
          schoolName: school.name,
          schoolSlug: school.slug,
        })}
        replace
      />
    );
  }

  if (!accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.mustChangePassword && !impersonation && !onChangePasswordRoute) {
    return <Navigate to={CHANGE_PASSWORD_PATH} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <Navigate
        to="/forbidden?reason=role"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // When session has capabilities, enforce nav/action caps (legacy sessions without caps skip).
  if (user?.role !== "SUPER_ADMIN" && Array.isArray(capabilities)) {
    const cap =
      requiredCapability ||
      pathCapabilityFromLocation(location.pathname, school?.slug || undefined);
    if (cap && cap.startsWith("nav.") && !hasCapability(capabilities, cap)) {
      // settings/* may map to nav.settings when only parent is granted
      if (cap.startsWith("nav.settings/") && hasCapability(capabilities, "nav.settings")) {
        return <>{children}</>;
      }
      if (
        cap === "nav.settings" &&
        hasCapability(capabilities, "action.settings.templates")
      ) {
        return <>{children}</>;
      }
      // Nested classroom routes share nav.classroom
      if (cap !== "nav.classroom" && location.pathname.includes("/classroom")) {
        if (hasCapability(capabilities, "nav.classroom")) {
          return <>{children}</>;
        }
      }
      if (cap !== "nav.dashboard") {
        return (
          <Navigate
            to="/forbidden?reason=capability"
            replace
            state={{ from: location.pathname }}
          />
        );
      }
    }
    if (requiredCapability && !hasCapability(capabilities, requiredCapability)) {
      return (
        <Navigate
          to="/forbidden?reason=capability"
          replace
          state={{ from: location.pathname }}
        />
      );
    }
  }

  if (user?.role !== "SUPER_ADMIN" && Array.isArray(entitlements)) {
    const feature = entitlementForPath(location.pathname, school?.slug || undefined);
    if (feature && !hasPlanAccess(entitlements, feature)) {
      return (
        <Navigate
          to="/forbidden?reason=plan"
          replace
          state={{ from: location.pathname }}
        />
      );
    }
  }

  return <>{children}</>;
};
