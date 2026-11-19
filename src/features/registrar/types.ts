export type TabType =
  | "overview"
  | "directory"
  | "admissions"
  | "promotion_statement"
  | "new_admission";

export type PlacementLink = {
  href: string;
  label: string;
  description: string;
};
