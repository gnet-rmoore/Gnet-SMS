/** Syllabus builder form field helpers + AI/template loaders. */
import { useTranslation } from "react-i18next";
import {
  applyCalendarToSyllabusForm,
  gradingCriteriaFromCalendar,
  mergeTemplateWithCalendar,
  normalizeCalendarPeriods,
  periodWeekLabel,
  type ActiveCalendar,
} from "../../academics-shared/syllabusCalendar";

export function useSyllabusFormHandlers(deps: {
  syllabusForm: any;
  setSyllabusForm: (v: any) => void;
  aiCustomPrompt: string;
  setAiCustomPrompt: (v: string) => void;
  setGeneratingAi: (v: boolean) => void;
  school: any;
  accessToken: string | null | undefined;
  subjects: any[];
  gradeLevels: any[];
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  calendar?: ActiveCalendar | null;
}) {
  const { t } = useTranslation(["pages", "common"]);
  const {
    syllabusForm,
    setSyllabusForm,
    aiCustomPrompt,
    setGeneratingAi,
    school,
    accessToken,
    subjects,
    gradeLevels,
    showToast,
    calendar = null,
  } = deps;

  const calendarPeriods = normalizeCalendarPeriods(calendar?.periods);

  const handleAddObjective = () => {
    setSyllabusForm((prev: any) => ({
      ...prev,
      objectives: [...prev.objectives, ""],
    }));
  };

  const handleObjectiveChange = (index: number, val: string) => {
    const updated = [...syllabusForm.objectives];
    updated[index] = val;
    setSyllabusForm((prev: any) => ({
      ...prev,
      objectives: updated,
    }));
  };

  const handleRemoveObjective = (index: number) => {
    const updated = syllabusForm.objectives.filter((_: any, i: number) => i !== index);
    setSyllabusForm((prev: any) => ({
      ...prev,
      objectives: updated.length === 0 ? [""] : updated,
    }));
  };

  const handleAddUnit = () => {
    const nextPeriod =
      calendarPeriods[syllabusForm.units.length] ?? calendarPeriods[0] ?? null;
    setSyllabusForm((prev: any) => ({
      ...prev,
      units: [
        ...prev.units,
        nextPeriod
          ? {
              week: periodWeekLabel(nextPeriod),
              topic: "",
              activities: "",
              assessment: "",
              academicPeriodId: nextPeriod.id ?? "",
            }
          : {
              week: `Weeks ${prev.units.length * 4 + 1}-${(prev.units.length + 1) * 4}`,
              topic: "",
              activities: "",
              assessment: "",
              academicPeriodId: "",
            },
      ],
    }));
  };

  const handleUnitChange = (index: number, field: string, val: string) => {
    const updated = [...syllabusForm.units];
    (updated[index] as any)[field] = val;
    setSyllabusForm((prev: any) => ({
      ...prev,
      units: updated,
    }));
  };

  const handleUnitPeriodChange = (index: number, periodId: string) => {
    const period = calendarPeriods.find((p) => p.id === periodId);
    const updated = [...syllabusForm.units];
    updated[index] = {
      ...updated[index],
      academicPeriodId: periodId,
      week: period ? periodWeekLabel(period) : updated[index].week,
    };
    setSyllabusForm((prev: any) => ({
      ...prev,
      units: updated,
    }));
  };

  const handleRemoveUnit = (index: number) => {
    const updated = syllabusForm.units.filter((_: any, i: number) => i !== index);
    setSyllabusForm((prev: any) => ({
      ...prev,
      units:
        updated.length === 0
          ? [
              calendarPeriods[0]
                ? {
                    week: periodWeekLabel(calendarPeriods[0]),
                    topic: "",
                    activities: "",
                    assessment: "",
                    academicPeriodId: calendarPeriods[0].id ?? "",
                  }
                : {
                    week: "Weeks 1-4",
                    topic: "",
                    activities: "",
                    assessment: "",
                    academicPeriodId: "",
                  },
            ]
          : updated,
    }));
  };

  const handleAddCriteria = () => {
    if (syllabusForm.weightsFromCalendar) return;
    setSyllabusForm((prev: any) => ({
      ...prev,
      gradingCriteria: [...prev.gradingCriteria, { label: "", weight: 0 }],
    }));
  };

  const handleCriteriaChange = (index: number, field: string, val: any) => {
    const item = syllabusForm.gradingCriteria[index];
    if (syllabusForm.weightsFromCalendar && item?.fromCalendar) return;
    const updated = [...syllabusForm.gradingCriteria];
    if (field === "weight") {
      (updated[index] as any)[field] = parseInt(val) || 0;
    } else {
      (updated[index] as any)[field] = val;
    }
    setSyllabusForm((prev: any) => ({
      ...prev,
      gradingCriteria: updated,
    }));
  };

  const handleRemoveCriteria = (index: number) => {
    if (syllabusForm.weightsFromCalendar) return;
    const updated = syllabusForm.gradingCriteria.filter((_: any, i: number) => i !== index);
    setSyllabusForm((prev: any) => ({
      ...prev,
      gradingCriteria: updated,
    }));
  };

  const handleReimportCalendarWeights = () => {
    const criteria = gradingCriteriaFromCalendar(calendar);
    if (criteria.length === 0) return;
    setSyllabusForm((prev: any) => ({
      ...prev,
      weightsFromCalendar: true,
      gradingCriteria: criteria,
    }));
  };

  const handleCustomizeWeights = () => {
    setSyllabusForm((prev: any) => ({
      ...prev,
      weightsFromCalendar: false,
      gradingCriteria: prev.gradingCriteria.map((c: any) => ({
        ...c,
        fromCalendar: false,
      })),
    }));
  };

  const handleLoadSyllabusTemplate = (frameworkType: "CAMBRIDGE" | "IB" | "COMMON_CORE") => {
    const defaultSubject = subjects[0]?.id || "";
    const defaultGrade = gradeLevels[0]?.id || "";

    const applyTemplate = (template: Record<string, unknown>) => {
      setSyllabusForm((prev: any) =>
        mergeTemplateWithCalendar(
          {
            ...prev,
            ...template,
            subjectId: prev.subjectId || defaultSubject,
            gradeLevelId: prev.gradeLevelId || defaultGrade,
            status: "PENDING",
          },
          calendar
        )
      );
    };

    if (frameworkType === "CAMBRIDGE") {
      applyTemplate({
        title: "IGCSE Mathematics (Extended) Course Syllabus - Fall Semester",
        standardsFramework: "Cambridge International (CIE)",
        textbooks:
          "Cambridge IGCSE Core and Extended Mathematics (Hodder Education), Scientific Calculator FX-991",
        differentiation:
          "Extended curriculum challenge cards are issued during mathematical investigations to stretch higher-attaining pupils. Guided visual manipulative tools to support pupils experiencing foundational bottlenecks.",
        accommodations:
          "Extended exam timing (extra 25%) and simplified verbal instructions for diagnosed dyslexia profiles. High-contrast coordinate plotting boards provided for visual accessibility.",
        objectives: [
          "Demonstrate thorough mastery of algebraic formulas, simultaneous equations, and quadratic modeling.",
          "Apply topographic geometric theorems and coordinate vector frameworks to reconstruct navigation vectors.",
          "Design random sample experiments and synthesize cumulative frequency graph models in context of local statistical trends.",
        ],
        units: [
          {
            week: "Weeks 1-4",
            topic: "Algebraic Formulations & Binomial Progressions",
            activities: "Structured quadratic expansion worksheets, graphical plotters",
            assessment: "CIE Format Chapter Homework 1",
          },
          {
            week: "Weeks 5-8",
            topic: "Coordinate Geometries & Trigonometric Formulas",
            activities: "Surveying shadow heights on field, three-figure bearing matrices",
            assessment: "Unit 1 Standard Written Examination",
          },
          {
            week: "Weeks 9-12",
            topic: "Statistical Sample Standardizations & Probability Arrays",
            activities: "Simulating coin tosses at scale, Excel pivot tables calculations",
            assessment: "Mock Past CIE Paper 2",
          },
          {
            week: "Weeks 13-16",
            topic: "Calculus Limits & Tangent Rate Estimations",
            activities: "Plotting dynamic tangents on digital cards, interval derivatives",
            assessment: "Final Term Assessment Exam",
          },
        ],
        gradingCriteria: [
          { label: "Paper 2 (Core Structured Questions)", weight: 35 },
          { label: "Paper 4 (Problem-Solving Extended)", weight: 35 },
          { label: "Internal Course Investigations", weight: 15 },
          { label: "Bi-Weekly Homework & Quizzes", weight: 15 },
        ],
      });
    } else if (frameworkType === "IB") {
      applyTemplate({
        title: "IB DP Physics Grade 11 - Wave Phenomena & Fluid Motion",
        standardsFramework: "International Baccalaureate (IB)",
        textbooks:
          "Oxford IB Prepared Physics Diploma, digital logging probes, Pasco Dynamics Cart",
        differentiation:
          "Calculus-focused challenges for high-achieving math peers. Scaffolding questions, vocabulary banks, and color-coded vector diagrams for students in learning support groups.",
        accommodations:
          "Permit use of word processor for lab reports. Standard physical accommodations for classroom experiment assembly.",
        objectives: [
          "Explain thermodynamic state variables using molecular kinetic equations.",
          "Design and execute a controlled experimental laboratory investigating wave frequency diffraction.",
          "Formulate standard internal assessment reports applying rigorous error regression frameworks.",
        ],
        units: [
          {
            week: "Weeks 1-4",
            topic: "Newtonian Classical Kinematics & Vector Interactions",
            activities: "Electronic sensor cart collisions, visual slope modeling",
            assessment: "Criterion B Experimental Lab Draft",
          },
          {
            week: "Weeks 5-8",
            topic: "Thermal Microstructures & Energy Transference",
            activities: "Calorimetry lab measuring copper specific heat, plotting cooling curve",
            assessment: "Criterion A Mechanics Theory Exam",
          },
          {
            week: "Weeks 9-12",
            topic: "Acoustic and Wave Diffraction Projections",
            activities: "Measuring sound waves inside resonant columns, laser red-slit measures",
            assessment: "Criterion C Data Regression Analysis",
          },
          {
            week: "Weeks 13-16",
            topic: "Sub-atomic Physics & Energy State Transitions",
            activities: "Radioactive isotope timeline modeling, simulated Bohr radius calc",
            assessment: "Comprehensive Semester Exit Exam",
          },
        ],
        gradingCriteria: [
          { label: "Criterion A: Theoretical Knowledge Exams", weight: 25 },
          { label: "Criterion B: Experimental Inquiring & Design", weight: 25 },
          { label: "Criterion C: Processing & Data Evaluation", weight: 25 },
          { label: "Criterion D: Socio-Environmental Impact Essays", weight: 25 },
        ],
      });
    } else if (frameworkType === "COMMON_CORE") {
      applyTemplate({
        title: "Common Core Grade 10 English Literature: Rhetorical Analysis",
        standardsFramework: "US Common Core (CCSS)",
        textbooks:
          "Norton Anthology of English Literature, Fitzgerald's: The Great Gatsby, Shakespeare's: Macbeth",
        differentiation:
          "Leveled secondary readings with varying historical contexts. Graphic essay mapping templates (PEEL structure) provided for students needing organization strategies.",
        accommodations:
          "Unlabeled audiobooks allowed for audio backup. Option to respond orally or via dictate options for argumentative writing exercises.",
        objectives: [
          "Cite precise, granular textual evidence to substantiate analyses of literary prose (US.CCSS.RL.9-10.1).",
          "Analyze how authorial choice sets structural tensions or builds heavy dramatic irony in classical drama.",
          "Synthesize academic argumentations in multi-draft expository research portfolios.",
        ],
        units: [
          {
            week: "Weeks 1-4",
            topic: "Rhetoric & American Post-War Socio-Class Divides",
            activities: "Close-reading Gatsby, charting color symbolism, socio-historical debate",
            assessment: "Rhetorical Thesis Proposal",
          },
          {
            week: "Weeks 5-8",
            topic: "Shakespearean Metaphor & Ambition: The Tragedy of Macbeth",
            activities: "Performing key monologues, writing thematic soliloquy commentaries",
            assessment: "Midterm Literary Criticism Essay",
          },
          {
            week: "Weeks 9-12",
            topic: "Interactive Socratic Discussions & Persuasive Essay Mechanics",
            activities: "Mock panel discussions on political speeches, drafting thesis arguments",
            assessment: "Socratic Debate performance grade",
          },
          {
            week: "Weeks 13-16",
            topic: "Capstone Annotated Literature Reviews & Editing",
            activities: "Synthesizing secondary scholarly books, peer citation check",
            assessment: "Final Capstone Portfolio Submission",
          },
        ],
        gradingCriteria: [
          { label: "Analytical Prose & Creative Writing Portfolios", weight: 35 },
          { label: "Socratic Seminars & Active Collaborative Debates", weight: 25 },
          { label: "Textual Nuance & Reading Quizzes", weight: 20 },
          { label: "Draft Progress, Annotation, and Peer Reviewing", weight: 20 },
        ],
      });
    }
  };

  const handleGenerateAiSyllabus = async () => {
    if (!syllabusForm.subjectId || !syllabusForm.gradeLevelId) {
      showToast(t("curriculum.toast.aiContextRequired"), "error");
      return;
    }

    const subjectObj = subjects.find((s) => s.id === syllabusForm.subjectId);
    const gradeObj = gradeLevels.find((g) => g.id === syllabusForm.gradeLevelId);

    if (!subjectObj || !gradeObj) {
      showToast(t("curriculum.toast.invalidSubjectGrade"), "error");
      return;
    }

    setGeneratingAi(true);
    try {
      const res = await fetch(`/api/schools/${school?.id}/syllabi/generate-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          subjectName: subjectObj.name,
          gradeLevelName: gradeObj.name,
          frameworkType: syllabusForm.standardsFramework,
          customPrompt: aiCustomPrompt,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to generate syllabus with AI.");
      }

      const generated = await res.json();

      setSyllabusForm((prev: any) =>
        applyCalendarToSyllabusForm(
          {
            ...prev,
            title:
              generated.title ||
              `${subjectObj.name} Syllabus - ${syllabusForm.standardsFramework}`,
            academicYear: generated.academicYear || prev.academicYear,
            standardsFramework: generated.standardsFramework || prev.standardsFramework,
            textbooks: generated.textbooks || "",
            differentiation: generated.differentiation || "",
            accommodations: generated.accommodations || "",
            objectives:
              generated.objectives && generated.objectives.length > 0
                ? generated.objectives
                : [""],
            units:
              generated.units && generated.units.length > 0
                ? generated.units
                : prev.units,
            gradingCriteria:
              generated.gradingCriteria && generated.gradingCriteria.length > 0
                ? generated.gradingCriteria
                : prev.gradingCriteria,
            weightsFromCalendar: false,
          },
          calendar
        )
      );

      showToast(t("curriculum.toast.aiDraftGenerated"));
    } catch (err: any) {
      showToast(err.message || t("curriculum.toast.aiGenerationFailed"), "error");
    } finally {
      setGeneratingAi(false);
    }
  };

  return {
    handleAddObjective,
    handleObjectiveChange,
    handleRemoveObjective,
    handleAddUnit,
    handleUnitChange,
    handleUnitPeriodChange,
    handleRemoveUnit,
    handleAddCriteria,
    handleCriteriaChange,
    handleRemoveCriteria,
    handleReimportCalendarWeights,
    handleCustomizeWeights,
    handleLoadSyllabusTemplate,
    handleGenerateAiSyllabus,
  };
}
