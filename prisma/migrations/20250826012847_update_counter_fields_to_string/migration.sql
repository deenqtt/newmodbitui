-- AlterTable
ALTER TABLE "public"."GatewayStats" ALTER COLUMN "counterInst" SET DEFAULT '0',
ALTER COLUMN "counterInst" SET DATA TYPE TEXT,
ALTER COLUMN "counterPps" SET DEFAULT '0',
ALTER COLUMN "counterPps" SET DATA TYPE TEXT;
