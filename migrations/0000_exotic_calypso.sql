CREATE TABLE `activity_log` (
	`id` varchar(36) NOT NULL DEFAULT (UUID()),
	`user_id` varchar(36) NOT NULL,
	`action` text NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `answers` (
	`id` varchar(36) NOT NULL DEFAULT (UUID()),
	`question_id` varchar(36) NOT NULL,
	`answer_text` text NOT NULL,
	`created_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	CONSTRAINT `answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` varchar(36) NOT NULL DEFAULT (UUID()),
	`title` text NOT NULL,
	`description` text NOT NULL,
	`category` enum('ibml','softtrac','omniscan') NOT NULL,
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`created_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`views` int NOT NULL DEFAULT 0,
	CONSTRAINT `questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL DEFAULT (UUID()),
	`username` text NOT NULL,
	`password` text NOT NULL,
	`user_role` enum('admin','user','supervisor') NOT NULL DEFAULT 'user',
	`first_name` text,
	`last_name` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`)
);
