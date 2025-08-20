-- CreateEnum
CREATE TYPE "public"."MaintenanceTarget" AS ENUM ('Device', 'Rack');

-- CreateTable
CREATE TABLE "public"."Maintenance" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(1000),
    "startTask" TIMESTAMP(3) NOT NULL,
    "endTask" TIMESTAMP(3) NOT NULL,
    "assignTo" TEXT NOT NULL,
    "targetType" "public"."MaintenanceTarget" NOT NULL,
    "targetId" INTEGER NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'Scheduled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Maintenance_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Maintenance" ADD CONSTRAINT "Maintenance_assignTo_fkey" FOREIGN KEY ("assignTo") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
