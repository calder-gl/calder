import { vec3 } from 'gl-matrix';
import { coord, coordFunc } from '../calder';

export namespace Mapper {
    export function coordToVector(cf: coordFunc): vec3 {
        const c = typeof cf === 'function' ? cf() : cf;

        return vec3.fromValues(c.x, c.y, c.z);
    }

    export function vectorToCoord(v: vec3): coord {
        return { x: v[0], y: v[1], z: v[2] };
    }
}
