import { mat4, quat, vec3 } from 'gl-matrix';

/*
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

    public moveTo(position: vec3) {
        const direction = vec3.subtract(vec3.create(), position, this.position);
        vec3.add(this.target, this.target, direction);
        vec3.copy(this.position, position);
        this.dirty = true;
    }

    public moveToWithFixedTarget(position: vec3) {
        vec3.copy(this.position, position);
        this.dirty = true;
    }

    public moveBy(direction: vec3) {
        vec3.add(this.position, this.position, direction);
        vec3.add(this.target, this.target, direction);
        this.dirty = true;
    }

    public moveByWithFixedTarget(direction: vec3) {
        vec3.add(this.position, this.position, direction);
        this.dirty = true;
    }

    public lookAt(target: vec3) {
        vec3.copy(this.target, target);
        this.dirty = true;
    }

    public rotate(rotation: quat) {
        const direction = vec3.subtract(vec3.create(), this.target, this.position);
        vec3.normalize(direction, direction);
        vec3.transformQuat(direction, direction, rotation);
        vec3.add(this.target, this.position, direction);
        this.dirty = true;
    }

    public setRotation(rotation: quat) {
        const direction = vec3.copy(vec3.create(), Camera.defaultDirection);
        vec3.transformQuat(direction, direction, rotation);
        vec3.add(this.target, this.position, direction);
        this.dirty = true;
    }

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
