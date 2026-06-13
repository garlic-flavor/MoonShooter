import { $ } from "jquery";
import * as L from "leaflet";

import type * as T from "./type.mts";

// 地球の半径(m)(赤道の値。ただし、ここで地球は真球と近似する。)
// https://ja.wikipedia.org/wiki/%E5%9C%B0%E7%90%83%E5%8D%8A%E5%BE%84
const EARTH_RADIUS = 6378136.6; // m
const EARTH_CIRCLE = EARTH_RADIUS * 2 * Math.PI;

const TO_RADIAN = Math.PI / 180;

//--------------------------------------------------------------------
// タイル位置から、標高タイル画像のURLを得る。
function getURL(p: L.Point, zoom: number): string {
  if (0 <= zoom && zoom <= 14) {
    return `https://cyberjapandata.gsi.go.jp/xyz/dem_png/${zoom}/${p.x}/${p.y}.png`;
  } else {
    return `https://cyberjapandata.gsi.go.jp/xyz/dem5a_png/15/${p.x}/${p.y}.png`;
  }
}

//--------------------------------------------------------------------
// 画像サーバキャッシュ付き
// $canvasのキャッシュ。
const cache = new Map();
// 古いキャッシュは消す。
const MAX_CACHE = 20;
async function get$canvas(
  tile: L.Point,
  zoom: number,
): Promise<JQuery<HTMLCanvasElement>> {
  const key = { x: tile.x, y: tile.y, z: zoom };
  // 既存のタイルだった。
  if (cache.has(key)) {
    return cache.get(key);
  }
  // 新しいタイルだった。
  // キャッシュを切り詰める。
  if (MAX_CACHE < cache.size) {
    cache.delete(cache.keys().next().value);
  }
  const url = getURL(tile, zoom);
  // 画像を追加する。
  const img = (
    (await new Promise((resolve, reject) => {
      $("<img>").on("load", resolve).on("error", reject).attr({
        crossOrigin: "Anonymous",
        src: url,
      });
    })) as Event
  ).target as HTMLImageElement;
  if (!img) {
    throw `failed to load ${url}.`;
  }
  // canvasに描画する。
  const $canvas = $("<canvas>").attr({
    width: img.width,
    height: img.height,
    src: img.src,
  }) as JQuery<HTMLCanvasElement>;
  const ctx = $canvas[0]?.getContext("2d");
  if (!ctx) {
    throw `failed to getContext: ${tile} / ${zoom}`;
  }
  ctx.drawImage(img, 0, 0);
  // キャッシュに保存する。
  cache.set(key, $canvas);
  return $canvas;
}

//--------------------------------------------------------------------
// 座標からタイルの位置を得る。
function getTileXYFromCoord(p: L.Point): L.Point {
  return L.point(Math.floor(p.x / 256), Math.floor(p.y / 256));
}

//--------------------------------------------------------------------
// 座標からタイル上での位置を得る。
function getPointOnTileFromCoord(p: L.Point): L.Point {
  return L.point(Math.floor(p.x % 256), Math.floor(p.y % 256));
}

//--------------------------------------------------------------------
// あるズームレベルにおけるマップの全サイズ(ピクセル)
function getMapSize(z: number): number {
  return 256 * 2 ** z;
}

//--------------------------------------------------------------------
// 指定のズームレベル、緯度で1pixelが何メートルになるか。
// ただし、地球は球であると近似する。
function getLengthOfPixel(zoom: number, lat: number) {
  return (EARTH_CIRCLE * Math.cos(lat * TO_RADIAN)) / getMapSize(zoom);
}

//--------------------------------------------------------------------
// 標高地図の色情報から標高を得る。
function getHeightFromRGB(r: number, g: number, b: number): number {
  const x = (r << 16) + (g << 8) + b;
  if (x < 1 << 23) {
    return x * 0.01;
  } else if (1 << 23 < x) {
    return ((x - 1) << 24) * 0.01;
  } else {
    return Number.NaN;
  }
}

//--------------------------------------------------------------------
// 標高画像を格納したcanvas要素から標高を得る。
function getHeightFrom$canvas(
  $canvas: JQuery<HTMLCanvasElement>,
  p: L.Point,
): number {
  const data =
    $canvas[0]?.getContext("2d")?.getImageData(p.x, p.y, 1, 1)?.data ?? null;
  if (data == null || data[0] == null || data[1] == null || data[2] == null) {
    return Number.NaN;
    //throw `failed to getHeightFrom$canvas: ${p}`;
  }
  return getHeightFromRGB(data[0], data[1], data[2]);
}

//--------------------------------------------------------------------
async function getHeightOfCoord(coord: L.Point, zoom: number): Promise<number> {
  const tile = getTileXYFromCoord(coord);
  const p = getPointOnTileFromCoord(coord);
  try {
    const $canvas = await get$canvas(tile, zoom);
    return getHeightFrom$canvas($canvas, p);
  } catch {
    return Number.NaN;
  }
}

//====================================================================
// 緯度経度から標高を得る。
export function getHeight(map: L.Map, latlng: L.LatLng): Promise<number> {
  const zoom = 15;
  const coord = map.project(latlng, zoom);
  return getHeightOfCoord(coord, zoom);
}

//====================================================================
// ドンポイントを得る。
export async function getShadow(
  map: L.Map,
  zoom: number,
  target: L.LatLng, // 地図上の対象の位置
  tip_height: number, // 対象の先端の地表からの高さ。単位はm。
  light: T.LightDir, // 対象の先端から見た光の向き。
  camera_height: number, // 観測者の地表からの高さ。単位はm
  far_distance: number, // 調べる範囲。単位はm
  progress: (p: number) => void,
): Promise<L.LatLng | undefined> {
  // 地球の中心から対象の先端までの距離
  const h0 = tip_height + EARTH_RADIUS;
  // メルカトル図法による地図上の位置。
  const origin = map.project(target, zoom);
  // 影の伸びる方位
  // light.azimuthは北を原点に時計回りを正とする(???)
  const shadow_cos = Math.sin(light.azimuth + Math.PI);
  const shadow_sin = -Math.cos(light.azimuth + Math.PI);

  // 何回調べるか(概算)
  const test_count = Math.ceil(
    far_distance / getLengthOfPixel(zoom, target.lat) / 1.5,
  );
  let prevll = target;
  let prevalt = tip_height;
  let prevdist = 0;
  let prevheight = 0;
  for (let i = 0; ; i++) {
    const coord = L.point(
      origin.x + (i + 1) * 1.5 * shadow_cos,
      origin.y + (i + 1) * 1.5 * shadow_sin,
    );
    const ll = map.unproject(coord, zoom);
    const dist = map.distance(target, ll);
    if (far_distance < dist) {
      break;
    }
    let h = await getHeightOfCoord(coord, zoom);
    if (h == null || Number.isNaN(h)) {
      h = prevheight;
    }

    // 2点が地球の中心を原点とする極座標系で為す角
    const r = dist / EARTH_RADIUS;
    // 影の見かけの標高
    const shadow_alt =
      h0 * Math.cos(r) +
      h0 * Math.sin(r) * Math.tan(r - light.altitude) -
      EARTH_RADIUS;
    // 影がカメラよりも下に来たら、ドンしていると判定する。
    if (shadow_alt <= h + camera_height) {
      // zoom レベル最大で検出し直す。
      if (zoom < 15) {
        return getShadow(
          map,
          15,
          prevll,
          prevalt,
          light,
          camera_height,
          far_distance - prevdist,
          (p) => {
            progress((i + p) / test_count);
          },
        );
      }
      return ll;
    }
    prevll = ll;
    prevalt = shadow_alt;
    prevdist = dist;
    prevheight = h;
    progress((i + 1) / test_count);
  }
  return undefined;
}
