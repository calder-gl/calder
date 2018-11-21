export type PerfStats = {
    realTime: number;
    cpuTime: number;
};

/**
 * A class that can break down work into chunks that run within a given time budget per
 * iteration. It allows the UI to update. It can also be cancelled.
 */
export class Task<T> {
    private result: T | undefined;
    private cancelled: boolean = false;
    private onComplete: ((res: T, stats: PerfStats) => void) | undefined;
    private timeBudget: number = Infinity;
    private startTime: number = new Date().getTime();
    private cpuTime: number = 0;

    /**
     * @param {number} timeBudget How much time in seconds can be spent per frame before the rest
     * of the work is deferred to the next frame. Note that it will only stop once it has gone OVER
     * this time budget (hopefully just by a little bit) so it is not a hard limit.
     */
    constructor(
        iterator: IterableIterator<T | undefined>,
        timeBudget: number,
    ) {
        this.timeBudget = timeBudget;

        // This will continue running the `iterator` coroutine to continue the optimization process until
        // either it finishes or we spent too long in the current frame, in which case, we schedule this
        // function again in another `requestAnimationFrame` callback to continue it after the UI gets a
        // chance to update.
        const incrementalWork = () => {
            const incrementalStartTime = new Date().getTime();

            const existsTimeRemaining = () =>
                (new Date().getTime() - incrementalStartTime) / 1000 < this.timeBudget;

            while (!this.cancelled && this.result === undefined && existsTimeRemaining()) {
                this.result = iterator.next().value;
            }

            this.cpuTime += (new Date().getTime() - incrementalStartTime) / 1000;

            if (!this.cancelled && this.result !== undefined) {
                this.finish(this.result);
            } else if (!this.cancelled) {
                requestAnimationFrame(incrementalWork);
            }
        };

        requestAnimationFrame(incrementalWork);
    }

    public then(onComplete: (res: T, stats: PerfStats) => void): Task<T> {
        this.onComplete = onComplete;

        if (this.result !== undefined) {
            this.finish(this.result);
        }

        return this;
    }

    public cancel() {
        this.cancelled = true;
    }

    private finish(res: T) {
        if (this.cancelled || this.onComplete === undefined || this.result === undefined) {
            return;
        }

        const stats: PerfStats = {
            realTime: (new Date().getTime() - this.startTime) / 1000,
            cpuTime: this.cpuTime
        };
        this.onComplete(res, stats);
    }
}
