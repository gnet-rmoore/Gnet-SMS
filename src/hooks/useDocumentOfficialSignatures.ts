import { useEffect, useMemo, useState } from "react";
import {
  parseDocumentSignatories,
  resolveDocumentSignatory,
  type OfficialSignatory,
  type StaffSignatureRef,
} from "../lib/documentSignatories";

export type DocumentOfficialSignatures = {
  principal?: OfficialSignatory | null;
  registrar?: OfficialSignatory | null;
  academic?: OfficialSignatory | null;
  vpa?: OfficialSignatory | null;
  vpi?: OfficialSignatory | null;
};

/**
 * Load school staff and resolve Settings → documentSignatories map
 * for report cards / gradesheets / printouts.
 */
export function useDocumentOfficialSignatures(
  schoolId: string | undefined,
  documentSignatories: unknown,
  accessToken: string | null | undefined
) {
  const [staff, setStaff] = useState<StaffSignatureRef[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!schoolId || !accessToken) {
        setStaff([]);
        return;
      }
      try {
        const res = await fetch(`/api/schools/${schoolId}/staff`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setStaff(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setStaff([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId, accessToken]);

  const officialSignatures = useMemo(() => {
    const map = parseDocumentSignatories(documentSignatories);
    const principal = resolveDocumentSignatory("principal", map, staff);
    const registrar = resolveDocumentSignatory("registrar", map, staff);
    const vpa = resolveDocumentSignatory("vpa", map, staff);
    const vpi = resolveDocumentSignatory("vpi", map, staff);
    const academic = vpi.signatureUrl || vpi.name ? vpi : principal;
    return {
      principal,
      registrar,
      academic,
      vpa,
      vpi,
    } satisfies DocumentOfficialSignatures;
  }, [documentSignatories, staff]);

  return { staff, officialSignatures };
}
