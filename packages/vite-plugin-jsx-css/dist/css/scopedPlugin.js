import selectorParser from "postcss-selector-parser";
const animationNameRE = /^(-\w+-)?animation-name$/;
const animationRE = /^(-\w+-)?animation$/;
const scopedPlugin = (id = "") => {
    const keyframes = Object.create(null);
    const shortId = id.replace(/^data-v-/, "");
    return {
        postcssPlugin: "styled-jsx-scoped",
        Rule(rule) {
            processRule(id, rule);
        },
        AtRule(node) {
            if (/-?keyframes$/.test(node.name) && !node.params.endsWith(`-${shortId}`)) {
                // register keyframes
                keyframes[node.params] = node.params = `${node.params}-${shortId}`;
            }
        },
        OnceExit(root) {
            if (Object.keys(keyframes).length > 0) {
                // If keyframes are found in this <style>, find and rewrite animation names
                // in declarations.
                // Caveat: this only works for keyframes and animation rules in the same
                // <style> element.
                // individual animation-name declaration
                root.walkDecls((decl) => {
                    if (animationNameRE.test(decl.prop)) {
                        decl.value = decl.value
                            .split(",")
                            .map((v) => keyframes[v.trim()] ?? v.trim())
                            .join(",");
                    }
                    // shorthand
                    if (animationRE.test(decl.prop)) {
                        decl.value = decl.value
                            .split(",")
                            .map((v) => {
                            const vals = v.trim().split(/\s+/);
                            const i = vals.findIndex((val) => keyframes[val]);
                            if (i === -1) {
                                return v;
                            }
                            vals.splice(i, 1, keyframes[vals[i]]);
                            return vals.join(" ");
                        })
                            .join(",");
                    }
                });
            }
        },
    };
};
const processedRules = new WeakSet();
function processRule(id, rule) {
    if (processedRules.has(rule) ||
        (rule.parent && rule.parent.type === "atrule" && /-?keyframes$/.test(rule.parent.name))) {
        return;
    }
    processedRules.add(rule);
    rule.selector = selectorParser((selectorRoot) => {
        selectorRoot.each((selector) => {
            rewriteSelector(id, selector, selectorRoot);
        });
    }).processSync(rule.selector);
}
function rewriteSelector(id, selector, selectorRoot, slotted = false) {
    let node = null;
    let shouldInject = true;
    // find the last child node to insert attribute selector
    selector.each((n) => {
        if (n.type === "pseudo") {
            const { value, nodes } = n;
            // deep: inject [id] attribute at the node before the ::v-deep
            // combinator.
            if (value === ":deep") {
                if (nodes.length > 0) {
                    // .foo :deep(.bar) -> .foo[xxxxxxx] .bar
                    // replace the current node with ::v-deep's inner selector
                    let last = n;
                    nodes[0]?.each((ss) => {
                        selector.insertAfter(last, ss);
                        last = ss;
                    });
                    // insert a space combinator before if it doesn't already have one
                    const prev = selector.at(selector.index(n) - 1);
                    if (!prev || !isSpaceCombinator(prev)) {
                        selector.insertAfter(n, selectorParser.combinator({
                            value: " ",
                        }));
                    }
                    n.remove();
                }
                return false;
            }
            // global: replace with inner selector and do not inject [id].
            // :global(.foo) -> .foo
            if (value === ":global") {
                selectorRoot.insertAfter(selector, nodes[0]);
                selector.remove();
                return false;
            }
        }
        if (n.type !== "pseudo" && n.type !== "combinator") {
            node = n;
        }
        if (n.type === "pseudo" && (n.value === ":is" || n.value === ":where")) {
            rewriteSelector(id, n.nodes[0], selectorRoot, slotted);
            shouldInject = false;
        }
    });
    if (node) {
        node.spaces.after = "";
    }
    else {
        // For deep selectors & standalone pseudo selectors,
        // the attribute selectors are prepended rather than appended.
        // So all leading spaces must be eliminated to avoid problems.
        selector.first.spaces.before = "";
    }
    if (shouldInject) {
        const idToAdd = slotted ? `${id}-s` : id;
        selector.insertAfter(
        // If node is null it means we need to inject [id] at the start
        // insertAfter can handle `null` here
        node, selectorParser.attribute({
            attribute: idToAdd,
            value: idToAdd,
            raws: {},
            quoteMark: `"`,
        }));
    }
}
function isSpaceCombinator(node) {
    return node.type === "combinator" && /^\s+$/.test(node.value);
}
scopedPlugin.postcss = true;
export default scopedPlugin;
