import { prisma } from "./client";

async function main() {
  console.log("🌱 Executando seed...");

  const categorias = [
    { id: "cat_1", nome: "Bebidas",      icone: "cafe-outline",         cor: "#7c3aed" },
    { id: "cat_2", nome: "Alimentos",    icone: "fast-food-outline",    cor: "#059669" },
    { id: "cat_3", nome: "Limpeza",      icone: "sparkles-outline",     cor: "#0284c7" },
    { id: "cat_4", nome: "Eletrônicos",  icone: "hardware-chip-outline", cor: "#d97706" },
    { id: "cat_5", nome: "Papelaria",    icone: "document-outline",     cor: "#db2777" },
  ];

  for (const cat of categorias) {
    await prisma.categoria.upsert({
      where: { id: cat.id },
      update: cat,
      create: cat,
    });
  }

  console.log("✅ Seed concluído! 5 categorias criadas.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });