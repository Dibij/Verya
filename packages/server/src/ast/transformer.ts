import _traverse from '@babel/traverse';
import _generate from '@babel/generator';

const traverse = ((_traverse as any).default || _traverse) as any;
const generate = ((_generate as any).default || _generate) as any;
import * as t from '@babel/types';
import fs from 'fs/promises';
import type { TransformRequest, ProjectInfo, SourceLocation } from '../types.js';
import { resolveWithin } from '../lib/safePath.js';
import { parseFile } from './parser.js';
import { formatCode } from './formatter.js';
import { transformTailwindClass, canMapToTailwind } from './tailwind.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getJSXAttributeValue(attr: t.JSXAttribute): string | null {
  if (!attr.value) return null;
  if (t.isStringLiteral(attr.value)) return attr.value.value;
  if (t.isJSXExpressionContainer(attr.value)) {
    const expr = attr.value.expression;
    if (t.isStringLiteral(expr)) return expr.value;
    if (t.isTemplateLiteral(expr) && expr.quasis.length === 1) {
      return expr.quasis[0]!.value.cooked ?? expr.quasis[0]!.value.raw;
    }
  }
  return null;
}

function getClassName(node: t.JSXOpeningElement): string {
  for (const attr of node.attributes) {
    if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name, { name: 'className' })) {
      return getJSXAttributeValue(attr) ?? '';
    }
  }
  return '';
}

function getTagName(node: t.JSXOpeningElement): string {
  if (t.isJSXIdentifier(node.name)) return node.name.name;
  if (t.isJSXMemberExpression(node.name)) {
    const obj = t.isJSXIdentifier(node.name.object) ? node.name.object.name : '';
    return `${obj}.${node.name.property.name}`;
  }
  return '';
}

const DIMENSION_PROPERTIES = new Set([
  'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
  'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'top', 'left', 'right', 'bottom',
  'fontSize', 'borderRadius', 'borderWidth', 'gap',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'letterSpacing',
]);

export function formatStyleValue(property: string, value: string, unit?: string): string {
  if (!value || value === 'auto' || value === 'none' || value === 'inherit' || value === 'initial') {
    return value;
  }
  const trimmed = String(value).trim();
  if (unit && /^-?\d+(\.\d+)?$/.test(trimmed)) {
    return `${trimmed}${unit}`;
  }
  if (DIMENSION_PROPERTIES.has(property) && /^-?\d+(\.\d+)?$/.test(trimmed)) {
    return `${trimmed}px`;
  }
  return trimmed;
}

// ─── Inline Style Transformation ─────────────────────────────────────────────

function findStyleAttr(openingEl: t.JSXOpeningElement): t.JSXAttribute | undefined {
  for (const attr of openingEl.attributes) {
    if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name, { name: 'style' })) {
      return attr;
    }
  }
  return undefined;
}

function styleObjectOf(
  styleAttr: t.JSXAttribute | undefined,
): t.ObjectExpression | null {
  if (
    styleAttr &&
    t.isJSXExpressionContainer(styleAttr.value) &&
    t.isObjectExpression(styleAttr.value.expression)
  ) {
    return styleAttr.value.expression;
  }
  return null;
}

function propertyKeyOf(prop: t.ObjectProperty | t.ObjectMethod): string | null {
  if (t.isIdentifier(prop.key)) return prop.key.name;
  if (t.isStringLiteral(prop.key)) return prop.key.value;
  return null;
}

function makeStyleValue(property: string, value: string): t.Expression {
  if (property === 'opacity' && /^-?\d+(\.\d+)?$/.test(value.trim())) {
    return t.numericLiteral(parseFloat(value));
  }
  return t.stringLiteral(value);
}

function applyInlineStyleChange(
  openingEl: t.JSXOpeningElement,
  property: string,
  value: string,
): void {
  const styleAttr = findStyleAttr(openingEl);

  if (!styleAttr) {
    const objExpr = t.objectExpression([
      t.objectProperty(t.identifier(property), makeStyleValue(property, value)),
    ]);
    openingEl.attributes.push(
      t.jsxAttribute(t.jsxIdentifier('style'), t.jsxExpressionContainer(objExpr)),
    );
    return;
  }

  const objExpr = styleObjectOf(styleAttr);
  if (!objExpr) {
    // style={myStyles} — we cannot safely merge, so replace with an explicit object
    // that preserves the original expression via a spread.
    const original = t.isJSXExpressionContainer(styleAttr.value)
      ? styleAttr.value.expression
      : null;
    const props: Array<t.ObjectProperty | t.SpreadElement> = [];
    if (original && !t.isJSXEmptyExpression(original)) {
      props.push(t.spreadElement(original));
    }
    props.push(t.objectProperty(t.identifier(property), makeStyleValue(property, value)));
    styleAttr.value = t.jsxExpressionContainer(t.objectExpression(props));
    return;
  }

  for (const prop of objExpr.properties) {
    if (!t.isObjectProperty(prop) && !t.isObjectMethod(prop)) continue;
    if (propertyKeyOf(prop) !== property) continue;
    if (t.isObjectProperty(prop)) {
      prop.value = makeStyleValue(property, value);
    } else {
      // Object method shorthand is not valid for a style value.
      objExpr.properties[objExpr.properties.indexOf(prop)] = t.objectProperty(
        t.identifier(property),
        makeStyleValue(property, value),
      );
    }
    return;
  }

  objExpr.properties.push(
    t.objectProperty(t.identifier(property), makeStyleValue(property, value)),
  );
}

// ─── Tailwind Class Transformation ───────────────────────────────────────────

function applyTailwindClassChange(
  openingEl: t.JSXOpeningElement,
  property: string,
  value: string,
): boolean {
  let classAttr: t.JSXAttribute | undefined;
  for (const attr of openingEl.attributes) {
    if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name, { name: 'className' })) {
      classAttr = attr;
      break;
    }
  }

  if (!classAttr) {
    const newClass = transformTailwindClass('', property, value);
    if (!newClass) return false;
    openingEl.attributes.push(
      t.jsxAttribute(t.jsxIdentifier('className'), t.stringLiteral(newClass)),
    );
    return true;
  }

  if (t.isStringLiteral(classAttr.value)) {
    const updated = transformTailwindClass(classAttr.value.value, property, value);
    if (!updated) return false;
    classAttr.value = t.stringLiteral(updated);
    return true;
  }

  if (t.isJSXExpressionContainer(classAttr.value)) {
    const expr = classAttr.value.expression;

    if (t.isStringLiteral(expr)) {
      const updated = transformTailwindClass(expr.value, property, value);
      if (!updated) return false;
      classAttr.value.expression = t.stringLiteral(updated);
      return true;
    }

    if (t.isTemplateLiteral(expr) && expr.quasis.length === 1) {
      const current = expr.quasis[0]!.value.cooked ?? '';
      const updated = transformTailwindClass(current, property, value);
      if (!updated) return false;
      expr.quasis[0]!.value.cooked = updated;
      expr.quasis[0]!.value.raw = updated;
      return true;
    }
  }

  return false;
}

// ─── Element matching ────────────────────────────────────────────────────────

interface Candidate {
  node: t.JSXOpeningElement;
  loc: SourceLocation | null;
}

function matchesSource(loc: SourceLocation | null, target: SourceLocation): boolean {
  if (!loc) return false;
  if (loc.line !== target.line) return false;
  if (target.column == null || loc.column == null) return true;
  return Math.abs(loc.column - target.column) <= 1;
}

function candidatesForSelector(
  candidates: Candidate[],
  selector: TransformRequest['selector'],
): Candidate[] {
  const byTag = candidates.filter(
    (c) => getTagName(c.node).toLowerCase() === selector.tagName.toLowerCase(),
  );

  // 1. Exact source position (most reliable across multi-file projects).
  if (selector.source) {
    const bySource = byTag.filter((c) => matchesSource(c.loc, selector.source!));
    if (bySource.length === 1) return bySource;
    if (bySource.length > 1) return bySource;
  }

  // 2. Fall back to className subset matching.
  if (selector.className) {
    const selectorTokens = selector.className.split(/\s+/).filter(Boolean);
    const byClass = byTag.filter((c) => {
      const elementTokens = getClassName(c.node).split(/\s+/).filter(Boolean);
      return selectorTokens.every((tok) => elementTokens.includes(tok));
    });
    if (byClass.length > 0) return byClass;
  }

  return byTag;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function applyTransform(
  request: TransformRequest,
  projectInfo: ProjectInfo,
): Promise<string> {
  const { selector, changes } = request;
  const file = resolveWithin(projectInfo.root, request.file);

  const { ast, content } = await parseFile(file);

  const candidates: Candidate[] = [];

  traverse(ast, {
    JSXOpeningElement(path: any) {
      const node = path.node as t.JSXOpeningElement;
      candidates.push({
        node,
        loc: node.loc
          ? { line: node.loc.start.line, column: node.loc.start.column }
          : null,
      });
    },
  });

  const matches = candidatesForSelector(candidates, selector);
  const targetIndex = selector.index ?? 0;
  const targetEl = matches[targetIndex]?.node;

  if (!targetEl) {
    throw new Error(
      `Could not find JSX element matching selector (tagName: "${selector.tagName}", ` +
        `className: "${selector.className ?? ''}", index: ${targetIndex}` +
        `${selector.source ? `, line: ${selector.source.line}` : ''}). ` +
        `Found ${matches.length} match(es).`,
    );
  }

  const useTailwind = projectInfo.hasTailwind;
  const hasInlineStyle = findStyleAttr(targetEl) !== undefined;

  for (const change of changes) {
    const val = formatStyleValue(change.property, change.value, change.unit);

    if (useTailwind && !hasInlineStyle && canMapToTailwind(change.property)) {
      const applied = applyTailwindClassChange(targetEl, change.property, val);
      if (applied) continue;
    }

    // Anything Tailwind cannot express (backdrop-filter, box-shadow, compound
    // colours, …) falls back to an inline style instead of being dropped.
    applyInlineStyleChange(targetEl, change.property, val);
  }

  const output = generate(ast, { retainLines: false, compact: false }, content);
  const formatted = await formatCode(output.code, file);

  await fs.writeFile(file, formatted, 'utf-8');

  return formatted;
}
