import { SingletonTemplate as Template } from "./template";
import { NodeVM, VM, VMOptions } from "vm2";

declare type ConstructorData = {
    VM: VM;
    NodeVM: NodeVM;
};

export declare class SandboxSingleton implements Template {
    static module: SandboxSingleton;
    static singleton (): SandboxSingleton;

    readonly #VM: VM;
    readonly #NodeVM: NodeVM;
    readonly #defaultVMOptions: object;

    constructor (sandboxModule: ConstructorData);

    run (script: string, options: VMOptions): any;
    destroy (): void;

    get VM (): VM;
    get NodeVM (): NodeVM;
    get modulePath (): "sandbox";
}
