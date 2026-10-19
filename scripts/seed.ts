import "../config/env";
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import {
  User,
  Task,
  Meeting,
  Project,
  PublicProject,
  Note,
} from '../models/index';

const MONGODB_URI = process.env.MONGODB_URI as string;
const SEED_DOMAIN = 'slackdev.seed';
const SEED_PASSWORD = 'Abcd1234!';

const SEED_PEOPLE = [
  { username: 'Maya Chen', jobRole: 'frontend', role: 'admin' },
  { username: 'Liam Okonkwo', jobRole: 'frontend', role: 'user' },
  { username: 'Elias Berg', jobRole: 'backend', role: 'admin' },
  { username: 'Amara Diallo', jobRole: 'backend', role: 'user' },
  { username: 'Aisha Rahman', jobRole: 'fullstack', role: 'user' },
  { username: 'Elena Volkov', jobRole: 'designer', role: 'user' },
  { username: 'Samir Hassan', jobRole: 'qa', role: 'user' },
  { username: 'Ravi Sharma', jobRole: 'devops', role: 'user' },
];

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];

const sample = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const sampleMany = <T>(arr: T[], count: number): T[] => {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < count && copy.length > 0; i++) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
};

const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const daysFromNow = (days: number): Date =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000);

/**
 * Scan a directory and return servable URL paths for any image files found.
 */
const scanImages = (dir: string, urlPrefix: string): string[] => {
  try {
    return fs
      .readdirSync(dir)
      .filter((file) => IMAGE_EXTENSIONS.includes(path.extname(file).toLowerCase()))
      .map((file) => `${urlPrefix}/${file}`.replace(/\/+/g, '/'));
  } catch {
    return [];
  }
};

/**
 * Scan a directory for zip files and return servable URL paths.
 */
const scanZips = (dir: string, urlPrefix: string): string[] => {
  try {
    return fs
      .readdirSync(dir)
      .filter((file) => path.extname(file).toLowerCase() === '.zip')
      .map((file) => `${urlPrefix}/${file}`.replace(/\/+/g, '/'));
  } catch {
    return [];
  }
};

// Resolve real, locally-served assets.
// `public/` is served at root (app.use(express.static('public')))
// `uploads/projects` is served at `/projects`
const PUBLIC_DIR = path.join(__dirname, '../public');
const PROJECT_UPLOADS_DIR = path.join(__dirname, '../uploads/projects');

const IMAGE_POOL: string[] = [
  ...scanImages(PUBLIC_DIR, ''),
  ...scanImages(PROJECT_UPLOADS_DIR, '/projects'),
];
if (IMAGE_POOL.length === 0) IMAGE_POOL.push('/logo.png');

const ZIP_POOL: string[] = scanZips(PROJECT_UPLOADS_DIR, '/projects');
if (ZIP_POOL.length === 0) ZIP_POOL.push('/projects/sample-project.zip');

const randomImage = (): string => sample(IMAGE_POOL);
const randomImages = (count: number): string[] =>
  sampleMany(IMAGE_POOL, Math.min(count, IMAGE_POOL.length)) || [randomImage()];
const randomZip = (): string => sample(ZIP_POOL);

// Google-hosted links used as note resources.
const GOOGLE_NOTE_LINKS = [
  'https://drive.google.com/file/d/1aZ9xQK7m2P0r4uVtY6sB3cD8eF1gH2jK/view?usp=sharing',
  'https://drive.google.com/file/d/1bC3dE5fG7hI9jK0lM2nO4pQ6rS8tU1vW/view?usp=sharing',
  'https://docs.google.com/document/d/1xY2zA3bC4dE5fG6hI7jK8lM9nO0pQ1rS2tU/edit?usp=sharing',
  'https://drive.google.com/file/d/1cD4eF6gH8iJ0kL2mN4oP6qR8sT0uV2wX/view?usp=sharing',
  'https://docs.google.com/presentation/d/1mN3oP5qR7sT9uV1wX3yZ5aB7cD9eF1gH/edit?usp=sharing',
  'https://drive.google.com/file/d/1dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY/view?usp=sharing',
];

const publicProjectsData = [
  {
    title: 'React Admin Dashboard',
    description:
      'A modern, fully responsive admin dashboard built with React, Tailwind CSS and Recharts. Includes auth, charts, tables and dark mode.',
    price: 49,
    category: 'Web App',
    tags: ['react', 'tailwind', 'dashboard', 'admin'],
    rating: 4.6,
  },
  {
    title: 'Node.js REST API Starter',
    description:
      'Production-ready Express + MongoDB REST API boilerplate with JWT auth, validation, logging and Docker support.',
    price: 39,
    category: 'Backend',
    tags: ['node', 'express', 'mongodb', 'api'],
    rating: 4.8,
  },
  {
    title: 'E-commerce Storefront',
    description:
      'Complete e-commerce storefront with cart, checkout, Stripe payments and product management.',
    price: 79,
    category: 'E-commerce',
    tags: ['react', 'stripe', 'ecommerce', 'nextjs'],
    rating: 4.5,
  },
  {
    title: 'SaaS Landing Page Kit',
    description:
      'Conversion-focused landing page templates for SaaS products. 12 sections, animations and CMS-ready.',
    price: 29,
    category: 'Templates',
    tags: ['landing', 'marketing', 'tailwind', 'animation'],
    rating: 4.3,
  },
  {
    title: 'Real-time Chat App',
    description:
      'Full-stack real-time chat application with Socket.IO, typing indicators, read receipts and group chats.',
    price: 59,
    category: 'Web App',
    tags: ['socket.io', 'chat', 'react', 'realtime'],
    rating: 4.7,
  },
];

const notesData = [
  {
    title: 'Data Structures Complete Notes',
    description: 'Comprehensive notes covering arrays, linked lists, trees, graphs and hashing.',
    department: 'Computer Science',
    subject: 'Data Structures',
    tags: ['dsa', 'algorithms', 'cs'],
  },
  {
    title: 'Operating Systems Handbook',
    description: 'Process scheduling, memory management, file systems and concurrency.',
    department: 'Computer Science',
    subject: 'Operating Systems',
    tags: ['os', 'concurrency', 'memory'],
  },
  {
    title: 'Database Management Systems',
    description: 'Relational model, normalization, SQL queries, indexing and transactions.',
    department: 'Information Technology',
    subject: 'DBMS',
    tags: ['database', 'sql', 'normalization'],
  },
  {
    title: 'Computer Networks Summary',
    description: 'OSI model, TCP/IP, routing protocols and network security basics.',
    department: 'Computer Science',
    subject: 'Computer Networks',
    tags: ['networking', 'tcp-ip', 'osi'],
  },
  {
    title: 'Software Engineering Principles',
    description: 'SDLC, agile, design patterns, testing strategies and best practices.',
    department: 'Software Engineering',
    subject: 'Software Engineering',
    tags: ['sdlc', 'agile', 'patterns'],
  },
  {
    title: 'Machine Learning Fundamentals',
    description: 'Supervised vs unsupervised learning, regression, classification and evaluation.',
    department: 'Artificial Intelligence',
    subject: 'Machine Learning',
    tags: ['ml', 'ai', 'regression'],
  },
];

const projectsData = [
  {
    name: 'CoreStack Platform',
    description:
      'The all-in-one developer collaboration platform with tasks, meetings, chat and code challenges.',
    status: 'active',
    priority: 'high',
    tags: ['platform', 'collaboration', 'saas'],
  },
  {
    name: 'Mobile Companion App',
    description: 'A React Native companion app for managing tasks and meetings on the go.',
    status: 'planning',
    priority: 'medium',
    tags: ['mobile', 'react-native', 'app'],
  },
  {
    name: 'Analytics & Reporting',
    description: 'Dashboards and reporting service providing insights across teams and projects.',
    status: 'active',
    priority: 'urgent',
    tags: ['analytics', 'charts', 'reporting'],
  },
  {
    name: 'Marketing Website Revamp',
    description: 'Complete redesign of the public marketing website with a new brand identity.',
    status: 'on_hold',
    priority: 'low',
    tags: ['website', 'marketing', 'design'],
  },
];

const taskTitles = [
  'Set up CI/CD pipeline',
  'Design database schema',
  'Implement authentication flow',
  'Write unit tests for API',
  'Refactor dashboard components',
  'Fix responsive layout issues',
  'Integrate Stripe payments',
  'Optimize database queries',
  'Add dark mode support',
  'Build notification system',
  'Create onboarding wizard',
  'Review pull requests',
];

const meetingTitles = [
  'Sprint Planning',
  'Daily Standup',
  'Design Review',
  'Retrospective',
  'Client Demo',
  'Architecture Discussion',
  'Backlog Grooming',
  'Release Planning',
];

// ----------------------------------------------------------------------------
// Seeder
// ----------------------------------------------------------------------------
async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB:', mongoose.connection.name);

    let users = await User.find().select('_id username email');
    if (users.length === 0) {
      console.log('No users in the database. Creating seed users…');
      for (const person of SEED_PEOPLE) {
        const user = await User.create({
          email: `${slug(person.username)}@${SEED_DOMAIN}`,
          username: person.username,
          password: SEED_PASSWORD,
          role: person.role,
          jobRole: person.jobRole,
          emailVerified: true,
          bio: `${person.username} on the workspace.`,
        });
        console.log(`✓ User: ${person.username}`);
        users.push(user);
      }
    } else {
      console.log(`Using ${users.length} existing users.`);
    }

    const USER_IDS = users.map((user) => user._id);

    console.log(`Image pool: ${IMAGE_POOL.length} images | Zip pool: ${ZIP_POOL.length} files`);

    // --- Public Projects ----------------------------------------------------
    let publicProjectCount = 0;
    for (const data of publicProjectsData) {
      const exists = await PublicProject.findOne({ title: data.title });
      if (exists) {
        console.log(`⊘ Public project exists: ${data.title}`);
        continue;
      }
      await PublicProject.create({
        ...data,
        previewImages: randomImages(randomInt(2, 4)),
        zipFile: randomZip(),
        createdBy: sample(USER_IDS),
        isActive: true,
        isRejected: false,
        purchaseCount: randomInt(0, 240),
      });
      publicProjectCount++;
      console.log(`✓ Public project: ${data.title}`);
    }

    // --- Notes --------------------------------------------------------------
    let noteCount = 0;
    for (const data of notesData) {
      const exists = await Note.findOne({ title: data.title });
      if (exists) {
        console.log(`⊘ Note exists: ${data.title}`);
        continue;
      }
      await Note.create({
        ...data,
        fileUrl: sample(GOOGLE_NOTE_LINKS),
        fileName: `${data.subject.replace(/\s+/g, '-').toLowerCase()}.pdf`,
        createdBy: sample(USER_IDS),
      });
      noteCount++;
      console.log(`✓ Note: ${data.title}`);
    }

    // --- Projects -----------------------------------------------------------
    const createdProjects: any[] = [];
    for (const data of projectsData) {
      const owner = sample(USER_IDS);
      let project = await Project.findOne({ name: data.name });
      if (project) {
        console.log(`⊘ Project exists: ${data.name}`);
        createdProjects.push(project);
        continue;
      }
      project = await Project.create({
        ...data,
        logo: randomImage(),
        media: randomImages(randomInt(1, 3)),
        startDate: daysFromNow(-randomInt(20, 90)),
        endDate: daysFromNow(randomInt(30, 120)),
        createdBy: owner,
        members: USER_IDS.map((user, index) => ({
          user,
          role: index === 0 ? 'owner' : index === 1 ? 'admin' : 'member',
          joinedAt: daysFromNow(-randomInt(5, 60)),
        })),
        links: [
          { title: 'GitHub Repository', url: 'https://github.com/example/core-stack', type: 'repository' },
          { title: 'Documentation', url: 'https://docs.google.com/document/d/1abcD/edit', type: 'documentation' },
          { title: 'Figma Design', url: 'https://figma.com/file/example-design', type: 'design' },
        ],
        progress: randomInt(10, 95),
        isPublic: Math.random() > 0.5,
      });
      createdProjects.push(project);
      console.log(`✓ Project: ${data.name}`);
    }

    // --- Tasks --------------------------------------------------------------
    const tasksByProject = new Map<string, mongoose.Types.ObjectId[]>();
    let taskCount = 0;
    const statuses = ['pending', 'in_progress', 'completed', 'cancelled'] as const;
    const priorities = ['low', 'medium', 'high', 'urgent'] as const;

    for (const title of taskTitles) {
      const project = sample(createdProjects);
      const task = await Task.create({
        title,
        description: `${title} for the ${project?.name} project.`,
        assignTo: sample(USER_IDS),
        assignedBy: sample(USER_IDS),
        projectId: project?._id,
        status: sample(statuses as unknown as string[]),
        priority: sample(priorities as unknown as string[]),
        dueDate: daysFromNow(randomInt(-10, 30)),
        tags: sampleMany(['frontend', 'backend', 'urgent', 'bug', 'feature', 'devops'], randomInt(1, 3)),
      });
      taskCount++;
      if (project?._id) {
        const key = String(project._id);
        tasksByProject.set(key, [...(tasksByProject.get(key) || []), task._id]);
      }
    }
    console.log(`✓ Tasks created: ${taskCount}`);

    // --- Meetings -----------------------------------------------------------
    const meetingsByProject = new Map<string, mongoose.Types.ObjectId[]>();
    let meetingCount = 0;
    const meetingTypes = ['online', 'in-person', 'hybrid'] as const;
    const meetingStatuses = ['scheduled', 'completed', 'cancelled', 'pending'] as const;

    for (const title of meetingTitles) {
      const project = sample(createdProjects);
      const type = sample(meetingTypes as unknown as string[]);
      const start = daysFromNow(randomInt(-5, 20));
      const end = new Date(start.getTime() + randomInt(30, 120) * 60 * 1000);
      const meeting = await Meeting.create({
        title,
        description: `${title} session for the ${project?.name} project.`,
        type,
        status: sample(meetingStatuses as unknown as string[]),
        assignedTo: sample(USER_IDS),
        assignedBy: sample(USER_IDS),
        projectId: project?._id,
        startDate: start,
        endDate: end,
        location: 'Conference Room A',
        meetingLink: 'https://meet.google.com/abc-defg-hij',
        tags: sampleMany(['planning', 'review', 'sync', 'demo'], randomInt(1, 2)),
        attendees: sampleMany(USER_IDS, randomInt(1, USER_IDS.length)),
      });
      meetingCount++;
      if (project?._id) {
        const key = String(project._id);
        meetingsByProject.set(key, [...(meetingsByProject.get(key) || []), meeting._id]);
      }
    }
    console.log(`✓ Meetings created: ${meetingCount}`);

    // --- Link tasks & meetings back to their projects + update stats --------
    for (const project of createdProjects) {
      const key = String(project._id);
      const projectTasks = tasksByProject.get(key) || [];
      const projectMeetings = meetingsByProject.get(key) || [];
      if (projectTasks.length === 0 && projectMeetings.length === 0) continue;

      project.tasks = projectTasks;
      project.meetings = projectMeetings;
      project.stats = {
        ...project.stats,
        totalTasks: projectTasks.length,
        totalMeetings: projectMeetings.length,
        totalMembers: project.members.length,
      };
      await project.save();
    }

    console.log('\n========================================');
    console.log('✅ Seeding complete');
    console.log(`   Users:           ${users.length}`);
    console.log(`   Public Projects: ${publicProjectCount}`);
    console.log(`   Notes:           ${noteCount}`);
    console.log(`   Projects:        ${createdProjects.length}`);
    console.log(`   Tasks:           ${taskCount}`);
    console.log(`   Meetings:        ${meetingCount}`);
    console.log('========================================');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seed();
