import { vec3 } from 'gl-matrix';
import { range } from 'lodash';

/**
 * A scalar field represents a function that takes a coordinate in 3D space and
 * returns a scalar. It can be used to represent surfaces as level sets: the set
 * of all coordinates that map to the same scalar value, which we assume to be
 * 0.
 */
export class ScalarField {
    protected readonly dim: number;
    protected readonly length: number;
    protected readonly resolution: number;

    protected grid: number[][][];

    constructor(dim: number, length: number, signedDistFunc: (coord: vec3) => number) {
        this.dim = dim;
        this.length = length;
        this.resolution = length / (dim - 1);
        this.grid = [];

        range(dim).forEach((xIdx: number) => {
            this.grid.push([]);
            range(dim).forEach((yIdx: number) => {
                this.grid[xIdx].push([]);
                range(dim).forEach((zIdx: number) => {
                    const modelCoord = this.indexToModel(xIdx, yIdx, zIdx);
                    this.grid[xIdx][yIdx].push(signedDistFunc(modelCoord));
                });
            });
        });
    }

    public forEachVoxel(func: (voxel: number[][][], x: number, y: number, z: number) => void) {
        range(this.dim - 1).forEach((xIdx: number) => {
            range(this.dim - 1).forEach((yIdx: number) => {
                range(this.dim - 1).forEach((zIdx: number) => {
                    const voxel: number[][][] = [];

                    range(2).forEach((dx: number) => {
                        voxel.push([]);
                        range(2).forEach((dy: number) => {
                            voxel[dx].push([]);
                            range(2).forEach((dz: number) => {
                                voxel[dx][dy].push(this.grid[xIdx + dx][yIdx + dy][zIdx + dz]);
                            });
                        });
                    });

                    func(voxel, xIdx, yIdx, zIdx);
                });
            });
        });
    }

    // Converts an index into the scalar field array to a position in model
    // space. This should only be used during voxel iteration.
    public indexToModel(x: number, y: number, z: number): vec3 {
        const model = vec3.create();
        model[0] = (x - (this.dim - 1) / 2) * this.resolution;
        model[1] = (y - (this.dim - 1) / 2) * this.resolution;
        model[2] = (z - (this.dim - 1) / 2) * this.resolution;

        return model;
    }
}
