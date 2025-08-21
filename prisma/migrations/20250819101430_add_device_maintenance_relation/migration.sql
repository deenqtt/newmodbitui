-- AlterTable
ALTER TABLE "public"."Maintenance" ALTER COLUMN "targetId" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "public"."Maintenance" ADD CONSTRAINT "Maintenance_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "public"."DeviceExternal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
