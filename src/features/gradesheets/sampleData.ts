import type { GradeSheetData, GradeSheetSubject } from "./types";

const NAMES = ["Mathematics","English Language","General Science","Social Studies","Civics","French","Computer Studies","Physical Education","Biology","Chemistry","Physics","Geography","History","Literature","Religious Education","Art & Design","Music"];
const CODES = ["MTH","ENG","SCI","SOC","CIV","FRN","ICT","PE","BIO","CHM","PHY","GEO","HIS","LIT","REL","ART","MUS"];
const COLS = [{code:"HW",name:"Homework",weightPct:20},{code:"QZ",name:"Quiz",weightPct:20},{code:"CW",name:"Classwork",weightPct:10},{code:"MID",name:"Midterm",weightPct:20},{code:"FIN",name:"Final",weightPct:30}];
const LEGEND = [{min:90,max:100,letter:"A",remark:"Excellent"},{min:80,max:89,letter:"B",remark:"Very good"},{min:70,max:79,letter:"C",remark:"Good"},{min:60,max:69,letter:"D",remark:"Satisfactory"},{min:0,max:59,letter:"F",remark:"Needs improvement"}];

function band(p:number){return LEGEND.find(b=>p>=b.min&&p<=b.max);}
function label(value:unknown){return value==null?"":String(value).trim();}
function initials(name:string){return name.split(/\s+/).filter(Boolean).slice(0,2).map(word=>word[0]?.toUpperCase()||"").join("");}
function shortDate(date:Date){return date.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"});}

export type SampleGradeSheetOverrides = {
  school?: Partial<GradeSheetData["school"]>;
  term?: Partial<GradeSheetData["term"]>;
  student?: Partial<GradeSheetData["student"]>;
  signatures?: GradeSheetData["signatures"];
  remarks?: Partial<GradeSheetData["remarks"]>;
  issuedOn?: string;
};

export function sampleGradeSheetData(schoolName = "Current School", address = "", overrides: SampleGradeSheetOverrides = {}): GradeSheetData {
  const base = [[92,88,95,84,90],[85,90,88,78,82],[78,82,80,74,77],[88,84,90,81,86],[95,92,94,89,91],[70,66,72,64,68],[96,94,98,90,93],[98,95,100,92,96],[82,79,85,76,80],[74,78,70,72,75],[80,83,77,79,82],[86,82,88,80,84],[77,80,75,73,78],[84,87,82,80,85],[91,89,93,87,90],[88,90,86,84,87],[76,74,78,70,73]];
  const subjects: GradeSheetSubject[] = NAMES.map((name,i)=>{
    const x = base[i];
    const scores:Record<string,number|null>={HW:x[0],QZ:x[1],CW:x[2],MID:x[3],FIN:x[4]};
    const total = Math.round((x[0]*.2+x[1]*.2+x[2]*.1+x[3]*.2+x[4]*.3)*10)/10;
    const b = band(Math.round(total));
    return { name, code:CODES[i], scores, total, letter:b?.letter||null, remark:b?.remark||null, position:null, max:100, obtained:total, classAvg:null, grade:b?.letter||"—", ca: Math.round((x[0]*.4+x[1]*.4+x[2]*.2)*10)/10, exam: Math.round((x[3]*.4+x[4]*.6)*10)/10 };
  });
  const avg = Math.round(subjects.reduce((s,x)=>s+(x.total||0),0)/subjects.length*10)/10;
  const now = new Date();
  const schoolOverride = overrides.school || {};
  const termOverride = overrides.term || {};
  const studentOverride = overrides.student || {};
  const remarksOverride = overrides.remarks || {};
  const resolvedName = label(schoolName) || "Current School";
  const resolvedAddress = label(address);
  const phone = label(schoolOverride.phone);
  const email = label(schoolOverride.email);
  const academicYear = label(termOverride.academicYear) || `${now.getFullYear()}/${now.getFullYear()+1}`;
  const teacherRemark = label(remarksOverride.teacher) || label(remarksOverride.educator) || "The learner works consistently and contributes thoughtfully in class. Continued practice will strengthen written expression.";
  return {
    school:{
      name: label(schoolOverride.name) || resolvedName,
      address: label(schoolOverride.address) || resolvedAddress,
      contact: label(schoolOverride.contact) || [phone,email].filter(Boolean).join(" · "),
      phone: phone || undefined,
      email: email || undefined,
      motto: label(schoolOverride.motto) || undefined,
      crestInitials: label(schoolOverride.crestInitials) || initials(resolvedName),
      logoUrl: schoolOverride.logoUrl ?? null,
    },
    term:{
      label: label(termOverride.label) || `Current Term — ${academicYear}`,
      periodLabel: label(termOverride.periodLabel) || "Current Term",
      examName: label(termOverride.examName) || "Current Examination",
      issueDate: label(termOverride.issueDate) || shortDate(now),
      nextTermStart: label(termOverride.nextTermStart) || "—",
      academicYear,
      schoolYear: label(termOverride.schoolYear) || academicYear,
    },
    student:{
      name: label(studentOverride.name) || "Sample Learner",
      id: label(studentOverride.id) || "PREVIEW-0001",
      admissionNo: label(studentOverride.admissionNo) || "PREVIEW-0001",
      classLabel: label(studentOverride.classLabel) || "Grade 9 — A",
      gradeLevel: label(studentOverride.gradeLevel) || "Grade 9",
      section: label(studentOverride.section) || "A",
      dob: label(studentOverride.dob) || "—",
      guardian: label(studentOverride.guardian) || "—",
    },
    columns: COLS, legend: LEGEND, subjects,
    summary:{ average:avg, rank:4, classSize:38, gpa:3.4, promotionStatus:null, maxTotal:subjects.length*100, obtainedTotal:Math.round(subjects.reduce((s,x)=>s+(x.total||0),0)*10)/10, percentage:avg, overallGrade: band(Math.round(avg))?.letter||"—", rankLabel:"4 of 38", conduct:"—" },
    attendance:{ present:58, total:62, absent:4, percentage:93.5 },
    remarks:{ educator: label(remarksOverride.educator) || teacherRemark, principal: remarksOverride.principal ?? null, teacher: teacherRemark },
    signatures: overrides.signatures ?? { teacher:{name:null}, principal:{name:null} },
    issuedOn: label(overrides.issuedOn) || shortDate(now),
  };
}
