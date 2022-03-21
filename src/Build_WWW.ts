
/*
 * Permissions:
 *   Nunjucks: requires permission to read ./ (CWD)
 */

import {emptyDir, existsSync, ensureDirSync, ensureDir} from "https://deno.land/std/fs/mod.ts";
import nunjucks from "https://deno.land/x/nunjucks/mod.js";
import {verbose} from "./CLI.ts";
import {throw_on_fail, run} from "./Process.ts";
import {download} from "./FS.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import { bold, yellow } from "https://deno.land/std/fmt/colors.ts";

const DEFAULT_OPTIONS = {
  "worker.ts": "./src/worker.ts",
  "worker.js": "./dist/worker.mjs",
  "html": {},
  "public": "./src/Public",
  "public_dist": "./dist/Public"
};

function _run(cmd: string) {
  return throw_on_fail(run(cmd, "inherit", "verbose"));
} // async function

export async function css(file_path: string) {
  const { success, stdout, stderr } = await _run(`npx lessc ${file_path.replace(/\.css$/, ".less")}`);
  if (!success)
    throw new Error(stderr);
  return stdout;
} // export async function

export async function js(file_path: string) {
  const { stdout } = await _run(`deno bundle ${file_path.replace(/\.js$/, ".ts")}`);
  return stdout;
} // export async function

export function html(file_path: string, site: Record<string, any>) {
  return(
    nunjucks.render(file_path.replace(/\.html/, ".njk"), site)
  );
} // export function

function print_wrote(x: string) {
  console.error(`=== ${bold('Wrote')}: ${yellow(x)}`);
} // function

export async function build_worker(WORKER_TS: string, WORKER_JS: string) {
  const filename = WORKER_TS;
  const new_file = WORKER_JS;
  const { stdout } = await _run(`deno bundle ${filename}`);
  await ensureDir(path.dirname(new_file));
  await Deno.writeTextFile(new_file, stdout);
  print_wrote(new_file);
} // export async function

export async function build_public(in_dir: string, out_dir: string, site: Record<string, any>) {
  await ensureDir(out_dir);
  await emptyDir(out_dir);

  const promises: Promise<void>[] = [];
  const { stdout } = await _run(
    `find ${in_dir} -type f -iname *.less -o -iname *.ts -o -iname *.njk`,
  );
  const files = stdout.split("\n").filter(
    (x) => x.trim() !== "" && path.basename(x).charAt(0) !== "_"
  );
  assert_files_in(in_dir, files);

  for (const d of new Set(files.map((x) => path.dirname(x)))) {
    await ensureDir(d.replace(in_dir, out_dir));
  }

  for (const f of files) {
    promises.push(compile_file(in_dir, out_dir, f, site));
  }
  return await Promise.all(promises);
} // export async function

async function compile_file(in_dir: string, out_dir: string, filename: string, site: Record<string, any>) {
  const ext = path.extname(filename);
  switch (ext) {
    case ".ts": {
      const new_file = filename.replace(in_dir, out_dir).replace(/.ts$/, ".js");
      const content = await js(filename);
      await Deno.writeTextFile(new_file, content);
      print_wrote(new_file);
      break;
    }
    case ".less": {
      const new_file = filename.replace(in_dir, out_dir).replace(
        /.less$/,
        ".css",
      );
      const  stdout = await css(filename);
      await Deno.writeTextFile(new_file, stdout);
      print_wrote(new_file);
      break;
    }
    case ".njk": {
      const new_file = filename.replace(in_dir, out_dir).replace(
        /\.njk$/,
        ".html",
      );
      await Deno.writeTextFile(new_file, html(filename, site));
      print_wrote(new_file);
      break;
    }
  } // switch
} // async function

function assert_files_in(dir: string, files: string[]) {
  if (files.length === 0) {
    throw new Error(`--- No files found in: ${dir}`);
  }
} // function

export async function build_www(group: "css"|"js"|"html", public_path: string, RAW_CONFIG: Record<string, any>) {
  const CONFIG      = Object.assign({}, DEFAULT_OPTIONS, RAW_CONFIG);
  const PUBLIC      = CONFIG.public;
  const HTML_CONFIG = CONFIG.html || {};
  const filepath = path.join(PUBLIC, public_path);

  switch (group) {
    case "css": {
      console.log(
        await css(filepath)
      );
      break;
    }

    case "js": {
      console.log(
        await js(filepath)
      );
      break;
    }

    case "html": {
      console.log(
        html(filepath, HTML_CONFIG)
      )
      break;
    }
  } // switch

} // export async function

export async function download_normalize_css(vendor: string) {
  return await verbose(
    download,
    "https://necolas.github.io/normalize.css/latest/normalize.css",
    path.join(vendor, "normalize.css")
  );
} // export async function

export async function download_alpine_js(vendor: string) {
  return await verbose(
    download,
    "https://unpkg.com/alpinejs@latest/dist/cdn.min.js",
    path.join(vendor, "alpine.js")
  );
} // export async function

export async function build_update(src_dir: string) {
  const vendor = path.join(src_dir, "vendor");
  await ensureDir(vendor);
  return await Promise.all([
    download_normalize_css(vendor),
    download_alpine_js(vendor)
  ]);
} // export async function

export async function build_app(group: "app"|"public"|"worker"|"update", RAW_CONFIG: Record<string, any>) {
  const CONFIG      = Object.assign({}, DEFAULT_OPTIONS, RAW_CONFIG);
  const PUBLIC      = CONFIG.public;
  const PUBLIC_DIST = CONFIG.public_dist;
  const HTML_CONFIG = CONFIG.html || {};
  const WORKER_TS   = CONFIG["worker.ts"];
  const WORKER_JS   = CONFIG["worker.js"];

  switch (group) {
    case "app": {
      await Promise.all([
        build_public(PUBLIC, PUBLIC_DIST, HTML_CONFIG),
        build_worker(WORKER_TS, WORKER_JS)
      ]);
      break;
    }

    case "public": {
      await build_public(PUBLIC, PUBLIC_DIST, HTML_CONFIG);
      break;
    }

    case "worker": {
      await build_worker(WORKER_TS, WORKER_JS);
      break;
    }

    case "update": {
      await build_update(PUBLIC);
      break;
    }

    default: {
      throw new Error(`!!! Unknown build_app command: ${group}`);
    }
  } // switch

} // export async function
