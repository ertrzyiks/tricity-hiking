import { getCollection } from "astro:content";
import fs from "fs";

export const prerender = true;

export async function getStaticPaths() {
  const allRoutes = await getCollection("routes");

  const routes = allRoutes.filter((route) => {
    return !route.data.draft;
  });

  return routes.map((route) => {
    return {
      params: {
        route: route.id,
      },
    };
  });
}
export function GET({ params }: { params: { route: string } }) {
  const name = params.route;
  const gpx = fs.readFileSync(
    `./src/content/routes/${name}/${name}.gpx`,
    "utf-8",
  );

  return new Response(gpx, {
    headers: {
      "Content-Type": "application/gpx+xml",
    },
  });
}
