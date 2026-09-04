import { getPrisma } from "../src/prisma.js";

async function main() {
  const prisma = getPrisma();

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

  // 2. Seed Related Systems (>=6 realistic related systems)
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

  // 3. Seed Development Requesters (at least 4 active, 1 inactive)
  const requesters = [
    {
      name: "Jennifer Anderson",
      email: "jennifer.anderson@example.com",
      active: true,
    },
    {
      name: "Michael Brown",
      email: "michael.brown@example.com",
      active: true,
    },
    {
      name: "Sarah Johnson",
      email: "sarah.johnson@example.com",
      active: true,
    },
    {
      name: "David Lee",
      email: "david.lee@example.com",
      active: true,
    },
    {
      name: "Inactive Tester",
      email: "inactive.tester@example.com",
      active: false,
    },
  ];

  for (const r of requesters) {
    await prisma.requester.upsert({
      where: { email: r.email },
      update: { name: r.name, active: r.active },
      create: r,
    });
  }
  console.log("Development Requesters seeded: 4 active, 1 inactive.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
