/** Mock staff API. Basic plan: hard limit of 3 members including the owner. */
import type { AddStaffInput, StaffList, StaffMember } from "./types";
import { delay, nextId, staff, STAFF_LIMIT } from "./mock/db";

export async function listStaff(): Promise<StaffList> {
  await delay();
  return { staff: [...staff], limit: STAFF_LIMIT, used: staff.length };
}

export async function getStaffMember(id: string): Promise<StaffMember> {
  await delay(250);
  const s = staff.find((x) => x.id === id);
  if (!s) throw new Error("Staff member not found");
  return { ...s };
}

export async function addStaff(input: AddStaffInput): Promise<StaffMember> {
  await delay(600);
  if (staff.length >= STAFF_LIMIT) {
    throw new Error(
      `Your Basic plan allows ${STAFF_LIMIT} members (owner + ${STAFF_LIMIT - 1} staff). Upgrade to add more.`,
    );
  }
  if (staff.some((s) => s.email.toLowerCase() === input.email.toLowerCase())) {
    throw new Error("A member with this email already exists");
  }
  const member: StaffMember = {
    id: nextId("user"),
    name: input.name,
    email: input.email,
    phone: input.phone,
    role: "staff",
    addedAt: new Date().toISOString(),
  };
  staff.push(member);
  return member;
}

export async function removeStaff(id: string): Promise<{ ok: boolean }> {
  await delay(500);
  const idx = staff.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error("Staff member not found");
  if (staff[idx].role === "owner") throw new Error("The owner cannot be removed");
  staff.splice(idx, 1);
  return { ok: true };
}
