export type TourSlideId =
  | "admissions"
  | "classroom"
  | "gradebook"
  | "onlineExam"
  | "fees"
  | "parent"
  | "facilities"
  | "reportCards";

export type TourSlideMeta = {
  id: TourSlideId;
  titleKey: string;
  bodyKey: string;
};

export const TOUR_SLIDES: TourSlideMeta[] = [
  {
    id: "admissions",
    titleKey: "landing.tourAdmissionsTitle",
    bodyKey: "landing.tourAdmissionsBody",
  },
  {
    id: "classroom",
    titleKey: "landing.tourClassroomTitle",
    bodyKey: "landing.tourClassroomBody",
  },
  {
    id: "gradebook",
    titleKey: "landing.tourGradebookTitle",
    bodyKey: "landing.tourGradebookBody",
  },
  {
    id: "onlineExam",
    titleKey: "landing.tourOnlineExamTitle",
    bodyKey: "landing.tourOnlineExamBody",
  },
  {
    id: "fees",
    titleKey: "landing.tourFeesTitle",
    bodyKey: "landing.tourFeesBody",
  },
  {
    id: "parent",
    titleKey: "landing.tourParentTitle",
    bodyKey: "landing.tourParentBody",
  },
  {
    id: "facilities",
    titleKey: "landing.tourFacilitiesTitle",
    bodyKey: "landing.tourFacilitiesBody",
  },
  {
    id: "reportCards",
    titleKey: "landing.tourReportCardsTitle",
    bodyKey: "landing.tourReportCardsBody",
  },
];
