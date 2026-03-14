"use client";

import { DecoratorNode, type SerializedLexicalNode, type Spread } from "lexical";
import type { JSX } from "react";

export type SerializedImageNode = Spread<
  { src: string; alt: string; type: "image"; version: 1 },
  SerializedLexicalNode
>;

export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __alt: string;

  static getType(): string {
    return "image";
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__src, node.__alt, node.__key);
  }

  constructor(src: string, alt: string, key?: string) {
    super(key);
    this.__src = src;
    this.__alt = alt;
  }

  createDOM(): HTMLElement {
    return document.createElement("span");
  }

  updateDOM(): boolean {
    return false;
  }

  isInline(): boolean {
    return false;
  }

  decorate(): JSX.Element {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={this.__src} alt={this.__alt} className="max-w-full h-auto rounded" />;
  }

  static importJSON(data: SerializedImageNode): ImageNode {
    return new ImageNode(data.src, data.alt);
  }

  exportJSON(): SerializedImageNode {
    return { src: this.__src, alt: this.__alt, type: "image", version: 1 };
  }
}

export function $createImageNode(src: string, alt: string): ImageNode {
  return new ImageNode(src, alt);
}
