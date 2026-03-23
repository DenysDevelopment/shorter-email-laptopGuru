import { prisma } from "../src/lib/db";
import { detectCategory } from "../src/lib/parser";

async function main() {
  const emails = await prisma.incomingEmail.findMany({
    where: { category: "other" },
    select: { id: true, body: true, subject: true },
  });

  let updated = 0;
  for (const email of emails) {
    const category = detectCategory(email.body);
    if (category === "lead") {
      await prisma.incomingEmail.update({
        where: { id: email.id },
        data: { category },
      });
      updated++;
    }
  }

  console.log(`Backfill done: ${updated}/${emails.length} emails marked as "lead"`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
