-- AlterTable
ALTER TABLE "AccessController" ADD COLUMN     "doorStatus" INTEGER[];

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "controllerId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_controllerId_fkey" FOREIGN KEY ("controllerId") REFERENCES "AccessController"("id") ON DELETE CASCADE ON UPDATE CASCADE;
