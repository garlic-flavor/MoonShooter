const fs = require("node:fs");
const gt = require("get-tsconfig");
const path = require("node:path");
const { execSync } = require("node:child_process");

//--------------------------------------------------------------------
// フォルダがなかったらコピーする。
// (中身に変更があったかどうかは考慮しない。)
function cpr(src, dst) {
  if (!fs.existsSync(dst)) {
    fs.cpSync(src, dst, { recursive: true, force: true });
    console.log(`${dst} is copied.`);
  }
}

//--------------------------------------------------------------------
// dstよりsrcが新しい場合はtrue
function newer(src, dst) {
  return !fs.existsSync(dst) || fs.statSync(dst).mtime < fs.statSync(src).mtime;
}

//--------------------------------------------------------------------
// srcの方が新しかったらコピーする。
function cp(src, dst) {
  if (newer(src, dst)) {
    fs.cpSync(src, dst, { force: true });
    console.log(`${dst} is copied`);
  }
}

//--------------------------------------------------------------------
// README.mdからGithub Page のindex.htmlを生成する。
// レンダラにcmark-gfmを使う。
function build_page() {
  const target = "./index.html";
  const source = "./README.md";
  const body = execSync(`npx cmark-gfm ${source}`);

  fs.writeFileSync(
    target,
    `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Moon Shooter GithubPage</title>
    <link rel="stylesheet" href="./dist/usage.css">
  </head>
  <body>
    ${body}
  </body>
</html>`,
    { force: true },
  );
  console.log(`${target} is updated`);
}

//--------------------------------------------------------------------
// リリース用。Javascriptライブラリの参照をunpkgに変える。
function hrefToUnpkg() {
  const index = "./dist/index.html";
  const original = fs.readFileSync(index, { encoding: "utf-8", flag: "r" });

  const result = original
    .replace(
      "./scripts/jquery/jquery.module.js",
      "https://unpkg.com/jquery/dist-module/jquery.module.min.js",
    )
    .replace(
      "./scripts/leaflet/leaflet-src.esm.js",
      "https://unpkg.com/leaflet/dist/leaflet-src.esm.js",
    )
    .replace(
      "./scripts/leaflet/leaflet.css",
      "https://unpkg.com/leaflet/dist/leaflet.css",
    )
    .replace(
      "./scripts/suncalc3/suncalc.js",
      "https://unpkg.com/@noim/suncalc3/suncalc.js",
    );

  fs.writeFileSync(index, result, { flush: true });
  console.log("re-linked to unpkg");
}

//--------------------------------------------------------------------
// argをビルドする。
function build(arg) {
  switch (arg) {
    case "all":
      console.log("build all...");
      [
        "leaflet",
        "jquery",
        "suncalc",
        "favicon",
        "license",
        "index",
        "base.css",
        "usage.css",
        "dial.css",
        "page",
        "tsc",
      ].forEach((item) => {
        build(item);
      });
      break;
    case "release":
      console.log("release build...");
      fs.rmSync("./dist", { recursive: true, force: true });
      [
        "favicon",
        "license",
        "index",
        "base.css",
        "usage.css",
        "page",
        "tsc",
      ].forEach((item) => {
        build(item);
      });
      hrefToUnpkg();
      break;
    case "tsc":
      if (
        gt.parseTsconfig("./tsconfig.json").files.reduce((acc, item) => {
          return (
            acc ||
            newer(
              item,
              path.join(
                "dist",
                "scripts",
                `${path.basename(item, ".mts")}.mjs`,
              ),
            )
          );
        }, false)
      ) {
        try {
          execSync("npx tsc");
        } catch (err) {
          console.error("Error occur while Transpiling...");
          console.error(err.stdout.toString());
          break;
        }
        console.log("scripts are updated.");
      }
      break;
    case "page":
      if (newer("./README.md", "./index.html")) {
        build_page();
      }
      break;
    case "leaflet":
      cpr("./node_modules/leaflet/dist/", "./dist/scripts/leaflet");
      break;
    case "jquery":
      cpr("./node_modules/jquery/dist-module", "./dist/scripts/jquery");
      break;
    case "suncalc":
      cpr("./node_modules/@noim/suncalc3", "./dist/scripts/suncalc3");
      break;
    case "favicon":
      cp("./src/favicon.ico", "./dist/favicon.ico");
      break;
    case "index":
      cp("./src/index.html", "./dist/index.html");
      break;
    case "base.css":
      cp("./src/base.css", "./dist/base.css");
      break;
    case "usage.css":
      cp("./src/usage.css", "./dist/usage.css");
      break;
    case "dial.css":
      cp("./src/dial.css", "./dist/dial.css");
      break;
    case "license":
      cp("./LICENSE", "./dist/LICENSE.txt");
      break;
    default:
      console.error("no package.", process.argv[2]);
  }
}

//====================================================================
//
build(process.argv[2]);
