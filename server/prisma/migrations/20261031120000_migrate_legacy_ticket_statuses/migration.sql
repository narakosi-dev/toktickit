-- Migrate legacy status names to canonical 8 statuses per BR-06
UPDATE "Ticket"
SET "status" = 'Waiting_for_Requester'
WHERE "status" IN ('Pending_Requester', 'pending_requester', 'pending requester');

UPDATE "Ticket"
SET "status" = 'Open'
WHERE "status" IN ('Assigned', 'assigned');

