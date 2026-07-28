/**
 * In-memory mock database. Deterministic, realistic Indian hostel data.
 * Mutations from the mock API layer update these arrays so the UI behaves
 * like a real backend for the duration of the session.
 */
import type {
  AppNotification,
  Bed,
  Complaint,
  Discount,
  FeeAssignment,
  FeeStructure,
  Invoice,
  Org,
  Payment,
  Resident,
  Room,
  SecurityDeposit,
  StaffMember,
  User,
} from "../types";

// ---------- time helpers ----------

const now = new Date();

export function daysAgo(n: number): string {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export function monthsAgoISO(n: number): string {
  const d = new Date(now.getFullYear(), now.getMonth() - n, 1);
  return d.toISOString();
}

export function ym(offset = 0): string {
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const CURRENT_YEAR = now.getFullYear();

// ---------- org & users ----------

export const org: Org = {
  id: "org_1",
  name: "Shree Shyam Hospitality",
  hostelName: "Shanti Niwas Boys Hostel",
  addressLine: "Plot 42, Gopalpura Bypass",
  city: "Jaipur",
  state: "Rajasthan",
  pincode: "302015",
  phone: "9829012345",
  email: "shantiniwas.jaipur@gmail.com",
  gstin: "08ABCDE1234F1Z5",
  plan: "basic",
  setupComplete: true,
};

export const owner: User = {
  id: "user_1",
  orgId: org.id,
  name: "Mayank Jangid",
  email: "jangidmayank2304@gmail.com",
  phone: "9829012345",
  role: "owner",
  twoFactorEnabled: false,
  createdAt: monthsAgoISO(14),
};

export const staff: StaffMember[] = [
  {
    id: "user_1",
    name: "Mayank Jangid",
    email: "jangidmayank2304@gmail.com",
    phone: "9829012345",
    role: "owner",
    addedAt: monthsAgoISO(14),
    lastActiveAt: daysAgo(0),
  },
  {
    id: "user_2",
    name: "Ramesh Choudhary",
    email: "ramesh.warden@gmail.com",
    phone: "9414055667",
    role: "staff",
    addedAt: monthsAgoISO(10),
    lastActiveAt: daysAgo(1),
  },
];

export const STAFF_LIMIT = 3;

// ---------- rooms & beds ----------

interface RoomSeed {
  num: number;
  floor: number;
  type: Room["type"];
  capacity: number;
  rent: number; // paisa
  /** Room-level fixed fee: residents' fees lock to the room amount */
  fixed?: boolean;
}

const roomSeeds: RoomSeed[] = [
  { num: 101, floor: 1, type: "double", capacity: 2, rent: 550000 },
  { num: 102, floor: 1, type: "double", capacity: 2, rent: 550000 },
  { num: 103, floor: 1, type: "triple", capacity: 3, rent: 450000 },
  { num: 104, floor: 1, type: "single", capacity: 1, rent: 800000 },
  { num: 105, floor: 1, type: "triple", capacity: 3, rent: 450000 },
  { num: 106, floor: 1, type: "dorm", capacity: 4, rent: 380000, fixed: true },
  { num: 201, floor: 2, type: "double", capacity: 2, rent: 570000 },
  { num: 202, floor: 2, type: "double", capacity: 2, rent: 570000 },
  { num: 203, floor: 2, type: "triple", capacity: 3, rent: 470000 },
  { num: 204, floor: 2, type: "single", capacity: 1, rent: 820000 },
  { num: 205, floor: 2, type: "triple", capacity: 3, rent: 470000 },
  { num: 206, floor: 2, type: "dorm", capacity: 4, rent: 400000, fixed: true },
  { num: 301, floor: 3, type: "double", capacity: 2, rent: 600000 },
  { num: 302, floor: 3, type: "double", capacity: 2, rent: 600000 },
  { num: 303, floor: 3, type: "triple", capacity: 3, rent: 500000 },
  { num: 304, floor: 3, type: "single", capacity: 1, rent: 850000 },
];

export const rooms: Room[] = roomSeeds.map((s) => ({
  id: `room_${s.num}`,
  number: `Room ${s.num}`,
  floor: s.floor,
  type: s.type,
  capacity: s.capacity,
  monthlyRentPaisa: s.rent,
  feeMode: s.fixed ? "fixed" : "variable",
  fixedFeeAmountPaisa: s.fixed ? s.rent : null,
  occupiedCount: 0,
  beds: Array.from({ length: s.capacity }, (_, i): Bed => ({
    id: `bed_${s.num}_${String.fromCharCode(65 + i)}`,
    roomId: `room_${s.num}`,
    label: String.fromCharCode(65 + i), // A, B, C…
    status: "vacant",
  })),
}));

// ---------- residents ----------

interface ResidentSeed {
  name: string;
  phone: string;
  guardian: string;
  city: string;
  occupation: "student" | "working";
  place: string;
  duesMonths?: number; // months of unpaid rent
}

const residentSeeds: ResidentSeed[] = [
  { name: "Rahul Sharma", phone: "9876543210", guardian: "Om Prakash Sharma", city: "Sikar, Rajasthan", occupation: "student", place: "Poornima College of Engineering" },
  { name: "Amit Verma", phone: "9812345678", guardian: "Suresh Verma", city: "Alwar, Rajasthan", occupation: "student", place: "Rajasthan University", duesMonths: 2 },
  { name: "Arjun Nair", phone: "9847012345", guardian: "Mohanan Nair", city: "Kochi, Kerala", occupation: "working", place: "Infosys, Jaipur" },
  { name: "Rohan Gupta", phone: "9829988776", guardian: "Dinesh Gupta", city: "Kota, Rajasthan", occupation: "student", place: "Allen Career Institute" },
  { name: "Vikram Joshi", phone: "9414123456", guardian: "Prakash Joshi", city: "Jodhpur, Rajasthan", occupation: "student", place: "MNIT Jaipur", duesMonths: 1 },
  { name: "Aditya Kulkarni", phone: "9822334455", guardian: "Shrikant Kulkarni", city: "Pune, Maharashtra", occupation: "working", place: "TCS, Jaipur" },
  { name: "Karan Malhotra", phone: "9911223344", guardian: "Rajiv Malhotra", city: "Delhi", occupation: "student", place: "JECRC University" },
  { name: "Nikhil Rao", phone: "9885566778", guardian: "Venkat Rao", city: "Hyderabad, Telangana", occupation: "working", place: "Genpact, Jaipur", duesMonths: 3 },
  { name: "Sanjay Yadav", phone: "9797011223", guardian: "Ram Singh Yadav", city: "Rewari, Haryana", occupation: "student", place: "Amity University Jaipur" },
  { name: "Varun Saxena", phone: "9838012345", guardian: "Alok Saxena", city: "Lucknow, UP", occupation: "student", place: "Manipal University Jaipur" },
  { name: "Harsh Trivedi", phone: "9727654321", guardian: "Bharat Trivedi", city: "Ahmedabad, Gujarat", occupation: "working", place: "Wipro, Jaipur" },
  { name: "Deepak Kumar", phone: "9709876543", guardian: "Mahesh Kumar", city: "Patna, Bihar", occupation: "student", place: "JECRC Foundation", duesMonths: 1 },
  { name: "Mohit Agarwal", phone: "9887700112", guardian: "Sunil Agarwal", city: "Bhilwara, Rajasthan", occupation: "student", place: "St. Xavier's College Jaipur" },
  { name: "Pranav Iyer", phone: "9445123456", guardian: "Ramesh Iyer", city: "Chennai, Tamil Nadu", occupation: "working", place: "Deloitte, Jaipur" },
  { name: "Sachin Meena", phone: "9660112233", guardian: "Kailash Meena", city: "Dausa, Rajasthan", occupation: "student", place: "Rajasthan University" },
  { name: "Ankit Singh", phone: "9559988770", guardian: "Devendra Singh", city: "Varanasi, UP", occupation: "student", place: "Vivekananda Global University", duesMonths: 2 },
  { name: "Gaurav Bansal", phone: "9313456789", guardian: "Naresh Bansal", city: "Gurugram, Haryana", occupation: "working", place: "Paytm, Jaipur" },
  { name: "Yash Purohit", phone: "9928123409", guardian: "Girish Purohit", city: "Udaipur, Rajasthan", occupation: "student", place: "MNIT Jaipur" },
  { name: "Ritesh Jain", phone: "9829456120", guardian: "Padam Jain", city: "Ajmer, Rajasthan", occupation: "student", place: "Poornima University" },
  { name: "Abhishek Chauhan", phone: "9711002233", guardian: "Vijay Chauhan", city: "Meerut, UP", occupation: "working", place: "Accenture, Jaipur" },
];

const idTypes = ["aadhaar", "pan", "aadhaar", "voter_id", "aadhaar", "driving_license"] as const;

// Assign residents to beds in order, skipping a few beds to leave vacancies.
const skipBedIndexes = new Set([3, 9, 14, 19, 23]);

const allBeds: Bed[] = rooms.flatMap((r) => r.beds);
// One bed under maintenance
allBeds[7].status = "maintenance";

export const residents: Resident[] = [];

let bedCursor = 0;
residentSeeds.forEach((seed, i) => {
  // find next assignable bed
  while (
    bedCursor < allBeds.length &&
    (skipBedIndexes.has(bedCursor) || allBeds[bedCursor].status === "maintenance")
  ) {
    bedCursor++;
  }
  const bed = allBeds[bedCursor++];
  const room = rooms.find((r) => r.id === bed.roomId)!;
  const joinMonths = 2 + ((i * 5) % 12);
  const duesMonths = seed.duesMonths ?? 0;
  const resident: Resident = {
    id: `res_${i + 1}`,
    name: seed.name,
    phone: seed.phone,
    email: `${seed.name.toLowerCase().replace(/\s+/g, ".")}@gmail.com`,
    status: "active",
    roomId: room.id,
    roomNumber: room.number,
    bedId: bed.id,
    bedLabel: bed.label,
    joinDate: monthsAgoISO(joinMonths),
    guardianName: seed.guardian,
    guardianPhone: `98${String(29100000 + i * 137).padStart(8, "0")}`,
    permanentAddress: seed.city,
    idType: idTypes[i % idTypes.length],
    idNumber:
      idTypes[i % idTypes.length] === "aadhaar"
        ? `XXXX XXXX ${String(1000 + i * 111).slice(0, 4)}`
        : `${seed.name.split(" ")[1]?.slice(0, 5).toUpperCase() ?? "DOCID"}${1000 + i}`,
    occupation: seed.occupation,
    institutionOrCompany: seed.place,
    monthlyFeePaisa: room.monthlyRentPaisa,
    depositPaisa: 1000000, // ₹10,000 standard deposit
    duesPaisa: duesMonths * room.monthlyRentPaisa,
  };
  residents.push(resident);
  bed.status = "occupied";
  bed.residentId = resident.id;
  bed.residentName = resident.name;
  room.occupiedCount++;
});

// Alumni (moved out)
const alumniSeeds = [
  { name: "Suresh Menon", phone: "9847098765", guardian: "Krishnan Menon", city: "Thrissur, Kerala", exitMonths: 2 },
  { name: "Ravi Shankar", phone: "9900112233", guardian: "Hari Shankar", city: "Bengaluru, Karnataka", exitMonths: 4 },
  { name: "Anil Rathore", phone: "9829334455", guardian: "Bhanwar Singh Rathore", city: "Jodhpur, Rajasthan", exitMonths: 6 },
  { name: "Manish Tiwari", phone: "9721456789", guardian: "Shyam Tiwari", city: "Kanpur, UP", exitMonths: 9 },
];

alumniSeeds.forEach((seed, i) => {
  residents.push({
    id: `res_al_${i + 1}`,
    name: seed.name,
    phone: seed.phone,
    email: `${seed.name.toLowerCase().replace(/\s+/g, ".")}@gmail.com`,
    status: "alumni",
    joinDate: monthsAgoISO(seed.exitMonths + 10),
    exitDate: monthsAgoISO(seed.exitMonths),
    guardianName: seed.guardian,
    guardianPhone: `94${String(14055000 + i * 313).padStart(8, "0")}`,
    permanentAddress: seed.city,
    idType: "aadhaar",
    idNumber: `XXXX XXXX ${4000 + i * 222}`,
    occupation: i % 2 === 0 ? "working" : "student",
    institutionOrCompany: i % 2 === 0 ? "Relocated for job" : "Course completed",
    monthlyFeePaisa: 550000,
    depositPaisa: 1000000,
    duesPaisa: 0,
  });
});

// ---------- payments ----------

export const payments: Payment[] = [];
let receiptSeq = 1;

const methods = ["upi", "cash", "upi", "bank_transfer", "upi", "cash", "card"] as const;

// Rent payments for the last 4 months from active residents (skipping dues months)
for (let m = 3; m >= 0; m--) {
  residents
    .filter((r) => r.status === "active")
    .forEach((r, i) => {
      const seed = residentSeeds[i];
      const duesMonths = seed?.duesMonths ?? 0;
      // resident hasn't paid the most recent `duesMonths` months
      if (m < duesMonths) return;
      // stagger: not everyone pays every month in this window
      if ((i + m) % 9 === 8) return;
      const payDay = 1 + ((i * 3 + m * 2) % 9);
      const d = new Date(now.getFullYear(), now.getMonth() - m, payDay, 10 + (i % 8), 15);
      if (d > now) return;
      payments.push({
        id: `pay_${receiptSeq}`,
        receiptNo: `RCP-${CURRENT_YEAR}-${String(receiptSeq).padStart(4, "0")}`,
        residentId: r.id,
        residentName: r.name,
        roomNumber: r.roomNumber,
        amountPaisa: r.monthlyFeePaisa,
        method: methods[(i + m) % methods.length],
        type: "rent",
        status: "completed",
        paidAt: d.toISOString(),
        periodMonth: ym(-m),
        refundedPaisa: 0,
        notes: undefined,
        recordedByName: (i + m) % 3 === 0 ? "Ramesh Choudhary" : "Mayank Jangid",
      });
      receiptSeq++;
    });
}

// A couple of deposit + misc payments
const extraPays: Array<Partial<Payment> & { residentIdx: number; amountPaisa: number; type: Payment["type"]; days: number }> = [
  { residentIdx: 17, amountPaisa: 1000000, type: "deposit", days: 40 },
  { residentIdx: 18, amountPaisa: 1000000, type: "deposit", days: 55 },
  { residentIdx: 4, amountPaisa: 50000, type: "fine", days: 12, notes: "Late night entry fine" },
  { residentIdx: 9, amountPaisa: 150000, type: "other", days: 6, notes: "Mess advance" },
];
extraPays.forEach((e) => {
  const r = residents[e.residentIdx];
  payments.push({
    id: `pay_${receiptSeq}`,
    receiptNo: `RCP-${CURRENT_YEAR}-${String(receiptSeq).padStart(4, "0")}`,
    residentId: r.id,
    residentName: r.name,
    roomNumber: r.roomNumber,
    amountPaisa: e.amountPaisa,
    method: "upi",
    type: e.type,
    status: "completed",
    paidAt: daysAgo(e.days),
    refundedPaisa: 0,
    notes: e.notes,
    recordedByName: "Mayank Jangid",
  });
  receiptSeq++;
});

// One refunded payment
payments[2].status = "partially_refunded";
payments[2].refundedPaisa = 100000;
payments[2].notes = "₹1,000 refunded — overcharged mess fee";

payments.sort((a, b) => b.paidAt.localeCompare(a.paidAt));

export function nextReceiptNo(): string {
  return `RCP-${CURRENT_YEAR}-${String(++receiptSeq).padStart(4, "0")}`;
}

// ---------- fee structures & assignments ----------

export const feeStructures: FeeStructure[] = [
  { id: "fee_1", name: "Double Sharing Rent", amountPaisa: 550000, cycle: "monthly", description: "Standard double sharing room rent", assignedCount: 8, createdAt: monthsAgoISO(14) },
  { id: "fee_2", name: "Triple Sharing Rent", amountPaisa: 450000, cycle: "monthly", description: "Triple sharing room rent", assignedCount: 7, createdAt: monthsAgoISO(14) },
  { id: "fee_3", name: "Single Room Rent", amountPaisa: 800000, cycle: "monthly", description: "Private single room", assignedCount: 3, createdAt: monthsAgoISO(14) },
  { id: "fee_4", name: "Mess Fee", amountPaisa: 300000, cycle: "monthly", description: "Two meals a day, veg", assignedCount: 15, createdAt: monthsAgoISO(12) },
  { id: "fee_5", name: "Laundry Add-on", amountPaisa: 50000, cycle: "monthly", description: "Twice a week pickup", assignedCount: 6, createdAt: monthsAgoISO(8) },
  { id: "fee_6", name: "Admission Fee", amountPaisa: 100000, cycle: "one_time", description: "One-time at joining", assignedCount: 20, createdAt: monthsAgoISO(14) },
];

export const feeAssignments: FeeAssignment[] = residents
  .filter((r) => r.status === "active")
  .slice(0, 12)
  .map((r, i) => {
    const fee = feeStructures[i % 3];
    return {
      id: `fa_${i + 1}`,
      feeStructureId: fee.id,
      feeName: fee.name,
      residentId: r.id,
      residentName: r.name,
      roomNumber: r.roomNumber,
      startDate: r.joinDate,
      amountPaisa: fee.amountPaisa,
    };
  });

// ---------- invoices ----------

export const invoices: Invoice[] = [];
let invSeq = 1;

residents
  .filter((r) => r.status === "active")
  .forEach((r, i) => {
    // current month invoice for everyone
    const unpaid = r.duesPaisa > 0;
    const issue = new Date(now.getFullYear(), now.getMonth(), 1);
    const due = new Date(now.getFullYear(), now.getMonth(), 10);
    const total = r.monthlyFeePaisa;
    invoices.push({
      id: `inv_${invSeq}`,
      number: `INV-${CURRENT_YEAR}-${String(invSeq).padStart(4, "0")}`,
      residentId: r.id,
      residentName: r.name,
      roomNumber: r.roomNumber,
      items: [{ description: `Room rent — ${ym(0)}`, amountPaisa: total }],
      totalPaisa: total,
      paidPaisa: unpaid ? 0 : total,
      status: unpaid ? (due < now ? "overdue" : "unpaid") : "paid",
      issueDate: issue.toISOString(),
      dueDate: due.toISOString(),
    });
    invSeq++;
    // last month invoice for a subset
    if (i % 2 === 0) {
      const issue2 = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const due2 = new Date(now.getFullYear(), now.getMonth() - 1, 10);
      invoices.push({
        id: `inv_${invSeq}`,
        number: `INV-${CURRENT_YEAR}-${String(invSeq).padStart(4, "0")}`,
        residentId: r.id,
        residentName: r.name,
        roomNumber: r.roomNumber,
        items: [
          { description: `Room rent — ${ym(-1)}`, amountPaisa: r.monthlyFeePaisa },
          { description: "Mess fee", amountPaisa: 300000 },
        ],
        totalPaisa: r.monthlyFeePaisa + 300000,
        paidPaisa: r.monthlyFeePaisa + 300000,
        status: "paid",
        issueDate: issue2.toISOString(),
        dueDate: due2.toISOString(),
      });
      invSeq++;
    }
  });

export function nextInvoiceNo(): string {
  return `INV-${CURRENT_YEAR}-${String(++invSeq).padStart(4, "0")}`;
}

// ---------- security deposits ----------

export const deposits: SecurityDeposit[] = residents.map((r, i) => {
  let status: SecurityDeposit["status"] = "held";
  let refunded = 0;
  let notes: string | undefined;
  if (r.status === "alumni") {
    if (i % 3 === 0) {
      status = "partially_refunded";
      refunded = 700000;
      notes = "₹3,000 withheld for room damage";
    } else if (i % 4 === 0) {
      status = "forfeited";
      notes = "Left without 30-day notice";
    } else {
      status = "refunded";
      refunded = r.depositPaisa;
    }
  }
  return {
    id: `dep_${i + 1}`,
    residentId: r.id,
    residentName: r.name,
    roomNumber: r.roomNumber,
    amountPaisa: r.depositPaisa,
    refundedPaisa: refunded,
    status,
    collectedOn: r.joinDate,
    updatedOn: r.exitDate ?? r.joinDate,
    notes,
  };
});

// ---------- complaints ----------

const complaintSeeds: Array<{
  title: string;
  desc: string;
  category: Complaint["category"];
  priority: Complaint["priority"];
  status: Complaint["status"];
  residentIdx?: number;
  days: number;
}> = [
  { title: "Geyser not working in 2nd floor bathroom", desc: "The geyser on the 2nd floor common bathroom has not been heating water since yesterday morning. Residents are getting cold water only.", category: "electrical", priority: "high", status: "in_progress", residentIdx: 6, days: 1 },
  { title: "WiFi very slow after 9 PM", desc: "Internet speed drops to under 1 Mbps every night between 9 PM and midnight. Impossible to attend online classes.", category: "wifi", priority: "medium", status: "open", residentIdx: 3, days: 2 },
  { title: "Water leakage near Room 103", desc: "There is continuous water seepage from the ceiling in the corridor outside Room 103. The floor stays wet and slippery.", category: "plumbing", priority: "high", status: "open", residentIdx: 4, days: 0 },
  { title: "Cot hinge broken — Room 205 Bed B", desc: "The folding hinge of the cot is broken and the bed tilts to one side.", category: "furniture", priority: "low", status: "resolved", residentIdx: 11, days: 6 },
  { title: "Food quality declined this week", desc: "Dal has been watery and rotis undercooked for the last 4-5 days. Several residents have complained.", category: "food", priority: "medium", status: "in_progress", residentIdx: 8, days: 3 },
  { title: "Main gate light not working", desc: "The light above the main gate is fused. Entry area is completely dark at night — safety concern.", category: "security", priority: "medium", status: "resolved", days: 10 },
  { title: "Room 106 fan making loud noise", desc: "Ceiling fan wobbles and makes a grinding noise at speed 3 and above.", category: "electrical", priority: "low", status: "closed", residentIdx: 13, days: 15 },
  { title: "Garbage not cleared from terrace", desc: "Old furniture and garbage bags have been lying on the terrace for two weeks.", category: "cleaning", priority: "low", status: "open", days: 4 },
];

export const complaints: Complaint[] = complaintSeeds.map((s, i) => {
  const r = s.residentIdx != null ? residents[s.residentIdx] : undefined;
  const created = daysAgo(s.days);
  const timeline: Complaint["timeline"] = [
    { id: `ce_${i}_1`, status: "open", note: "Complaint registered", byName: r?.name ?? "Ramesh Choudhary", at: created },
  ];
  if (s.status !== "open") {
    timeline.push({
      id: `ce_${i}_2`,
      status: "in_progress",
      note: s.category === "electrical" ? "Electrician called, visiting today" : "Assigned to warden for follow-up",
      byName: "Mayank Jangid",
      at: daysAgo(Math.max(0, s.days - 1)),
    });
  }
  if (s.status === "resolved" || s.status === "closed") {
    timeline.push({
      id: `ce_${i}_3`,
      status: "resolved",
      note: "Issue fixed and verified",
      byName: "Ramesh Choudhary",
      at: daysAgo(Math.max(0, s.days - 2)),
    });
  }
  if (s.status === "closed") {
    timeline.push({
      id: `ce_${i}_4`,
      status: "closed",
      note: "Confirmed by resident, closing ticket",
      byName: "Mayank Jangid",
      at: daysAgo(Math.max(0, s.days - 3)),
    });
  }
  return {
    id: `cmp_${i + 1}`,
    ticketNo: `CMP-${String(31 + i).padStart(4, "0")}`,
    title: s.title,
    description: s.desc,
    category: s.category,
    priority: s.priority,
    status: s.status,
    residentId: r?.id,
    residentName: r?.name,
    roomNumber: r?.roomNumber,
    createdAt: created,
    updatedAt: timeline[timeline.length - 1].at,
    timeline,
    attachments:
      i === 2
        ? [{ id: "att_1", fileName: "leakage-photo.jpg", fileType: "image/jpeg", url: "" }]
        : [],
  };
});

let complaintSeq = complaints.length;
export function nextTicketNo(): string {
  return `CMP-${String(31 + complaintSeq++).padStart(4, "0")}`;
}

// ---------- discounts ----------

export const discounts: Discount[] = [
  { id: "disc_1", name: "Sibling Discount", kind: "percent", value: 10, appliedCount: 2, active: true, createdAt: monthsAgoISO(6) },
  { id: "disc_2", name: "Long Stay (12+ months)", kind: "flat", value: 50000, appliedCount: 4, active: true, createdAt: monthsAgoISO(9) },
  { id: "disc_3", name: "Referral Bonus", kind: "flat", value: 100000, appliedCount: 1, active: false, validTill: monthsAgoISO(1), createdAt: monthsAgoISO(11) },
];

// ---------- notifications ----------

export const notifications: AppNotification[] = [
  { id: "ntf_1", kind: "payment", title: "Payment received", body: `Rahul Sharma paid ₹5,500 rent for ${ym(0)} via UPI.`, read: false, createdAt: daysAgo(0), link: "/payments" },
  { id: "ntf_2", kind: "complaint", title: "New complaint", body: "Water leakage near Room 103 — marked high priority.", read: false, createdAt: daysAgo(0), link: "/complaints" },
  { id: "ntf_3", kind: "due", title: "Dues crossed ₹15,000", body: "Nikhil Rao now has 3 months of unpaid rent (₹14,100).", read: false, createdAt: daysAgo(1), link: "/dues" },
  { id: "ntf_4", kind: "payment", title: "Payment received", body: "Gaurav Bansal paid ₹5,700 rent via bank transfer.", read: true, createdAt: daysAgo(2), link: "/payments" },
  { id: "ntf_5", kind: "complaint", title: "Complaint resolved", body: "Cot hinge in Room 205 has been repaired.", read: true, createdAt: daysAgo(5), link: "/complaints" },
  { id: "ntf_6", kind: "system", title: "Monthly invoices generated", body: `${invoices.filter((i) => i.issueDate.startsWith(ym(0))).length} invoices created for ${ym(0)}.`, read: true, createdAt: daysAgo(26), link: "/invoices" },
  { id: "ntf_7", kind: "due", title: "Dues reminder sent", body: "Reminder SMS sent to 5 residents with pending dues.", read: true, createdAt: daysAgo(8) },
  { id: "ntf_8", kind: "system", title: "Welcome to Saahvik", body: "Your hostel is set up. Add rooms and residents to get started.", read: true, createdAt: monthsAgoISO(14) },
];

// ---------- generic helpers ----------

export function paginate<T>(arr: T[], page = 1, pageSize = 10) {
  return {
    data: arr.slice((page - 1) * pageSize, page * pageSize),
    total: arr.length,
    page,
    pageSize,
  };
}

export function sortBy<T>(arr: T[], key: string | undefined, dir: "asc" | "desc" = "asc"): T[] {
  if (!key) return arr;
  const sorted = [...arr].sort((a, b) => {
    const av = (a as Record<string, unknown>)[key];
    const bv = (b as Record<string, unknown>)[key];
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "number" && typeof bv === "number") return av - bv;
    return String(av).localeCompare(String(bv));
  });
  return dir === "desc" ? sorted.reverse() : sorted;
}

export function delay(ms = 350): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let idSeq = 1000;
export function nextId(prefix: string): string {
  return `${prefix}_${++idSeq}`;
}
