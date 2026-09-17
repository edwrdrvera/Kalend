// Gives the demo account real Space -> Event -> Task relationships.
//
// Kalend's "Spaces" are rows in the `categories` table; an event or task
// belongs to a Space through its `category_id` foreign key. The base seed
// (`seed.ts`) only loads events, all with a null `category_id`, so out of the
// box nothing is grouped under a Space. This script fixes that for one user:
//
//   1. creates a small set of Spaces (School / Work / Personal / Hackathon),
//   2. assigns every one of that user's events to a Space by title,
//   3. assigns their tasks to a Space and adds a few per-Space backlog tasks,
//
// so the calendar, the icon rail, and the Space panel all have linked data to
// show. Run with `bun run db:seed:spaces`.
//
// Safe to run more than once: Spaces are matched by (user_id, name) and only
// created when missing; event/task links are recomputed from the title map;
// the extra backlog tasks are only inserted when the user doesn't already have
// a task with that exact title. Nothing is deleted.
//
// User selection: pass SEED_USER_ID=<uuid> to target a specific account,
// otherwise it resolves the single Supabase Auth user automatically (and
// errors if there are zero or more than one, so it never guesses).

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "./index";
import { categories } from "./schema/categories";
import { events } from "./schema/events";
import { tasks } from "./schema/tasks";

// Each Space: a display name, a palette color (from EVENT_COLORS), the event
// titles that belong to it, and a few backlog tasks to seed under it.
interface SpaceSpec {
  name: string;
  color: string;
  eventTitles: string[];
  tasks: { title: string; dueInDays?: number }[];
}

// The Space every remaining (unmatched) event and task falls back to, so
// nothing is left without a relation.
const DEFAULT_SPACE = "Personal";

const SPACES: SpaceSpec[] = [
  {
    name: "School",
    color: "indigo",
    eventTitles: [
      "CS 101",
      "Intro to Algorithms",
      "Data Structures Lab",
      "Software Engineering Lecture",
      "Algorithms Problem Set Due",
      "Exam 101",
      "Midterm Exam – Algorithms",
      "Office Hours – Prof. Chen",
      "Study Group – Algorithms",
      "Study Group – SE Project",
      "SE Group Project Demo",
      "Research Paper Review",
      "Career Fair",
      "Career Fair Prep",
    ],
    tasks: [
      { title: "Finish algorithms problem set", dueInDays: 2 },
      { title: "Prepare for the algorithms midterm", dueInDays: 6 },
    ],
  },
  {
    name: "Work",
    color: "blue",
    eventTitles: [
      "WCLC Team Sync",
      "Code Review",
      "Deep Work Block",
      "Project Kickoff",
      "Project Brainstorm",
      "Monthly Retrospective",
      "1:1 with Manager",
      "Client Call",
    ],
    tasks: [
      { title: "Write sprint retro notes", dueInDays: 1 },
      { title: "Clear the code review backlog", dueInDays: 3 },
    ],
  },
  {
    name: "Personal",
    color: "green",
    eventTitles: [
      "Dentist Appointment",
      "Grocery Run",
      "Laundry Day",
      "Call Home",
      "Farmers Market",
    ],
    tasks: [{ title: "Book a dentist follow-up", dueInDays: 5 }],
  },
  {
    name: "Hackathon",
    color: "orange",
    eventTitles: [
      "Hackathon Weekend",
      "Hackathon Planning",
      "Team Standup",
      "Demo Prep",
    ],
    tasks: [
      { title: "Draft the hackathon pitch", dueInDays: 4 },
      { title: "Line up a hackathon team", dueInDays: 2 },
    ],
  },
  {
    name: "Fitness",
    color: "teal",
    eventTitles: [
      "Gym Session",
      "Morning Run",
      "Yoga Class",
      "Basketball Pickup",
      "Rock Climbing",
    ],
    tasks: [{ title: "Sign up for the spring 5K", dueInDays: 4 }],
  },
  {
    name: "Social",
    color: "pink",
    eventTitles: [
      "Lunch with Edward",
      "Coffee with Priya",
      "Dinner with Roommates",
      "Movie Night",
      "Birthday Party",
      "Book Club",
    ],
    tasks: [{ title: "Plan the weekend trip", dueInDays: 6 }],
  },
];

// Existing free-floating tasks (from the base data) mapped to a Space by title.
const TASK_TITLE_TO_SPACE: Record<string, string> = {
  Read: "School",
  "Do Chores": "Personal",
};

async function resolveUserId(): Promise<string> {
  const fromEnv = process.env.SEED_USER_ID;
  if (fromEnv) return fromEnv;

  const rows = (await db.execute(
    sql`select id from auth.users order by created_at`
  )) as unknown as { id: string }[];

  if (rows.length === 0) {
    throw new Error(
      "No Supabase Auth users found. Pass SEED_USER_ID=<uuid> explicitly."
    );
  }
  if (rows.length > 1) {
    throw new Error(
      `Found ${rows.length} auth users; pass SEED_USER_ID=<uuid> to pick one.`
    );
  }
  return rows[0].id;
}

/** Insert the Space if the user doesn't have one by that name; return its id. */
async function ensureSpace(userId: string, name: string, color: string): Promise<string> {
  const existing = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.user_id, userId), eq(categories.name, name)));

  if (existing.length > 0) return existing[0].id;

  const [created] = await db
    .insert(categories)
    .values({ user_id: userId, name, color })
    .returning({ id: categories.id });
  return created.id;
}

function dueDate(dueInDays?: number): Date | null {
  if (dueInDays === undefined) return null;
  const d = new Date();
  d.setDate(d.getDate() + dueInDays);
  d.setHours(17, 0, 0, 0);
  return d;
}

async function main() {
  const userId = await resolveUserId();
  console.log(`Seeding Space relations for user ${userId}\n`);

  const spaceIds = new Map<string, string>();
  for (const space of SPACES) {
    const id = await ensureSpace(userId, space.name, space.color);
    spaceIds.set(space.name, id);
  }
  console.log(`Spaces ready: ${[...spaceIds.keys()].join(", ")}`);

  // Link events by title.
  let eventsLinked = 0;
  for (const space of SPACES) {
    if (space.eventTitles.length === 0) continue;
    const res = await db
      .update(events)
      .set({ category_id: spaceIds.get(space.name)! })
      .where(
        and(eq(events.user_id, userId), inArray(events.title, space.eventTitles))
      );
    eventsLinked += res.count ?? 0;
  }
  // Any leftover unlinked events go to the default Space.
  const defaultId = spaceIds.get(DEFAULT_SPACE)!;
  const leftover = await db
    .update(events)
    .set({ category_id: defaultId })
    .where(and(eq(events.user_id, userId), isNull(events.category_id)));
  console.log(
    `Events linked: ${eventsLinked} by title, ${leftover.count ?? 0} fallback -> ${DEFAULT_SPACE}`
  );

  // Link the existing free-floating tasks by title.
  let tasksLinked = 0;
  for (const [title, spaceName] of Object.entries(TASK_TITLE_TO_SPACE)) {
    const res = await db
      .update(tasks)
      .set({ category_id: spaceIds.get(spaceName)! })
      .where(and(eq(tasks.user_id, userId), eq(tasks.title, title)));
    tasksLinked += res.count ?? 0;
  }
  // Any other unlinked tasks fall back to the default Space.
  const leftoverTasks = await db
    .update(tasks)
    .set({ category_id: defaultId })
    .where(and(eq(tasks.user_id, userId), isNull(tasks.category_id)));
  console.log(
    `Existing tasks linked: ${tasksLinked} by title, ${leftoverTasks.count ?? 0} fallback -> ${DEFAULT_SPACE}`
  );

  // Add a few backlog tasks per Space (skip ones the user already has).
  let tasksCreated = 0;
  for (const space of SPACES) {
    const spaceId = spaceIds.get(space.name)!;
    for (const t of space.tasks) {
      const already = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(eq(tasks.user_id, userId), eq(tasks.title, t.title)));
      if (already.length > 0) continue;

      await db.insert(tasks).values({
        user_id: userId,
        title: t.title,
        due_at: dueDate(t.dueInDays),
        category_id: spaceId,
        color: space.color,
      });
      tasksCreated++;
    }
  }
  console.log(`Backlog tasks created: ${tasksCreated}`);

  console.log("\nSpace relations seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
