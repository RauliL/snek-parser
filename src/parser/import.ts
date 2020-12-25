import { IdentifierToken } from 'snek-lexer';

import { ImportSpecifier, NamedImportSpecifier, StarImportSpecifier } from '../types';

import { State } from './state';

const parseNamedImportSpecifier = (state: State): NamedImportSpecifier => {
  const { id: name, position } = state.tokens[state.offset++] as IdentifierToken;
  let alias: string | undefined;

  if (state.peekRead('KeywordAs')) {
    if (!state.peek('Id')) {
      throw new Error("Missing identifier after `as'.");
    }
    alias = (state.tokens[state.offset++] as IdentifierToken).id;
  }

  return {
    position,
    kind: 'Named',
    name,
    alias,
  };
};

const parseStarImportSpecifier = (state: State): StarImportSpecifier => {
  const { position } = state.tokens[state.offset++];
  let name: string;

  if (!state.peekRead('KeywordAs')) {
    throw new Error("Missing `as' after `import *'.");
  }
  if (!state.peek('Id')) {
    throw new Error("Missing identifier after `import * as'.");
  }
  name = (state.tokens[state.offset++] as IdentifierToken).id;

  return {
    position,
    kind: 'Star',
    name,
  };
};

export const parseImportSpecifier = (state: State): ImportSpecifier => {
  if (state.eof()) {
    throw new Error('Unexpected end of input; Missing import speicifer.');
  }
  switch (state.tokens[state.offset].kind) {
    case 'Id':
      return parseNamedImportSpecifier(state);

    case 'Mul':
      return parseStarImportSpecifier(state);

    default:
      throw new Error(`Unexpected ${state.tokens[state.offset].kind}; Missing import specifier.`);
  }
};
