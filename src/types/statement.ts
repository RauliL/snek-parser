import { Expression } from './expression';
import { ImportSpecifier } from './import';
import { Node } from './node';
import { Type } from './type';

export type StatementKind =
  | 'Block'
  | 'Break'
  | 'Continue'
  | 'ExportExpression'
  | 'ExportName'
  | 'ExportType'
  | 'Expression'
  | 'If'
  | 'Import'
  | 'Pass'
  | 'Return'
  | 'Type'
  | 'While';

export type Statement = Node & {
  kind: StatementKind;
};

export type BlockStatement = Statement & {
  kind: 'Block';
  statements: Statement[];
};

export type BreakStatement = Statement & {
  kind: 'Break';
};

export type ContinueStatement = Statement & {
  kind: 'Continue';
};

export type ExportStatement = Statement & {
  kind: 'ExportExpression' | 'ExportName' | 'ExportType';
  name: string;
};

export type ExportExpressionStatement = ExportStatement & {
  kind: 'ExportExpression';
  expression: Expression;
};

export type ExportNameStatement = ExportStatement & {
  kind: 'ExportName';
};

export type ExportTypeStatement = ExportStatement & {
  kind: 'ExportType';
  type: Type;
};

export type ExpressionStatement = Statement & {
  kind: 'Expression';
  expression: Expression;
};

export type IfStatement = Statement & {
  kind: 'If';
  condition: Expression;
  thenStatement: Statement;
  elseStatement?: Statement;
};

export type ImportStatement = Statement & {
  kind: 'Import';
  path: string;
  specifiers: ImportSpecifier[];
};

export type PassStatement = Statement & {
  kind: 'Pass';
};

export type ReturnStatement = Statement & {
  kind: 'Return';
  valueExpression?: Expression;
};

export type TypeStatement = Statement & {
  kind: 'Type';
  name: string;
  type: Type;
};

export type WhileStatement = Statement & {
  kind: 'While';
  condition: Expression;
  statement: Statement;
};
