import { drizzle } from "drizzle-orm/mysql2";
import { ticketTypes } from "./drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);

const types = [
  { name: "Inteira", description: "Ingresso inteira", price: 100.0 },
  { name: "Meia-entrada", description: "Meia-entrada (estudante/idoso)", price: 50.0 },
  { name: "Cortesia", description: "Ingresso cortesia", price: 0.0 },
  { name: "Entrada", description: "Acesso restaurante", price: 40.0 },
];

for (const type of types) {
  await db.insert(ticketTypes).values(type).onDuplicateKeyUpdate({ set: { name: type.name } });
}

console.log("✓ Tipos de ingressos inseridos com sucesso");
process.exit(0);
