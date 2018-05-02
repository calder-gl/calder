import { mat4, quat, vec3 } from 'gl-matrix';

/**
 * Represents the orientation of the camera in a scene, defined by a position for the camera and a
 * target for the camera to look at
 */
export class Camera {
    private static readonly up: vec3 = vec3.fromValues(0, 1, 0);
    private static readonly defaultDirection: vec3 = vec3.fromValues(0, 0, -1);

    private position: vec3 = vec3.fromValues(0, 0, 0);
    private target: vec3 = vec3.copy(vec3.create(), Camera.defaultDirection);
    private transform: mat4 = mat4.create();
    private dirty: boolean = true;

    /**
     * @param {vec3} position The world-space coordinate to move the camera to, preserving rotation
     */
    public moveTo(position: vec3) {
        const direction = vec3.subtract(vec3.create(), position, this.position);
        vec3.add(this.target, this.target, direction);
        vec3.copy(this.position, position);
        this.dirty = true;
    }

    /**
     * @param {vec3} position The world-space coordinate to move the camera to, keeping the camera
     * rotated towards its previous target
     */
    public moveToWithFixedTarget(position: vec3) {
        vec3.copy(this.position, position);
        this.dirty = true;
    }

    /**
     * @param {vec3} direction A world-space direction vector that will be added to the camera's
     * position, preserving its existing rotation
     */
    public moveBy(direction: vec3) {
        vec3.add(this.position, this.position, direction);
        vec3.add(this.target, this.target, direction);
        this.dirty = true;
    }

    /**
     * @param {vec3} direction A world-space direction vector that will be added to the camera's
     * position, keeping the camera pointed towards its previous target
     */
    public moveByWithFixedTarget(direction: vec3) {
        vec3.add(this.position, this.position, direction);
        this.dirty = true;
    }

    /**
     * @param {vec3} target A world-space coordinate that the camera will rotate to face
     */
    public lookAt(target: vec3) {
        vec3.copy(this.target, target);
        this.dirty = true;
    }

    /**
     * @param {vec3} target A quaternion that will be applied to the camera's current rotation.
     */
    public rotate(rotation: quat) {
        const direction = vec3.subtract(vec3.create(), this.target, this.position);
        vec3.normalize(direction, direction);
        vec3.transformQuat(direction, direction, rotation);
        vec3.add(this.target, this.position, direction);
        this.dirty = true;
    }

    /**
     * @param {vec3} target A quaternion that will replace the camera's current rotation.
     */
    public setRotation(rotation: quat) {
        const direction = vec3.copy(vec3.create(), Camera.defaultDirection);
        vec3.transformQuat(direction, direction, rotation);
        vec3.add(this.target, this.position, direction);
        this.dirty = true;
    }

    /**
     * Using the current position and target of the camera, produces a transformation matrix to
     * bring world space coordinates into camera space
     */
    public getTransform(): mat4 {
        if (this.dirty) {
            this.updateTransform();
        }

        return this.transform;
    }

    private updateTransform() {
        mat4.lookAt(this.transform, this.position, this.target, Camera.up);
        this.dirty = false;
    }
}
