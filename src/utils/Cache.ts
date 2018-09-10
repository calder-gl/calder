export class Cache<T> {
    private cached: T | null = null;
    private compute: () => T;

    constructor(compute: () => T) {
        this.compute = compute;
    }

    public static create<T>(compute: () => T): Cache<T> {
        return new Cache<T>(compute);
    }

    public invalidate() {
        this.cached = null;
    }

    public value(): T {
        if (this.cached !== null) {
            return this.cached;
        } else {
            this.cached = this.compute();

            return this.cached;
        }
    }
}
