/**
 * A class to lazily compute values and keep them around.
 */
export class Cache<T> {
    private cached: T | null = null;
    private compute: () => T;

    /**
     * @param {() => T} compute A function to generate the value to cache.
     */
    constructor(compute: () => T) {
        this.compute = compute;
    }

    /**
     * @param {() => T} compute A function to generate the value to cache.
     */
    public static create<T>(compute: () => T): Cache<T> {
        return new Cache<T>(compute);
    }

    /**
     * Deletes the cached value, forcing it to be recomputed.
     */
    public invalidate() {
        this.cached = null;
    }

    /**
     * @returns {T} The cached value, which is created if it doesn't already exist.
     */
    public value(): T {
        if (this.cached !== null) {
            return this.cached;
        } else {
            this.cached = this.compute();

            return this.cached;
        }
    }
}
