const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const prisma = new PrismaClient();

// H-1 Fix: Encryption helper for mobile numbers (deterministic)
function encryptMobile(mobile) {
  if (!mobile) return null;

  const encryptionKey =
    process.env.TWOFA_ENCRYPTION_KEY || process.env.GITHUB_ENCRYPTION_KEY;
  if (!encryptionKey) {
    console.warn('⚠️ No encryption key found, storing mobile in plaintext');
    return mobile;
  }

  try {
    const key = Buffer.from(encryptionKey, 'base64');
    // Deterministic IV from key (for uniqueness constraint)
    const iv = crypto.createHash('sha256').update(key).digest().slice(0, 16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    let encrypted = cipher.update(mobile, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error.message);
    return mobile;
  }
}

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Hash password
  const hashedPassword = await bcrypt.hash('Shivam9090@@', 10);

  // 1. Create BOSS account
  console.log('👑 Creating BOSS account...');
  const boss = await prisma.user.create({
    data: {
      email: 'vaghanishivam83@gmail.com',
      name: 'Shivam Vaghani',
      mobile: encryptMobile('+919876543210'), // H-1: Encrypted mobile
      password: hashedPassword,
      role: 'BOSS',
      isEmailVerified: true,
      isActive: true,
      skills: ['Full Stack', 'Leadership', 'Management', 'Architecture'],
      achievements: 'Company Founder & CEO',
    },
  });
  console.log(`✅ BOSS created: ${boss.email}\n`);

  // 2. Create Company
  console.log('🏢 Creating Company...');
  const company = await prisma.company.create({
    data: {
      name: 'TechVision Solutions',
      ownerId: boss.id,
      isActive: true,
    },
  });
  console.log(`✅ Company created: ${company.name}\n`);

  // Update boss with company
  await prisma.user.update({
    where: { id: boss.id },
    data: { companyId: company.id },
  });

  // 3. Create Employees
  console.log('👥 Creating 10 Employees...');
  const employees = [];

  const employeeData = [
    {
      name: 'Rahul Sharma',
      email: 'rahul.sharma@techvision.com',
      mobile: encryptMobile('+919876543211'),
      skills: ['React', 'TypeScript', 'Next.js', 'TailwindCSS'],
      achievements: 'Built 5+ production apps, UI/UX expert',
    },
    {
      name: 'Priya Patel',
      email: 'priya.patel@techvision.com',
      mobile: encryptMobile('+919876543212'),
      skills: ['Node.js', 'NestJS', 'PostgreSQL', 'Redis'],
      achievements: 'Backend architecture specialist, 3 years exp',
    },
    {
      name: 'Amit Kumar',
      email: 'amit.kumar@techvision.com',
      mobile: encryptMobile('+919876543213'),
      skills: ['Python', 'TensorFlow', 'PyTorch', 'ML'],
      achievements: 'AI/ML engineer, published 2 research papers',
    },
    {
      name: 'Sneha Reddy',
      email: 'sneha.reddy@techvision.com',
      mobile: encryptMobile('+919876543214'),
      skills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD'],
      achievements: 'DevOps expert, reduced deployment time by 60%',
    },
    {
      name: 'Vikram Singh',
      email: 'vikram.singh@techvision.com',
      mobile: encryptMobile('+919876543215'),
      skills: ['React Native', 'Flutter', 'iOS', 'Android'],
      achievements: 'Mobile dev, 10+ apps in app stores',
    },
    {
      name: 'Anjali Gupta',
      email: 'anjali.gupta@techvision.com',
      mobile: encryptMobile('+919876543216'),
      skills: ['Jest', 'Cypress', 'Selenium', 'QA'],
      achievements: 'QA lead, found 500+ critical bugs',
    },
    {
      name: 'Rohan Mehta',
      email: 'rohan.mehta@techvision.com',
      mobile: encryptMobile('+919876543217'),
      skills: ['MongoDB', 'PostgreSQL', 'MySQL', 'Redis'],
      achievements: 'Database architect, optimized queries by 80%',
    },
    {
      name: 'Kavya Iyer',
      email: 'kavya.iyer@techvision.com',
      mobile: encryptMobile('+919876543218'),
      skills: ['Figma', 'Adobe XD', 'UI Design', 'UX Research'],
      achievements: 'UI/UX designer, redesigned 3 major products',
    },
    {
      name: 'Arjun Desai',
      email: 'arjun.desai@techvision.com',
      mobile: encryptMobile('+919876543219'),
      skills: ['Vue.js', 'JavaScript', 'HTML5', 'CSS3'],
      achievements: 'Frontend developer, performance optimization expert',
    },
    {
      name: 'Nisha Kapoor',
      email: 'nisha.kapoor@techvision.com',
      mobile: encryptMobile('+919876543220'),
      skills: ['GraphQL', 'REST API', 'Microservices', 'gRPC'],
      achievements: 'API architect, built scalable microservices',
    },
  ];

  for (const empData of employeeData) {
    const employee = await prisma.user.create({
      data: {
        ...empData,
        password: await bcrypt.hash('Employee123!', 10),
        role: 'EMPLOYEE',
        isEmailVerified: true,
        isActive: true,
        companyId: company.id,
        createdBy: boss.id,
        attendance: Math.floor(Math.random() * 50) + 20,
      },
    });
    employees.push(employee);
    console.log(`  ✓ Created: ${employee.name}`);
  }
  console.log(`✅ ${employees.length} Employees created\n`);

  // 4. Create Teams
  console.log('🏢 Creating 5 Teams...');
  const teams = [];

  const teamData = [
    {
      name: 'Frontend Warriors',
      teamType: 'frontend',
      description: 'Building stunning user interfaces',
      memberIds: [employees[0].id, employees[8].id], // Rahul, Arjun
    },
    {
      name: 'Backend Ninjas',
      teamType: 'backend',
      description: 'Crafting robust server-side solutions',
      memberIds: [employees[1].id, employees[9].id], // Priya, Nisha
    },
    {
      name: 'AI/ML Wizards',
      teamType: 'ai/ml',
      description: 'Developing intelligent systems',
      memberIds: [employees[2].id], // Amit
    },
    {
      name: 'DevOps Squad',
      teamType: 'devops',
      description: 'Ensuring smooth deployments',
      memberIds: [employees[3].id], // Sneha
    },
    {
      name: 'Mobile Mavericks',
      teamType: 'mobile',
      description: 'Creating amazing mobile experiences',
      memberIds: [employees[4].id], // Vikram
    },
  ];

  for (const teamInfo of teamData) {
    const team = await prisma.team.create({
      data: {
        ...teamInfo,
        companyId: company.id,
        createdById: boss.id,
      },
    });
    teams.push(team);
    console.log(`  ✓ Created: ${team.name} (${team.teamType})`);
  }
  console.log(`✅ ${teams.length} Teams created\n`);

  // 5. Create Projects
  console.log('📁 Creating 8 Projects...');
  const projects = [];

  const projectData = [
    {
      title: 'E-Commerce Platform Redesign',
      description:
        'Complete overhaul of the existing e-commerce platform with modern UI/UX',
      source: 'Client Request',
      startDate: new Date('2026-01-01'),
      closeDate: new Date('2026-06-30'),
      status: 'active',
      teamIds: [teams[0].id, teams[1].id], // Frontend Warriors + Backend Ninjas
      githubRepoName: 'techvision/ecommerce-platform',
      githubRepoUrl: 'https://github.com/techvision/ecommerce-platform',
      githubRepoBranch: 'main',
    },
    {
      title: 'Microservices API Gateway',
      description:
        'Build scalable API gateway with rate limiting and authentication',
      source: 'Internal Initiative',
      startDate: new Date('2026-01-15'),
      closeDate: new Date('2026-05-15'),
      status: 'active',
      teamIds: [teams[1].id, teams[3].id], // Backend Ninjas + DevOps Squad
      githubRepoName: 'techvision/api-gateway',
      githubRepoUrl: 'https://github.com/techvision/api-gateway',
      githubRepoBranch: 'develop',
    },
    {
      title: 'AI Recommendation Engine',
      description:
        'Machine learning system for personalized product recommendations',
      source: 'R&D Project',
      startDate: new Date('2026-02-01'),
      closeDate: new Date('2026-08-31'),
      status: 'active',
      teamIds: [teams[2].id], // AI/ML Wizards
      githubRepoName: 'techvision/ml-recommender',
      githubRepoUrl: 'https://github.com/techvision/ml-recommender',
      githubRepoBranch: 'main',
    },
    {
      title: 'Cloud Infrastructure Setup',
      description: 'Kubernetes cluster setup with auto-scaling and monitoring',
      source: 'Infrastructure Upgrade',
      startDate: new Date('2026-01-10'),
      closeDate: new Date('2026-03-31'),
      status: 'active',
      teamIds: [teams[3].id], // DevOps Squad
      githubRepoName: 'techvision/k8s-infra',
      githubRepoUrl: 'https://github.com/techvision/k8s-infra',
      githubRepoBranch: 'production',
    },
    {
      title: 'Mobile Banking App',
      description: 'Cross-platform mobile app for banking services',
      source: 'Client Contract',
      startDate: new Date('2025-12-01'),
      closeDate: new Date('2026-07-31'),
      status: 'active',
      teamIds: [teams[4].id, teams[1].id], // Mobile Mavericks + Backend Ninjas
      githubRepoName: 'techvision/banking-mobile',
      githubRepoUrl: 'https://github.com/techvision/banking-mobile',
      githubRepoBranch: 'main',
    },
    {
      title: 'Customer Analytics Dashboard',
      description: 'Real-time analytics dashboard with AI insights',
      source: 'Product Development',
      startDate: new Date('2026-01-20'),
      closeDate: new Date('2026-04-30'),
      status: 'active',
      teamIds: [teams[0].id, teams[2].id], // Frontend Warriors + AI/ML Wizards
      githubRepoName: 'techvision/analytics-dashboard',
      githubRepoUrl: 'https://github.com/techvision/analytics-dashboard',
      githubRepoBranch: 'main',
    },
    {
      title: 'Legacy System Migration',
      description: 'Migrate monolith application to microservices architecture',
      source: 'Technical Debt',
      startDate: new Date('2025-11-01'),
      closeDate: new Date('2026-10-31'),
      status: 'active',
      teamIds: [teams[1].id, teams[3].id], // Backend Ninjas + DevOps Squad
      githubRepoName: 'techvision/legacy-migration',
      githubRepoUrl: 'https://github.com/techvision/legacy-migration',
      githubRepoBranch: 'migration',
    },
    {
      title: 'Employee Portal Enhancement',
      description: 'Add new features to internal employee management portal',
      source: 'Internal Request',
      startDate: new Date('2025-12-15'),
      closeDate: new Date('2026-03-15'),
      status: 'completed',
      teamIds: [teams[0].id], // Frontend Warriors
      githubRepoName: 'techvision/employee-portal',
      githubRepoUrl: 'https://github.com/techvision/employee-portal',
      githubRepoBranch: 'main',
    },
  ];

  for (const projData of projectData) {
    const { teamIds, ...projectFields } = projData;
    const project = await prisma.project.create({
      data: {
        ...projectFields,
        companyId: company.id,
        createdById: boss.id,
        teams: {
          create: teamIds.map((teamId) => ({
            teamId: teamId,
          })),
        },
      },
    });
    projects.push(project);
    console.log(
      `  ✓ Created: ${project.title} (${teamIds.length} team${teamIds.length > 1 ? 's' : ''})`,
    );
  }
  console.log(`✅ ${projects.length} Projects created\n`);

  // 6. Create Tasks
  console.log('📋 Creating 25 Tasks...');
  let taskCount = 0;

  const tasksData = [
    // E-Commerce Platform tasks
    {
      title: 'Design product listing page',
      projectIdx: 0,
      type: 'frontend',
      assignTo: [0],
      priority: 'high',
      status: 'in_progress',
    },
    {
      title: 'Implement shopping cart functionality',
      projectIdx: 0,
      type: 'frontend',
      assignTo: [0, 8],
      priority: 'high',
      status: 'in_progress',
    },
    {
      title: 'Create checkout flow UI',
      projectIdx: 0,
      type: 'ui/ux',
      assignTo: [7],
      priority: 'medium',
      status: 'pending',
    },

    // API Gateway tasks
    {
      title: 'Setup rate limiting middleware',
      projectIdx: 1,
      type: 'backend',
      assignTo: [1],
      priority: 'high',
      status: 'completed',
    },
    {
      title: 'Implement JWT authentication',
      projectIdx: 1,
      type: 'backend',
      assignTo: [1, 9],
      priority: 'urgent',
      status: 'completed',
    },
    {
      title: 'Write API documentation',
      projectIdx: 1,
      type: 'backend',
      assignTo: [9],
      priority: 'medium',
      status: 'in_progress',
    },

    // AI Recommendation Engine tasks
    {
      title: 'Data preprocessing pipeline',
      projectIdx: 2,
      type: 'ai/ml',
      assignTo: [2],
      priority: 'urgent',
      status: 'in_progress',
    },
    {
      title: 'Train collaborative filtering model',
      projectIdx: 2,
      type: 'ai/ml',
      assignTo: [2],
      priority: 'high',
      status: 'pending',
    },
    {
      title: 'Deploy model to production',
      projectIdx: 2,
      type: 'devops',
      assignTo: [3],
      priority: 'medium',
      status: 'pending',
    },

    // Cloud Infrastructure tasks
    {
      title: 'Setup Kubernetes cluster',
      projectIdx: 3,
      type: 'devops',
      assignTo: [3],
      priority: 'urgent',
      status: 'completed',
    },
    {
      title: 'Configure auto-scaling policies',
      projectIdx: 3,
      type: 'devops',
      assignTo: [3],
      priority: 'high',
      status: 'in_progress',
    },
    {
      title: 'Setup monitoring with Prometheus',
      projectIdx: 3,
      type: 'devops',
      assignTo: [3],
      priority: 'high',
      status: 'in_progress',
    },

    // Mobile Banking App tasks
    {
      title: 'Design login screen',
      projectIdx: 4,
      type: 'mobile',
      assignTo: [4],
      priority: 'high',
      status: 'completed',
    },
    {
      title: 'Implement biometric authentication',
      projectIdx: 4,
      type: 'mobile',
      assignTo: [4],
      priority: 'urgent',
      status: 'in_progress',
    },
    {
      title: 'Create transaction history view',
      projectIdx: 4,
      type: 'mobile',
      assignTo: [4],
      priority: 'medium',
      status: 'pending',
    },

    // Analytics Dashboard tasks
    {
      title: 'Create data visualization components',
      projectIdx: 5,
      type: 'frontend',
      assignTo: [0],
      priority: 'high',
      status: 'in_progress',
    },
    {
      title: 'Implement real-time updates',
      projectIdx: 5,
      type: 'frontend',
      assignTo: [8],
      priority: 'medium',
      status: 'pending',
    },
    {
      title: 'Add export to PDF feature',
      projectIdx: 5,
      type: 'frontend',
      assignTo: [0, 8],
      priority: 'low',
      status: 'pending',
    },

    // Legacy Migration tasks
    {
      title: 'Analyze monolith dependencies',
      projectIdx: 6,
      type: 'backend',
      assignTo: [1, 9],
      priority: 'urgent',
      status: 'completed',
    },
    {
      title: 'Break down into microservices',
      projectIdx: 6,
      type: 'backend',
      assignTo: [1],
      priority: 'high',
      status: 'in_progress',
    },
    {
      title: 'Setup service mesh',
      projectIdx: 6,
      type: 'devops',
      assignTo: [3],
      priority: 'high',
      status: 'pending',
    },
    {
      title: 'Database migration strategy',
      projectIdx: 6,
      type: 'database',
      assignTo: [6],
      priority: 'urgent',
      status: 'in_progress',
    },

    // Employee Portal tasks (completed project)
    {
      title: 'Add employee directory search',
      projectIdx: 7,
      type: 'frontend',
      assignTo: [0],
      priority: 'medium',
      status: 'completed',
    },
    {
      title: 'Implement leave management',
      projectIdx: 7,
      type: 'frontend',
      assignTo: [8],
      priority: 'high',
      status: 'completed',
    },
    {
      title: 'Create attendance tracking',
      projectIdx: 7,
      type: 'frontend',
      assignTo: [0],
      priority: 'high',
      status: 'completed',
    },
  ];

  for (const taskData of tasksData) {
    const project = projects[taskData.projectIdx];
    const assignedEmployees = taskData.assignTo.map((idx) => employees[idx].id);

    const isCompleted = taskData.status === 'completed';
    const completionData = isCompleted
      ? {
          completedById: assignedEmployees[0],
          verifiedByBossId: boss.id,
          completedAt: new Date(
            Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000,
          ),
          verifiedAt: new Date(
            Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000,
          ),
          completionCommitSha: Math.random().toString(36).substring(2, 9),
          completionCommitUrl: `https://github.com/techvision/repo/commit/${Math.random().toString(36).substring(2, 9)}`,
          completionCommitMessage: `feat: ${taskData.title.toLowerCase()}`,
        }
      : {};

    const task = await prisma.task.create({
      data: {
        title: taskData.title,
        description: `Detailed description for: ${taskData.title}`,
        startDate: new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
        ),
        closeDate: new Date(
          Date.now() + Math.random() * 60 * 24 * 60 * 60 * 1000,
        ),
        taskType: taskData.type,
        status: taskData.status,
        priority: taskData.priority,
        projectId: project.id,
        companyId: company.id,
        createdById: boss.id,
        assignedToIds: assignedEmployees,
        ...completionData,
      },
    });
    taskCount++;
    console.log(`  ✓ Created: ${task.title} (${task.status})`);
  }
  console.log(`✅ ${taskCount} Tasks created\n`);

  // 7. Create some chat messages
  console.log('💬 Creating 15 Chat Messages...');
  const messages = [
    {
      projectIdx: 0,
      senderId: boss.id,
      message: 'Great progress on the e-commerce redesign! Keep it up team.',
    },
    {
      projectIdx: 0,
      senderId: employees[0].id,
      message: 'Thank you! Working on the cart functionality now.',
    },
    {
      projectIdx: 1,
      senderId: boss.id,
      message: 'The API gateway is looking solid. Nice work!',
    },
    {
      projectIdx: 1,
      senderId: employees[1].id,
      message: 'Authentication is complete. Moving to documentation.',
    },
    {
      projectIdx: 2,
      senderId: employees[2].id,
      message: 'ML model training is in progress, ETA 2 days.',
    },
    {
      projectIdx: 3,
      senderId: employees[3].id,
      message: 'K8s cluster is up! Setting up monitoring next.',
    },
    {
      projectIdx: 4,
      senderId: boss.id,
      message: 'Mobile app is looking great! Users will love it.',
      isPinned: true,
    },
    {
      projectIdx: 4,
      senderId: employees[4].id,
      message: 'Thanks! Biometric auth is almost done.',
    },
    {
      projectIdx: 5,
      senderId: employees[0].id,
      message: 'Dashboard charts are rendering beautifully!',
    },
    {
      projectIdx: 6,
      senderId: employees[1].id,
      message: 'Microservices breakdown completed, ready for review.',
    },
    {
      projectIdx: 6,
      senderId: employees[6].id,
      message: 'Database migration strategy documented.',
    },
    {
      projectIdx: 7,
      senderId: boss.id,
      message: 'Employee portal is complete! Great job everyone!',
      isPinned: true,
    },
    {
      projectIdx: 0,
      senderId: employees[8].id,
      message: 'Checkout flow UI mockups ready for review.',
    },
    {
      projectIdx: 1,
      senderId: employees[9].id,
      message: 'API docs are 80% complete.',
    },
    {
      projectIdx: 3,
      senderId: employees[3].id,
      message: 'Auto-scaling is working perfectly!',
    },
  ];

  for (const msgData of messages) {
    const project = projects[msgData.projectIdx];
    await prisma.projectChat.create({
      data: {
        message: msgData.message,
        projectId: project.id,
        senderId: msgData.senderId,
        isPinned: msgData.isPinned || false,
        pinnedBy: msgData.isPinned ? boss.id : null,
        pinnedAt: msgData.isPinned ? new Date() : null,
      },
    });
  }
  console.log(`✅ ${messages.length} Chat messages created\n`);

  // 8. Create Audit Logs
  console.log('📜 Creating Audit Logs...');
  await prisma.auditLog.create({
    data: {
      userId: boss.id,
      action: 'REGISTER',
      resource: 'User',
      metadata: JSON.stringify({ email: boss.email, role: 'BOSS' }),
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    },
  });

  for (let i = 0; i < 3; i++) {
    await prisma.auditLog.create({
      data: {
        userId: employees[i].id,
        action: 'EMPLOYEE_CREATED',
        resource: 'User',
        metadata: JSON.stringify({
          email: employees[i].email,
          createdBy: boss.email,
        }),
        ipAddress: '192.168.1.2',
        userAgent: 'Mozilla/5.0',
      },
    });
  }
  console.log('✅ Audit logs created\n');

  // Summary
  console.log('═══════════════════════════════════════════════');
  console.log('🎉 SEED COMPLETED SUCCESSFULLY!');
  console.log('═══════════════════════════════════════════════');
  console.log('\n📊 Summary:');
  console.log(`  👑 BOSS Account: ${boss.email}`);
  console.log(`  🏢 Company: ${company.name}`);
  console.log(`  👥 Employees: ${employees.length}`);
  console.log(`  🏢 Teams: ${teams.length}`);
  console.log(`  📁 Projects: ${projects.length}`);
  console.log(`  📋 Tasks: ${taskCount}`);
  console.log(`  💬 Chat Messages: ${messages.length}`);
  console.log('\n🔑 Login Credentials:');
  console.log('  BOSS:');
  console.log(`    Email: vaghanishivam83@gmail.com`);
  console.log(`    Password: Shivam9090@@`);
  console.log('\n  Employees (all have same password):');
  console.log(`    Password: Employee123!`);
  console.log(`    Example: rahul.sharma@techvision.com`);
  console.log('\n═══════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
