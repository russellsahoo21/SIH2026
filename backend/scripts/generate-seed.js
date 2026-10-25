import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const institutionsList = [
  { pid: "AICTE-PID-0001", name: "Hillcrest Institute of Technology", region: "North", address: "Sector 14, Gurugram, Haryana" },
  { pid: "AICTE-PID-0002", name: "Apex National Academy of Engineering", region: "North", address: "Knowledge Park III, Greater Noida, UP" },
  { pid: "AICTE-PID-0003", name: "Vidya Vihar College of Science and Tech", region: "Central", address: "Bhopal Bypass Road, Bhopal, MP" },
  { pid: "AICTE-PID-0004", name: "Sahyadri Institute of Management and Tech", region: "West", address: "Kothrud, Pune, Maharashtra" },
  { pid: "AICTE-PID-0005", name: "Vanguard Engineering College", region: "South", address: "Electronic City, Bengaluru, Karnataka" },
  { pid: "AICTE-PID-0006", name: "Kalinga Technical Campus", region: "East", address: "Patia, Bhubaneswar, Odisha" },
  { pid: "AICTE-PID-0007", name: "Aryavarta Institute of Advanced Studies", region: "North", address: "Sitapur Road, Lucknow, UP" },
  { pid: "AICTE-PID-0008", name: "Deccan College of Engineering and Tech", region: "South", address: "Gachibowli, Hyderabad, Telangana" },
  { pid: "AICTE-PID-0009", name: "Western Institute of Chemical Technology", region: "West", address: "Navrangpura, Ahmedabad, Gujarat" },
  { pid: "AICTE-PID-0010", name: "Chola Institute of Technical Studies", region: "South", address: "OMR, Chennai, Tamil Nadu" },
  { pid: "AICTE-PID-0011", name: "Himalayan Institute of Applied Sciences", region: "North", address: "Chakrata Road, Dehradun, Uttarakhand" },
  { pid: "AICTE-PID-0012", name: "Zenith Business and Management Institute", region: "Central", address: "AB Road, Indore, MP" },
  { pid: "AICTE-PID-0013", name: "Pragati College of Engineering", region: "East", address: "Salt Lake Sector V, Kolkata, WB" },
  { pid: "AICTE-PID-0014", name: "Konkan Maritime and Technical Institute", region: "West", address: "Vashi, Navi Mumbai, Maharashtra" },
  { pid: "AICTE-PID-0015", name: "Coromandel Academy of Pharmacy", region: "South", address: "Visakhapatnam, Andhra Pradesh" },
  { pid: "AICTE-PID-0016", name: "Drona College of Technology", region: "North", address: "Sohna Road, Gurugram, Haryana" },
  { pid: "AICTE-PID-0017", name: "Malabar Institute of Engineering", region: "South", address: "Calicut Road, Kozhikode, Kerala" },
  { pid: "AICTE-PID-0018", name: "Marwar Technical University Campus", region: "West", address: "Pal Road, Jodhpur, Rajasthan" },
  { pid: "AICTE-PID-0019", name: "Pataliputra Engineering College", region: "East", address: "Bailey Road, Patna, Bihar" },
  { pid: "AICTE-PID-0020", name: "Satpura Institute of Polytechnic Studies", region: "Central", address: "Jabalpur Highway, Jabalpur, MP" },
  { pid: "AICTE-PID-0021", name: "Brahmaputra Valley College of Engineering", region: "East", address: "Jalukbari, Guwahati, Assam" },
  { pid: "AICTE-PID-0022", name: "Aravalli Institute of Technology", region: "West", address: "Sukher, Udaipur, Rajasthan" },
  { pid: "AICTE-PID-0023", name: "Ganga Institute of Architecture and Design", region: "North", address: "Jhajjar Road, Bahadurgarh, Haryana" },
  { pid: "AICTE-PID-0024", name: "Mysore Academy of Technology and Management", region: "South", address: "Hunsur Road, Mysuru, Karnataka" },
  { pid: "AICTE-PID-0025", name: "Narmada Institute of Science and Technology", region: "West", address: "Zadeshwar, Bharuch, Gujarat" },
  { pid: "AICTE-PID-0026", name: "Shivalik College of Engineering", region: "North", address: "Shimla Bypass, Dehradun, Uttarakhand" },
  { pid: "AICTE-PID-0027", name: "Utkal Institute of Computer Applications", region: "East", address: "Chandaka, Bhubaneswar, Odisha" },
  { pid: "AICTE-PID-0028", name: "Kaveri College of Engineering and Tech", region: "South", address: "Thirumazhisai, Chennai, Tamil Nadu" },
  { pid: "AICTE-PID-0029", name: "Vidarbha Institute of Technology", region: "West", address: "Umaria, Nagpur, Maharashtra" },
  { pid: "AICTE-PID-0030", name: "Bundelkhand Technical Academy", region: "Central", address: "Kanpur Road, Jhansi, UP" },
  { pid: "AICTE-PID-0031", name: "Thar Institute of Engineering and Tech", region: "West", address: "Bikaner Highway, Bikaner, Rajasthan" },
  { pid: "AICTE-PID-0032", name: "Sundarbans Engineering Institute", region: "East", address: "Baruipur, South 24 Parganas, WB" },
  { pid: "AICTE-PID-0033", name: "Godavari College of Engineering", region: "South", address: "Rajahmundry, Andhra Pradesh" },
  { pid: "AICTE-PID-0034", name: "Doab Technical Institute", region: "North", address: "GT Road, Aligarh, UP" },
  { pid: "AICTE-PID-0035", name: "Panchvati Institute of Management", region: "West", address: "Gangapur Road, Nashik, Maharashtra" },
  { pid: "AICTE-PID-0036", name: "Nilgiri Academy of Technical Studies", region: "South", address: "Coimbatore Road, Ooty, Tamil Nadu" },
  { pid: "AICTE-PID-0037", name: "Chotanagpur College of Engineering", region: "East", address: "Tatisilwai, Ranchi, Jharkhand" },
  { pid: "AICTE-PID-0038", name: "Vindhya Institute of Technology", region: "Central", address: "Rewa Bypass, Satna, MP" },
  { pid: "AICTE-PID-0039", name: "Thiruvalluvar Institute of Engineering", region: "South", address: "Vandavasi Road, Kanchipuram, TN" },
  { pid: "AICTE-PID-0040", name: "Surya College of Engineering and Tech", region: "North", address: "Ambala Highway, Mohali, Punjab" }
];

function normalizeName(name) {
  return name.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const institutionsJson = institutionsList.map((inst, idx) => ({
  id: idx + 1,
  permanentId: inst.pid,
  name: inst.name,
  normalizedName: normalizeName(inst.name),
  address: inst.address,
  region: inst.region,
  active: 1
}));

// Planted Overlaps specification (15 institutions with overlapping grievances across bureaus)
const plantedOverlaps = [
  {
    institutionIndex: 0, // Hillcrest (North)
    cases: [
      { bureau: "PGRC", category: "FEES", desc: "College is demanding capitation fees of Rs 2,50,000 for B.Tech admission contrary to AICTE fee committee norms.", channel: "CPGRAMS", daysAgo: 10, status: "UNDER_PROCESS" },
      { bureau: "RB", category: "FEES", desc: "Overcharging tuition and laboratory fee under the guise of developmental charges.", channel: "LETTER", daysAgo: 6, status: "NEW" }
    ]
  },
  {
    institutionIndex: 1, // Apex National
    cases: [
      { bureau: "RB", category: "INTAKE", desc: "Institution admitted 240 students in Computer Science exceeding the approved AICTE intake of 180.", channel: "EMAIL", daysAgo: 18, status: "UNDER_PROCESS" },
      { bureau: "PGRC", category: "INTAKE", desc: "College admitted excess candidates without state counseling quota clearance.", channel: "CPGRAMS", daysAgo: 12, status: "NEW" }
    ]
  },
  {
    institutionIndex: 2, // Vidya Vihar
    cases: [
      { bureau: "PGRC", category: "FACULTY", desc: "Severe shortage of qualified professors and Assistant Professors in Mechanical department.", channel: "LETTER", daysAgo: 25, status: "PENDING" },
      { bureau: "RO", category: "FACULTY", desc: "Faculty members are being paid below 7th CPC guidelines and forced to sign blank cheques.", channel: "MINISTRY", daysAgo: 15, status: "UNDER_PROCESS" }
    ]
  },
  {
    institutionIndex: 3, // Sahyadri
    cases: [
      { bureau: "RB", category: "INFRASTRUCTURE", desc: "Lack of mandatory fire safety clearance and unapproved building construction on campus.", channel: "COURT", daysAgo: 40, status: "ESCALATED" },
      { bureau: "RO", category: "INFRASTRUCTURE", desc: "Laboratories and computer center lack required equipment as per AICTE Approval Process Handbook.", channel: "LETTER", daysAgo: 32, status: "UNDER_PROCESS" }
    ]
  },
  {
    institutionIndex: 4, // Vanguard
    cases: [
      { bureau: "PGRC", category: "RAGGING", desc: "Severe ragging incidents reported in first year boys hostel; Anti-Ragging Committee not active.", channel: "CPGRAMS", daysAgo: 8, status: "NEW" },
      { bureau: "RO", category: "RAGGING", desc: "Hostel wardens and management failed to take prompt action on repeated ragging complaint.", channel: "EMAIL", daysAgo: 4, status: "UNDER_PROCESS" }
    ]
  },
  {
    institutionIndex: 5, // Kalinga
    cases: [
      { bureau: "RB", category: "NORM_VIOLATION", desc: "Running unapproved evening shift diploma and degree programs without council sanction.", channel: "RTI", daysAgo: 22, status: "UNDER_PROCESS" },
      { bureau: "PGRC", category: "NORM_VIOLATION", desc: "Unapproved distance education study center operated within campus premises.", channel: "EMAIL", daysAgo: 14, status: "NEW" }
    ]
  },
  {
    institutionIndex: 6, // Aryavarta
    cases: [
      { bureau: "RO", category: "FEES", desc: "Refusal to refund caution deposit and original educational certificates of withdrawn students.", channel: "CPGRAMS", daysAgo: 35, status: "ESCALATED" },
      { bureau: "PGRC", category: "FEES", desc: "Illegal retention of original degree certificates for pending semester fees.", channel: "LETTER", daysAgo: 16, status: "UNDER_PROCESS" }
    ]
  },
  {
    institutionIndex: 7, // Deccan
    cases: [
      { bureau: "RB", category: "FACULTY", desc: "Ghost faculty listed during annual AICTE inspection; many faculty absent in biometric logs.", channel: "MINISTRY", daysAgo: 45, status: "ESCALATED" },
      { bureau: "RO", category: "FACULTY", desc: "Ph.D. guides lacking mandatory credentials appointed as heads of postgraduate departments.", channel: "EMAIL", daysAgo: 20, status: "UNDER_PROCESS" }
    ]
  },
  {
    institutionIndex: 8, // Western Inst
    cases: [
      { bureau: "PGRC", category: "INTAKE", desc: "Admissions conducted under management quota exceeding statutory 15% quota ceiling.", channel: "LETTER", daysAgo: 15, status: "NEW" },
      { bureau: "RB", category: "INTAKE", desc: "Management quota seats filled without merit list publication on college website.", channel: "CPGRAMS", daysAgo: 11, status: "UNDER_PROCESS" }
    ]
  },
  {
    institutionIndex: 9, // Chola Inst
    cases: [
      { bureau: "RO", category: "INFRASTRUCTURE", desc: "Insufficient library titles and lack of subscribed mandatory IEEE/ScienceDirect journals.", channel: "LETTER", daysAgo: 28, status: "UNDER_PROCESS" },
      { bureau: "RB", category: "INFRASTRUCTURE", desc: "Library seating capacity is less than half of prescribed AICTE norms.", channel: "RTI", daysAgo: 9, status: "NEW" }
    ]
  },
  {
    institutionIndex: 10, // Himalayan
    cases: [
      { bureau: "PGRC", category: "FEES", desc: "Demanding mandatory hostel and mess fees even from local day-scholar students.", channel: "CPGRAMS", daysAgo: 19, status: "UNDER_PROCESS" },
      { bureau: "RO", category: "FEES", desc: "Extortionate transport fee levied on students without providing proper transit.", channel: "LETTER", daysAgo: 7, status: "NEW" }
    ]
  },
  {
    institutionIndex: 11, // Zenith
    cases: [
      { bureau: "RB", category: "NORM_VIOLATION", desc: "Misleading advertisements regarding 100% placement with fraudulent salary packages.", channel: "VIP", daysAgo: 21, status: "UNDER_PROCESS" },
      { bureau: "PGRC", category: "NORM_VIOLATION", desc: "Deceptive advertising of unaccredited international dual-degree programs.", channel: "EMAIL", daysAgo: 13, status: "NEW" }
    ]
  },
  {
    institutionIndex: 12, // Pragati
    cases: [
      { bureau: "RO", category: "RAGGING", desc: "Severe intimidation of junior students in off-campus private hostel managed by college.", channel: "LETTER", daysAgo: 10, status: "UNDER_PROCESS" },
      { bureau: "PGRC", category: "RAGGING", desc: "Physical harassment of first year students during technical symposium rehearsals.", channel: "EMAIL", daysAgo: 5, status: "NEW" }
    ]
  },
  {
    institutionIndex: 13, // Konkan
    cases: [
      { bureau: "RB", category: "FACULTY", desc: "Non-payment of faculty salaries for four consecutive months.", channel: "COURT", daysAgo: 50, status: "ESCALATED" },
      { bureau: "RO", category: "FACULTY", desc: "Unlawful termination of faculty members who raised concerns regarding salary delays.", channel: "LETTER", daysAgo: 30, status: "UNDER_PROCESS" }
    ]
  },
  {
    institutionIndex: 14, // Coromandel
    cases: [
      { bureau: "PGRC", category: "INFRASTRUCTURE", desc: "Laboratory chemicals expired and analytical balances non-functional in pharmacology lab.", channel: "CPGRAMS", daysAgo: 24, status: "UNDER_PROCESS" },
      { bureau: "RO", category: "INFRASTRUCTURE", desc: "Hazardous chemical disposal procedures violated posing environmental threat on campus.", channel: "MINISTRY", daysAgo: 17, status: "NEW" }
    ]
  }
];

const categories = ['FEES', 'INTAKE', 'FACULTY', 'INFRASTRUCTURE', 'RAGGING', 'NORM_VIOLATION', 'OTHER'];
const channels = ['CPGRAMS', 'EMAIL', 'LETTER', 'MINISTRY', 'VIP', 'COURT', 'RTI', 'OTHER'];
const bureaus = ['RB', 'PGRC', 'RO'];

function getIsoDate(daysAgo) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

const allCases = [];

// 1. Add Planted Overlap Cases (30 cases across 15 institutions)
plantedOverlaps.forEach((overlap) => {
  const inst = institutionsList[overlap.institutionIndex];
  overlap.cases.forEach((c) => {
    allCases.push({
      institutionPermanentId: inst.pid,
      institutionName: inst.name,
      bureau: c.bureau,
      category: c.category,
      sourceChannel: c.channel,
      receivedOn: getIsoDate(c.daysAgo),
      status: c.status,
      description: c.desc
    });
  });
});

// 2. Add 10 deliberately Overdue cases (35 to 65 days ago)
const overdueTemplates = [
  { instIdx: 15, cat: "FEES", desc: "Non-settlement of scholarship refund due to SC/ST students.", daysAgo: 45, bureau: "PGRC" },
  { instIdx: 16, cat: "FACULTY", desc: "Inadequate faculty cadre ratio in Civil Engineering department.", daysAgo: 55, bureau: "RB" },
  { instIdx: 17, cat: "INFRASTRUCTURE", desc: "Lack of ramp and lift access for disabled students as per PwD guidelines.", daysAgo: 40, bureau: "RO" },
  { instIdx: 18, cat: "INTAKE", desc: "Running unapproved supernumerary NRI seats.", daysAgo: 35, bureau: "RB" },
  { instIdx: 19, cat: "NORM_VIOLATION", desc: "Operating without mandatory NAAC/NBA accreditation declarations.", daysAgo: 50, bureau: "PGRC" },
  { instIdx: 20, cat: "OTHER", desc: "Refusal to provide transcript copies for overseas higher education.", daysAgo: 38, bureau: "RO" },
  { instIdx: 21, cat: "FEES", desc: "Demanding Rs 50,000 extra fee for university examination hall tickets.", daysAgo: 42, bureau: "PGRC" },
  { instIdx: 22, cat: "FACULTY", desc: "Adhoc teachers appointed without selection committee interview.", daysAgo: 60, bureau: "RB" },
  { instIdx: 23, cat: "INFRASTRUCTURE", desc: "Server room and campus intranet non-functional during online semester examinations.", daysAgo: 48, bureau: "RO" },
  { instIdx: 24, cat: "NORM_VIOLATION", desc: "Change of college location without prior approval of AICTE.", daysAgo: 65, bureau: "RB" }
];

overdueTemplates.forEach((t) => {
  const inst = institutionsList[t.instIdx];
  allCases.push({
    institutionPermanentId: inst.pid,
    institutionName: inst.name,
    bureau: t.bureau,
    category: t.cat,
    sourceChannel: "CPGRAMS",
    receivedOn: getIsoDate(t.daysAgo),
    status: "UNDER_PROCESS", // will be picked up by escalation service
    description: t.desc
  });
});

// 3. Add 5 Transferred cases
const transferredTemplates = [
  { instIdx: 25, cat: "FEES", desc: "Complaint originally lodged at RO, forwarded to PGRC for central grievance committee review.", daysAgo: 14, bureau: "RO" },
  { instIdx: 26, cat: "NORM_VIOLATION", desc: "Affiliation dispute forwarded from Regional Office to Regulation Bureau for policy resolution.", daysAgo: 12, bureau: "RO" },
  { instIdx: 27, cat: "INTAKE", desc: "Seat matrix ambiguity transferred to Approval Bureau Cell for verification.", daysAgo: 8, bureau: "PGRC" },
  { instIdx: 28, cat: "FACULTY", desc: "Fake appointment letter issue transferred to Regional Director for on-ground inspection.", daysAgo: 16, bureau: "RB" },
  { instIdx: 29, cat: "INFRASTRUCTURE", desc: "Land title litigation complaint transferred to Legal Cell and Regulation Bureau.", daysAgo: 20, bureau: "RO" }
];

transferredTemplates.forEach((t) => {
  const inst = institutionsList[t.instIdx];
  allCases.push({
    institutionPermanentId: inst.pid,
    institutionName: inst.name,
    bureau: t.bureau,
    category: t.cat,
    sourceChannel: "LETTER",
    receivedOn: getIsoDate(t.daysAgo),
    status: "TRANSFERRED",
    description: t.desc
  });
});

// 4. Generate Remaining diverse cases up to 200 total
const descriptionsPool = [
  "Excessive exam fee collected in violation of state fee fixation committee guidelines.",
  "Inadequate drinking water and hygienic sanitation facilities in girls common room.",
  "Non-disbursement of PG GATE scholarship stipend to eligible M.Tech students.",
  "College principal does not possess required 15 years teaching experience and API score.",
  "Biometric attendance records falsified to demonstrate compliance during AICTE surprise visit.",
  "Non-formation of Internal Complaints Committee (ICC) under Sexual Harassment Act.",
  "Illegal collection of bus transportation charges despite online class mode.",
  "Undergraduate students forced to buy textbooks published exclusively by college promoters.",
  "Placement brochure claimed Google and Microsoft visits without any actual campus drive.",
  "Faculty forced to do non-academic admission marketing duty under threat of salary deduction.",
  "Library lacks mandatory subscription to National Digital Library and online ejournals.",
  "Delay in issuance of final consolidated marksheets causing job offer cancellation.",
  "Grievance redressal portal on college website is dysfunctional and unmonitored.",
  "Canteen charges exorbitant rates for substandard and unhygienic food.",
  "Refusal to issue migration certificate after completion of degree requirements."
];

let counter = 30;
while (allCases.length < 200) {
  const instIdx = counter % institutionsList.length;
  const inst = institutionsList[instIdx];
  const cat = categories[counter % categories.length];
  const channel = channels[counter % channels.length];
  const bureau = bureaus[counter % bureaus.length];
  const desc = descriptionsPool[counter % descriptionsPool.length];
  const daysAgo = (counter * 3) % 90 + 2;

  // Mix of statuses
  let status = "UNDER_PROCESS";
  if (daysAgo > 60 && counter % 3 === 0) status = "DISPOSED";
  else if (counter % 5 === 0) status = "NEW";
  else if (counter % 7 === 0) status = "PENDING";
  else if (counter % 11 === 0) status = "ESCALATED";

  allCases.push({
    institutionPermanentId: inst.pid,
    institutionName: inst.name,
    bureau,
    category: cat,
    sourceChannel: channel,
    receivedOn: getIsoDate(daysAgo),
    status,
    description: `${desc} (Reference Case #${counter + 1})`
  });
  counter++;
}

// Write to data/seed/
const seedDir = path.join(__dirname, '..', 'data', 'seed');
fs.mkdirSync(seedDir, { recursive: true });

fs.writeFileSync(
  path.join(seedDir, 'institutions.json'),
  JSON.stringify(institutionsJson, null, 2)
);
console.log(`Generated ${institutionsJson.length} institutions in data/seed/institutions.json`);

fs.writeFileSync(
  path.join(seedDir, 'cases.json'),
  JSON.stringify(allCases, null, 2)
);
console.log(`Generated ${allCases.length} cases in data/seed/cases.json`);
