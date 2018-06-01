import { ConstraintWithNode } from '../types/ConstraintTypes';

/**
 * User facing constraint on an armature which a user may define.
 */
export class Constraints {
    private static instance: Constraints;
    private constraints: ConstraintWithNode[] = [];

    private constructor() {
        this.constraints = [];
    }

    public static getInstance() {
        if (this.instance === null) {
            this.instance = new this();
        }

        return this.instance;
    }

    /**
     * Adds a constraint function to the array of constraints.
     */
    public add(constraintWithNode: ConstraintWithNode) {
        this.constraints.push(constraintWithNode);
    }

    /**
     * Applies all the constraints in sequential order.
     */
    public applyAll() {
        this.constraints.forEach((c: ConstraintWithNode) => {
            c.constraint(c.node);
        });
    }
}