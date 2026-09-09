export declare function getCached<T>(key: string): Promise<T | null>;
export declare function setCached(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
export declare function invalidateCache(...keys: string[]): Promise<void>;
//# sourceMappingURL=cache.d.ts.map