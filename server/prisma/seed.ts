import { getPrisma } from "../src/prisma.js";
import bcrypt from "bcryptjs";

async function main() {
  const prisma = getPrisma();
  const defaultPasswordHash = await bcrypt.hash("Password123!", 10);

  // 1. Seed Categories (4 required categories)
  const categories = [
    "Account and Access",
    "Hardware",
    "Software",
    "Network",
  ];

  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log("Categories seeded: 4 categories.");

  // 2. Seed Related Systems (7 realistic related systems)
  const relatedSystems = [
    "Email",
    "Campus Wi-Fi",
    "VPN",
    "LEB2 App",
    "Grade Submission App",
    "Printer",
    "Corporate Laptop",
  ];

  for (const name of relatedSystems) {
    await prisma.relatedSystem.upsert({
      where: { name },
      update: { active: true },
      create: { name, active: true },
    });
  }
  console.log("Related Systems seeded: 7 systems.");

  // 3. Seed Users (Requesters, IT Staff, Administrators)
  const users = [
    // Administrator
    {
      name: "Alice Admin",
      email: "admin@toktick.local",
      role: "Administrator" as const,
      passwordHash: defaultPasswordHash,
      isActive: true,
      mustChangePassword: true,
    },
    // IT Staff
    {
      name: "Charlie Staff",
      email: "charlie.staff@toktick.local",
      role: "IT_Staff" as const,
      passwordHash: defaultPasswordHash,
      isActive: true,
      mustChangePassword: true,
    },
    {
      name: "Bob Support",
      email: "bob.staff@toktick.local",
      role: "IT_Staff" as const,
      passwordHash: defaultPasswordHash,
      isActive: true,
      mustChangePassword: true,
    },
    {
      name: "Alex Helpdesk",
      email: "alex.staff@toktick.local",
      role: "IT_Staff" as const,
      passwordHash: defaultPasswordHash,
      isActive: true,
      mustChangePassword: true,
    },
    // Requesters
    {
      name: "Sarah Johnson",
      email: "sarah.requester@toktick.local",
      role: "Requester" as const,
      passwordHash: defaultPasswordHash,
      isActive: true,
      mustChangePassword: true,
    },
    {
      name: "Jennifer Anderson",
      email: "jennifer.anderson@toktick.local",
      role: "Requester" as const,
      passwordHash: defaultPasswordHash,
      isActive: true,
      mustChangePassword: true,
    },
    {
      name: "Michael Brown",
      email: "michael.brown@toktick.local",
      role: "Requester" as const,
      passwordHash: defaultPasswordHash,
      isActive: true,
      mustChangePassword: true,
    },
    {
      name: "David Lee",
      email: "david.lee@toktick.local",
      role: "Requester" as const,
      passwordHash: defaultPasswordHash,
      isActive: true,
      mustChangePassword: true,
    },
    {
      name: "Nara Kosiyaporn",
      email: "nara.kosi@kmutt.ac.th",
      role: "Requester" as const,
      passwordHash: defaultPasswordHash,
      isActive: true,
      mustChangePassword: false, // Student account ready without forced change
    },
    {
      name: "Sunny farmhouse",
      email: "nara2012sun@gmail.com",
      role: "Requester" as const,
      passwordHash: defaultPasswordHash,
      isActive: true,
      mustChangePassword: false,
    },
    // Inactive Accounts
    {
      name: "Inactive User",
      email: "inactive.user@toktick.local",
      role: "Requester" as const,
      passwordHash: defaultPasswordHash,
      isActive: false,
      mustChangePassword: true,
    },
    {
      name: "Retired Staff",
      email: "retired.staff@toktick.local",
      role: "IT_Staff" as const,
      passwordHash: defaultPasswordHash,
      isActive: false,
      mustChangePassword: true,
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        isActive: u.isActive,
        mustChangePassword: u.mustChangePassword,
      },
      create: u,
    });

    // Also populate legacy Requester table if Requester
    if (u.role === "Requester") {
      await prisma.requester.upsert({
        where: { email: u.email },
        update: { name: u.name, active: u.isActive },
        create: { name: u.name, email: u.email, active: u.isActive },
      });
    }
  }
  console.log("Users seeded: 1 Admin, 3 IT Staff, 6 Requesters, 2 Inactive accounts.");

  // 4. Seed Initial Sample Tickets for Staff Queue Testing
  const sarah = await prisma.user.findUnique({ where: { email: "sarah.requester@toktick.local" } });
  const charlie = await prisma.user.findUnique({ where: { email: "charlie.staff@toktick.local" } });
  const bob = await prisma.user.findUnique({ where: { email: "bob.staff@toktick.local" } });
  const catNetwork = await prisma.category.findUnique({ where: { name: "Network" } });
  const catHardware = await prisma.category.findUnique({ where: { name: "Hardware" } });
  const catSoftware = await prisma.category.findUnique({ where: { name: "Software" } });
  const sysVpn = await prisma.relatedSystem.findUnique({ where: { name: "VPN" } });
  const sysLaptop = await prisma.relatedSystem.findUnique({ where: { name: "Corporate Laptop" } });
  const sysEmail = await prisma.relatedSystem.findUnique({ where: { name: "Email" } });

  if (sarah && catNetwork && sysVpn && charlie) {
    const t1 = await prisma.ticket.upsert({
      where: { ticketNumber: "TCK-20260901-0001" },
      update: {},
      create: {
        ticketNumber: "TCK-20260901-0001",
        summary: "VPN disconnecting intermittently during peak hours",
        description: "Whenever I connect to the corporate VPN from home between 2 PM and 4 PM, connection drops every 5-10 minutes.",
        priority: "High",
        itPriority: "High",
        status: "In_Progress",
        requesterId: sarah.id,
        categoryId: catNetwork.id,
        relatedSystemId: sysVpn.id,
        assignedToId: charlie.id,
      },
    });

    // Add public comment
    const existingComment = await prisma.publicComment.findFirst({ where: { ticketId: t1.id } });
    if (!existingComment) {
      await prisma.publicComment.create({
        data: {
          ticketId: t1.id,
          userId: charlie.id,
          content: "We reviewed the VPN gateway logs and spotted high packet loss. We are updating the route table now.",
        },
      });
    }

    // Add confidential internal note
    const existingNote = await prisma.internalNote.findFirst({ where: { ticketId: t1.id } });
    if (!existingNote) {
      await prisma.internalNote.create({
        data: {
          ticketId: t1.id,
          userId: charlie.id,
          content: "Gateway 4 router firmware needs upgrade tonight during maintenance window.",
        },
      });
    }
  }

  if (sarah && catHardware && sysLaptop && bob) {
    await prisma.ticket.upsert({
      where: { ticketNumber: "TCK-20260902-0002" },
      update: {},
      create: {
        ticketNumber: "TCK-20260902-0002",
        summary: "Laptop battery draining in less than 45 minutes",
        description: "The Dell Latitude battery level drops rapidly from 100% to 15% without heavy workload.",
        priority: "Medium",
        itPriority: "Medium",
        status: "Assigned",
        requesterId: sarah.id,
        categoryId: catHardware.id,
        relatedSystemId: sysLaptop.id,
        assignedToId: bob.id,
      },
    });
  }

  if (sarah && catSoftware && sysEmail) {
    await prisma.ticket.upsert({
      where: { ticketNumber: "TCK-20260903-0003" },
      update: {},
      create: {
        ticketNumber: "TCK-20260903-0003",
        summary: "Outlook search indexing failure after macOS update",
        description: "Cannot search any emails older than one week in the desktop client.",
        priority: "Low",
        status: "New",
        requesterId: sarah.id,
        categoryId: catSoftware.id,
        relatedSystemId: sysEmail.id,
      },
    });
  }

  console.log("Sample tickets, comments, and internal notes seeded.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
