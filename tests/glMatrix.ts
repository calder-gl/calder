import { mat4, quat, vec3, vec4 } from 'gl-matrix';

declare global {
    namespace jest {
        interface Matchers<R> {
            toEqualArrVec3(
                received: vec4[],
                argument: vec4[]
            ): { pass: boolean; message(): string };
            toEqualArrVec4(
                received: vec4[],
                argument: vec4[]
            ): { pass: boolean; message(): string };
            toEqualMat4(argument: mat4): { pass: boolean; message(): string };
            toEqualVec3(argument: vec3): { pass: boolean; message(): string };
            toEqualVec4(argument: vec4): { pass: boolean; message(): string };
            toEqualQuat(argument: quat): { pass: boolean; message(): string };
        }
    }
}

expect.extend({
    toEqualArrVec4(received: vec4[], argument: vec4[]) {
        let match: boolean = true;
        if (received.length !== argument.length) {
            match = false;
        }
        for (let i: number = 0; i < received.length; i += 1) {
            if (!vec4.equals(received[i], argument[i])) {
                match = false;
            }
        }
        if (match) {
            return {
                message: () =>
                    `expected ${argument.map(vec4.str).join(',')} to not be equal to ${argument
                        .map(vec4.str)
                        .join(',')}`,
                pass: true
            };
        } else {
            return {
                message: () =>
                    `expected ${received.map(vec4.str).join(',')} to be equal to ${argument
                        .map(vec4.str)
                        .join(',')}`,
                pass: false
            };
        }
    },
    toEqualArrVec3(received: vec3[], argument: vec3[]) {
        let match: boolean = true;
        if (received.length !== argument.length) {
            match = false;
        }
        for (let i: number = 0; i < received.length; i += 1) {
            if (!vec3.equals(received[i], argument[i])) {
                match = false;
            }
        }
        if (match) {
            return {
                message: () =>
                    `expected ${argument.map(vec3.str).join(',')} to not be equal to ${argument
                        .map(vec3.str)
                        .join(',')}`,
                pass: true
            };
        } else {
            return {
                message: () =>
                    `expected ${received.map(vec3.str).join(',')} to be equal to ${argument
                        .map(vec3.str)
                        .join(',')}`,
                pass: false
            };
        }
    },
    toEqualMat4(received: mat4, argument: mat4) {
        if (mat4.equals(received, argument)) {
            return {
                message: () =>
                    `expected ${mat4.str(received)} to not be equal to ${mat4.str(argument)}`,
                pass: true
            };
        } else {
            return {
                message: () =>
                    `expected ${mat4.str(received)} to be equal to ${mat4.str(argument)}`,
                pass: false
            };
        }
    },
    toEqualVec3(received: vec3, argument: vec3) {
        if (vec3.equals(received, argument)) {
            return {
                message: () =>
                    `expected ${vec3.str(received)} to not be equal to ${vec3.str(argument)}`,
                pass: true
            };
        } else {
            return {
                message: () =>
                    `expected ${vec3.str(received)} to be equal to ${vec3.str(argument)}`,
                pass: false
            };
        }
    },
    toEqualVec4(received: vec4, argument: vec4) {
        if (vec4.equals(received, argument)) {
            return {
                message: () =>
                    `expected ${vec4.str(received)} to not be equal to ${vec4.str(argument)}`,
                pass: true
            };
        } else {
            return {
                message: () =>
                    `expected ${vec4.str(received)} to be equal to ${vec4.str(argument)}`,
                pass: false
            };
        }
    },
    toEqualQuat(received: quat, argument: quat) {
        if (quat.equals(received, argument)) {
            return {
                message: () =>
                    `expected ${quat.str(received)} to not be equal to ${quat.str(argument)}`,
                pass: true
            };
        } else {
            return {
                message: () =>
                    `expected ${quat.str(received)} to be equal to ${quat.str(argument)}`,
                pass: false
            };
        }
    }
});
