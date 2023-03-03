
git clone React源码 yarn 安装依赖 修改scripts/rollup/build.js文件 注释以下插件 1.

// {  
    //   transform(source) {  
    //     return source.replace(/['"]use strict["']/g, '');  
    //   },  
    // },  
​  
​  
​  
 // isProduction &&  
    //   closure({  
    //     compilation_level: 'SIMPLE',  
    //     language_in: 'ECMASCRIPT_2015',  
    //     language_out:  
    //       bundleType === BROWSER_SCRIPT ? 'ECMASCRIPT5' : 'ECMASCRIPT5_STRICT',  
    //     env: 'CUSTOM',  
    //     warning_level: 'QUIET',  
    //     apply_input_source_maps: false,  
    //     use_types_for_optimization: false,  
    //     process_common_js_modules: false,  
    //     rewrite_polyfills: false,  
    //     inject_libraries: false,  
​  
    //     // Don't let it create global variables in the browser.  
    //     // https://github.com/facebook/react/issues/10909  
    //     assume_function_wrapper: !isUMDBundle,  
    //     renaming: !shouldStayReadable,  
    //   }),  
​  
​  
​  
// shouldStayReadable &&  
    //   prettier({  
    //     parser: 'babel',  
    //     singleQuote: false,  
    //     trailingComma: 'none',  
    //     bracketSpacing: true,  
    //   }),  
​  
​  
​  
 //   renderChunk(source) {  
    //     return Wrappers.wrapBundle(  
    //       source,  
    //       bundleType,  
    //       globalName,  
    //       filename,  
    //       moduleType,  
    //       bundle.wrapWithModuleBoundaries  
    //     );  
    //   },  
    // },  
​  
​  
 // isProduction && stripUnusedImports(pureExternalModules),

修改配置，生成sourcemap

function getRollupOutputOptions(  
  outputPath,  
  format,  
  globals,  
  globalName,  
  bundleType  
) {  
  const isProduction = isProductionBundleType(bundleType);  
​  
  return {  
    file: outputPath,  
    format,  
    globals,  
    freeze: !isProduction,  
    interop: false,  
    name: globalName,  
    sourcemap: true, //修改为true  
    esModule: false,  
  };  
}

修改scripts/rollup/bundles.js 重新赋值bundles文件，设置只打包cjs模块的react和react-dom，减少构建速度

​  
bundles = [  
  {  
    bundleTypes: [  
      // UMD_DEV,  
      // UMD_PROD,  
      // UMD_PROFILING,  
      NODE_DEV,  
      // NODE_PROD,  
      // FB_WWW_DEV,  
      // FB_WWW_PROD,  
      // FB_WWW_PROFILING,  
      // RN_FB_DEV,  
      // RN_FB_PROD,  
      // RN_FB_PROFILING,  
    ],  
    moduleType: ISOMORPHIC,  
    entry: "react",  
    global: "React",  
    externals: [],  
  },  
  {  
    bundleTypes: [  
      // UMD_DEV,  
      // UMD_PROD,  
      // UMD_PROFILING,  
      NODE_DEV,  
      // NODE_PROD,  
      // NODE_PROFILING,  
      // FB_WWW_DEV,  
      // FB_WWW_PROD,  
      // FB_WWW_PROFILING,  
    ],  
    moduleType: RENDERER,  
    entry: "react-dom",  
    global: "ReactDOM",  
    externals: ["react"],  
  },  
];

执行yarn build，即可生成带有sourmap的react代码

修改webapck配置文件，将react库和build代码关联起来

 resolve: {  
        alias: {  
            "react-dom$": path.resolve(  
                __dirname,  
                "../react/build/node_modules/react-dom/cjs/react-dom.development.js"  
            ),  
            react$: path.resolve(  
                __dirname,  
                "../react/build/node_modules/react/cjs/react.development.js"  
            ),  
        },  
    },

即可进行源码调试