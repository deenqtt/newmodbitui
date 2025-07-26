-- CreateEnum
CREATE TYPE "AlarmLogStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'CLEARED');

-- CreateTable
CREATE TABLE "AlarmLog" (
    "id" TEXT NOT NULL,
    "status" "AlarmLogStatus" NOT NULL,
    "triggeringValue" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clearedAt" TIMESTAMP(3),
    "alarmConfigId" TEXT NOT NULL,

    CONSTRAINT "AlarmLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AlarmLog" ADD CONSTRAINT "AlarmLog_alarmConfigId_fkey" FOREIGN KEY ("alarmConfigId") REFERENCES "AlarmConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
