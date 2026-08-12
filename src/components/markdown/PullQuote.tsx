interface Props {
  quote: string;
}

export const PullQuote = ({ quote }: Props) => {
  return (
    <blockquote className="font-display my-6 border-l-4 border-green-600 pl-5 text-2xl leading-snug text-slate-800 italic lg:text-3xl">
      {quote}
    </blockquote>
  );
};
