-- CreateTable
CREATE TABLE "hotels" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "base_rate" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "hotel_id" INTEGER NOT NULL,
    "room_number" TEXT NOT NULL,
    "room_type" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "base_rate" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hotels_uuid_key" ON "hotels"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "hotels_slug_key" ON "hotels"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_uuid_key" ON "rooms"("uuid");

-- CreateIndex
CREATE INDEX "rooms_hotel_id_room_type_idx" ON "rooms"("hotel_id", "room_type");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_hotel_id_room_number_key" ON "rooms"("hotel_id", "room_number");

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
