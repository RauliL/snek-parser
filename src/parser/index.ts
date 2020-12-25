import { lex } from 'snek-lexer';

import { Statement } from '../types';

import { State } from './state';
import { parseStatement } from './statement';

export const parse = (source: string): Statement[] => {
  const state = new State(lex(source));
  const statements: Statement[] = [];

  while (!state.eof()) {
    statements.push(parseStatement(state, true));
  }

  return statements;
};
