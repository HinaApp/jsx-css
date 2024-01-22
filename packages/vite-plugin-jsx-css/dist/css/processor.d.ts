import { LazyResult, Result } from "postcss";
import { RawSourceMap } from "source-map-js";
export interface SFCStyleCompileOptions {
    source: string;
    filename: string;
    id: string;
    scoped?: boolean;
    trim?: boolean;
    isProd?: boolean;
    inMap?: RawSourceMap;
    preprocessOptions?: any;
    preprocessCustomRequire?: (id: string) => any;
    postcssOptions?: any;
    postcssPlugins?: any[];
}
export interface SFCAsyncStyleCompileOptions extends SFCStyleCompileOptions {
    isAsync?: boolean;
    modules?: boolean;
}
export interface SFCStyleCompileResults {
    code: string;
    map: RawSourceMap | undefined;
    rawResult: Result | LazyResult | undefined;
    errors: Error[];
    modules?: Record<string, string>;
    dependencies: Set<string>;
}
export declare function compileStyle(options: SFCStyleCompileOptions): SFCStyleCompileResults;
export declare function compileStyleAsync(options: SFCAsyncStyleCompileOptions): Promise<SFCStyleCompileResults>;
export declare function doCompileStyle(options: SFCAsyncStyleCompileOptions): SFCStyleCompileResults | Promise<SFCStyleCompileResults>;
