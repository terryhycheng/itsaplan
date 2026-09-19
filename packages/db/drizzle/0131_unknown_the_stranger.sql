CREATE TABLE "recurring_issue" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"frequency" text NOT NULL,
	"interval" integer DEFAULT 1 NOT NULL,
	"weekdays" integer[],
	"day_of_month" integer,
	"month" integer,
	"start_date" date NOT NULL,
	"local_time" text NOT NULL,
	"timezone" text NOT NULL,
	"end_date" date,
	"max_occurrences" integer,
	"occurrence_count" integer DEFAULT 0 NOT NULL,
	"next_run_at" timestamp with time zone,
	"last_run_at" timestamp with time zone,
	"created_by_user_id" text,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"column_id" integer,
	"type_id" integer,
	"initiative_id" integer,
	"assignee_user_id" text,
	"delegate_user_id" text,
	"priority" text,
	"estimate_points" numeric,
	"estimate_minutes" integer,
	"start_offset_days" integer,
	"due_offset_days" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_issue_status_check" CHECK ("recurring_issue"."status" IN ('active', 'paused', 'cancelled', 'completed')),
	CONSTRAINT "recurring_issue_frequency_check" CHECK ("recurring_issue"."frequency" IN ('daily', 'weekly', 'monthly', 'yearly')),
	CONSTRAINT "recurring_issue_interval_check" CHECK ("recurring_issue"."interval" BETWEEN 1 AND 100),
	CONSTRAINT "recurring_issue_schedule_fields_check" CHECK (("recurring_issue"."frequency" = 'weekly' AND cardinality("recurring_issue"."weekdays") > 0 AND "recurring_issue"."day_of_month" IS NULL AND "recurring_issue"."month" IS NULL)
        OR ("recurring_issue"."frequency" = 'monthly' AND "recurring_issue"."weekdays" IS NULL AND "recurring_issue"."day_of_month" BETWEEN 1 AND 31 AND "recurring_issue"."month" IS NULL)
        OR ("recurring_issue"."frequency" = 'yearly' AND "recurring_issue"."weekdays" IS NULL AND "recurring_issue"."day_of_month" BETWEEN 1 AND 31 AND "recurring_issue"."month" BETWEEN 1 AND 12)
        OR ("recurring_issue"."frequency" = 'daily' AND "recurring_issue"."weekdays" IS NULL AND "recurring_issue"."day_of_month" IS NULL AND "recurring_issue"."month" IS NULL)),
	CONSTRAINT "recurring_issue_weekdays_check" CHECK ("recurring_issue"."weekdays" IS NULL OR "recurring_issue"."weekdays" <@ ARRAY[1,2,3,4,5,6,7]::integer[]),
	CONSTRAINT "recurring_issue_dates_check" CHECK ("recurring_issue"."end_date" IS NULL OR "recurring_issue"."end_date" >= "recurring_issue"."start_date"),
	CONSTRAINT "recurring_issue_max_occurrences_check" CHECK ("recurring_issue"."max_occurrences" IS NULL OR "recurring_issue"."max_occurrences" > 0),
	CONSTRAINT "recurring_issue_occurrence_count_check" CHECK ("recurring_issue"."occurrence_count" >= 0),
	CONSTRAINT "recurring_issue_estimate_points_check" CHECK ("recurring_issue"."estimate_points" >= 0),
	CONSTRAINT "recurring_issue_estimate_minutes_check" CHECK ("recurring_issue"."estimate_minutes" >= 0),
	CONSTRAINT "recurring_issue_date_offsets_check" CHECK ("recurring_issue"."start_offset_days" IS NULL OR "recurring_issue"."due_offset_days" IS NULL OR "recurring_issue"."due_offset_days" >= "recurring_issue"."start_offset_days")
);
--> statement-breakpoint
CREATE TABLE "recurring_issue_field_option" (
	"recurring_issue_id" integer NOT NULL,
	"field_id" integer NOT NULL,
	"option_id" integer NOT NULL,
	CONSTRAINT "recurring_issue_field_option_recurring_issue_id_field_id_option_id_pk" PRIMARY KEY("recurring_issue_id","field_id","option_id")
);
--> statement-breakpoint
CREATE TABLE "recurring_issue_field_value" (
	"id" serial PRIMARY KEY NOT NULL,
	"recurring_issue_id" integer NOT NULL,
	"field_id" integer NOT NULL,
	"value_text" text,
	"value_number" numeric,
	"value_bool" boolean,
	"value_date" date,
	"value_datetime" timestamp with time zone,
	"value_datetime_end" timestamp with time zone,
	"value_user_id" text,
	CONSTRAINT "recurring_issue_field_value_recurring_issue_id_field_id_unique" UNIQUE("recurring_issue_id","field_id")
);
--> statement-breakpoint
CREATE TABLE "recurring_issue_label" (
	"recurring_issue_id" integer NOT NULL,
	"label_id" integer NOT NULL,
	CONSTRAINT "recurring_issue_label_recurring_issue_id_label_id_pk" PRIMARY KEY("recurring_issue_id","label_id")
);
--> statement-breakpoint
CREATE TABLE "recurring_issue_occurrence" (
	"id" serial PRIMARY KEY NOT NULL,
	"recurring_issue_id" integer NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"issue_id" integer,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	CONSTRAINT "recurring_issue_occurrence_status_check" CHECK ("recurring_issue_occurrence"."status" IN ('pending', 'created', 'skipped', 'failed')),
	CONSTRAINT "recurring_issue_occurrence_attempts_check" CHECK ("recurring_issue_occurrence"."attempts" >= 0)
);
--> statement-breakpoint
ALTER TABLE "issue" ADD COLUMN "recurring_issue_id" integer;--> statement-breakpoint
ALTER TABLE "issue" ADD COLUMN "recurrence_scheduled_for" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "recurring_issue" ADD CONSTRAINT "recurring_issue_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_issue" ADD CONSTRAINT "recurring_issue_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_issue" ADD CONSTRAINT "recurring_issue_column_id_project_column_id_fk" FOREIGN KEY ("column_id") REFERENCES "public"."project_column"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_issue" ADD CONSTRAINT "recurring_issue_type_id_issue_type_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."issue_type"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_issue" ADD CONSTRAINT "recurring_issue_initiative_id_initiative_id_fk" FOREIGN KEY ("initiative_id") REFERENCES "public"."initiative"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_issue" ADD CONSTRAINT "recurring_issue_assignee_user_id_user_id_fk" FOREIGN KEY ("assignee_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_issue" ADD CONSTRAINT "recurring_issue_delegate_user_id_user_id_fk" FOREIGN KEY ("delegate_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_issue_field_option" ADD CONSTRAINT "recurring_issue_field_option_recurring_issue_id_recurring_issue_id_fk" FOREIGN KEY ("recurring_issue_id") REFERENCES "public"."recurring_issue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_issue_field_option" ADD CONSTRAINT "recurring_issue_field_option_field_id_custom_field_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."custom_field"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_issue_field_option" ADD CONSTRAINT "recurring_issue_field_option_option_id_custom_field_option_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."custom_field_option"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_issue_field_value" ADD CONSTRAINT "recurring_issue_field_value_recurring_issue_id_recurring_issue_id_fk" FOREIGN KEY ("recurring_issue_id") REFERENCES "public"."recurring_issue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_issue_field_value" ADD CONSTRAINT "recurring_issue_field_value_field_id_custom_field_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."custom_field"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_issue_field_value" ADD CONSTRAINT "recurring_issue_field_value_value_user_id_user_id_fk" FOREIGN KEY ("value_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_issue_label" ADD CONSTRAINT "recurring_issue_label_recurring_issue_id_recurring_issue_id_fk" FOREIGN KEY ("recurring_issue_id") REFERENCES "public"."recurring_issue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_issue_label" ADD CONSTRAINT "recurring_issue_label_label_id_label_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."label"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_issue_occurrence" ADD CONSTRAINT "recurring_issue_occurrence_recurring_issue_id_recurring_issue_id_fk" FOREIGN KEY ("recurring_issue_id") REFERENCES "public"."recurring_issue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_issue_occurrence" ADD CONSTRAINT "recurring_issue_occurrence_issue_id_issue_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issue"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "recurring_issue_project_name_uq" ON "recurring_issue" USING btree ("project_id","name");--> statement-breakpoint
CREATE INDEX "recurring_issue_due_idx" ON "recurring_issue" USING btree ("status","next_run_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "recurring_issue_occurrence_fire_uq" ON "recurring_issue_occurrence" USING btree ("recurring_issue_id","scheduled_for");--> statement-breakpoint
CREATE UNIQUE INDEX "recurring_issue_occurrence_issue_uq" ON "recurring_issue_occurrence" USING btree ("issue_id") WHERE "recurring_issue_occurrence"."issue_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "recurring_issue_occurrence_due_idx" ON "recurring_issue_occurrence" USING btree ("status","next_attempt_at","id");--> statement-breakpoint
ALTER TABLE "issue" ADD CONSTRAINT "issue_recurring_issue_id_recurring_issue_id_fk" FOREIGN KEY ("recurring_issue_id") REFERENCES "public"."recurring_issue"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "issue_recurring_occurrence_uq" ON "issue" USING btree ("recurring_issue_id","recurrence_scheduled_for") WHERE "issue"."recurring_issue_id" IS NOT NULL AND "issue"."recurrence_scheduled_for" IS NOT NULL;
--> statement-breakpoint
UPDATE "team_role"
SET "permissions" = "permissions" || jsonb_build_object(
  'recurring_issues',
  jsonb_build_object(
    'create', false,
    'edit', false,
    'read', COALESCE(("permissions" -> 'issue_templates' ->> 'read')::boolean, false),
    'delete', false
  )
)
WHERE NOT ("permissions" ? 'recurring_issues');
--> statement-breakpoint
CREATE FUNCTION rev_recurring_issue() RETURNS trigger AS $$
DECLARE
  r recurring_issue%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN r := OLD; ELSE r := NEW; END IF;
  PERFORM bump_rev('recurring:' || r.project_id, r.project_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE FUNCTION rev_recurring_issue_child() RETURNS trigger AS $$
DECLARE
  recurring_id integer;
  target_project_id integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    recurring_id := OLD.recurring_issue_id;
  ELSE
    recurring_id := NEW.recurring_issue_id;
  END IF;
  SELECT ri.project_id INTO target_project_id FROM recurring_issue ri WHERE ri.id = recurring_id;
  IF target_project_id IS NOT NULL THEN
    PERFORM bump_rev('recurring:' || target_project_id, target_project_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER recurring_issue_rev AFTER INSERT OR UPDATE OR DELETE ON recurring_issue
  FOR EACH ROW EXECUTE FUNCTION rev_recurring_issue();
--> statement-breakpoint
CREATE TRIGGER recurring_issue_label_rev AFTER INSERT OR UPDATE OR DELETE ON recurring_issue_label
  FOR EACH ROW EXECUTE FUNCTION rev_recurring_issue_child();
--> statement-breakpoint
CREATE TRIGGER recurring_issue_field_value_rev AFTER INSERT OR UPDATE OR DELETE ON recurring_issue_field_value
  FOR EACH ROW EXECUTE FUNCTION rev_recurring_issue_child();
--> statement-breakpoint
CREATE TRIGGER recurring_issue_field_option_rev AFTER INSERT OR UPDATE OR DELETE ON recurring_issue_field_option
  FOR EACH ROW EXECUTE FUNCTION rev_recurring_issue_child();
--> statement-breakpoint
CREATE TRIGGER recurring_issue_occurrence_rev AFTER INSERT OR UPDATE OR DELETE ON recurring_issue_occurrence
  FOR EACH ROW EXECUTE FUNCTION rev_recurring_issue_child();
