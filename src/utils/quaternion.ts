import { quat } from 'gl-matrix';

export namespace Quaternion {
    export function fromEuler(
        theta: number = Math.random() * 90 - 45,
        phi: number = Math.random() * 90 - 45,
        quaternion: quat = quat.create()
    ): quat {
        return quat.fromEuler(quaternion, theta, phi, 0);
    }
}
