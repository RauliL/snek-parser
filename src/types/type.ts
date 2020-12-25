import { Node } from './node';

export type TypeKind = 'Builtin' | 'Intersection' | 'List' | 'Named' | 'String' | 'Tuple' | 'Union';

export type Type = Node & {
  kind: TypeKind;
};

export type BuiltinTypeKind = 'Any' | 'Bin' | 'Bool' | 'Float' | 'Int' | 'Num' | 'Str' | 'Void';

export type BuiltinType = Type & {
  kind: 'Builtin';
  builtinKind: BuiltinTypeKind;
};

export type ListType = Type & {
  kind: 'List';
  elementType: Type;
};

export type MultipleType = Type & {
  kind: 'Intersection' | 'Tuple' | 'Union';
  types: Type[];
};

export type IntersectionType = MultipleType & { kind: 'Intersection' };
export type UnionType = MultipleType & { kind: 'Union' };
export type TupleType = MultipleType & { kind: 'Tuple' };

export type NamedType = Type & {
  kind: 'Named';
  name: string;
};

export type StringType = Type & {
  kind: 'String';
  value: string;
};
