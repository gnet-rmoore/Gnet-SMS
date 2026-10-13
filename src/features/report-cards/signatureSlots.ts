type SignatureLike = {
  name?: string | null;
  title?: string | null;
  signatureUrl?: string | null;
  userId?: string | null;
};

export type DocumentOfficialSignatures = {
  principal?: SignatureLike | null;
  registrar?: SignatureLike | null;
  academic?: SignatureLike | null;
  vpa?: SignatureLike | null;
  vpi?: SignatureLike | null;
};

/** Map a printed role label to a school document signature slot. */
export function signatureForLabel(
  label: string,
  sigs?: DocumentOfficialSignatures | null
): { signatureUrl?: string | null; name?: string | null } | null {
  if (!sigs) return null;
  const l = label.toLowerCase();
  if (
    l.includes("parent") ||
    l.includes("guardian") ||
    l.includes("parents") ||
    l.includes("class teacher") ||
    l.includes("form teacher") ||
    l.includes("class sponsor") ||
    l.includes("professeur")
  ) {
    return null;
  }
  if (l.includes("registrar")) return sigs.registrar || null;
  if (
    l.includes("academic") ||
    l.includes("exams officer") ||
    l.includes("vpi") ||
    l.includes("instruction")
  ) {
    return sigs.academic || sigs.vpi || sigs.principal || null;
  }
  if (l.includes("vpa") || l.includes("admin")) {
    return sigs.vpa || sigs.principal || null;
  }
  if (
    l.includes("principal") ||
    l.includes("direction") ||
    l.includes("head of centre") ||
    l.includes("head of school")
  ) {
    return sigs.principal || null;
  }
  return null;
}

export function signaturesForLabels(
  labels: string[],
  sigs?: DocumentOfficialSignatures | null
) {
  return labels.map((label) => signatureForLabel(label, sigs));
}
