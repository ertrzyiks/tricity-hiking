import { useEffect, useMemo, useState } from "preact/hooks";

type Category = "street name" | "district name" | "locality name";

type Feature = {
  type: "Feature";
  properties: {
    german: string;
    polish: string;
    category: Category;
    exists: boolean;
  };
  geometry: unknown;
};

type Status = "loading" | "idle" | "saving" | "saved" | "error";

const CATEGORIES: Category[] = [
  "street name",
  "district name",
  "locality name",
];

export const GermanNamesEditor = () => {
  const [features, setFeatures] = useState<Feature[] | null>(null);
  const [saved, setSaved] = useState<Feature[] | null>(null);
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/german-names");
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = await res.json();
      setFeatures(data.features);
      setSaved(data.features);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const dirty =
    features !== null &&
    saved !== null &&
    JSON.stringify(features) !== JSON.stringify(saved);

  const updateField = (
    index: number,
    field: "german" | "polish" | "category" | "exists",
    value: string | boolean,
  ) => {
    setFeatures((prev) => {
      if (!prev) return prev;
      const next = prev.slice();
      next[index] = {
        ...next[index],
        properties: { ...next[index].properties, [field]: value },
      };
      return next;
    });
  };

  const save = async () => {
    if (!features) return;
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/german-names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "FeatureCollection", features }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `${res.status} ${res.statusText}`);
      }
      setSaved(features);
      setStatus("saved");
      setTimeout(() => {
        setStatus((current) => (current === "saved" ? "idle" : current));
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  };

  const visible = useMemo(() => {
    if (!features) return [];
    const needle = filter.trim().toLowerCase();
    return features
      .map((feature, index) => ({ feature, index }))
      .filter(({ feature }) => {
        if (!needle) return true;
        return (
          feature.properties.german.toLowerCase().includes(needle) ||
          feature.properties.polish.toLowerCase().includes(needle)
        );
      });
  }, [features, filter]);

  if (!import.meta.env.DEV) {
    return (
      <p className="text-slate-600">
        This editor is only available in dev mode.
      </p>
    );
  }

  if (status === "loading") {
    return <p className="text-slate-600">Loading…</p>;
  }

  if (status === "error" && !features) {
    return <p className="text-red-600">Failed to load: {error}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 sticky top-0 bg-white/95 backdrop-blur py-2 z-10 border-b border-slate-200">
        <input
          type="text"
          placeholder="Filter by German or Polish name…"
          value={filter}
          onInput={(e) => setFilter((e.target as HTMLInputElement).value)}
          className="border border-slate-300 rounded px-3 py-1.5 text-sm w-72"
        />
        <span className="text-sm text-slate-500">
          {visible.length} / {features?.length ?? 0} entries
        </span>

        <div className="ml-auto flex items-center gap-3">
          {status === "saved" && (
            <span className="text-sm text-green-600">Saved</span>
          )}
          {status === "error" && (
            <span className="text-sm text-red-600">{error}</span>
          )}
          <button
            type="button"
            onClick={load}
            disabled={status === "saving"}
            className="text-sm px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
          >
            Reload
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || status === "saving"}
            className="text-sm px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            {status === "saving" ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b border-slate-300">
            <th className="py-1 pr-2">German</th>
            <th className="py-1 pr-2">Polish</th>
            <th className="py-1 pr-2">Category</th>
            <th className="py-1 pr-2 text-center">Exists</th>
            <th className="py-1 pr-2 text-center">On map</th>
          </tr>
        </thead>
        <tbody>
          {visible.map(({ feature, index }) => (
            <tr key={index} className="border-b border-slate-100">
              <td className="py-1 pr-2">
                <input
                  type="text"
                  value={feature.properties.german}
                  onInput={(e) =>
                    updateField(
                      index,
                      "german",
                      (e.target as HTMLInputElement).value,
                    )
                  }
                  className="border border-slate-200 rounded px-2 py-1 w-full"
                />
              </td>
              <td className="py-1 pr-2">
                <input
                  type="text"
                  value={feature.properties.polish}
                  onInput={(e) =>
                    updateField(
                      index,
                      "polish",
                      (e.target as HTMLInputElement).value,
                    )
                  }
                  className="border border-slate-200 rounded px-2 py-1 w-full"
                />
              </td>
              <td className="py-1 pr-2">
                <select
                  value={feature.properties.category}
                  onChange={(e) =>
                    updateField(
                      index,
                      "category",
                      (e.target as HTMLSelectElement).value,
                    )
                  }
                  className="border border-slate-200 rounded px-2 py-1"
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </td>
              <td className="py-1 pr-2 text-center">
                <input
                  type="checkbox"
                  checked={feature.properties.exists}
                  onChange={(e) =>
                    updateField(
                      index,
                      "exists",
                      (e.target as HTMLInputElement).checked,
                    )
                  }
                />
              </td>
              <td className="py-1 pr-2 text-center">
                {feature.geometry ? (
                  <span className="text-green-600" title="Has geometry">
                    ●
                  </span>
                ) : (
                  <span className="text-slate-300" title="No geometry">
                    ○
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
