import React from "react";
import { RefreshCw } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { gradeReviewApi } from "./api";
import { ReviewerQueue } from "./components/ReviewerQueue";
import { TeacherSubmissions } from "./components/TeacherSubmissions";
import type { ReviewGrade } from "./types";
import { useTranslation } from "react-i18next";
import { ListPagination } from "../../components/ui";
import { useListFilters } from "../list-filters";

const REVIEWER_ROLES = new Set(["SCHOOL_ADMIN", "PRINCIPAL", "VPI"]);

export function GradeReviewPage() {
  const { t } = useTranslation("pages");
  const { school, user } = useAuthStore();
  const { toast, showToast } = usePageToast();
  const [grades, setGrades] = React.useState<ReviewGrade[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const isReviewer = user?.role ? REVIEWER_ROLES.has(user.role) : false;
  const slug = school?.slug || "";

  const filters = useListFilters({
    fields: [],
    defaultPageSize: isReviewer ? 20 : 50,
    syncUrl: true,
  });

  const fetchData = React.useCallback(async () => {
    if (!school?.id) return;
    try {
      if (isReviewer) {
        const data = await gradeReviewApi.fetchPending(school.id, {
          page: filters.page,
          limit: filters.pageSize,
        });
        const list = Array.isArray(data?.grades)
          ? data.grades
          : Array.isArray(data)
            ? data
            : [];
        setGrades(list);
        setTotal(Number(data?.totalBatches) || list.length);
      } else {
        const data = await gradeReviewApi.fetchMySubmissions(school.id, {
          page: filters.page,
          limit: filters.pageSize,
        });
        const list = Array.isArray(data?.grades)
          ? data.grades
          : Array.isArray(data)
            ? data
            : [];
        setGrades(list);
        setTotal(Number(data?.total) || list.length);
      }
    } catch (err: any) {
      showToast(err?.message || "Failed to load grade review", "error");
      setGrades([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [school?.id, isReviewer, showToast, filters.page, filters.pageSize]);

  React.useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0 pb-16">
      <PageToast toast={toast} />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            {isReviewer ? "Academic supervision" : "My teaching"}
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1 font-dashboard">
            {t("gradeReview.title")}
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            {t("gradeReview.subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing || loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {isReviewer ? (
        <ReviewerQueue
          schoolId={school?.id || ""}
          slug={slug}
          grades={grades}
          loading={loading}
          onRefresh={onRefresh}
          showToast={showToast}
        />
      ) : (
        <TeacherSubmissions
          slug={slug}
          grades={grades}
          loading={loading}
        />
      )}

      {total > filters.pageSize ? (
        <div className="rounded-[32px] border border-slate-200 bg-white shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] overflow-hidden">
          <ListPagination
            total={total}
            page={filters.page}
            pageSize={filters.pageSize}
            onPageChange={filters.setPage}
            onPageSizeChange={filters.setPageSize}
            alwaysShow
          />
        </div>
      ) : null}
    </div>
  );
}
