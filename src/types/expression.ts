import { Node } from './node';

export type ExpressionKind = 'Binary' | 'Bool' | 'Call' | 'Field' | 'Subscript' | 'Unary';

export type BinaryExpressionKind =
  | '=='
  | '!='
  | '<'
  | '>'
  | '<='
  | '>='
  | '+'
  | '-'
  | '*'
  | '/'
  | '%'
  | '^'
  | '<<'
  | '>>'
  | '&&'
  | '||';

export type UnaryExpressionKind = '!' | '+' | '-' | '~';

export type Expression = Node & { kind: ExpressionKind };

export type BinaryExpression = Expression & {
  kind: 'Binary';
  binaryKind: BinaryExpressionKind;
  leftOperand: Expression;
  rightOperand: Expression;
};

export type BoolExpression = Expression & {
  kind: 'Bool';
  value: boolean;
};

export type CallExpression = Expression & {
  kind: 'Call';
  callee: Expression;
  arguments: Expression[];
  optional: boolean;
};

export type FieldExpression = Expression & {
  kind: 'Field';
  record: Expression;
  field: string;
  optional: boolean;
};

export type SubscriptExpression = Expression & {
  kind: 'Subscript';
  record: Expression;
  field: Expression;
  optional: boolean;
};

export type UnaryExpression = Expression & {
  kind: 'Unary';
  unaryKind: UnaryExpressionKind;
  operand: Expression;
};
