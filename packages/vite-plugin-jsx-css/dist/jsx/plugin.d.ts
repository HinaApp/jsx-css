import * as babel from "@babel/core";
export declare function jsxCssPlugin(): babel.PluginObj<babel.PluginPass & {
    opts: {
        css: string;
    };
}>;
