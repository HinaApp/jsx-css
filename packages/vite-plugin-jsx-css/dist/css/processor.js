// From: https://github.com/vuejs/core/blob/HEAD/packages/compiler-sfc/src/compileStyle.ts
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */
import postcss from "postcss";
import nestingPlugin from "postcss-nesting";
import scopedPlugin from "./scopedPlugin.js";
import trimPlugin from "./trimPlugin.js";
export function compileStyle(options) {
    return doCompileStyle({
        ...options,
        isAsync: false,
    });
}
export function compileStyleAsync(options) {
    return doCompileStyle({
        ...options,
        isAsync: true,
    });
}
export function doCompileStyle(options) {
    const { filename, id, scoped = true, postcssOptions, postcssPlugins, isAsync, inMap } = options;
    const map = inMap;
    const source = options.source;
    const longId = `s\\:${id}`;
    const plugins = [...(postcssPlugins ?? []), nestingPlugin, trimPlugin()];
    if (scoped) {
        plugins.push(scopedPlugin(longId));
    }
    const postCSSOptions = {
        ...postcssOptions,
        to: filename,
        from: filename,
    };
    if (map) {
        postCSSOptions.map = {
            inline: false,
            annotation: false,
            prev: map,
        };
    }
    let result;
    let code;
    let outMap;
    // stylus output include plain css. so need remove the repeat item
    const dependencies = new Set([]);
    // sass has filename self when provided filename option
    dependencies.delete(filename);
    const errors = [];
    const recordPlainCssDependencies = (messages) => {
        for (const msg of messages) {
            if (msg.type === "dependency") {
                // postcss output path is absolute position path
                dependencies.add(msg.file);
            }
        }
        return dependencies;
    };
    try {
        result = postcss(plugins).process(source, postCSSOptions);
        // In async mode, return a promise.
        if (isAsync) {
            return result
                .then((result) => ({
                code: result.css || "",
                map: result.map.toJSON(),
                errors,
                rawResult: result,
                dependencies: recordPlainCssDependencies(result.messages),
            }))
                .catch((error) => ({
                code: "",
                map: undefined,
                errors: [...errors, error],
                rawResult: undefined,
                dependencies,
            }));
        }
        recordPlainCssDependencies(result.messages);
        // force synchronous transform (we know we only have sync plugins)
        code = result.css;
        outMap = result.map;
    }
    catch (error) {
        errors.push(error);
    }
    return {
        code: code ?? ``,
        map: outMap && outMap.toJSON(),
        errors,
        rawResult: result,
        dependencies,
    };
}
