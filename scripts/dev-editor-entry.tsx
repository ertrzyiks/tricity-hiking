import { render } from "preact";
import "../src/styles/base.css";
import { GermanNamesEditor } from "../src/components/ui/GermanNamesEditor/GermanNamesEditor";

// Mount script for the /dev/german-names/ editor page, served directly by
// Vite dev middleware (see german-names-dev-editor.js) rather than through
// an Astro page - living outside src/pages keeps Astro's build from ever
// discovering (and bundling a chunk for) this component, which is the only
// way to guarantee it has zero footprint in `astro build`'s output, not
// just a route that renders nothing.
const root = document.getElementById("root");
if (root) {
  render(<GermanNamesEditor />, root);
}
