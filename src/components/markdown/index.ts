import { Heading1, Heading2, Heading3 } from "./Headings";
import { Paragraph } from "./Paragraph";
import { Link } from "./Link";
import { Mark } from "./Mark";
import { List, ListItem } from "./List";

export const config = {
  h1: Heading1,
  h2: Heading2,
  h3: Heading3,
  ul: List,
  li: ListItem,
  p: Paragraph,
  a: Link,
  em: Mark,
};
