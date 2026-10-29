import { getPrisma } from "../src/prisma.js";
import bcrypt from "bcryptjs";

async function main() {
  const prisma = getPrisma();
  const defaultPasswordHash = await bcrypt.hash("Password123!", 10);

  // 0. Reset PostgreSQL sequences so User and Requester start deterministically at 1
  try {
    await prisma.$executeRawUnsafe(`ALTER SEQUENCE IF EXISTS "User_id_seq" RESTART WITH 1;`);
    await prisma.$executeRawUnsafe(`ALTER SEQUENCE IF EXISTS "Requester_id_seq" RESTART WITH 1;`);
  } catch (err) {
    console.warn("Notice: could not restart sequences:", err);
  }

  // 1. Seed Categories (4 standard categories)
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
    // Requesters (Seeded first with explicit IDs 1-5 to align with legacy test contracts)
    {
      id: 1,
      name: "Nara Kosiyaporn",
      email: "nara.kosi@kmutt.ac.th",
      role: "Requester" as const,
      passwordHash: defaultPasswordHash,
      isActive: true,
      mustChangePassword: false,
    },
    {
      id: 2,
      name: "Sunny farmhouse",
      email: "nara2012sun@gmail.com",
      role: "Requester" as const,
      passwordHash: defaultPasswordHash,
      isActive: true,
      mustChangePassword: false,
    },
    {
      id: 3,
      name: "Jennifer Anderson",
      email: "jennifer.anderson@example.com",
      role: "Requester" as const,
      passwordHash: defaultPasswordHash,
      isActive: true,
      mustChangePassword: true,
    },
    {
      id: 4,
      name: "Michael Brown",
      email: "michael.brown@example.com",
      role: "Requester" as const,
      passwordHash: defaultPasswordHash,
      isActive: true,
      mustChangePassword: true,
    },
    {
      id: 5,
      name: "Inactive Tester",
      email: "inactive.tester@example.com",
      role: "Requester" as const,
      passwordHash: defaultPasswordHash,
      isActive: false,
      mustChangePassword: true,
    },
    // Administrator
    {
      id: 6,
      name: "Alice Admin",
      email: "admin@toktick.local",
      role: "Administrator" as const,
      passwordHash: defaultPasswordHash,
      isActive: true,
      mustChangePassword: false,
    },
    {
      id: 7,
      name: "Admin User",
      email: "admin@toktickit.com",
      role: "Administrator" as const,
      passwordHash: defaultPasswordHash,
      isActive: true,
      mustChangePassword: false,
    },
    // IT Staff
    {
      id: 8,
      name: "Charlie Staff",
      email: "charlie.staff@toktick.local",
      role: "IT_Staff" as const,
      passwordHash: defaultPasswordHash,
      isActive: true,
      mustChangePassword: false,
    },
    {
      id: 9,
      name: "Bob Smith",
      email: "bob.smith@example.com",
      role: "IT_Staff" as const,
      passwordHash: defaultPasswordHash,
      isActive: true,
      mustChangePassword: false,
    },
    {
      id: 10,
      name: "Bob Support",
      email: "bob.staff@toktick.local",
      role: "IT_Staff" as const,
      passwordHash: defaultPasswordHash,
      isActive: true,
      mustChangePassword: true,
    },
    {
      id: 11,
      name: "Alex Helpdesk",
      email: "alex.staff@toktick.local",
      role: "IT_Staff" as const,
      passwordHash: defaultPasswordHash,
      isActive: true,
      mustChangePassword: true,
    },
    // Additional Requesters
    {
      id: 12,
      name: "Sarah Johnson",
      email: "sarah.requester@toktick.local",
      role: "Requester" as const,
      passwordHash: defaultPasswordHash,
      isActive: true,
      mustChangePassword: true,
    },
    {
      id: 13,
      name: "Alice Johnson",
      email: "alice.johnson@example.com",
      role: "Requester" as const,
      passwordHash: defaultPasswordHash,
      isActive: true,
      mustChangePassword: false,
    },
    {
      id: 14,
      name: "David Lee",
      email: "david.lee@toktick.local",
      role: "Requester" as const,
      passwordHash: defaultPasswordHash,
      isActive: true,
      mustChangePassword: true,
    },
    // Inactive Accounts
    {
      id: 15,
      name: "Inactive User",
      email: "inactive.user@toktick.local",
      role: "Requester" as const,
      passwordHash: defaultPasswordHash,
      isActive: false,
      mustChangePassword: true,
    },
    {
      id: 16,
      name: "Retired Staff",
      email: "retired.staff@toktick.local",
      role: "IT_Staff" as const,
      passwordHash: defaultPasswordHash,
      isActive: false,
      mustChangePassword: true,
    },
  ];

  let reqSeq = 1;
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        passwordHash: u.passwordHash,
        isActive: u.isActive,
        mustChangePassword: u.mustChangePassword,
      },
      create: {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        passwordHash: u.passwordHash,
        isActive: u.isActive,
        mustChangePassword: u.mustChangePassword,
      },
    });

    // Also populate legacy Requester table if Requester
    if (u.role === "Requester") {
      const requesterId = reqSeq++;
      await prisma.requester.upsert({
        where: { email: u.email },
        update: { name: u.name, active: u.isActive },
        create: {
          id: requesterId,
          name: u.name,
          email: u.email,
          active: u.isActive,
        },
      });
    }
  }

  console.log("Users seeded: 2 Admins, 4 IT Staff, 8 Requesters, 2 Inactive accounts.");

  // Fetch Lookups for Tickets & Actions Seeding
  const usersByEmail = new Map<string, { id: number }>();
  const allUsers = await prisma.user.findMany();
  for (const u of allUsers) {
    usersByEmail.set(u.email, u);
  }

  const catMap = new Map<string, number>();
  const allCats = await prisma.category.findMany();
  for (const c of allCats) {
    catMap.set(c.name, c.id);
  }

  const sysMap = new Map<string, number>();
  const allSys = await prisma.relatedSystem.findMany();
  for (const s of allSys) {
    sysMap.set(s.name, s.id);
  }

  const sarah = usersByEmail.get("sarah.requester@toktick.local")!;
  const alice = usersByEmail.get("alice.johnson@example.com")!;
  const jennifer = usersByEmail.get("jennifer.anderson@example.com")!;
  const michael = usersByEmail.get("michael.brown@example.com")!;
  const david = usersByEmail.get("david.lee@toktick.local")!;
  const nara = usersByEmail.get("nara.kosi@kmutt.ac.th")!;

  const charlie = usersByEmail.get("charlie.staff@toktick.local")!;
  const bob = usersByEmail.get("bob.staff@toktick.local")!;
  const bobSmith = usersByEmail.get("bob.smith@example.com")!;
  const alex = usersByEmail.get("alex.staff@toktick.local")!;

  // 4. Seed Tickets with Lifecycle Variants & Multi-Status Distribution
  const ticketDefs = [
    // Ticket 1: In_Progress with MULTIPLE actions by DIFFERENT staff members
    {
      ticketNumber: "TCK-20260901-0001",
      summary: "VPN disconnecting intermittently during peak hours",
      description: "Whenever I connect to the corporate VPN from home between 2 PM and 4 PM, connection drops every 5-10 minutes.",
      priority: "High",
      itPriority: "High",
      status: "In_Progress",
      version: 3,
      resolvedIndicated: false,
      requesterId: sarah.id,
      categoryId: catMap.get("Network")!,
      relatedSystemId: sysMap.get("VPN")!,
      assignedToId: charlie.id,
      actions: [
        {
          performedById: charlie.id,
          actionDateTime: new Date(Date.now() - 3 * 3600 * 1000), // 3 hours ago
          description: "Analyzed gateway 4 routing tables and packet capture under peak traffic load.",
          result: "Identified MTU mismatch and high packet fragmentation causing TCP session resets.",
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: "gateway4_pcap_analysis.txt",
        },
        {
          performedById: bobSmith.id,
          actionDateTime: new Date(Date.now() - 1 * 3600 * 1000), // 1 hour ago
          description: "Adjusted router MSS clamping to 1360 bytes on interface vlan100 and tested tunnel latency.",
          result: "Packet drop reduced from 14% to 0.1% over 30-minute sampling.",
          followUpRequired: true,
          followUpNote: "Requested requester to test prolonged video streaming and confirm zero disconnects.",
          attachmentNotes: "mss_clamping_config.patch",
        },
      ],
      comment: "We reviewed the VPN gateway logs and spotted high packet loss. We are updating the route table now.",
      note: "Gateway 4 router firmware needs upgrade tonight during maintenance window.",
    },
    // Ticket 2: Open with ONE action taken
    {
      ticketNumber: "TCK-20260902-0002",
      summary: "Laptop battery draining in less than 45 minutes",
      description: "The Dell Latitude battery level drops rapidly from 100% to 15% without heavy workload.",
      priority: "Medium",
      itPriority: "Medium",
      status: "Open",
      version: 2,
      resolvedIndicated: false,
      requesterId: sarah.id,
      categoryId: catMap.get("Hardware")!,
      relatedSystemId: sysMap.get("Corporate Laptop")!,
      assignedToId: bob.id,
      actions: [
        {
          performedById: bob.id,
          actionDateTime: new Date(Date.now() - 4 * 3600 * 1000),
          description: "Ran battery diagnostic test in BIOS UEFI diagnostics utility.",
          result: "Battery health reported at 54% with cycle count 892. Chemistry degradation confirmed.",
          followUpRequired: true,
          followUpNote: "Awaiting user drop-off at Helpdesk Room 302 for battery replacement module swap.",
          attachmentNotes: "dell_battery_report.xml",
        },
      ],
      comment: null,
      note: null,
    },
    // Ticket 3: New with ZERO actions taken (Demonstrates clean initial state)
    {
      ticketNumber: "TCK-20260903-0003",
      summary: "Outlook search indexing failure after macOS update",
      description: "Cannot search any emails older than one week in the desktop client.",
      priority: "Low",
      itPriority: null,
      status: "New",
      version: 1,
      resolvedIndicated: false,
      requesterId: sarah.id,
      categoryId: catMap.get("Software")!,
      relatedSystemId: sysMap.get("Email")!,
      assignedToId: null,
      actions: [],
      comment: null,
      note: null,
    },
    // Ticket 4: Resolved with 2 Actions Taken and resolution indicated
    {
      ticketNumber: "TCK-20260904-0004",
      summary: "Cannot access LEB2 student portal via campus single sign-on",
      description: "Getting HTTP 500 error on callback from auth.kmutt.ac.th to LEB2 application.",
      priority: "High",
      itPriority: "High",
      status: "Resolved",
      version: 3,
      resolvedIndicated: true,
      requesterId: jennifer.id,
      categoryId: catMap.get("Account and Access")!,
      relatedSystemId: sysMap.get("LEB2 App")!,
      assignedToId: charlie.id,
      actions: [
        {
          performedById: charlie.id,
          actionDateTime: new Date(Date.now() - 8 * 3600 * 1000),
          description: "Investigated OAuth2 callback timeout logs in auth proxy container.",
          result: "Identified expired client secret in identity provider configuration.",
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: null,
        },
        {
          performedById: charlie.id,
          actionDateTime: new Date(Date.now() - 6 * 3600 * 1000),
          description: "Rotated OAuth2 secret and refreshed metadata cache across ingress cluster.",
          result: "SSO handshake succeeded; user successfully authenticated into LEB2 dashboard.",
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: "oauth_rotation_audit.log",
        },
      ],
      comment: "The authentication secret was refreshed. Please attempt login again.",
      note: "Renewed client secret valid until 2027-10-31.",
    },
    // Ticket 5: Closed with ONE Action Taken
    {
      ticketNumber: "TCK-20260905-0005",
      summary: "Paper jam in 3rd floor department multifunction printer",
      description: "Paper jammed near roller tray 2, displaying error code 13.02.",
      priority: "Low",
      itPriority: "Low",
      status: "Closed",
      version: 2,
      resolvedIndicated: true,
      requesterId: jennifer.id,
      categoryId: catMap.get("Hardware")!,
      relatedSystemId: sysMap.get("Printer")!,
      assignedToId: alex.id,
      actions: [
        {
          performedById: alex.id,
          actionDateTime: new Date(Date.now() - 24 * 3600 * 1000),
          description: "Opened paper pathway, removed crumpled sheet from feed roller, and cleaned optical sensors with isopropyl alcohol.",
          result: "Ran self-test diagnostic print; 5 consecutive test pages fed without misfeed.",
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: null,
        },
      ],
      comment: "Printer roller cleaned and test pages completed.",
      note: null,
    },
    // Ticket 6: Waiting_for_Requester with Follow-up Action
    {
      ticketNumber: "TCK-20260906-0006",
      summary: "Grade submission spreadsheet import fails with encoding error",
      description: "Import tool throws 'Invalid character sequence at line 42' when uploading final exam grades.",
      priority: "Critical",
      itPriority: "Critical",
      status: "Waiting_for_Requester",
      version: 2,
      resolvedIndicated: false,
      requesterId: michael.id,
      categoryId: catMap.get("Software")!,
      relatedSystemId: sysMap.get("Grade Submission App")!,
      assignedToId: bobSmith.id,
      actions: [
        {
          performedById: bobSmith.id,
          actionDateTime: new Date(Date.now() - 5 * 3600 * 1000),
          description: "Inspected uploaded CSV file headers and byte order mark (BOM) in hex editor.",
          result: "File saved with UTF-16 LE BOM instead of UTF-8, breaking CSV parser parser.",
          followUpRequired: true,
          followUpNote: "Please re-export CSV from Excel choosing 'CSV UTF-8 (Comma delimited) (*.csv)' and re-upload.",
          attachmentNotes: "encoding_conversion_guide.pdf",
        },
      ],
      comment: "We diagnosed the file encoding issue. Please review the attached guide to re-export as UTF-8.",
      note: "CSV parser could be hardened in future sprint to detect UTF-16 BOM automatically.",
    },
    // Ticket 7: Reopened ticket with actions from multiple staff
    {
      ticketNumber: "TCK-20260907-0007",
      summary: "Wi-Fi disconnection issues in Classroom Building CB2",
      description: "Disconnects immediately upon entering 3rd floor seminar rooms.",
      priority: "Medium",
      itPriority: "Medium",
      status: "Reopened",
      version: 3,
      resolvedIndicated: false,
      requesterId: david.id,
      categoryId: catMap.get("Network")!,
      relatedSystemId: sysMap.get("Campus Wi-Fi")!,
      assignedToId: charlie.id,
      actions: [
        {
          performedById: charlie.id,
          actionDateTime: new Date(Date.now() - 48 * 3600 * 1000),
          description: "Re-provisioned 802.1X certificate and verified RADIUS authentication.",
          result: "Device authenticated on 1st floor AP successfully.",
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: null,
        },
        {
          performedById: alex.id,
          actionDateTime: new Date(Date.now() - 2 * 3600 * 1000),
          description: "Investigated recurring disconnect on 3rd floor access point AP-CB2-301.",
          result: "Discovered rogue AP transmitting conflicting SSID on channel 6.",
          followUpRequired: true,
          followUpNote: "Campus Security and Facilities notified to locate and unplug unauthorized rogue router in room 305.",
          attachmentNotes: "rf_spectrum_scan.png",
        },
      ],
      comment: "Ticket reopened following recurrence on 3rd floor. Rogue AP detected and security alerted.",
      note: "Security ticket SEC-2026-992 opened for physical sweep.",
    },
    // Ticket 8: Cancelled ticket with ZERO actions
    {
      ticketNumber: "TCK-20260908-0008",
      summary: "Duplicate request for monitor HDMI adapter",
      description: "Submitted in error; colleague already supplied a working USB-C to HDMI adapter.",
      priority: "Low",
      itPriority: null,
      status: "Cancelled",
      version: 1,
      resolvedIndicated: false,
      requesterId: michael.id,
      categoryId: catMap.get("Hardware")!,
      relatedSystemId: sysMap.get("Corporate Laptop")!,
      assignedToId: null,
      actions: [],
      comment: "Cancelled by requester: duplicate request.",
      note: null,
    },
    // Ticket 9: Open ticket with ZERO actions (Awaiting assignment/action)
    {
      ticketNumber: "TCK-20260909-0009",
      summary: "Mailbox quota exceeded warning on shared department inbox",
      description: "Shared mailbox 'cpe-office@kmutt.ac.th' has reached 49.8 GB out of 50 GB.",
      priority: "High",
      itPriority: "High",
      status: "Open",
      version: 1,
      resolvedIndicated: false,
      requesterId: nara.id,
      categoryId: catMap.get("Account and Access")!,
      relatedSystemId: sysMap.get("Email")!,
      assignedToId: bob.id,
      actions: [],
      comment: null,
      note: null,
    },
  ];

  for (const t of ticketDefs) {
    const ticket = await prisma.ticket.upsert({
      where: { ticketNumber: t.ticketNumber },
      update: {
        summary: t.summary,
        description: t.description,
        priority: t.priority,
        itPriority: t.itPriority,
        status: t.status,
        version: t.version,
        resolvedIndicated: t.resolvedIndicated,
        requesterId: t.requesterId,
        categoryId: t.categoryId,
        relatedSystemId: t.relatedSystemId,
        assignedToId: t.assignedToId,
      },
      create: {
        ticketNumber: t.ticketNumber,
        summary: t.summary,
        description: t.description,
        priority: t.priority,
        itPriority: t.itPriority,
        status: t.status,
        version: t.version,
        resolvedIndicated: t.resolvedIndicated,
        requesterId: t.requesterId,
        categoryId: t.categoryId,
        relatedSystemId: t.relatedSystemId,
        assignedToId: t.assignedToId,
      },
    });

    // Seed Actions Taken idempotently
    for (const act of t.actions) {
      const existingAction = await prisma.actionTaken.findFirst({
        where: {
          ticketId: ticket.id,
          description: act.description,
        },
      });

      if (!existingAction) {
        await prisma.actionTaken.create({
          data: {
            ticketId: ticket.id,
            performedById: act.performedById,
            actionDateTime: act.actionDateTime,
            description: act.description,
            result: act.result,
            followUpRequired: act.followUpRequired,
            followUpNote: act.followUpNote,
            attachmentNotes: act.attachmentNotes,
          },
        });
      }
    }

    // Seed Public Comment if specified and not exists
    if (t.comment && t.assignedToId) {
      const existingComment = await prisma.publicComment.findFirst({
        where: { ticketId: ticket.id, content: t.comment },
      });
      if (!existingComment) {
        await prisma.publicComment.create({
          data: {
            ticketId: ticket.id,
            userId: t.assignedToId,
            content: t.comment,
          },
        });
      }
    }

    // Seed Internal Note if specified and not exists
    if (t.note && t.assignedToId) {
      const existingNote = await prisma.internalNote.findFirst({
        where: { ticketId: ticket.id, content: t.note },
      });
      if (!existingNote) {
        await prisma.internalNote.create({
          data: {
            ticketId: ticket.id,
            userId: t.assignedToId,
            content: t.note,
          },
        });
      }
    }
  }

  // 5. Synchronize all PostgreSQL sequences to MAX(id) after seeding
  try {
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"User"', 'id'), COALESCE((SELECT MAX("id") FROM "User"), 1), true);`);
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Requester"', 'id'), COALESCE((SELECT MAX("id") FROM "Requester"), 1), true);`);
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Ticket"', 'id'), COALESCE((SELECT MAX("id") FROM "Ticket"), 1), true);`);
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"ActionTaken"', 'id'), COALESCE((SELECT MAX("id") FROM "ActionTaken"), 1), true);`);
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Category"', 'id'), COALESCE((SELECT MAX("id") FROM "Category"), 1), true);`);
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"RelatedSystem"', 'id'), COALESCE((SELECT MAX("id") FROM "RelatedSystem"), 1), true);`);
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"PublicComment"', 'id'), COALESCE((SELECT MAX("id") FROM "PublicComment"), 1), true);`);
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"InternalNote"', 'id'), COALESCE((SELECT MAX("id") FROM "InternalNote"), 1), true);`);
    console.log("PostgreSQL sequences synchronized successfully.");
  } catch (err) {
    console.warn("Notice: could not sync sequences after seeding:", err);
  }

  console.log("Database seeded successfully: 9 tickets across 8 statuses, rich Actions Taken, comments, and notes.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
