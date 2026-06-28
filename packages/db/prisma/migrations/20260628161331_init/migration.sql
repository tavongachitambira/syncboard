/*
  Warnings:

  - The values [active,past_due,cancelled] on the enum `BillingStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [open,investigating,mitigating,resolved] on the enum `IncidentStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [pending,confirmed,failed] on the enum `OpState` will be removed. If these variants are still used in the database, this will fail.
  - The values [text,field] on the enum `OperationType` will be removed. If these variants are still used in the database, this will fail.
  - The values [critical,high,medium,low] on the enum `Severity` will be removed. If these variants are still used in the database, this will fail.
  - The values [responder,admin] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `assigneeId` on the `Incident` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "BillingStatus_new" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED');
ALTER TABLE "public"."Organization" ALTER COLUMN "billingStatus" DROP DEFAULT;
ALTER TABLE "Organization" ALTER COLUMN "billingStatus" TYPE "BillingStatus_new" USING ("billingStatus"::text::"BillingStatus_new");
ALTER TYPE "BillingStatus" RENAME TO "BillingStatus_old";
ALTER TYPE "BillingStatus_new" RENAME TO "BillingStatus";
DROP TYPE "public"."BillingStatus_old";
ALTER TABLE "Organization" ALTER COLUMN "billingStatus" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "IncidentStatus_new" AS ENUM ('OPEN', 'INVESTIGATING', 'MITIGATING', 'RESOLVED');
ALTER TABLE "public"."Incident" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Incident" ALTER COLUMN "status" TYPE "IncidentStatus_new" USING ("status"::text::"IncidentStatus_new");
ALTER TYPE "IncidentStatus" RENAME TO "IncidentStatus_old";
ALTER TYPE "IncidentStatus_new" RENAME TO "IncidentStatus";
DROP TYPE "public"."IncidentStatus_old";
ALTER TABLE "Incident" ALTER COLUMN "status" SET DEFAULT 'OPEN';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "OpState_new" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');
ALTER TABLE "public"."Operation" ALTER COLUMN "opState" DROP DEFAULT;
ALTER TABLE "Operation" ALTER COLUMN "opState" TYPE "OpState_new" USING ("opState"::text::"OpState_new");
ALTER TYPE "OpState" RENAME TO "OpState_old";
ALTER TYPE "OpState_new" RENAME TO "OpState";
DROP TYPE "public"."OpState_old";
ALTER TABLE "Operation" ALTER COLUMN "opState" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "OperationType_new" AS ENUM ('TEXT', 'FIELD');
ALTER TABLE "Operation" ALTER COLUMN "type" TYPE "OperationType_new" USING ("type"::text::"OperationType_new");
ALTER TYPE "OperationType" RENAME TO "OperationType_old";
ALTER TYPE "OperationType_new" RENAME TO "OperationType";
DROP TYPE "public"."OperationType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "Severity_new" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');
ALTER TABLE "Incident" ALTER COLUMN "severity" TYPE "Severity_new" USING ("severity"::text::"Severity_new");
ALTER TYPE "Severity" RENAME TO "Severity_old";
ALTER TYPE "Severity_new" RENAME TO "Severity";
DROP TYPE "public"."Severity_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('OWNER', 'ADMIN', 'ENGINEER', 'VIEWER');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'VIEWER';
COMMIT;

-- DropForeignKey
ALTER TABLE "Incident" DROP CONSTRAINT "Incident_assigneeId_fkey";

-- DropIndex
DROP INDEX "Incident_assigneeId_idx";

-- AlterTable
ALTER TABLE "Incident" DROP COLUMN "assigneeId",
ALTER COLUMN "status" SET DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE "Operation" ALTER COLUMN "opState" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Organization" ALTER COLUMN "billingStatus" SET DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'VIEWER';

-- CreateTable
CREATE TABLE "IncidentAssignee" (
    "incidentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentAssignee_pkey" PRIMARY KEY ("incidentId","userId")
);

-- CreateIndex
CREATE INDEX "IncidentAssignee_userId_idx" ON "IncidentAssignee"("userId");

-- CreateIndex
CREATE INDEX "BillingEvent_organizationId_idx" ON "BillingEvent"("organizationId");

-- AddForeignKey
ALTER TABLE "IncidentAssignee" ADD CONSTRAINT "IncidentAssignee_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentAssignee" ADD CONSTRAINT "IncidentAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
