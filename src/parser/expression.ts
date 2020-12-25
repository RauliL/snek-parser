import { IdentifierToken, Position, TokenKind } from 'snek-lexer';

import {
  BinaryExpression,
  BoolExpression,
  CallExpression,
  Expression,
  FieldExpression,
  SubscriptExpression,
  UnaryExpression,
} from '../types';

import { State } from './state';

const parseExpressionList = (state: State, position: Position, separator: TokenKind, what: string): Expression[] => {
  const list: Expression[] = [];

  for (;;) {
    if (state.eof()) {
      throw new Error(`Unterminated ${what}; Missing ${separator}.`);
    } else if (state.peekRead(separator)) {
      break;
    } else {
      list.push(parseEqualityExpression(state));
      if (!state.peek('Comma') && !state.peek(separator)) {
        throw new Error(`Unterminated ${what}; Missing ${separator}.`);
      }
      state.peekRead('Comma');
    }
  }

  return list;
};

const parsePrimaryExpression = (state: State, position?: Position): Expression => {
  let expression: Expression;

  if (state.eof()) {
    throw new Error('Unexpected end of input; Missing expression.');
  }
  switch (state.tokens[state.offset].kind) {
    case 'Float':
    case 'Int':
      throw new Error('TODO: Numeric literals');

    case 'Str':
      throw new Error('TODO: String literals');

    case 'Id':
      throw new Error('TODO: Identifiers');

    case 'LeftBracket':
      throw new Error('TODO: List literals');

    case 'LeftBrace':
      throw new Error('TODO: Record literals');

    case 'LeftParen':
      throw new Error('TODO: Parenthesized expressions');

    case 'KeywordNull':
      throw new Error('TODO: null expression');

    case 'KeywordFalse':
    case 'KeywordTrue':
      expression = {
        position: state.tokens[state.offset].position,
        kind: 'Bool',
        value: state.tokens[state.offset].kind === 'KeywordTrue',
      } as BoolExpression;
      break;

    default:
      throw new Error(`Unexpected ${state.tokens[state.offset]}; Missing expression.`);
  }
  ++state.offset;

  return expression;
};

const parseCallExpression = (
  state: State,
  position: Position,
  callee: Expression,
  optional: boolean,
): CallExpression => ({
  position,
  kind: 'Call',
  callee,
  arguments: parseExpressionList(state, position, 'RightParen', 'argument list'),
  optional,
});

const parseFieldExpression = (
  state: State,
  position: Position,
  record: Expression,
  optional: boolean,
): FieldExpression => {
  if (state.eof() || !state.peek('Id')) {
    throw new Error("Missing identifier after `.'.");
  }

  return {
    position,
    kind: 'Field',
    record,
    field: (state.tokens[state.offset++] as IdentifierToken).id,
    optional,
  };
};

const parseSubscriptExpression = (
  state: State,
  position: Position,
  record: Expression,
  optional: boolean,
): SubscriptExpression => {
  const field = parseEqualityExpression(state, position);

  if (!state.peekRead('RightBracket')) {
    throw new Error("Missing `]' after the expression.");
  }

  return {
    position,
    kind: 'Subscript',
    record,
    field,
    optional,
  };
};

const parseConditionalSelector = (state: State, target: Expression): Expression => {
  ++state.offset;

  if (state.eof()) {
    throw new Error("Unexpected end of input after `?.'.");
  }
  switch (state.tokens[state.offset].kind) {
    case 'Id':
      return parseFieldExpression(state, state.tokens[state.offset].position, target, true);

    case 'LeftBracket':
      return parseSubscriptExpression(state, state.tokens[state.offset].position, target, true);

    case 'LeftParen':
      return parseCallExpression(state, state.tokens[state.offset].position, target, true);

    default:
      throw new Error(`Unexpected ${state.tokens[state.offset]} after \`?.'.`);
  }
};

const parseSelector = (state: State, target: Expression): Expression => {
  const { position, kind } = state.tokens[state.offset++];

  if (kind === 'LeftParen') {
    return parseCallExpression(state, position, target, false);
  } else if (kind === 'Dot') {
    return parseFieldExpression(state, position, target, false);
  } else {
    return parseSubscriptExpression(state, position, target, false);
  }
};

const parseUnaryExpression = (state: State, position?: Position): Expression => {
  if (state.peek('Not') || state.peek('Add') || state.peek('Sub') || state.peek('BitwiseNot')) {
    const { kind, position: newPosition } = state.tokens[state.offset++];
    const operand = parseUnaryExpression(state, newPosition);

    return {
      position: newPosition,
      kind: 'Unary',
      unaryKind: kind === 'Not' ? '!' : kind === 'Add' ? '+' : kind === 'Sub' ? '-' : '~',
      operand,
    } as UnaryExpression;
  } else {
    let expression = parsePrimaryExpression(state, position);

    while (state.peek('Dot') || state.peek('LeftParen') || state.peek('LeftBracket') || state.peek('ConditionalDot')) {
      if (state.peek('ConditionalDot')) {
        expression = parseConditionalSelector(state, expression);
      } else {
        expression = parseSelector(state, expression);
      }
    }

    return expression;
  }
};

const parseMultiplicativeExpression = (state: State, position?: Position): Expression => {
  let expression = parseUnaryExpression(state, position);

  while (
    state.peek('Mul') ||
    state.peek('Div') ||
    state.peek('Mod') ||
    state.peek('BitwiseXor') ||
    state.peek('LeftShift') ||
    state.peek('RightShift') ||
    state.peek('LogicalAnd') ||
    state.peek('LogicalOr')
  ) {
    const { position: newPosition, kind } = state.tokens[state.offset++];
    const operand = parseUnaryExpression(state, newPosition);

    expression = {
      position: newPosition,
      kind: 'Binary',
      binaryKind:
        kind === 'Mul'
          ? '*'
          : kind === 'Div'
          ? '/'
          : kind === 'Mod'
          ? '%'
          : kind === 'BitwiseXor'
          ? '^'
          : kind === 'LeftShift'
          ? '<<'
          : kind === 'RightShift'
          ? '>>'
          : kind === 'LogicalAnd'
          ? '&&'
          : '||',
      leftOperand: expression,
      rightOperand: operand,
    } as BinaryExpression;
  }

  return expression;
};

const parseAdditiveExpression = (state: State, position?: Position): Expression => {
  let expression = parseMultiplicativeExpression(state, position);

  while (state.peek('Add') || state.peek('Sub')) {
    const { position: newPosition, kind } = state.tokens[state.offset++];
    const operand = parseMultiplicativeExpression(state, newPosition);

    expression = {
      position: newPosition,
      kind: 'Binary',
      binaryKind: kind === 'Add' ? '+' : '-',
      leftOperand: expression,
      rightOperand: operand,
    } as BinaryExpression;
  }

  return expression;
};

const parseRelationalExpression = (state: State, position?: Position): Expression => {
  let expression = parseAdditiveExpression(state, position);

  while (state.peek('Lt') || state.peek('Gt') || state.peek('Lte') || state.peek('Gte')) {
    const { position: newPosition, kind } = state.tokens[state.offset++];
    const operand = parseAdditiveExpression(state, newPosition);

    expression = {
      position: newPosition,
      kind: 'Binary',
      binaryKind: kind === 'Lt' ? '<' : kind === 'Gt' ? '>' : kind === 'Lte' ? '<=' : '>=',
      leftOperand: expression,
      rightOperand: operand,
    } as BinaryExpression;
  }

  return expression;
};

const parseEqualityExpression = (state: State, position?: Position): Expression => {
  let expression = parseRelationalExpression(state, position);

  while (state.peek('Eq') || state.peek('Ne')) {
    const { position: newPosition, kind } = state.tokens[state.offset++];
    const operand = parseRelationalExpression(state, newPosition);

    expression = {
      position: newPosition,
      kind: 'Binary',
      binaryKind: kind === 'Eq' ? '==' : '!=',
      leftOperand: expression,
      rightOperand: operand,
    } as BinaryExpression;
  }

  return expression;
};

export const parseExpression = (state: State): Expression => parseEqualityExpression(state);
