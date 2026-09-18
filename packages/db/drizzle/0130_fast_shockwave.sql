CREATE TABLE "issue_useful_link" (
	"id" serial PRIMARY KEY NOT NULL,
	"issue_id" integer NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_important_date" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"name" text NOT NULL,
	"date" date NOT NULL,
	"show_on_timeline" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "issue_attachment" ADD COLUMN "is_cover" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "issue_useful_link" ADD CONSTRAINT "issue_useful_link_issue_id_issue_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_important_date" ADD CONSTRAINT "project_important_date_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "issue_useful_link_issue_url_uq" ON "issue_useful_link" USING btree ("issue_id","url");--> statement-breakpoint
CREATE INDEX "issue_useful_link_issue_created_idx" ON "issue_useful_link" USING btree ("issue_id","created_at","id");--> statement-breakpoint
CREATE INDEX "project_important_date_project_date_idx" ON "project_important_date" USING btree ("project_id","date","id");--> statement-breakpoint
CREATE UNIQUE INDEX "issue_attachment_cover_uq" ON "issue_attachment" USING btree ("issue_id") WHERE "issue_attachment"."is_cover";--> statement-breakpoint
CREATE FUNCTION rev_project_important_date() RETURNS trigger AS $$
DECLARE
	r project_important_date%ROWTYPE;
BEGIN
	IF TG_OP = 'DELETE' THEN r := OLD; ELSE r := NEW; END IF;
	PERFORM bump_rev('board:' || r.project_id, r.project_id);
	RETURN NULL;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER project_important_date_rev AFTER INSERT OR UPDATE OR DELETE ON project_important_date
	FOR EACH ROW EXECUTE FUNCTION rev_project_important_date();--> statement-breakpoint
CREATE TRIGGER issue_useful_link_rev AFTER INSERT OR DELETE ON issue_useful_link
	FOR EACH ROW EXECUTE FUNCTION rev_issue_child('issue_id', 'detail');--> statement-breakpoint
DROP TRIGGER issue_attachment_rev ON issue_attachment;--> statement-breakpoint
CREATE FUNCTION rev_issue_attachment() RETURNS trigger AS $$
DECLARE
	target_id integer;
	p integer;
	i integer;
	board_changed boolean;
BEGIN
	IF TG_OP = 'DELETE' THEN
		target_id := OLD.issue_id;
		board_changed := OLD.is_cover;
	ELSIF TG_OP = 'INSERT' THEN
		target_id := NEW.issue_id;
		board_changed := NEW.is_cover;
	ELSE
		target_id := NEW.issue_id;
		board_changed := OLD.is_cover IS DISTINCT FROM NEW.is_cover
			OR (NEW.is_cover AND OLD.s3_key IS DISTINCT FROM NEW.s3_key);
	END IF;

	SELECT project_id, initiative_id INTO p, i FROM issue WHERE id = target_id;
	IF p IS NULL THEN RETURN NULL; END IF;
	IF board_changed THEN PERFORM bump_rev('board:' || p, p); END IF;
	PERFORM bump_rev('issue:' || target_id, p);
	IF i IS NOT NULL THEN PERFORM bump_rev('initiative:' || i, p); END IF;
	RETURN NULL;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER issue_attachment_rev AFTER INSERT OR UPDATE OR DELETE ON issue_attachment
	FOR EACH ROW EXECUTE FUNCTION rev_issue_attachment();
