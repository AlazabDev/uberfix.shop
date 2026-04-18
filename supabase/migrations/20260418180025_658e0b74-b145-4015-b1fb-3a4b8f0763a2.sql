
-- نفّذ كل مرحلة وانتظر قليلاً (محاكاة التحديث)
UPDATE maintenance_requests SET workflow_stage = 'assigned' WHERE id = 'b11a3261-be26-4c47-84cd-474dcd2c0b5d';
UPDATE maintenance_requests SET workflow_stage = 'scheduled' WHERE id = 'b11a3261-be26-4c47-84cd-474dcd2c0b5d';
UPDATE maintenance_requests SET workflow_stage = 'in_progress' WHERE id = 'b11a3261-be26-4c47-84cd-474dcd2c0b5d';
UPDATE maintenance_requests SET workflow_stage = 'on_site' WHERE id = 'b11a3261-be26-4c47-84cd-474dcd2c0b5d';
UPDATE maintenance_requests SET workflow_stage = 'work_started' WHERE id = 'b11a3261-be26-4c47-84cd-474dcd2c0b5d';
UPDATE maintenance_requests SET workflow_stage = 'completed' WHERE id = 'b11a3261-be26-4c47-84cd-474dcd2c0b5d';
UPDATE maintenance_requests SET workflow_stage = 'closed' WHERE id = 'b11a3261-be26-4c47-84cd-474dcd2c0b5d';
