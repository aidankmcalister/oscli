export class Storage<T extends Record<string, unknown>> {
  private _data: Partial<T> = {};

  set<K extends keyof T>(key: K, value: T[K]): void {
    this._data[key] = value;
  }

  get<K extends keyof T>(key: K): T[K] | undefined {
    return this._data[key];
  }

  get data(): Partial<T> {
    return this._data;
  }
}

export function createStorage<T extends Record<string, unknown>>() {
  return new Storage<T>();
}
