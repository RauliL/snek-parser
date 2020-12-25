import { IdentifierToken, Position, StringLiteralToken } from 'snek-lexer';

import {
  BlockStatement,
  BreakStatement,
  ContinueStatement,
  ExportExpressionStatement,
  ExportNameStatement,
  ExportTypeStatement,
  Expression,
  ExpressionStatement,
  IfStatement,
  ImportSpecifier,
  ImportStatement,
  PassStatement,
  ReturnStatement,
  Statement,
  Type,
  TypeStatement,
  WhileStatement,
} from '../types';

import { parseExpression } from './expression';
import { parseImportSpecifier } from './import';
import { State } from './state';
import { parseType } from './type';

const parseBlock = (state: State, position: Position): BlockStatement | Statement => {
  if (state.peekRead('NewLine')) {
    const statements: Statement[] = [];

    if (!state.peekRead('Indent')) {
      throw new Error('Missing block.');
    }
    for (;;) {
      statements.push(parseStatement(state));
      if (state.eof() || state.peekRead('Dedent')) {
        break;
      }
    }

    return {
      position,
      kind: 'Block',
      statements,
    };
  }

  return parseStatement(state);
};

const parseExportStatement = (state: State): ExportExpressionStatement | ExportNameStatement | ExportTypeStatement => {
  const { position } = state.tokens[state.offset++];
  let name: string;

  if (state.peekRead('KeywordType')) {
    if (state.eof()) {
      throw new Error("Unexpected end of input; Missing identifier after `export type'.");
    } else if (!state.peek('Id')) {
      throw new Error(`Unexpected ${state.tokens[state.offset].kind}; Missing identifier after \`export type'.`);
    }
    name = (state.tokens[state.offset++] as IdentifierToken).id;
    if (state.peekRead('Assign')) {
      return { position, kind: 'ExportType', name, type: parseType(state) };
    } else if (state.eof()) {
      throw new Error("Unexpected end of input; Missing `=' after `export type'.");
    }

    throw new Error(`Unexpected ${state.tokens[state.offset].kind}; Missing \`=' after \`export type'.`);
  } else if (state.eof()) {
    throw new Error("Unexpected end of input; Missing identifier after `export'.");
  } else if (!state.peek('Id')) {
    throw new Error(`Unexpected ${state.tokens[state.offset].kind}; Missing identifier after \`export'.`);
  }
  name = (state.tokens[state.offset++] as IdentifierToken).id;
  if (state.peekRead('Assign')) {
    const expression = parseExpression(state);

    state.skipNewLine();

    return {
      position,
      kind: 'ExportExpression',
      name,
      expression,
    };
  }
  state.skipNewLine();

  return {
    position,
    kind: 'ExportName',
    name,
  };
};

const parseExpressionStatement = (state: State): ExpressionStatement => {
  const expression = parseExpression(state);

  if (state.peek('Assign')) {
    throw new Error('TODO: Parse assignment statement');
  }
  state.skipNewLine();

  return {
    position: expression.position,
    kind: 'Expression',
    expression,
  };
};

const parseIfStatement = (state: State): IfStatement => {
  const { position } = state.tokens[state.offset++];
  const condition = parseExpression(state);
  let thenStatement: Statement;
  let elseStatement: Statement | undefined;

  if (!state.peekRead('Colon')) {
    throw new Error("Missing `:' after `if' statement.");
  }
  thenStatement = parseBlock(state, position);
  if (state.peekRead('KeywordElse')) {
    if (state.peekRead('KeywordIf')) {
      elseStatement = parseIfStatement(state);
    } else if (state.peekRead('Colon')) {
      elseStatement = parseBlock(state, position);
    } else {
      throw new Error("Missing `:' after `else' statement");
    }
  }

  return {
    position,
    kind: 'If',
    condition,
    thenStatement,
    elseStatement,
  };
};

const parseImportStatement = (state: State): ImportStatement => {
  const { position } = state.tokens[state.offset++];
  const specifiers: ImportSpecifier[] = [];
  let path: string;

  do {
    specifiers.push(parseImportSpecifier(state));
  } while (state.peekRead('Comma'));
  if (!state.peekRead('KeywordFrom') || !state.peek('Str')) {
    throw new Error("Missing module path in `import' statement.");
  }
  path = (state.tokens[state.offset++] as StringLiteralToken).value;
  state.skipNewLine();

  return {
    position,
    kind: 'Import',
    path,
    specifiers,
  };
};

const parseReturnStatement = (state: State): ReturnStatement => {
  const { position } = state.tokens[state.offset++];
  let valueExpression: Expression | undefined;

  if ((!state.eof() && !state.peek('NewLine')) || !state.peek('Dedent') || !state.peek('Semicolon')) {
    valueExpression = parseExpression(state);
    state.skipNewLine();
  }

  return {
    position,
    kind: 'Return',
    valueExpression,
  };
};

const parseSimpleStatement = (
  state: State,
  kind: 'Break' | 'Continue' | 'Pass',
): BreakStatement | ContinueStatement | PassStatement => {
  const { position } = state.tokens[state.offset++];

  state.skipNewLine();

  return { position, kind };
};

const parseTypeStatement = (state: State): TypeStatement => {
  const { position } = state.tokens[state.offset++];
  let name: string;
  let type: Type;

  if (!state.peek('Id')) {
    if (state.eof()) {
      throw new Error('Unexpected end of input; Missing identifier.');
    }

    throw new Error(`Unexpected ${state.tokens[state.offset]}; Missing identifier.`);
  }
  name = (state.tokens[state.offset++] as IdentifierToken).id;
  if (state.peekRead('Assign')) {
    type = parseType(state);
  } else if (state.eof()) {
    throw new Error("Unexpected end of input; Missing `=' after `type'.");
  } else {
    throw new Error(`Unexpected ${state.tokens[state.offset]}; Missing \`=' after \`type'.`);
  }

  return { position, kind: 'Type', name, type };
};

const parseWhileStatement = (state: State): WhileStatement => {
  const { position } = state.tokens[state.offset++];
  const condition = parseExpression(state);
  let statement: BlockStatement | Statement;

  if (!state.peekRead('Colon')) {
    throw new Error("Missing `:' after `while' statement.");
  }
  statement = parseBlock(state, position);

  return {
    position,
    kind: 'While',
    condition,
    statement,
  };
};

export const parseStatement = (state: State, isTopLevel: boolean = false): Statement => {
  if (state.eof()) {
    throw new Error('Unexpected end of input; Missing statement.');
  }

  switch (state.tokens[state.offset].kind) {
    case 'KeywordImport':
      if (!isTopLevel) {
        throw new Error("Unexpected `import'.");
      }
      return parseImportStatement(state);

    case 'KeywordExport':
      if (!isTopLevel) {
        throw new Error("Unexpected `import'.");
      }
      return parseExportStatement(state);

    case 'KeywordIf':
      return parseIfStatement(state);

    case 'KeywordWhile':
      return parseWhileStatement(state);

    case 'KeywordReturn':
      return parseReturnStatement(state);

    case 'KeywordBreak':
      return parseSimpleStatement(state, 'Break');

    case 'KeywordContinue':
      return parseSimpleStatement(state, 'Continue');

    case 'KeywordPass':
      return parseSimpleStatement(state, 'Pass');

    case 'KeywordType':
      return parseTypeStatement(state);

    default:
      return parseExpressionStatement(state);
  }
};
