import { quat } from 'gl-matrix';

export namespace Quaternion {
    /**
     * Creates a quaternion from the given euler angle theta, phi, zeta.
     *
     * @param {number} theta
     * @param {number} phi
     * @param {number} zeta
     * @param {quat} quaternion An optional quaternion (by default the identity quaternion).
     * @returns {quat}
     */
    export function fromEuler(
        theta: number = Math.random() * 90 - 45,
        phi: number = Math.random() * 90 - 45,
        zeta: number = 0,
        quaternion: quat = quat.create()
    ): quat {
        return quat.fromEuler(quaternion, theta, phi, zeta);
    }
}
