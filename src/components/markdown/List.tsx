import type { ComponentChildren } from "preact";

interface Props {
  children: ComponentChildren;
}
export const List = ({ children }: Props) => {
  return <ul class="list-disc list-inside my-2">{children}</ul>;
};

export const ListItem = ({ children }: Props) => {
  return <li class="my-1">{children}</li>;
};
