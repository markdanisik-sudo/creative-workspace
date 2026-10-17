import type { Phase } from "@/features/projects/types";

export const EVENT_KINDS = ["shoot", "deadline", "meeting", "delivery", "other"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export const REQUEST_STATUSES = ["requested", "approved", "declined", "done"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const UNITS = ["day", "hour", "cut", "item"] as const;
export type Unit = (typeof UNITS)[number];

export interface ProjectDetails {
  id: string;
  name: string;
  clientName: string | null;
  description: string | null;
  phase: Phase;
  updatedAt: string;
}

export interface Person {
  id: string;
  name: string;
  isStudio: boolean;
}

export interface Task {
  id: string;
  phase: Phase;
  title: string;
  notes: string | null;
  dueDate: string | null;
  done: boolean;
  position: number;
}

export interface ProjectEvent {
  id: string;
  kind: EventKind;
  title: string;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  location: string | null;
  notes: string | null;
}

export interface Comment {
  id: string;
  body: string;
  author: Person;
  createdAt: string;
  edited: boolean;
  /** The Plan box the message is about, if any. */
  topic: string | null;
  /** What in that box: "palette", "image:<id>", "item:<id>". */
  target: string | null;
  resolvedAt: string | null;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  unit: Unit;
  unitPrice: number | null;
  currency: string;
  active: boolean;
}

export interface AddOnRequest {
  id: string;
  title: string;
  unit: Unit;
  unitPrice: number | null;
  currency: string;
  quantity: number;
  details: string | null;
  status: RequestStatus;
  requester: Person;
  requestedById: string;
  createdAt: string;
}

export interface Member extends Person {
  email: string | null;
  joinedAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  createdAt: string;
  expired: boolean;
}
