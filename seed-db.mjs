import { drizzle } from "drizzle-orm/mysql2";
import { ticketTypes } from "./drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);

async function seed() {
  console.log("Seeding database...");

  // Inserir tipos de ingressos
  await db.insert(ticketTypes).values([
    {
      name: "Inteira",
      description: "Ingresso inteira",
      price: 10000, // R$ 100,00
    },
    {
      name: "Meia-entrada",
      description: "Meia-entrada (estudante/idoso)",
      price: 5000, // R$ 50,00
    },
    {
      name: "Cortesia",
      description: "Ingresso cortesia",
      price: 0,
    },
  ]);

  console.log("Database seeded successfully!");
}

seed().catch(console.error);
