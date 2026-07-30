import { useCallback, useEffect, useState } from 'react';
import type { SetURLSearchParams } from 'react-router-dom';

interface UrlBackedViewOptions<T extends string> {
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
  parameter: string;
  allowedValues: ReadonlySet<T>;
  defaultValue: T;
}

export function useUrlBackedView<T extends string>({
  searchParams,
  setSearchParams,
  parameter,
  allowedValues,
  defaultValue,
}: UrlBackedViewOptions<T>) {
  const readValue = useCallback((): T => {
    const requested = searchParams.get(parameter) as T | null;
    return requested && allowedValues.has(requested) ? requested : defaultValue;
  }, [allowedValues, defaultValue, parameter, searchParams]);

  const [value, setValueState] = useState<T>(() => readValue());

  useEffect(() => {
    const next = readValue();
    setValueState((current) => current === next ? current : next);
  }, [readValue]);

  const setValue = useCallback((nextValue: T) => {
    setValueState(nextValue);
    const next = new URLSearchParams(searchParams);
    if (nextValue === defaultValue) next.delete(parameter);
    else next.set(parameter, nextValue);
    setSearchParams(next, { replace: true });
  }, [defaultValue, parameter, searchParams, setSearchParams]);

  return [value, setValue] as const;
}