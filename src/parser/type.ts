import { IdentifierToken, StringLiteralToken } from 'snek-lexer';

import { BuiltinType, BuiltinTypeKind, ListType, MultipleType, NamedType, StringType, TupleType, Type } from '../types';

import { State } from './state';

const BUILTIN_TYPE_SET = new Set<string>(['Any', 'Bool', 'Float', 'Int', 'Num', 'Str', 'Void']);

const parseMultipleType = (state: State, firstType: Type): MultipleType => {
  const { position, kind: tokenKind } = state.tokens[state.offset++];
  const kind = tokenKind === '&' ? 'Intersection' : 'Union';
  const types: Type[] = [firstType];

  for (;;) {
    if (state.eof()) {
      throw new Error('Unexpected end of input; Missing type.');
    }
    types.push(parseType(state));
    if (!state.peekRead(kind === 'Intersection' ? '&' : '|')) {
      break;
    }
  }

  return { position, kind, types };
};

const parseNamedType = (state: State): BuiltinType | NamedType => {
  const { position, id: name } = state.tokens[state.offset++] as IdentifierToken;

  if (BUILTIN_TYPE_SET.has(name)) {
    return {
      position,
      kind: 'Builtin',
      builtinKind: name as BuiltinTypeKind,
    };
  }

  return { position, kind: 'Named', name };
};

const parseStringType = (state: State): StringType => {
  const { position, value } = state.tokens[state.offset++] as StringLiteralToken;

  return {
    position,
    kind: 'String',
    value,
  };
};

const parseTupleType = (state: State): TupleType => {
  const { position } = state.tokens[state.offset++];
  const types: Type[] = [];

  for (;;) {
    if (state.eof()) {
      throw new Error("Unterminated tuple type; Missing `]'.");
    } else if (state.peekRead(']')) {
      break;
    }
    types.push(parseType(state));
    if (!state.peek(',') && !state.peek(']')) {
      throw new Error("Unterminated tuple type; Missing `]'.");
    }
    state.peekRead(',');
  }

  return {
    position,
    kind: 'Tuple',
    types,
  };
};

export const parseType = (state: State): ListType | Type => {
  let type: ListType | Type;

  if (state.eof()) {
    throw new Error('Unexpected end of input; Missing type.');
  }
  switch (state.tokens[state.offset].kind) {
    case 'Id':
      type = parseNamedType(state);
      break;

    case '(':
      throw new Error('TODO: Function types');

    case '[':
      type = parseTupleType(state);
      break;

    case '{':
      throw new Error('TODO: Record types');

    case 'Str':
      type = parseStringType(state);
      break;

    default:
      throw new Error(`Unexpected ${state.tokens[state.offset]}; Missing type.`);
  }

  while (state.peekRead('[')) {
    if (!state.peekRead(']')) {
      throw new Error("Missing `]' after `['.");
    }
    type = {
      position: type.position,
      kind: 'List',
      elementType: type,
    };
  }

  while (state.peek('&') || state.peek('|')) {
    type = parseMultipleType(state, type);
  }

  return type;
};
