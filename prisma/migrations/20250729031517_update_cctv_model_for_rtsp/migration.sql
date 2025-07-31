-- CreateTable
CREATE TABLE "Cctv" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "channel" TEXT,
    "username" TEXT,
    "password" TEXT,
    "resolution" TEXT DEFAULT '640x480',
    "framerate" INTEGER DEFAULT 15,
    "bitrate" INTEGER DEFAULT 1024,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cctv_pkey" PRIMARY KEY ("id")
);
