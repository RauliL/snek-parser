import { Token, TokenKind } from 'snek-lexer';

export class State {
  public readonly tokens: Token[];
  public offset: number;

  public constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.offset = 0;
  }

  public eof(): boolean {
    return this.offset >= this.tokens.length;
  }

  public peek(kind: TokenKind): boolean {
    return !this.eof() && this.tokens[this.offset].kind === kind;
  }

  public peekRead(kind: TokenKind): boolean {
    if (this.peek(kind)) {
      ++this.offset;

      return true;
    }

    return false;
  }

  public skipNewLine(): void {
    if (!this.eof()) {
      const token = this.tokens[this.offset++];

      if (token.kind !== 'NewLine') {
        throw new Error(`Unexpected ${token.kind}; Missing new line.`);
      }
    }
  }
}
