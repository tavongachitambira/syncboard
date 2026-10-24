import { z } from "zod"
import { IncidentStatus, Severity } from "../types/incident.ts"
import { emailSchema } from "./auth.ts"

const severity = z.enum(Severity)
const status = z.enum(IncidentStatus)

const atLeastOneField = {
  message: "At least one field is required",
}

// ─── Incidents ────────────────────────────────────────────────────────────────

export const createIncidentSchema = z.object({
  title: z.string().trim().min(1).max(255),
  severity,
  serviceId: z.uuid(),
  assignees: z.array(z.uuid()).default([]),
})
export type CreateIncidentInput = z.infer<typeof createIncidentSchema>

// version is required: structured fields use optimistic concurrency
// (error-handling.md, ADR-05). RESOLVED is reached through the resolve
// endpoint, not PATCH.
export const updateIncidentSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    severity: severity.optional(),
    status: status.exclude(["RESOLVED"]).optional(),
    version: z.number().int().positive(),
  })
  .refine(
    ({ version: _version, ...fields }) => Object.keys(fields).length > 0,
    atLeastOneField
  )
export type UpdateIncidentInput = z.infer<typeof updateIncidentSchema>

export const listIncidentsSchema = z.object({
  status: status.optional(),
  severity: severity.optional(),
  serviceId: z.uuid().optional(),
  assignee: z.uuid().optional(),
  q: z.string().max(100).optional(),
  sort: z.enum(["updatedAt", "createdAt", "severity"]).default("updatedAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
export type ListIncidentsInput = z.infer<typeof listIncidentsSchema>

// ─── Comments ─────────────────────────────────────────────────────────────────

export const createCommentSchema = z.object({
  content: z.string().trim().min(1).max(10_000),
})
export type CreateCommentInput = z.infer<typeof createCommentSchema>

export const updateCommentSchema = createCommentSchema
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>

// ─── Services ─────────────────────────────────────────────────────────────────

export const createServiceSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
})
export type CreateServiceInput = z.infer<typeof createServiceSchema>

export const updateServiceSchema = createServiceSchema
  .partial()
  .refine((fields) => Object.keys(fields).length > 0, atLeastOneField)
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>

// ─── Organization and members ─────────────────────────────────────────────────

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(1).max(100),
})
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>

const assignableRole = z.enum(["ADMIN", "ENGINEER", "VIEWER"])

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: assignableRole,
})
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>

export const updateRoleSchema = z.object({ role: assignableRole })
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>