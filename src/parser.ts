import { IdentifierToken, Position, StringLiteralToken, Token, TokenKind, lex } from 'snek-lexer';

import {
  BlockStatement,
  BreakStatement,
  BuiltinType,
  BuiltinTypeKind,
  ContinueStatement,
  ExportExpressionStatement,
  ExportNameStatement,
  ExportTypeStatement,
  Expression,
  ExpressionStatement,
  IfStatement,
  ImportSpecifier,
  ImportStatement,
  ListType,
  MultipleType,
  NamedImportSpecifier,
  NamedType,
  PassStatement,
  ReturnStatement,
  StarImportSpecifier,
  Statement,
  StringType,
  TupleType,
  Type,
  TypeStatement,
  WhileStatement,
} from './types';

const BUILTIN_TYPE_SET = new Set(['Any', 'Bool', 'Float', 'Int', 'Num', 'Str', 'Void']);

class Parser {
  private readonly tokens: Token[];
  private offset: number;

  public constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.offset = 0;
  }

  public parse(): Statement[] {
    const statements: Statement[] = [];

    while (!this.eof()) {
      statements.push(this.parseStatement(true));
    }

    return statements;
  }

  private eof(): boolean {
    return this.offset >= this.tokens.length;
  }

  private peek(kind: TokenKind): boolean {
    return !this.eof() && this.tokens[this.offset].kind === kind;
  }

  private peekRead(kind: TokenKind): boolean {
    if (this.peek(kind)) {
      ++this.offset;

      return true;
    }

    return false;
  }

  private skipNewLine() {
    if (!this.eof()) {
      const token = this.tokens[this.offset++];

      if (token.kind != 'NewLine') {
        throw new Error(`Unexpected ${token.kind}; Missing new line.`);
      }
    }
  }

  private parseStatement(isTopLevel: boolean = false, position?: Position): Statement {
    if (this.eof()) {
      throw new Error('Unexpected end of input; Missing statement.');
    }

    switch (this.tokens[this.offset].kind) {
      case 'KeywordImport':
        if (!isTopLevel) {
          throw new Error("Unexpected `import'.");
        }
        return this.parseImportStatement();

      case 'KeywordExport':
        if (!isTopLevel) {
          throw new Error("Unexpected `import'.");
        }
        return this.parseExportStatement();

      case 'KeywordIf':
        return this.parseIfStatement();

      case 'KeywordWhile':
        return this.parseWhileStatement();

      case 'KeywordReturn':
        return this.parseReturnStatement();

      case 'KeywordBreak':
        return this.parseSingleLineStatement('Break');

      case 'KeywordContinue':
        return this.parseSingleLineStatement('Continue');

      case 'KeywordPass':
        return this.parseSingleLineStatement('Pass');

      case 'KeywordType':
        return this.parseTypeStatement();

      default:
        return this.parseExpressionStatement();
    }
  }

  private parseImportStatement(): ImportStatement {
    const { position } = this.tokens[this.offset++];
    const specifiers: ImportSpecifier[] = [];
    let path: string;

    do {
      specifiers.push(this.parseImportSpecifier());
    } while (this.peekRead('Comma'));
    if (!this.peekRead('KeywordFrom') || !this.peek('Str')) {
      throw new Error("Missing module path in `import' statement.");
    }
    path = (this.tokens[this.offset++] as StringLiteralToken).value;
    this.skipNewLine();

    return {
      position,
      kind: 'Import',
      path,
      specifiers,
    };
  }

  private parseImportSpecifier(): ImportSpecifier {
    if (this.eof()) {
      throw new Error('Unexpected end of input; Missing import speicifer.');
    }
    switch (this.tokens[this.offset].kind) {
      case 'Id':
        return this.parseNamedImportSpecifier();

      case 'Mul':
        return this.parseStarImportSpecifier();

      default:
        throw new Error(`Unexpected ${this.tokens[this.offset].kind}; Missing import specifier.`);
    }
  }

  private parseNamedImportSpecifier(): NamedImportSpecifier {
    const { id: name, position } = this.tokens[this.offset++] as IdentifierToken;
    let alias: string | undefined;

    if (this.peekRead('KeywordAs')) {
      if (!this.peek('Id')) {
        throw new Error("Missing identifier after `as'.");
      }
      alias = (this.tokens[this.offset++] as IdentifierToken).id;
    }

    return {
      position,
      kind: 'Named',
      name,
      alias,
    };
  }

  private parseStarImportSpecifier(): StarImportSpecifier {
    const { position } = this.tokens[this.offset++];
    let name: string;

    if (!this.peekRead('KeywordAs')) {
      throw new Error("Missing `as' after `import *'.");
    }
    if (!this.peek('Id')) {
      throw new Error("Missing identifier after `import * as'.");
    }
    name = (this.tokens[this.offset++] as IdentifierToken).id;

    return {
      position,
      kind: 'Star',
      name,
    };
  }

  private parseExportStatement(): ExportExpressionStatement | ExportNameStatement | ExportTypeStatement {
    const { position } = this.tokens[this.offset++];
    let name: string;

    if (this.peekRead('KeywordType')) {
      if (this.eof()) {
        throw new Error("Unexpected end of input; Missing identifier after `export type'.");
      } else if (!this.peek('Id')) {
        throw new Error(`Unexpected ${this.tokens[this.offset].kind}; Missing identifier after \`export type'.`);
      }
      name = (this.tokens[this.offset++] as IdentifierToken).id;
      if (this.peekRead('Assign')) {
        return { position, kind: 'ExportType', name, type: this.parseType() };
      } else if (this.eof()) {
        throw new Error("Unexpected end of input; Missing `=' after `export type'.");
      }

      throw new Error(`Unexpected ${this.tokens[this.offset].kind}; Missing \`=' after \`export type'.`);
    } else if (this.eof()) {
      throw new Error("Unexpected end of input; Missing identifier after `export'.");
    } else if (!this.peek('Id')) {
      throw new Error(`Unexpected ${this.tokens[this.offset].kind}; Missing identifier after \`export'.`);
    }
    name = (this.tokens[this.offset++] as IdentifierToken).id;
    if (this.peekRead('Assign')) {
      const expression = this.parseExpression();

      this.skipNewLine();

      return {
        position,
        kind: 'ExportExpression',
        name,
        expression,
      };
    }
    this.skipNewLine();

    return {
      position,
      kind: 'ExportName',
      name,
    };
  }

  private parseIfStatement(): IfStatement {
    const { position } = this.tokens[this.offset++];
    const condition = this.parseExpression();
    let thenStatement: Statement;
    let elseStatement: Statement | undefined;

    if (!this.peekRead('Colon')) {
      throw new Error("Missing `:' after `if' statement.");
    }
    thenStatement = this.parseBlock(position);
    if (this.peekRead('KeywordElse')) {
      if (this.peekRead('KeywordIf')) {
        elseStatement = this.parseIfStatement();
      } else if (this.peekRead('Colon')) {
        elseStatement = this.parseBlock(position);
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
  }

  private parseExpressionStatement(): ExpressionStatement {
    const expression = this.parseExpression();

    if (this.peek('Assign')) {
      throw new Error('TODO: Parse assignment statement');
    }
    this.skipNewLine();

    return {
      position: expression.position,
      kind: 'Expression',
      expression,
    };
  }

  private parseWhileStatement(): WhileStatement {
    const { position } = this.tokens[this.offset++];
    const condition = this.parseExpression();
    let statement: BlockStatement | Statement;

    if (!this.peekRead('Colon')) {
      throw new Error("Missing `:' after `while' statement.");
    }
    statement = this.parseBlock(position);

    return {
      position,
      kind: 'While',
      condition,
      statement,
    };
  }

  private parseReturnStatement(): ReturnStatement {
    const { position } = this.tokens[this.offset++];
    let valueExpression: Expression | undefined;

    if ((!this.eof() && !this.peek('NewLine')) || !this.peek('Dedent') || !this.peek('Semicolon')) {
      valueExpression = this.parseExpression();
      this.skipNewLine();
    }

    return {
      position,
      kind: 'Return',
      valueExpression,
    };
  }

  private parseSingleLineStatement(
    kind: 'Break' | 'Continue' | 'Pass',
  ): BreakStatement | ContinueStatement | PassStatement {
    const { position } = this.tokens[this.offset++];

    this.skipNewLine();

    return { position, kind };
  }

  private parseTypeStatement(): TypeStatement {
    const { position } = this.tokens[this.offset++];
    let name: string;
    let type: Type;

    if (!this.peek('Id')) {
      if (this.eof()) {
        throw new Error('Unexpected end of input; Missing identifier.');
      }

      throw new Error(`Unexpected ${this.tokens[this.offset]}; Missing identifier.`);
    }
    name = (this.tokens[this.offset++] as IdentifierToken).id;
    if (this.peekRead('Assign')) {
      type = this.parseType();
    } else if (this.eof()) {
      throw new Error("Unexpected end of input; Missing `=' after `type'.");
    } else {
      throw new Error(`Unexpected ${this.tokens[this.offset]}; Missing \`=' after \`type'.`);
    }

    return { position, kind: 'Type', name, type };
  }

  private parseBlock(position: Position): BlockStatement | Statement {
    if (this.peekRead('NewLine')) {
      const statements: Statement[] = [];

      if (!this.peekRead('Indent')) {
        throw new Error('Missing block.');
      }
      for (;;) {
        statements.push(this.parseStatement());
        if (this.eof() || this.peekRead('Dedent')) {
          break;
        }
      }

      return {
        position,
        kind: 'Block',
        statements,
      };
    }

    return this.parseStatement(false, position);
  }

  private parseExpression(): Expression {
    throw new Error('TODO: Parsing expressions');
  }

  private parseType(): ListType | Type {
    let type: ListType | Type;

    if (this.eof()) {
      throw new Error('Unexpected end of input; Missing type.');
    }
    switch (this.tokens[this.offset].kind) {
      case 'Id':
        type = this.parseNamedType();
        break;

      case 'LeftParen':
        throw new Error('TODO: Function types');

      case 'LeftBracket':
        type = this.parseTupleType();
        break;

      case 'LeftBrace':
        throw new Error('TODO: Record types');

      case 'Str':
        type = this.parseStringType();
        break;

      default:
        throw new Error(`Unexpected ${this.tokens[this.offset]}; Missing type.`);
    }

    while (this.peekRead('LeftBracket')) {
      if (!this.peekRead('RightBracket')) {
        throw new Error("Missing `]' after `['.");
      }
      type = {
        position: type.position,
        kind: 'List',
        elementType: type,
      };
    }

    while (this.peek('And') || this.peek('Or')) {
      type = this.parseMultipleType(type);
    }

    return type;
  }

  private parseTupleType(): TupleType {
    const { position } = this.tokens[this.offset++];
    const types: Type[] = [];

    for (;;) {
      if (this.eof()) {
        throw new Error("Unterminated tuple type; Missing `]'.");
      } else if (this.peekRead('RightBracket')) {
        break;
      }
      types.push(this.parseType());
      if (!this.peek('Comma') && !this.peek('RightBracket')) {
        throw new Error("Unterminated tuple type; Missing `]'.");
      }
      this.peekRead('Comma');
    }

    return {
      position,
      kind: 'Tuple',
      types,
    };
  }

  private parseStringType(): StringType {
    const { position, value } = this.tokens[this.offset++] as StringLiteralToken;

    return {
      position,
      kind: 'String',
      value,
    };
  }

  private parseMultipleType(firstType: Type): MultipleType {
    const { position, kind: tokenKind } = this.tokens[this.offset++];
    const kind = tokenKind === 'And' ? 'Intersection' : 'Union';
    const types: Type[] = [firstType];

    for (;;) {
      if (this.eof()) {
        throw new Error('Unexpected end of input; Missing type.');
      }
      types.push(this.parseType());
      if (!this.peekRead(kind === 'Intersection' ? 'And' : 'Or')) {
        break;
      }
    }

    return { position, kind, types };
  }

  private parseNamedType(): BuiltinType | NamedType {
    const { position, id: name } = this.tokens[this.offset++] as IdentifierToken;

    if (BUILTIN_TYPE_SET.has(name)) {
      return {
        position,
        kind: 'Builtin',
        builtinKind: name as BuiltinTypeKind,
      };
    }

    return { position, kind: 'Named', name };
  }
}

export const parse = (source: string): Statement[] => new Parser(lex(source)).parse();
