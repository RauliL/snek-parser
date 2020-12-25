import { Node } from './node';
import { Type } from './type';

export type Parameter = Node & {
  name: string;
  type?: Type;
};
