ALTER TABLE `answers` ADD `attachment` text;--> statement-breakpoint
ALTER TABLE `questions` ADD `is_final` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `questions` ADD `attachment` text;--> statement-breakpoint
ALTER TABLE `users` ADD `supervisor_type` enum('qc','validation','scanner');