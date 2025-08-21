-- AlterTable
ALTER TABLE "public"."Cctv" ADD COLUMN     "apiKey" TEXT,
ADD COLUMN     "group" TEXT;

-- AlterTable
ALTER TABLE "public"."DashboardLayout" ADD COLUMN     "isActive" BOOLEAN DEFAULT true;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "phoneNumber" TEXT;
