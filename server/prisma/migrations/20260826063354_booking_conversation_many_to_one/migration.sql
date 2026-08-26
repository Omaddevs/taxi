-- DropIndex
DROP INDEX "Booking_conversationId_key";

-- CreateIndex
CREATE INDEX "Booking_conversationId_idx" ON "Booking"("conversationId");
