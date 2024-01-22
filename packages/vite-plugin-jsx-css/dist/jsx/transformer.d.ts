import * as babel from "@babel/core";
interface CompileResult {
    code: string;
    map: babel.BabelFileResult["map"];
    css: string;
}
export declare function transform(fileName: string, code: string): Promise<CompileResult>;
export {};
