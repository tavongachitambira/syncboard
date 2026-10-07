import { z } from "zod"
import { Severity, IncidentStatus } from "../types/incident.js"

const severityEnum = z.enum(
  Object.values(Severity) as [string, ...string[]],
)
const statusEnum = z.enum(
  Object.values(IncidentStatus) as [string, ...string[]],
)

export const createIncidentSchema = z.object({
  title: z.string().min(1).max(255).trim(),
  severity: severityEnum,
  serviceId: z.uuid(),
  assignees: z.array(z.uuid()).default([]),
})
export type CreateIncidentInput = z.infer<typeof createIncidentSchema>

export const updateIncidentSchema = z
  .object({
    title: z.string().min(1).max(255).trim(),
    severity: severityEnum,
    version: z.number().int().nonnegative(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
  })
export type UpdateIncidentInput = z.infer<typeof updateIncidentSchema>

export const listIncidentsSchema = z.object({
  status: statusEnum.optional(),
  severity: severityEnum.optional(),
  serviceId: z.string().uuid().optional(),
  assignee: z.string().uuid().optional(),
  q: z.string().max(100).optional(),
  sort: z.enum(["updatedAt", "createdAt", "severity"]).default("updatedAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
export type ListIncidentsInput = z.infer<typeof listIncidentsSchema>

export const createCommentSchema = z.object({
  content: z.string().min(1).max(10_000).trim(),
})
export type CreateCommentInput = z.infer<typeof createCommentSchema>

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(10_000).trim(),
})
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>

export const createServiceSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(500).trim().optional(),
})
export type CreateServiceInput = z.infer<typeof createServiceSchema>

export const updateServiceSchema = createServiceSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
  })
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>

export const updateOrganizationSchema = z.object({ name: z.string().min(1).max(100).trim() })
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>

export const inviteMemberSchema = z.object({
  email: z.email(),
  role: z.enum(["ADMIN", "ENGINEER", "VIEWER"]),
})
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>

export const updateRoleSchema = z.object({ role: z.enum(["ADMIN", "ENGINEER", "VIEWER"]) })
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>
