import path from "node:path";
import * as babel from "@babel/core";
import { jsxCssPlugin } from "./plugin.js";
export async function transform(fileName, code) {
    const parserPlugins = ["jsx"];
    if (/\.[cm]?tsx?$/i.test(fileName)) {
        parserPlugins.push("typescript");
    }
    const state = { css: "" };
    const result = await babel.transformAsync(code, {
        plugins: [[jsxCssPlugin, state]],
        parserOpts: {
            plugins: parserPlugins,
        },
        filename: path.basename(fileName),
        ast: false,
        sourceMaps: true,
        configFile: false,
        babelrc: false,
        sourceFileName: fileName,
    });
    if (result)
        return { code: result.code ?? "", map: result.map, css: state.css };
    throw new Error(`Error occured while trying to transform '${fileName}'`);
}
