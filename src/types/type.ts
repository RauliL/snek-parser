import { Node } from './node';

export type TypeKind = 'Builtin' | 'Intersection' | 'List' | 'Named' | 'String' | 'Union';

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
  kind: 'Intersection' | 'Union';
  types: Type[];
};

export type NamedType = Type & {
  kind: 'Named';
  name: string;
};

export type StringType = Type & {
  kind: 'String';
  value: string;
};
