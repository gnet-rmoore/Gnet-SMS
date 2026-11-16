import type { GradeSheetData, GradeSheetSubject } from "./types";

const NAMES = ["Mathematics","English Language","General Science","Social Studies","Civics","French","Computer Studies","Physical Education","Biology","Chemistry","Physics","Geography","History","Literature","Religious Education","Art & Design","Music"];
const CODES = ["MTH","ENG","SCI","SOC","CIV","FRN","ICT","PE","BIO","CHM","PHY","GEO","HIS","LIT","REL","ART","MUS"];
const COLS = [{code:"HW",name:"Homework",weightPct:20},{code:"QZ",name:"Quiz",weightPct:20},{code:"CW",name:"Classwork",weightPct:10},{code:"MID",name:"Midterm",weightPct:20},{code:"FIN",name:"Final",weightPct:30}];
const LEGEND = [{min:90,max:100,letter:"A",remark:"Excellent"},{min:80,max:89,letter:"B",remark:"Very good"},{min:70,max:79,letter:"C",remark:"Good"},{min:60,max:69,letter:"D",remark:"Satisfactory"},{min:0,max:59,letter:"F",remark:"Needs improvement"}];

function band(p:number){return LEGEND.find(b=>p>=b.min&&p<=b.max);}

export function sampleGradeSheetData(schoolName = "Greenfield Academy", address = "12 Tubman Boulevard, Monrovia, Liberia"): GradeSheetData {
  const base = [[92,88,95,84,90],[85,90,88,78,82],[78,82,80,74,77],[88,84,90,81,86],[95,92,94,89,91],[70,66,72,64,68],[96,94,98,90,93],[98,95,100,92,96],[82,79,85,76,80],[74,78,70,72,75],[80,83,77,79,82],[86,82,88,80,84],[77,80,75,73,78],[84,87,82,80,85],[91,89,93,87,90],[88,90,86,84,87],[76,74,78,70,73]];
  const subjects: GradeSheetSubject[] = NAMES.map((name,i)=>{
    const x = base[i];
    const scores:Record<string,number|null>={HW:x[0],QZ:x[1],CW:x[2],MID:x[3],FIN:x[4]};
    const total = Math.round((x[0]*.2+x[1]*.2+x[2]*.1+x[3]*.2+x[4]*.3)*10)/10;
    const b = band(Math.round(total));
    return { name, code:CODES[i], scores, total, letter:b?.letter||null, remark:b?.remark||null, position:null, max:100, obtained:total, classAvg:null, grade:b?.letter||"—", ca: Math.round((x[0]*.4+x[1]*.4+x[2]*.2)*10)/10, exam: Math.round((x[3]*.4+x[4]*.6)*10)/10 };
  });
  const avg = Math.round(subjects.reduce((s,x)=>s+(x.total||0),0)/subjects.length*10)/10;
  return {
    school:{ name: schoolName||"Greenfield Academy", address: address||"12 Tubman Boulevard, Monrovia, Liberia", contact:"+231 77 000 0000 · office@greenfield.example", phone:"+231 77 000 0000", email:"office@greenfield.example", motto:"Knowledge with integrity", crestInitials:"GA", logoUrl:null },
    term:{ label:`First Term — 2026/2027`, periodLabel:"First Term", examName:"First Term", issueDate:"16 Nov 2026", nextTermStart:"—", academicYear:"2026/2027", schoolYear:"2026/2027" },
    student:{ name:"Grace K. Johnson", id:"GA-2026-0142", admissionNo:"GA-2026-0142", classLabel:"Grade 9 — A", gradeLevel:"Grade 9", section:"A", dob:"—", guardian:"—" },
    columns: COLS, legend: LEGEND, subjects,
    summary:{ average:avg, rank:4, classSize:38, gpa:3.4, promotionStatus:null, maxTotal:subjects.length*100, obtainedTotal:Math.round(subjects.reduce((s,x)=>s+(x.total||0),0)*10)/10, percentage:avg, overallGrade: band(Math.round(avg))?.letter||"—", rankLabel:"4 of 38", conduct:"—" },
    attendance:{ present:58, total:62, absent:4, percentage:93.5 },
    remarks:{ educator:"Grace works consistently and contributes thoughtfully in class. Extra practice in French vocabulary will lift her next result.", principal:null, teacher:"Grace works consistently and contributes thoughtfully in class. Extra practice in French vocabulary will lift her next result." },
    signatures:{ teacher:{name:null}, principal:{name:null} },
    issuedOn:"16 Nov 2026",
  };
}
