import { vec3 } from 'gl-matrix';
import { coord, coordFunc } from '../calder';

export namespace Mapper {
    /**
     * Transforms a `coord` type into a `vec3`.
     *
     * @param {coordFunc} cf The coordinate to transform.
     * @returns {vec3}
     */
    export function coordToVector(cf: coordFunc): vec3 {
        const c = typeof cf === 'function' ? cf() : cf;

        return vec3.fromValues(c.x, c.y, c.z);
    }

    /**
     * Transforms a `vec3` type into a `coord`.
     *
     * @param {vec3} v The vector to transform.
     * @returns {coord}
     */
    export function vectorToCoord(v: vec3): coord {
        return { x: v[0], y: v[1], z: v[2] };
    }
}
