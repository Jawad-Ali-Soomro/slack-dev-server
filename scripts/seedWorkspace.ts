import "../config/env";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import { User, Task, Meeting, Project } from "../models/index";
import { Team } from "../models/team.model";
import { Friendship, FriendRequest } from "../models/friend.model";
import { Availability, JobRole, Role } from "../interfaces/index";

const MONGODB_URI = process.env.MONGODB_URI as string;

const SEED_DOMAIN = "slackdev.seed";
const SEED_PASSWORD = "Abcd1234!";
const FRESH = process.argv.includes("--fresh");

const PROFILES_DIR = path.join(__dirname, "../uploads/profiles");
const PROJECTS_DIR = path.join(__dirname, "../uploads/projects");

const JOB_ROLES = Object.values(JobRole).filter((r) => r !== JobRole.Unassigned);

type SeedPerson = {
  username: string;
  firstName: string;
  lastName: string;
  jobRole: JobRole;
  availability: Availability;
  role: Role;
  bio: string;
  location: string;
  statusMessage?: string;
};

const PEOPLE: SeedPerson[] = [
  { username: "Maya Chen", firstName: "Maya", lastName: "Chen", jobRole: JobRole.Frontend, availability: Availability.Available, role: Role.Admin, bio: "Frontend lead who cares about empty states.", location: "San Francisco, US", statusMessage: "Shipping the new dashboard" },
  { username: "Liam Okonkwo", firstName: "Liam", lastName: "Okonkwo", jobRole: JobRole.Frontend, availability: Availability.Available, role: Role.User, bio: "React + TypeScript. Animations on the side.", location: "Lagos, NG" },
  { username: "Sofia Rossi", firstName: "Sofia", lastName: "Rossi", jobRole: JobRole.Frontend, availability: Availability.Busy, role: Role.User, bio: "CSS systems and design tokens.", location: "Milan, IT", statusMessage: "Heads down on the design system" },
  { username: "Noah Patel", firstName: "Noah", lastName: "Patel", jobRole: JobRole.Frontend, availability: Availability.Away, role: Role.User, bio: "Accessibility and performance nerd.", location: "Toronto, CA" },
  { username: "Hana Suzuki", firstName: "Hana", lastName: "Suzuki", jobRole: JobRole.Frontend, availability: Availability.Available, role: Role.User, bio: "Next.js, charts, and pixel-perfect UI.", location: "Tokyo, JP" },
  { username: "Elias Berg", firstName: "Elias", lastName: "Berg", jobRole: JobRole.Backend, availability: Availability.Available, role: Role.Admin, bio: "APIs, queues, and boring reliability.", location: "Stockholm, SE" },
  { username: "Amara Diallo", firstName: "Amara", lastName: "Diallo", jobRole: JobRole.Backend, availability: Availability.Available, role: Role.User, bio: "Node, Mongo, and auth that doesn't leak.", location: "Dakar, SN" },
  { username: "Jonas Keller", firstName: "Jonas", lastName: "Keller", jobRole: JobRole.Backend, availability: Availability.Busy, role: Role.User, bio: "Payments and webhooks.", location: "Berlin, DE", statusMessage: "In the Stripe rabbit hole" },
  { username: "Priya Nair", firstName: "Priya", lastName: "Nair", jobRole: JobRole.Backend, availability: Availability.Available, role: Role.User, bio: "GraphQL and data modeling.", location: "Bengaluru, IN" },
  { username: "Marco Silva", firstName: "Marco", lastName: "Silva", jobRole: JobRole.Backend, availability: Availability.InMeeting, role: Role.User, bio: "Search, indexes, slow-query hunter.", location: "São Paulo, BR" },
  { username: "Aisha Rahman", firstName: "Aisha", lastName: "Rahman", jobRole: JobRole.FullStack, availability: Availability.Available, role: Role.User, bio: "Full stack. Ships the whole ticket.", location: "Dubai, AE" },
  { username: "Owen Brooks", firstName: "Owen", lastName: "Brooks", jobRole: JobRole.FullStack, availability: Availability.Available, role: Role.User, bio: "TypeScript end to end.", location: "Austin, US" },
  { username: "Yara Haddad", firstName: "Yara", lastName: "Haddad", jobRole: JobRole.FullStack, availability: Availability.Busy, role: Role.User, bio: "Product-minded engineer.", location: "Amman, JO" },
  { username: "Kenji Mori", firstName: "Kenji", lastName: "Mori", jobRole: JobRole.FullStack, availability: Availability.Available, role: Role.User, bio: "Realtime features and sockets.", location: "Osaka, JP" },
  { username: "Elena Volkov", firstName: "Elena", lastName: "Volkov", jobRole: JobRole.Designer, availability: Availability.Available, role: Role.User, bio: "Product design and illustration.", location: "Kyiv, UA" },
  { username: "Diego Martinez", firstName: "Diego", lastName: "Martinez", jobRole: JobRole.Designer, availability: Availability.Away, role: Role.User, bio: "UX research and prototypes.", location: "Mexico City, MX" },
  { username: "Nina Kowalski", firstName: "Nina", lastName: "Kowalski", jobRole: JobRole.Designer, availability: Availability.Available, role: Role.User, bio: "Brand, motion, and Figma libraries.", location: "Warsaw, PL" },
  { username: "Samir Hassan", firstName: "Samir", lastName: "Hassan", jobRole: JobRole.QA, availability: Availability.Available, role: Role.User, bio: "Playwright, edge cases, flaky-test slayer.", location: "Cairo, EG" },
  { username: "Claire Dubois", firstName: "Claire", lastName: "Dubois", jobRole: JobRole.QA, availability: Availability.Busy, role: Role.User, bio: "QA strategy and regression suites.", location: "Lyon, FR" },
  { username: "Theo Nguyen", firstName: "Theo", lastName: "Nguyen", jobRole: JobRole.QA, availability: Availability.Available, role: Role.User, bio: "API tests and load tests.", location: "Ho Chi Minh City, VN" },
  { username: "Ravi Sharma", firstName: "Ravi", lastName: "Sharma", jobRole: JobRole.DevOps, availability: Availability.Available, role: Role.User, bio: "CI/CD, k8s, and sleepy pagers.", location: "Pune, IN" },
  { username: "Freya Andersen", firstName: "Freya", lastName: "Andersen", jobRole: JobRole.DevOps, availability: Availability.InMeeting, role: Role.User, bio: "Observability and infra as code.", location: "Copenhagen, DK" },
  { username: "Lucas Moreau", firstName: "Lucas", lastName: "Moreau", jobRole: JobRole.DevOps, availability: Availability.Available, role: Role.User, bio: "Docker, GitHub Actions, cost control.", location: "Montreal, CA" },
  { username: "Zara Ahmed", firstName: "Zara", lastName: "Ahmed", jobRole: JobRole.Frontend, availability: Availability.Available, role: Role.User, bio: "Design-to-code and component libraries.", location: "Karachi, PK" },
];

type TeamDef = {
  name: string;
  description: string;
  roles: JobRole[];
};

const TEAM_DEFS: TeamDef[] = [
  {
    name: "Atlas UI",
    description: "Product interface, design system, and frontend platform.",
    roles: [JobRole.Frontend, JobRole.Designer, JobRole.FullStack],
  },
  {
    name: "Nova API",
    description: "Services, data, and integrations that power the workspace.",
    roles: [JobRole.Backend, JobRole.FullStack, JobRole.DevOps],
  },
  {
    name: "Orbit Platform",
    description: "Cross-stack squad for auth, billing, and workspace OS.",
    roles: [JobRole.FullStack, JobRole.Backend, JobRole.Frontend, JobRole.DevOps],
  },
  {
    name: "Pulse Design",
    description: "Brand, UX, and the empty states people actually notice.",
    roles: [JobRole.Designer, JobRole.Frontend, JobRole.QA],
  },
  {
    name: "Harbor Reliability",
    description: "QA, DevOps, and keeping deploys boring.",
    roles: [JobRole.QA, JobRole.DevOps, JobRole.Backend],
  },
];

type ProjectDef = {
  name: string;
  description: string;
  teamName: string;
  status: "planning" | "active" | "on_hold" | "completed";
  priority: "low" | "medium" | "high" | "urgent";
  tags: string[];
};

const PROJECT_DEFS: ProjectDef[] = [
  { name: "Atlas Dashboard", description: "Home widgets, availability wall, and live stats.", teamName: "Atlas UI", status: "active", priority: "high", tags: ["frontend", "dashboard"] },
  { name: "Design System v2", description: "Shared tokens, chips, and component kit.", teamName: "Atlas UI", status: "active", priority: "medium", tags: ["frontend", "design"] },
  { name: "Empty States Pack", description: "Illustrated empty states for tasks and teams.", teamName: "Atlas UI", status: "planning", priority: "low", tags: ["design", "frontend"] },
  { name: "Capture Extension UI", description: "Chrome capture flow into Create Task.", teamName: "Atlas UI", status: "active", priority: "high", tags: ["frontend", "extension"] },
  { name: "Task API", description: "Assignments, due dates, and GitHub-linked tickets.", teamName: "Nova API", status: "active", priority: "urgent", tags: ["backend", "api"] },
  { name: "Auth & Sessions", description: "Login, JWT, and GitHub OAuth.", teamName: "Nova API", status: "active", priority: "high", tags: ["backend", "auth"] },
  { name: "Notifications Service", description: "Invites, mentions, and realtime pings.", teamName: "Nova API", status: "planning", priority: "medium", tags: ["backend"] },
  { name: "Search Index", description: "People, tasks, and project search.", teamName: "Nova API", status: "on_hold", priority: "low", tags: ["backend", "search"] },
  { name: "Auto-Assign Engine", description: "Role + availability + load matching.", teamName: "Orbit Platform", status: "active", priority: "urgent", tags: ["fullstack", "automation"] },
  { name: "Billing Workspace", description: "Plans, seats, and invoices.", teamName: "Orbit Platform", status: "planning", priority: "medium", tags: ["fullstack"] },
  { name: "Team Graph", description: "Memberships, roles, and invite flow.", teamName: "Orbit Platform", status: "active", priority: "high", tags: ["fullstack", "teams"] },
  { name: "GitHub Sync", description: "PRs on the task card.", teamName: "Orbit Platform", status: "planning", priority: "medium", tags: ["fullstack", "github"] },
  { name: "Brand Refresh", description: "Logo, color, and landing motion.", teamName: "Pulse Design", status: "active", priority: "medium", tags: ["design"] },
  { name: "Onboarding Illustrations", description: "First-run art for new teammates.", teamName: "Pulse Design", status: "planning", priority: "low", tags: ["design"] },
  { name: "Meeting Room UI", description: "Lobby, participants, and follow-ups.", teamName: "Pulse Design", status: "active", priority: "high", tags: ["design", "frontend"] },
  { name: "Marketplace Packs", description: "Explore kits that drop in as projects.", teamName: "Pulse Design", status: "on_hold", priority: "low", tags: ["design"] },
  { name: "CI Pipeline", description: "Lint, test, and deploy on every PR.", teamName: "Harbor Reliability", status: "active", priority: "high", tags: ["devops"] },
  { name: "Load Tests", description: "Assign engine under peak standup traffic.", teamName: "Harbor Reliability", status: "planning", priority: "medium", tags: ["qa", "devops"] },
  { name: "Regression Suite", description: "Playwright coverage for tasks and teams.", teamName: "Harbor Reliability", status: "active", priority: "high", tags: ["qa"] },
  { name: "Observability Board", description: "Errors, latency, and busy-user traces.", teamName: "Harbor Reliability", status: "active", priority: "medium", tags: ["devops"] },
];

const TASK_TEMPLATES = [
  { title: "Wire empty-state chips from the write-up", tags: ["frontend"] },
  { title: "Match assignee by team job role", tags: ["backend"] },
  { title: "Skip busy teammates in auto-assign", tags: ["fullstack"] },
  { title: "Add hoverable why-this-person chip", tags: ["frontend", "design"] },
  { title: "Cover invite + role on team members", tags: ["qa"] },
  { title: "Cache-bust team membership after invite", tags: ["backend"] },
  { title: "Design the suggested-developers modal", tags: ["design"] },
  { title: "Add GitHub repo picker to create task", tags: ["frontend"] },
  { title: "Paginate team list on the dashboard", tags: ["frontend"] },
  { title: "Index assignTo + status for load counts", tags: ["backend"] },
  { title: "Pipeline lint on pull requests", tags: ["devops"] },
  { title: "Write Playwright for assign modal", tags: ["qa"] },
  { title: "Tighten mobile layout of task sheet", tags: ["frontend"] },
  { title: "Document the assign contract in UNIQUENESS", tags: ["fullstack"] },
  { title: "Alert when every matching role is busy", tags: ["backend"] },
];

const MEETING_TEMPLATES = [
  "Sprint planning",
  "Standup",
  "Design critique",
  "API review",
  "QA handoff",
  "Retro",
  "Release train",
  "Office hours",
];

const sample = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const sampleMany = <T>(arr: T[], count: number): T[] => {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < count && copy.length; i++) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
};

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const daysFromNow = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000);

const slug = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const seedEmail = (username: string) => `${slug(username)}@${SEED_DOMAIN}`;

const friendPair = (a: mongoose.Types.ObjectId, b: mongoose.Types.ObjectId) =>
  a.toString() < b.toString()
    ? { user1: a, user2: b }
    : { user1: b, user2: a };

const ensureDir = (dir: string) => {
  fs.mkdirSync(dir, { recursive: true });
};

const downloadFile = async (url: string, dest: string): Promise<boolean> => {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(20000),
      headers: { "User-Agent": "slack-dev-seeder/1.0" },
    });
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 32) return false;
    fs.writeFileSync(dest, buf);
    return true;
  } catch (err) {
    console.warn(`  ⚠ download failed ${url}: ${(err as Error).message}`);
    return false;
  }
};

const fetchPortraits = async (): Promise<string[]> => {
  try {
    const res = await fetch(
      `https://randomuser.me/api/?results=${PEOPLE.length}&inc=picture&noinfo`,
      { signal: AbortSignal.timeout(20000) },
    );
    if (!res.ok) throw new Error(`randomuser ${res.status}`);
    const json: any = await res.json();
    return (json.results || [])
      .map((r: any) => r?.picture?.large)
      .filter(Boolean);
  } catch (err) {
    console.warn(`randomuser.me unavailable: ${(err as Error).message}`);
    return [];
  }
};

const dicebearAvatar = (seed: string) =>
  `https://api.dicebear.com/9.x/adventurer/png?seed=${encodeURIComponent(seed)}&size=256`;

const dicebearLogo = (seed: string) =>
  `https://api.dicebear.com/9.x/identicon/png?seed=${encodeURIComponent(seed)}&size=256&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

async function downloadAvatars(portraits: string[]): Promise<Map<string, string>> {
  ensureDir(PROFILES_DIR);
  const map = new Map<string, string>();
  console.log("Downloading avatars…");

  for (let i = 0; i < PEOPLE.length; i++) {
    const person = PEOPLE[i];
    const sources = [portraits[i], dicebearAvatar(person.username)].filter(
      Boolean,
    ) as string[];

    let savedUrl = dicebearAvatar(person.username);
    for (const src of sources) {
      const ext = src.includes("dicebear") ? ".png" : ".jpg";
      const file = `seed-${slug(person.username)}${ext}`;
      const fileDest = path.join(PROFILES_DIR, file);
      if (await downloadFile(src, fileDest)) {
        savedUrl = `/profiles/${file}`;
        console.log(`  ✓ avatar ${person.username}`);
        break;
      }
    }
    map.set(person.username, savedUrl);
  }
  return map;
}

async function downloadLogos(): Promise<Map<string, string>> {
  ensureDir(PROJECTS_DIR);
  const map = new Map<string, string>();
  console.log("Downloading project logos…");

  for (const project of PROJECT_DEFS) {
    const file = `seed-${project.name.toLowerCase().replace(/\s+/g, "-")}.png`;
    const dest = path.join(PROJECTS_DIR, file);
    const ok = await downloadFile(dicebearLogo(project.name), dest);
    map.set(project.name, ok ? `/projects/${file}` : dicebearLogo(project.name));
    if (ok) console.log(`  ✓ logo ${project.name}`);
  }
  return map;
}

async function wipeSeedData() {
  const seedUsers = await User.find({ email: { $regex: `@${SEED_DOMAIN}$` } }).select(
    "_id",
  );
  const ids = seedUsers.map((u) => u._id);
  if (!ids.length) {
    console.log("No previous seed users to wipe.");
    return;
  }

  console.log(`Wiping ${ids.length} seed users and related data…`);
  await Promise.all([
    Task.deleteMany({ $or: [{ assignTo: { $in: ids } }, { assignedBy: { $in: ids } }] }),
    Meeting.deleteMany({
      $or: [{ assignedTo: { $in: ids } }, { assignedBy: { $in: ids } }],
    }),
    Friendship.deleteMany({ $or: [{ user1: { $in: ids } }, { user2: { $in: ids } }] }),
    FriendRequest.deleteMany({
      $or: [{ sender: { $in: ids } }, { receiver: { $in: ids } }],
    }),
    Project.deleteMany({ createdBy: { $in: ids } }),
    Team.deleteMany({ createdBy: { $in: ids } }),
    User.deleteMany({ _id: { $in: ids } }),
  ]);

  for (const dir of [PROFILES_DIR, PROJECTS_DIR]) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (file.startsWith("seed-")) fs.unlinkSync(path.join(dir, file));
    }
  }
}

async function ensureFriendship(
  a: mongoose.Types.ObjectId,
  b: mongoose.Types.ObjectId,
) {
  if (a.toString() === b.toString()) return false;
  const pair = friendPair(a, b);
  const existing = await Friendship.findOne({
    $or: [
      { user1: pair.user1, user2: pair.user2 },
      { user1: pair.user2, user2: pair.user1 },
    ],
  });
  if (existing) return false;
  await Friendship.create(pair);
  return true;
}

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB:", mongoose.connection.name);

  if (FRESH) await wipeSeedData();

  const portraits = await fetchPortraits();
  const avatarByUser = await downloadAvatars(portraits);
  const logoByProject = await downloadLogos();

  // --- Users ----------------------------------------------------------------
  const seedUsers: any[] = [];
  console.log("\nCreating users…");
  for (const person of PEOPLE) {
    const email = seedEmail(person.username);
    let user = await User.findOne({ email });
    const avatar = avatarByUser.get(person.username);
    if (user) {
      user.avatar = avatar;
      user.availability = person.availability;
      user.jobRole = person.jobRole;
      user.bio = person.bio;
      user.userLocation = person.location;
      user.statusMessage = person.statusMessage;
      user.emailVerified = true;
      await user.save();
      console.log(`  ⊘ exists ${person.username}`);
    } else {
      user = await User.create({
        email,
        username: person.username,
        password: SEED_PASSWORD,
        role: person.role,
        emailVerified: true,
        avatar,
        bio: person.bio,
        userLocation: person.location,
        website: `https://github.com/${slug(person.username)}`,
        availability: person.availability,
        jobRole: person.jobRole,
        statusMessage: person.statusMessage,
      });
      console.log(`  ✓ ${person.username} (${person.jobRole}, ${person.availability})`);
    }
    seedUsers.push(user);
  }

  const byUsername = new Map(seedUsers.map((u) => [u.username, u]));
  const byRole = (role: JobRole) =>
    seedUsers.filter((u) => u.jobRole === role);

  // --- Teams ----------------------------------------------------------------
  console.log("\nCreating teams…");
  const teams: any[] = [];
  for (const def of TEAM_DEFS) {
    let team = await Team.findOne({ name: def.name, createdBy: { $in: seedUsers.map((u) => u._id) } });
    const pool = def.roles.flatMap((role) => byRole(role));
    const uniquePool = [...new Map(pool.map((u) => [u._id.toString(), u])).values()];
    const owner = uniquePool[0] || seedUsers[0];
    const members = sampleMany(
      uniquePool.filter((u) => u._id.toString() !== owner._id.toString()),
      Math.min(6, Math.max(4, uniquePool.length - 1)),
    );

    const memberDocs = [
      {
        user: owner._id,
        role: "owner" as const,
        jobRole: owner.jobRole || JobRole.Unassigned,
        joinedAt: daysFromNow(-40),
      },
      ...members.map((u, i) => ({
        user: u._id,
        role: i === 0 ? ("admin" as const) : ("member" as const),
        jobRole: u.jobRole || JobRole.Unassigned,
        joinedAt: daysFromNow(-randomInt(5, 35)),
      })),
    ];

    if (team) {
      team.description = def.description;
      team.members = memberDocs;
      team.isActive = true;
      await team.save();
      console.log(`  ⊘ exists ${def.name} (${memberDocs.length} members)`);
    } else {
      team = await Team.create({
        name: def.name,
        description: def.description,
        createdBy: owner._id,
        members: memberDocs,
        isActive: true,
        settings: { allowMemberInvites: true, allowProjectCreation: true },
      });
      console.log(`  ✓ ${def.name} (${memberDocs.length} members)`);
    }
    teams.push(team);

    const memberIds = memberDocs.map((m) => m.user);
    await User.updateMany(
      { _id: { $in: memberIds } },
      { $addToSet: { teams: team._id } },
    );
  }

  const teamByName = new Map(teams.map((t) => [t.name, t]));

  // --- Projects -------------------------------------------------------------
  console.log("\nCreating projects…");
  const projects: any[] = [];
  for (const def of PROJECT_DEFS) {
    const team = teamByName.get(def.teamName);
    const ownerId = team?.createdBy || seedUsers[0]._id;
    const teamMembers = (team?.members || []).map((m: any) => ({
      user: m.user,
      role:
        m.user.toString() === ownerId.toString()
          ? "owner"
          : m.role === "admin"
            ? "admin"
            : "member",
      joinedAt: m.joinedAt || new Date(),
    }));

    let project = await Project.findOne({ name: def.name, createdBy: ownerId });
    const payload = {
      name: def.name,
      description: def.description,
      logo: logoByProject.get(def.name),
      status: def.status,
      priority: def.priority,
      tags: def.tags,
      startDate: daysFromNow(-randomInt(10, 80)),
      endDate: daysFromNow(randomInt(20, 90)),
      createdBy: ownerId,
      teamId: team?._id,
      members: teamMembers.length
        ? teamMembers
        : [{ user: ownerId, role: "owner", joinedAt: new Date() }],
      links: [
        {
          title: "GitHub",
          url: `https://github.com/slack-dev/${def.name.toLowerCase().replace(/\s+/g, "-")}`,
          type: "repository",
        },
        {
          title: "Figma",
          url: "https://figma.com/file/seed-workspace",
          type: "design",
        },
      ],
      progress: randomInt(8, 88),
      isPublic: Math.random() > 0.6,
    };

    if (project) {
      Object.assign(project, payload);
      await project.save();
      console.log(`  ⊘ exists ${def.name}`);
    } else {
      project = await Project.create(payload);
      console.log(`  ✓ ${def.name}`);
    }
    projects.push(project);

    if (team) {
      await Team.updateOne(
        { _id: team._id },
        { $addToSet: { projects: project._id } },
      );
    }
    await User.updateMany(
      { _id: { $in: teamMembers.map((m: any) => m.user) } },
      { $addToSet: { projects: project._id } },
    );
  }

  // --- Friendships among seed users -----------------------------------------
  console.log("\nCreating friendships among seed users…");
  let friendshipCount = 0;
  for (const user of seedUsers) {
    const others = seedUsers.filter(
      (u) => u._id.toString() !== user._id.toString(),
    );
    for (const friend of sampleMany(others, randomInt(8, 12))) {
      if (await ensureFriendship(user._id, friend._id)) friendshipCount++;
    }
  }
  console.log(`  ✓ ${friendshipCount} new seed↔seed friendships`);

  // --- Friend existing accounts with seed users -----------------------------
  const existingUsers = await User.find({
    email: { $not: { $regex: `@${SEED_DOMAIN}$` } },
  }).select("_id username email");

  console.log(`\nExisting accounts: ${existingUsers.length}`);
  let existingFriendCount = 0;
  for (const current of existingUsers) {
    const pals = sampleMany(seedUsers, Math.min(8, seedUsers.length));
    for (const pal of pals) {
      if (await ensureFriendship(current._id, pal._id)) existingFriendCount++;
    }
    console.log(
      `  ✓ ${current.username || current.email} ↔ ${pals.length} seed friends`,
    );
  }
  console.log(`  ✓ ${existingFriendCount} new existing↔seed friendships`);

  const involveExistingInMeetings = async (
    meetings: any[],
    existing: any[],
  ) => {
    if (!meetings.length || !existing.length) return 0;
    let touched = 0;
    for (const current of existing) {
      const slice = sampleMany(meetings, Math.min(10, meetings.length));
      for (let i = 0; i < slice.length; i++) {
        const update: Record<string, unknown> = {
          $addToSet: { attendees: current._id },
        };
        if (i < 3) {
          (update as any).$set = { assignedTo: current._id };
        } else if (i < 5) {
          (update as any).$set = { assignedBy: current._id };
        }
        await Meeting.updateOne({ _id: slice[i]._id }, update);
        touched++;
      }
    }
    return touched;
  };

  // --- Tasks ----------------------------------------------------------------
  console.log("\nCreating tasks…");
  const statuses = ["pending", "in_progress", "completed", "cancelled"] as const;
  const priorities = ["low", "medium", "high", "urgent"] as const;
  let taskCount = 0;
  const tasksByProject = new Map<string, mongoose.Types.ObjectId[]>();

  for (const project of projects) {
    const team = teams.find(
      (t) => t._id.toString() === project.teamId?.toString(),
    );
    const memberIds = (team?.members || project.members || []).map((m: any) =>
      (m.user?._id || m.user).toString(),
    );
    const memberUsers = seedUsers.filter((u) =>
      memberIds.includes(u._id.toString()),
    );
    const assignPool = memberUsers.length ? memberUsers : seedUsers;
    const owner =
      assignPool.find(
        (u) => u._id.toString() === (project.createdBy._id || project.createdBy).toString(),
      ) || assignPool[0];

    const n = randomInt(3, 5);
    for (let i = 0; i < n; i++) {
      const tpl = sample(TASK_TEMPLATES);
      const wantedRole = JOB_ROLES.find((r) => tpl.tags.includes(r));
      const rolePool = wantedRole
        ? assignPool.filter((u) => u.jobRole === wantedRole)
        : [];
      const assignTo = (rolePool.length ? rolePool : assignPool)[
        i % (rolePool.length ? rolePool.length : assignPool.length)
      ];
      const status = sample([...statuses]);
      const task = await Task.create({
        title: `${tpl.title} — ${project.name}`,
        description: `${tpl.title} on ${project.name}. Assigned from the ${team?.name || "workspace"} roster.`,
        assignTo: assignTo._id,
        assignedBy: owner._id,
        projectId: project._id,
        status,
        priority: sample([...priorities]),
        dueDate: daysFromNow(randomInt(-4, 24)),
        tags: tpl.tags,
      });
      taskCount++;
      const key = String(project._id);
      tasksByProject.set(key, [...(tasksByProject.get(key) || []), task._id]);
    }
  }
  console.log(`  ✓ ${taskCount} tasks`);

  // --- Meetings -------------------------------------------------------------
  console.log("\nCreating meetings…");
  let meetingCount = 0;
  const meetingsByProject = new Map<string, mongoose.Types.ObjectId[]>();

  for (const project of projects) {
    const team = teams.find(
      (t) => t._id.toString() === project.teamId?.toString(),
    );
    const memberIds = (team?.members || []).map((m: any) =>
      (m.user._id || m.user).toString(),
    );
    const attendees = seedUsers.filter((u) =>
      memberIds.includes(u._id.toString()),
    );
    const pool = [...(attendees.length ? attendees : seedUsers)];
    for (const current of existingUsers) {
      if (!pool.some((u) => u._id.toString() === current._id.toString())) {
        pool.push(current);
      }
    }
    const host = pool[0];
    const n = randomInt(1, 2);

    for (let i = 0; i < n; i++) {
      const start = daysFromNow(randomInt(-3, 18));
      start.setHours(randomInt(9, 16), [0, 15, 30, 45][randomInt(0, 3)], 0, 0);
      const end = new Date(start.getTime() + randomInt(30, 90) * 60 * 1000);
      const title = `${sample(MEETING_TEMPLATES)} · ${project.name}`;
      const meeting = await Meeting.create({
        title,
        description: `${title} for ${team?.name || "the workspace"}.`,
        type: "online",
        status: start < new Date() ? "completed" : "scheduled",
        assignedTo: sample(pool)._id,
        assignedBy: host._id,
        projectId: project._id,
        startDate: start,
        endDate: end,
        meetingLink: `https://${process.env.JITSI_DOMAIN}/slack-dev-${project.name
          .toLowerCase()
          .replace(/\s+/g, "-")}-${i}`,
        tags: sampleMany(["planning", "review", "sync", "demo"], 2),
        attendees: sampleMany(pool, Math.min(pool.length, randomInt(3, 6))).map(
          (u) => u._id,
        ),
      });
      meetingCount++;
      const key = String(project._id);
      meetingsByProject.set(key, [
        ...(meetingsByProject.get(key) || []),
        meeting._id,
      ]);
    }
  }
  console.log(`  ✓ ${meetingCount} meetings`);

  const seedMeetings = await Meeting.find({
    assignedBy: { $in: seedUsers.map((u) => u._id) },
  }).select("_id");
  const involved = await involveExistingInMeetings(seedMeetings, existingUsers);
  if (involved) {
    console.log(`  ✓ involved existing accounts in ${involved} meeting updates`);
  }

  for (const project of projects) {
    const key = String(project._id);
    const projectTasks = tasksByProject.get(key) || [];
    const projectMeetings = meetingsByProject.get(key) || [];
    project.tasks = projectTasks;
    project.meetings = projectMeetings;
    project.stats = {
      ...project.stats,
      totalTasks: projectTasks.length,
      completedTasks: 0,
      totalMeetings: projectMeetings.length,
      completedMeetings: 0,
      totalMembers: project.members.length,
    };
    await project.save();
  }

  console.log("\n========================================");
  console.log("Seed workspace complete");
  console.log(`  Users:        ${seedUsers.length}  (password: ${SEED_PASSWORD})`);
  console.log(`  Existing:     ${existingUsers.length} befriended`);
  console.log(`  Teams:        ${teams.length}`);
  console.log(`  Projects:     ${projects.length}`);
  console.log(`  Tasks:        ${taskCount}`);
  console.log(`  Meetings:     ${meetingCount}`);
  console.log(`  Friendships:  +${friendshipCount} seed, +${existingFriendCount} existing`);
  console.log("  Emails:       *@slackdev.seed");
  console.log("========================================");

  await mongoose.connection.close();
  process.exit(0);
}

seed().catch(async (error) => {
  console.error("Seed failed:", error);
  await mongoose.connection.close().catch(() => undefined);
  process.exit(1);
});
