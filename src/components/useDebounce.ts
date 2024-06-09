import { useEffect, useRef, useMemo } from "preact/hooks";
import debounce from "debounce";

export const useDebounce = <T extends (arg: any) => any>(callback: T) => {
  const ref = useRef<(arg: any) => any>();

  useEffect(() => {
    ref.current = callback;
  }, [callback]);

  const debouncedCallback = useMemo(() => {
    const func = (...args: Parameters<T>) => {
      ref.current?.apply(this, args);
    };

    return debounce(func, 50);
  }, []);

  return debouncedCallback;
};
