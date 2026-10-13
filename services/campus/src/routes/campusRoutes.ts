import express from "express";
import { authenticate, requireTenant, requireRoles, requireResourceTenant } from "../middleware/auth";
import { resourceLoaders } from "../middleware/resourceLoaders";
import { campusController } from "../controllers/campusController";
import { myCampusController } from "../controllers/myCampusController";
import { requireFeature } from "../lib/entitlements";

const router = express.Router();

const ADMIN = ["SCHOOL_ADMIN", "PRINCIPAL", "VPA"] as const;

router.get(
  "/api/schools/:schoolId/my-campus",
  authenticate,
  requireTenant,
  requireRoles(["PARENT", "STUDENT"]),
  myCampusController.getSummary
);

router.get(
  "/api/schools/:schoolId/library/items",
  authenticate,
  requireTenant,
  requireRoles([...ADMIN, "LIBRARIAN"]),
  requireFeature("library"),
  campusController.listLibraryItems
);
router.post(
  "/api/schools/:schoolId/library/items",
  authenticate,
  requireTenant,
  requireRoles([...ADMIN, "LIBRARIAN"]),
  requireFeature("library"),
  campusController.createLibraryItem
);
router.patch(
  "/api/library/items/:id",
  authenticate,
  requireRoles([...ADMIN, "LIBRARIAN"]),
  requireResourceTenant(resourceLoaders.libraryItem),
  requireFeature("library"),
  campusController.updateLibraryItem
);
router.get(
  "/api/schools/:schoolId/library/loans",
  authenticate,
  requireTenant,
  requireRoles([...ADMIN, "LIBRARIAN"]),
  requireFeature("library"),
  campusController.listLibraryLoans
);
router.post(
  "/api/schools/:schoolId/library/loans",
  authenticate,
  requireTenant,
  requireRoles([...ADMIN, "LIBRARIAN"]),
  requireFeature("library"),
  campusController.checkoutLibraryItem
);
router.patch(
  "/api/library/loans/:id/return",
  authenticate,
  requireRoles([...ADMIN, "LIBRARIAN"]),
  requireResourceTenant(resourceLoaders.libraryLoan),
  requireFeature("library"),
  campusController.returnLibraryLoan
);

router.get(
  "/api/schools/:schoolId/clinic/visits",
  authenticate,
  requireTenant,
  requireRoles([...ADMIN, "NURSE"]),
  requireFeature("clinic"),
  campusController.listClinicVisits
);
router.post(
  "/api/schools/:schoolId/clinic/visits",
  authenticate,
  requireTenant,
  requireRoles([...ADMIN, "NURSE"]),
  requireFeature("clinic"),
  campusController.createClinicVisit
);
router.get(
  "/api/schools/:schoolId/clinic/health-profiles/:studentId",
  authenticate,
  requireTenant,
  requireRoles([...ADMIN, "NURSE"]),
  requireFeature("clinic"),
  campusController.getHealthProfile
);
router.put(
  "/api/schools/:schoolId/clinic/health-profiles/:studentId",
  authenticate,
  requireTenant,
  requireRoles([...ADMIN, "NURSE"]),
  requireFeature("clinic"),
  campusController.upsertHealthProfile
);

router.get(
  "/api/schools/:schoolId/counseling/sessions",
  authenticate,
  requireTenant,
  requireRoles([...ADMIN, "COUNSELOR"]),
  requireFeature("counseling"),
  campusController.listCounselingSessions
);
router.post(
  "/api/schools/:schoolId/counseling/sessions",
  authenticate,
  requireTenant,
  requireRoles([...ADMIN, "COUNSELOR"]),
  requireFeature("counseling"),
  campusController.createCounselingSession
);

router.get(
  "/api/schools/:schoolId/athletics/teams",
  authenticate,
  requireTenant,
  requireRoles([...ADMIN, "ATHLETICS_DIRECTOR"]),
  requireFeature("athletics"),
  campusController.listAthleticsTeams
);
router.post(
  "/api/schools/:schoolId/athletics/teams",
  authenticate,
  requireTenant,
  requireRoles([...ADMIN, "ATHLETICS_DIRECTOR"]),
  requireFeature("athletics"),
  campusController.createAthleticsTeam
);
router.post(
  "/api/athletics/teams/:teamId/roster",
  authenticate,
  requireRoles([...ADMIN, "ATHLETICS_DIRECTOR"]),
  requireResourceTenant(resourceLoaders.athleticsTeam),
  requireFeature("athletics"),
  campusController.addAthleticsRoster
);
router.delete(
  "/api/athletics/teams/:teamId/roster/:studentId",
  authenticate,
  requireRoles([...ADMIN, "ATHLETICS_DIRECTOR"]),
  requireResourceTenant(resourceLoaders.athleticsTeam),
  requireFeature("athletics"),
  campusController.removeAthleticsRoster
);
router.post(
  "/api/athletics/teams/:teamId/events",
  authenticate,
  requireRoles([...ADMIN, "ATHLETICS_DIRECTOR"]),
  requireResourceTenant(resourceLoaders.athleticsTeam),
  requireFeature("athletics"),
  campusController.createAthleticsEvent
);

router.get(
  "/api/schools/:schoolId/hostel/buildings",
  authenticate,
  requireTenant,
  requireRoles([...ADMIN, "HOSTEL_WARDEN"]),
  requireFeature("hostel"),
  campusController.listHostelBuildings
);
router.post(
  "/api/schools/:schoolId/hostel/buildings",
  authenticate,
  requireTenant,
  requireRoles([...ADMIN, "HOSTEL_WARDEN"]),
  requireFeature("hostel"),
  campusController.createHostelBuilding
);
router.post(
  "/api/hostel/buildings/:buildingId/rooms",
  authenticate,
  requireRoles([...ADMIN, "HOSTEL_WARDEN"]),
  requireResourceTenant(resourceLoaders.hostelBuilding),
  requireFeature("hostel"),
  campusController.createHostelRoom
);
router.get(
  "/api/schools/:schoolId/hostel/assignments",
  authenticate,
  requireTenant,
  requireRoles([...ADMIN, "HOSTEL_WARDEN"]),
  requireFeature("hostel"),
  campusController.listHostelAssignments
);
router.post(
  "/api/schools/:schoolId/hostel/assignments",
  authenticate,
  requireTenant,
  requireRoles([...ADMIN, "HOSTEL_WARDEN"]),
  requireFeature("hostel"),
  campusController.createHostelAssignment
);
router.patch(
  "/api/hostel/assignments/:id/checkout",
  authenticate,
  requireRoles([...ADMIN, "HOSTEL_WARDEN"]),
  requireResourceTenant(resourceLoaders.hostelAssignment),
  requireFeature("hostel"),
  campusController.checkoutHostelAssignment
);

router.get(
  "/api/schools/:schoolId/cafeteria/menus",
  authenticate,
  requireTenant,
  requireRoles([...ADMIN, "CAFETERIA_MANAGER"]),
  requireFeature("cafeteria"),
  campusController.listCafeteriaMenus
);
router.put(
  "/api/schools/:schoolId/cafeteria/menus",
  authenticate,
  requireTenant,
  requireRoles([...ADMIN, "CAFETERIA_MANAGER"]),
  requireFeature("cafeteria"),
  campusController.upsertCafeteriaMenu
);
router.get(
  "/api/schools/:schoolId/cafeteria/meal-counts",
  authenticate,
  requireTenant,
  requireRoles([...ADMIN, "CAFETERIA_MANAGER"]),
  requireFeature("cafeteria"),
  campusController.listCafeteriaMealCounts
);
router.put(
  "/api/schools/:schoolId/cafeteria/meal-counts",
  authenticate,
  requireTenant,
  requireRoles([...ADMIN, "CAFETERIA_MANAGER"]),
  requireFeature("cafeteria"),
  campusController.upsertCafeteriaMealCount
);

export default router;
