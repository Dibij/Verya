import { Router } from 'express';
import path from 'path';
import _traverse from '@babel/traverse';
const traverse = ((_traverse as any).default || _traverse) as any;
import * as t from '@babel/types';
import { parseFile } from '../ast/parser.js';
import type { ComponentNode } from '../types.js';

function getJSXTagName(node: t.JSXOpeningElement): string {
  if (t.isJSXIdentifier(node.name)) return node.name.name;
  if (t.isJSXMemberExpression(node.name)) {
    const obj = t.isJSXIdentifier(node.name.object) ? node.name.object.name : '';
    return `${obj}.${node.name.property.name}`;
  }
  return 'unknown';
}

function getJSXClassName(node: t.JSXOpeningElement): string | undefined {
  for (const attr of node.attributes) {
    if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name, { name: 'className' })) {
      if (t.isStringLiteral(attr.value)) return attr.value.value;
      if (
        t.isJSXExpressionContainer(attr.value) &&
        t.isStringLiteral(attr.value.expression)
      ) {
        return attr.value.expression.value;
      }
    }
  }
  return undefined;
}

function buildJSXTree(
  jsxNode: t.JSXElement,
  filePath: string,
  parentId: string,
  counters: Map<string, number>,
): ComponentNode {
  const opening = jsxNode.openingElement;
  const tagName = getJSXTagName(opening);
  const className = getJSXClassName(opening);
  const line = opening.loc?.start.line ?? 0;

  const countKey = `${tagName}:${line}`;
  const count = counters.get(countKey) ?? 0;
  counters.set(countKey, count + 1);

  const id = `${filePath}:${line}:${count}`;
  const isComponent = /^[A-Z]/.test(tagName);

  const node: ComponentNode = {
    id,
    name: isComponent ? tagName : tagName,
    file: filePath,
    line,
    tagName: isComponent ? undefined : tagName,
    className,
    children: [],
  };

  for (const child of jsxNode.children) {
    if (t.isJSXElement(child)) {
      node.children!.push(buildJSXTree(child, filePath, id, counters));
    }
  }

  return node;
}

export function createComponentTreeRouter(projectInfo: { root: string }): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const filePath = req.query.file as string;
    if (!filePath) {
      return res.status(400).json({ error: 'Missing file query param' });
    }

    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(projectInfo.root)) {
      return res.status(403).json({ error: 'Access denied: path outside project root' });
    }

    try {
      const { ast } = await parseFile(resolved);
      const roots: ComponentNode[] = [];
      const counters = new Map<string, number>();

      // Find all exported function/arrow function component declarations
      traverse(ast, {
        ExportDefaultDeclaration(nodePath: any) {
          const decl = nodePath.node.declaration;
          // export default function Component() { ... }
          if (t.isFunctionDeclaration(decl)) {
            nodePath.traverse({
              JSXElement(innerPath: any) {
                if (!innerPath.findParent((p: any) => p.isJSXElement() && p !== innerPath)) {
                  roots.push(buildJSXTree(innerPath.node, resolved, '', counters));
                }
              },
            });
          }
          // export default () => <...>
          if (t.isArrowFunctionExpression(decl) || t.isFunctionExpression(decl)) {
            nodePath.traverse({
              JSXElement(innerPath: any) {
                if (!innerPath.findParent((p: any) => p.isJSXElement() && p !== innerPath)) {
                  roots.push(buildJSXTree(innerPath.node, resolved, '', counters));
                }
              },
            });
          }
        },
        ExportNamedDeclaration(nodePath: any) {
          const decl = nodePath.node.declaration;
          if (t.isFunctionDeclaration(decl) || t.isVariableDeclaration(decl)) {
            nodePath.traverse({
              JSXElement(innerPath: any) {
                if (!innerPath.findParent((p: any) => p.isJSXElement() && p !== innerPath)) {
                  roots.push(buildJSXTree(innerPath.node, resolved, '', counters));
                }
              },
            });
          }
        },
        // Also catch non-exported function components (named, starting with capital)
        FunctionDeclaration(nodePath: any) {
          const name = nodePath.node.id?.name;
          if (!name || !/^[A-Z]/.test(name)) return;
          if (nodePath.parent && t.isExportDefaultDeclaration(nodePath.parent)) return;
          if (nodePath.parent && t.isExportNamedDeclaration(nodePath.parent)) return;

          nodePath.traverse({
            JSXElement(innerPath: any) {
              if (!innerPath.findParent((p: any) => p.isJSXElement() && p !== innerPath)) {
                roots.push(buildJSXTree(innerPath.node, resolved, '', counters));
              }
            },
          });
        },
      });

      return res.json(roots);
    } catch (err) {
      return res.status(500).json({
        error: 'Failed to parse component tree',
        detail: String(err),
      });
    }
  });

  return router;
}
