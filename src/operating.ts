import assert from 'assert';
import { VarInfo } from './scoping';
import { Resolved, Type, TypeFunction, TypeSome, TypeTable } from './typing';

// export type MetaOpNames = { [T in keyof typeof MetaOp]: typeof MetaOp[T] };

export namespace MetaOp {

  export function __add(left: VarInfo, right: VarInfo): unknown { return null!; }

  export function __sub(left: VarInfo, right: VarInfo): unknown { return null!; }

  export function __mul(left: VarInfo, right: VarInfo): unknown { return null!; }

  export function __div(left: VarInfo, right: VarInfo): unknown { return null!; }

  export function __mod(left: VarInfo, right: VarInfo): unknown { return null!; }

  export function __pow(left: VarInfo, right: VarInfo): unknown { return null!; }

  export function __concat(left: VarInfo, right: VarInfo): unknown { return null!; }

  export function __unm(self: VarInfo): unknown { return null!; }

  export function __len(self: VarInfo): unknown { return null!; }

  export function __eq(left: VarInfo, right: VarInfo) { }

  export function __lt(left: VarInfo, right: VarInfo) { }

  export function __le(left: VarInfo, right: VarInfo) { }

  export function __index(self: VarInfo, key: string | number | VarInfo): VarInfo {
    return self.type.itself instanceof TypeTable
      ? self.type.itself.getField(key as string)
      : self.type.itself instanceof TypeSome
        ? self.type.itself.getApplied(new TypeSomeOp.__index(key))
        : { type: Type.noType() };
  }

  export function __newindex(self: VarInfo, key: string | number | VarInfo, value: VarInfo) {
    if (self.type.itself instanceof TypeTable)
      self.type.itself.setField(key as string, value);
    else if (self.type.itself instanceof TypeSome)
      self.type.itself.setApplied(new TypeSomeOp.__newindex(key, value));
  }

  export function __call(self: VarInfo, parameters: VarInfo[]): VarInfo[] { // XXX: TypeTuple? rework TypeTuple to carry a `VarInfo`s instead of `Type`s
    return self.type.itself instanceof TypeFunction
        ? self.type.itself.getReturns(parameters)
        : self.type.itself instanceof TypeSome
          ? [self.type.itself.getApplied(new TypeSomeOp.__call(parameters))] // XXX: tuple gap
          : [{ type: Type.noType() }];
  }

}

export namespace MetaOp {

  export function __metatable(...args: unknown[]): VarInfo { return null!; } // TypeTable // YYY: not implemented

  export function __ipairs(...args: unknown[]): VarInfo { return null!; } // TypeFunction // YYY: not implemented

  export function __pairs(...args: unknown[]) { } // TypeFunction     // YYY: not implemented

  export function __tostring(...args: unknown[]) { } // TypeString    // YYY: not implemented

}

//export namespace MetaOp {
//
//  export function __cocreate(...args: unknown[]): unknown { return null!; }
//
//  export function __coresume(...args: unknown[]): unknown { return null!; }
//
//  export function __costatus(...args: unknown[]): unknown { return null!; }
//
//}

/**
 * represents an operation performed on an unknown type
 * 
 * for now, the operations this models are the metamethodes
 * 
 * @todo TODO: same as Handling.handlers, would like it refactored
 * so it can easily be augmented/adapted for new kinds of usages
 */
export abstract class TypeSomeOp<T extends unknown[] = unknown[]> {

  protected args: T;
  private next?: TypeSomeOp;

  public constructor(...args: T) { this.args = args; }
  public then(op: TypeSomeOp) { this.next = op; }

  public toString() { return this.constructor.name + (this.next ? ` then ${this.next}` : ""); }

  public represent(to: string): string { assert(false, `TypeSomeOp.represent: operation "${this}" applied to "${to}"`); }
  public resolve(to: Resolved): Resolved { assert(false, `TypeSomeOp.resolve: operation "${this}" applied to "${to}"`); }

  protected nextRepresent(to: string) { return this.next?.represent(to) ?? to; }
  protected nextResolve(to: Resolved) { return this.next?.resolve(to) ?? to; }

  public static __add = class __add extends TypeSomeOp<[left: VarInfo, right: VarInfo]> {
  }

  public static __sub = class __sub extends TypeSomeOp<[left: VarInfo, right: VarInfo]> {
  }

  public static __mul = class __mul extends TypeSomeOp<[left: VarInfo, right: VarInfo]> {
  }

  public static __div = class __div extends TypeSomeOp<[left: VarInfo, right: VarInfo]> {
  }

  public static __mod = class __mod extends TypeSomeOp<[left: VarInfo, right: VarInfo]> {
  }

  public static __pow = class __pow extends TypeSomeOp<[left: VarInfo, right: VarInfo]> {
  }

  public static __concat = class __concat extends TypeSomeOp<[left: VarInfo, right: VarInfo]> {
  }

  public static __unm = class __unm extends TypeSomeOp<[]> {
  }

  public static __len = class __len extends TypeSomeOp<[]> {
  }

  public static __eq = class __eq extends TypeSomeOp<[left: VarInfo, right: VarInfo]> {
  }

  public static __lt = class __lt extends TypeSomeOp<[left: VarInfo, right: VarInfo]> {
  }

  public static __le = class __le extends TypeSomeOp<[left: VarInfo, right: VarInfo]> {
  }

  public static __index = class __index extends TypeSomeOp<[key: string | number | VarInfo]> {

    public override represent(to: string) {
      const [key] = this.args;

      return this.nextRepresent(
        'string' === typeof key
          ? `${to}.${key}` // XXX: again, assumes '.'
          : 'number' === typeof key
            ? `${to}[${key}]`
            : `${to}[${key.type.itself instanceof TypeFunction
                ? "function"
                : key.type.itself instanceof TypeTable
                  ? "table"
                  : key.type.itself}]`
      );
    }

    public override resolve(to: Resolved) {
      const [key] = this.args;
      let r: Resolved;

      if ('string' === typeof key || 'number' === typeof key)
        r = to.itself instanceof TypeTable
          ? to.itself.getField(key.toString()).type.itself.resolved()
          : Type.noType().itself.resolved();
      else
        r = to.itself instanceof TypeTable
          ? to.itself.getIndexer(key.type)[1].type.itself.resolved()
          : Type.noType().itself.resolved();

      return this.nextResolve(r);
    }

  }

  public static __newindex = class __newindex extends TypeSomeOp<[key: string | number | VarInfo, value: VarInfo]> {

    public override represent(to: string) {
      const [key, value] = this.args;

      return this.nextRepresent(
        'string' === typeof key
          ? `${to}(.${key}: ${value.type.itself})` // XXX: again, assumes '.'
          : 'number' === typeof key
            ? `${to}([${key}]: ${value.type.itself})`
            : `${to}([${key.type.itself instanceof TypeFunction
                ? "function"
                : key.type.itself instanceof TypeTable
                  ? "table"
                  : key.type.itself}]: ${value.type.itself})`
      );
    }

    public override resolve(to: Resolved) {
      const [key, value] = this.args;

      if ('string' === typeof key || 'number' === typeof key) {
        if (to.itself instanceof TypeTable)
          to.itself.setField(key.toString(), value);
      } else {
        if (to.itself instanceof TypeTable)
          to.itself.setIndexer(key.type, value);
      }

      return this.nextResolve(to);
    }

  }

  public static __call = class __call extends TypeSomeOp<[parameters: VarInfo[]]> {

    public override represent(to: string) {
      const [parameters] = this.args;
      return this.nextRepresent(`${to}(${parameters.join(", ")})`);
    }

    public override resolve(to: Resolved) {
      const [parameters] = this.args;
      return this.nextResolve(
        to.itself instanceof TypeFunction
          ? to.itself.getReturns(parameters)[0].type.itself.resolved() // XXX: tuple gap
          : Type.noType().itself.resolved()
      );
    }

  }

  // XXX: see todo above class, this may be moved outside, to be implemented as a specific usage
  public static __metatable = class __metatable extends TypeSomeOp<unknown[]> { } // YYY: not implemented yet
  public static __ipairs = class __ipairs extends TypeSomeOp<unknown[]> { } // YYY: not implemented yet
  public static __pairs = class __pairs extends TypeSomeOp<unknown[]> { } // YYY: not implemented yet
  public static __tostring = class __tostring extends TypeSomeOp<unknown[]> { } // YYY: not implemented yet

}
