import { Node } from './node';

export type ImportSpecifierKind = 'Named' | 'Star';

export type ImportSpecifier = Node & {
  kind: ImportSpecifierKind;
  name: string;
};

export type NamedImportSpecifier = ImportSpecifier & {
  kind: 'Named';
  alias?: string;
};

export type StarImportSpecifier = ImportSpecifier & {
  kind: 'Star';
};
