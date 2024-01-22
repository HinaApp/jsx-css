import * as t from "@babel/types";
import { compileStyle } from "../css/processor.js";
import { computeHash, PLUGIN_NAME } from "../utils.js";
const JSX_CSS_NS = "s";
function getFunctionName(functionScope) {
    const { node } = functionScope.path;
    if ((t.isFunctionExpression(node) || t.isFunctionDeclaration(node)) && t.isIdentifier(node.id)) {
        return node.id.name;
    }
    return "Anonymous";
}
function addScopedId(functionScope, map) {
    functionScope.path.traverse({
        JSXElement(path) {
            const opening = path.node.openingElement;
            if (
            // <div>, <Item>
            (t.isJSXIdentifier(opening.name) && /^[A-Za-z]/.test(opening.name.name)) ||
                // <div.el> <Popup.Root>
                (t.isJSXMemberExpression(opening.name) &&
                    t.isJSXIdentifier(opening.name.object) &&
                    /^[A-Za-z]/.test(opening.name.object.name))) {
                const value = map.get(functionScope);
                if (!value)
                    return;
                // Check if scoping attribute already exists
                if (opening.attributes.some((attr) => t.isJSXAttribute(attr) &&
                    t.isJSXNamespacedName(attr.name) &&
                    attr.name.namespace.name === JSX_CSS_NS &&
                    attr.name.name.name === value)) {
                    return;
                }
                opening.attributes.push(t.jsxAttribute(t.jsxNamespacedName(t.jsxIdentifier(JSX_CSS_NS), t.jsxIdentifier(value))));
            }
        },
    });
}
export function jsxCssPlugin() {
    const functionStyleMap = new WeakMap();
    return {
        name: PLUGIN_NAME,
        visitor: {
            Program(rootPath, state) {
                // const genId = 0;
                const fileName = state.file.opts.sourceFileName;
                if (!fileName)
                    return;
                let hasStyledJsx = false;
                rootPath.traverse({
                    ReturnStatement(path) {
                        if (t.isTaggedTemplateExpression(path.node.argument) &&
                            t.isCallExpression(path.node.argument.tag) &&
                            t.isIdentifier(path.node.argument.tag.callee) &&
                            t.isJSXElement(path.node.argument.tag.arguments[0]) &&
                            path.node.argument.tag.callee.name === "styled") {
                            const containingFunc = path.scope.getFunctionParent();
                            if (containingFunc) {
                                // Extract the css
                                const id = `v${computeHash(`${fileName}-${getFunctionName(containingFunc)}`)}`;
                                const { code: css } = compileStyle({
                                    id,
                                    filename: fileName,
                                    source: path.node.argument.quasi.quasis[0]?.value?.cooked ?? "",
                                    scoped: true,
                                });
                                functionStyleMap.set(containingFunc, id);
                                const hashedFileName = computeHash(fileName);
                                state.opts.css = `${state.opts.css}\n${css}`;
                                // Add scoping to JSXElement
                                addScopedId(containingFunc, functionStyleMap);
                                // Add import (if not there already)
                                if (!hasStyledJsx) {
                                    hasStyledJsx = true;
                                    const importDecl = t.importDeclaration([], t.stringLiteral(`virtual:${PLUGIN_NAME}/${hashedFileName}.css`));
                                    rootPath.unshiftContainer("body", importDecl);
                                }
                                // Remove wrapping styled(...)``
                                path.get("argument").replaceWith(path.node.argument.tag.arguments[0]);
                            }
                        }
                    },
                });
                rootPath.scope.crawl();
            },
        },
    };
}
