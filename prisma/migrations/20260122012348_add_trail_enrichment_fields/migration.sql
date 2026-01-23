-- AlterTable
ALTER TABLE "Hike" ADD COLUMN     "city" TEXT,
ADD COLUMN     "coordinates" JSONB,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "difficulty" TEXT,
ADD COLUMN     "lastEnriched" TIMESTAMP(3),
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "parkName" TEXT,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "sourceUrl" TEXT,
ADD COLUMN     "surface" TEXT,
ADD COLUMN     "trailType" TEXT;
