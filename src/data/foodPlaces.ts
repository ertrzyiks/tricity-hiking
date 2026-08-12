// Shared with src/pages/food.astro and the Food section of the single-scroll
// homepage (src/pages/index.astro) so both read from one source of truth.
export const foodCategoryIcons: Record<string, string> = {
  Breakfast: "mdi:silverware",
  "Lunch/Dinner": "mdi:silverware-fork-knife",
  Cafe: "mdi:coffee",
};

export type FoodPlace = {
  name: string;
  link: string;
  kind: keyof typeof foodCategoryIcons;
  location: string;
};

export const foodPlaces: FoodPlace[] = [
  {
    name: "Avocado",
    link: "https://avocadovegan.pl/",
    kind: "Breakfast",
    location: "Gdańsk",
  },
  {
    name: "Marmolada Chleb i Kawa",
    link: "https://marmoladachlebikawa.pl/",
    kind: "Breakfast",
    location: "Gdańsk",
  },
  {
    name: "Pomelo",
    link: "https://www.pomelogdansk.pl/",
    kind: "Breakfast",
    location: "Gdańsk",
  },
  {
    name: "Pasta miasta",
    link: "https://www.pastamiasta.pl/",
    kind: "Lunch/Dinner",
    location: "Gdynia",
  },
  {
    name: "Hellas Gyradiko",
    link: "https://hellasgyradiko.eatbu.com/?lang=pl",
    kind: "Lunch/Dinner",
    location: "Gdynia",
  },
  {
    name: "Sumo Ramen",
    link: "https://www.facebook.com/p/SUMO-RAMEN-100027868855912/?locale=pl_PL",
    kind: "Lunch/Dinner",
    location: "Gdynia",
  },
  {
    name: "A Modo Mio",
    link: "https://www.facebook.com/p/A-Modo-Mio-da-Ciro-100069903701638/",
    kind: "Lunch/Dinner",
    location: "Sopot",
  },
  {
    name: "Pak Choi",
    link: "http://www.restauracjapakchoi.pl/",
    kind: "Lunch/Dinner",
    location: "Sopot",
  },
  {
    name: "Phuket - Thai Food & Bar",
    link: "https://www.facebook.com/phuketsopot/",
    kind: "Lunch/Dinner",
    location: "Sopot",
  },
  {
    name: "la nostra pizzeria",
    link: "https://www.facebook.com/Sopotlanostrapizzeria/",
    kind: "Lunch/Dinner",
    location: "Sopot",
  },
  {
    name: "Flaming & Co",
    link: "https://flaming-co.com/",
    kind: "Cafe",
    location: "Sopot",
  },
  {
    name: "Santa Cafe",
    link: "https://www.facebook.com/santacafe2020/",
    kind: "Cafe",
    location: "Sopot",
  },
  {
    name: "KAISER Patisserie",
    link: "https://kaiserpatisserie.pl/sopot/",
    kind: "Cafe",
    location: "Sopot",
  },
  {
    name: "Ancymon",
    link: "https://www.ancymoncafe.com/",
    kind: "Cafe",
    location: "Gdańsk",
  },
];
