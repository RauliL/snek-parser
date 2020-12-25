import { IdentifierToken, Position, TokenKind } from 'snek-lexer';

import {
  BinaryExpression,
  BinaryExpressionKind,
  BoolExpression,
  CallExpression,
  Expression,
  FieldExpression,
  SubscriptExpression,
  UnaryExpression,
  UnaryExpressionKind,
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
      if (!state.peek(',') && !state.peek(separator)) {
        throw new Error(`Unterminated ${what}; Missing ${separator}.`);
      }
      state.peekRead(',');
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

    case '[':
      throw new Error('TODO: List literals');

    case '{':
      throw new Error('TODO: Record literals');

    case '(':
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
  arguments: parseExpressionList(state, position, ')', 'argument list'),
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

  if (!state.peekRead(']')) {
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

    case '[':
      return parseSubscriptExpression(state, state.tokens[state.offset].position, target, true);

    case '(':
      return parseCallExpression(state, state.tokens[state.offset].position, target, true);

    default:
      throw new Error(`Unexpected ${state.tokens[state.offset]} after \`?.'.`);
  }
};

const parseSelector = (state: State, target: Expression): Expression => {
  const { position, kind } = state.tokens[state.offset++];

  switch (kind) {
    case '(':
      return parseCallExpression(state, position, target, false);

    case '.':
      return parseFieldExpression(state, position, target, false);

    default:
      return parseSubscriptExpression(state, position, target, false);
  }
};

const parseUnaryExpression = (state: State, position?: Position): Expression => {
  if (state.peek('!') || state.peek('+') || state.peek('-') || state.peek('~')) {
    const { kind, position: newPosition } = state.tokens[state.offset++];
    const operand = parseUnaryExpression(state, newPosition);

    return {
      position: newPosition,
      kind: 'Unary',
      unaryKind: kind as UnaryExpressionKind,
      operand,
    } as UnaryExpression;
  } else {
    let expression = parsePrimaryExpression(state, position);

    while (state.peek('.') || state.peek('(') || state.peek('[') || state.peek('?.')) {
      if (state.peek('?.')) {
        expression = parseConditionalSelector(state, expression);
      } else {
        expression = parseSelector(state, expression);
      }
    }

    return expression;
  }
};

const parseMultiplicativeExpression = (state: State, position?: Position): Expression => {
  let leftOperand = parseUnaryExpression(state, position);

  while (
    state.peek('*') ||
    state.peek('/') ||
    state.peek('%') ||
    state.peek('^') ||
    state.peek('<<') ||
    state.peek('>>') ||
    state.peek('&&') ||
    state.peek('||')
  ) {
    const { position: newPosition, kind } = state.tokens[state.offset++];
    const rightOperand = parseUnaryExpression(state, newPosition);

    leftOperand = {
      position: newPosition,
      kind: 'Binary',
      binaryKind: kind as BinaryExpressionKind,
      leftOperand,
      rightOperand,
    } as BinaryExpression;
  }

  return leftOperand;
};

const parseAdditiveExpression = (state: State, position?: Position): Expression => {
  let leftOperand = parseMultiplicativeExpression(state, position);

  while (state.peek('+') || state.peek('-')) {
    const { position: newPosition, kind } = state.tokens[state.offset++];
    const rightOperand = parseMultiplicativeExpression(state, newPosition);

    leftOperand = {
      position: newPosition,
      kind: 'Binary',
      binaryKind: kind as BinaryExpressionKind,
      leftOperand,
      rightOperand,
    } as BinaryExpression;
  }

  return leftOperand;
};

const parseRelationalExpression = (state: State, position?: Position): Expression => {
  let leftOperand = parseAdditiveExpression(state, position);

  while (state.peek('<') || state.peek('>') || state.peek('<=') || state.peek('>=')) {
    const { position: newPosition, kind } = state.tokens[state.offset++];
    const rightOperand = parseAdditiveExpression(state, newPosition);

    leftOperand = {
      position: newPosition,
      kind: 'Binary',
      binaryKind: kind as BinaryExpressionKind,
      leftOperand,
      rightOperand,
    } as BinaryExpression;
  }

  return leftOperand;
};

const parseEqualityExpression = (state: State, position?: Position): Expression => {
  let leftOperand = parseRelationalExpression(state, position);

  while (state.peek('==') || state.peek('!=')) {
    const { position: newPosition, kind } = state.tokens[state.offset++];
    const rightOperand = parseRelationalExpression(state, newPosition);

    leftOperand = {
      position: newPosition,
      kind: 'Binary',
      binaryKind: kind as BinaryExpressionKind,
      leftOperand,
      rightOperand,
    } as BinaryExpression;
  }

  return leftOperand;
};

export const parseExpression = (state: State): Expression => parseEqualityExpression(state);
