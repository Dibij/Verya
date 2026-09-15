import _traverse from '@babel/traverse';
import _generate from '@babel/generator';

const traverse = ((_traverse as any).default || _traverse) as any;
const generate = ((_generate as any).default || _generate) as any;
import * as t from '@babel/types';
import fs from 'fs/promises';
import type { TransformRequest, ProjectInfo } from '../types.js';
import { parseFile } from './parser.js';
import { formatCode } from './formatter.js';
import { transformTailwindClass } from './tailwind.js';

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

function elementMatchesSelector(
  node: t.JSXOpeningElement,
  selector: TransformRequest['selector'],
): boolean {
  const tagName = getTagName(node);
  if (tagName.toLowerCase() !== selector.tagName.toLowerCase()) return false;

  if (selector.className) {
    const className = getClassName(node);
    const selectorTokens = selector.className.split(/\s+/).filter(Boolean);
    const elementTokens = className.split(/\s+/).filter(Boolean);
    const matches = selectorTokens.every((tok) => elementTokens.includes(tok));
    if (!matches) return false;
  }

  return true;
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

function camelToCSS(prop: string): string {
  return prop.replace(/([A-Z])/g, '-$1').toLowerCase();
}

function applyInlineStyleChange(
  openingEl: t.JSXOpeningElement,
  property: string,
  value: string,
): void {
  // Find existing style attribute
  let styleAttr: t.JSXAttribute | undefined;
  for (const attr of openingEl.attributes) {
    if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name, { name: 'style' })) {
      styleAttr = attr;
      break;
    }
  }

  if (!styleAttr) {
    // Create new style attribute: style={{ property: "value" }}
    const objExpr = t.objectExpression([
      t.objectProperty(t.identifier(property), t.stringLiteral(value)),
    ]);
    const newAttr = t.jsxAttribute(
      t.jsxIdentifier('style'),
      t.jsxExpressionContainer(objExpr),
    );
    openingEl.attributes.push(newAttr);
    return;
  }

  // style attribute exists — get object expression
  if (
    !t.isJSXExpressionContainer(styleAttr.value) ||
    !t.isObjectExpression(styleAttr.value.expression)
  ) {
    // Can't handle non-object style (e.g. style={myStyles}) — create/replace
    const objExpr = t.objectExpression([
      t.objectProperty(t.identifier(property), t.stringLiteral(value)),
    ]);
    styleAttr.value = t.jsxExpressionContainer(objExpr);
    return;
  }

  const objExpr = styleAttr.value.expression;

  // Look for existing property
  for (const prop of objExpr.properties) {
    if (t.isObjectProperty(prop)) {
      const keyName = t.isIdentifier(prop.key)
        ? prop.key.name
        : t.isStringLiteral(prop.key)
          ? prop.key.value
          : null;
      if (keyName === property) {
        // Update existing value
        prop.value = t.stringLiteral(value);
        return;
      }
    }
  }

  // Property not found — add it
  objExpr.properties.push(
    t.objectProperty(t.identifier(property), t.stringLiteral(value)),
  );
}

// ─── Tailwind Class Transformation ───────────────────────────────────────────

function applyTailwindClassChange(
  openingEl: t.JSXOpeningElement,
  property: string,
  value: string,
): void {
  let classAttr: t.JSXAttribute | undefined;
  for (const attr of openingEl.attributes) {
    if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name, { name: 'className' })) {
      classAttr = attr;
      break;
    }
  }

  if (!classAttr) {
    // No className — create one
    const newClass = transformTailwindClass('', property, value);
    const newAttr = t.jsxAttribute(
      t.jsxIdentifier('className'),
      t.stringLiteral(newClass),
    );
    openingEl.attributes.push(newAttr);
    return;
  }

  if (t.isStringLiteral(classAttr.value)) {
    const current = classAttr.value.value;
    classAttr.value = t.stringLiteral(transformTailwindClass(current, property, value));
    return;
  }

  if (
    t.isJSXExpressionContainer(classAttr.value) &&
    t.isStringLiteral(classAttr.value.expression)
  ) {
    const current = classAttr.value.expression.value;
    classAttr.value.expression = t.stringLiteral(
      transformTailwindClass(current, property, value),
    );
    return;
  }

  if (
    t.isJSXExpressionContainer(classAttr.value) &&
    t.isTemplateLiteral(classAttr.value.expression) &&
    classAttr.value.expression.quasis.length === 1
  ) {
    const current = classAttr.value.expression.quasis[0]!.value.cooked ?? '';
    const updated = transformTailwindClass(current, property, value);
    classAttr.value.expression.quasis[0]!.value.cooked = updated;
    classAttr.value.expression.quasis[0]!.value.raw = updated;
    return;
  }

  // For complex expressions (e.g. clsx calls) — append a string concat or just add as-is
  // Fallback: add a new className attribute won't work (duplicate), so skip
  // In practice, a simpler approach is to convert to inline style as fallback
  applyInlineStyleChange(openingEl, property, value);
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function applyTransform(
  request: TransformRequest,
  projectInfo: ProjectInfo,
): Promise<string> {
  const { file, selector, changes } = request;
  const { ast, content } = await parseFile(file);

  const matchingElements: t.JSXOpeningElement[] = [];

  // Collect all matching JSX elements
  traverse(ast, {
    JSXOpeningElement(path: any) {
      if (elementMatchesSelector(path.node, selector)) {
        matchingElements.push(path.node);
      }
    },
  });

  const targetIndex = selector.index ?? 0;
  const targetEl = matchingElements[targetIndex];

  if (!targetEl) {
    const found = matchingElements.length;
    throw new Error(
      `Could not find JSX element matching selector (tagName: "${selector.tagName}", className: "${selector.className ?? ''}", index: ${targetIndex}). Found ${found} match(es).`,
    );
  }

  // Determine styling approach
  const useTailwind = projectInfo.hasTailwind;

  // Check if the element already has inline styles — if so, prefer inline for that element
  const hasInlineStyle = targetEl.attributes.some(
    (attr) => t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name, { name: 'style' }),
  );

  // Apply each change
  for (const change of changes) {
    const val = formatStyleValue(change.property, change.value, change.unit);
    if (useTailwind && !hasInlineStyle) {
      applyTailwindClassChange(targetEl, change.property, val);
    } else {
      applyInlineStyleChange(targetEl, change.property, val);
    }
  }

  // Generate new code
  const output = generate(ast, { retainLines: false, compact: false }, content);
  const newContent = output.code;

  // Format with prettier
  const formatted = await formatCode(newContent, file);

  // Write to file
  await fs.writeFile(file, formatted, 'utf-8');

  return formatted;
}
