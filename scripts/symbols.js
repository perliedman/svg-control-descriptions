const fs = require("fs");
const path = require("path");
const { DOMParser, XMLSerializer, DOMImplementation } = require("@xmldom/xmldom");

const getSvg = (symbol) => {
  const bounds = getBounds(symbol);
  const width = bounds[2] - bounds[0];
  const height = bounds[3] - bounds[1];
  const viewBox = `${bounds[0]} ${bounds[1]} ${width} ${height}`;

  return {
    type: "svg",
    attrs: {
      fill: "transparent",
      viewBox,
      width: `${width}px`,
      height: `${height}px`,
    },
    children: paths("lines", false, false, symbol)
      .concat(paths("polygon", false, true, symbol))
      .concat(paths("filled-polygon", true, true, symbol))
      .concat(circles("circle", false, symbol))
      .concat(circles("filled-circle", true, symbol))
      .concat(beziers("beziers", false, symbol))
      .concat(beziers("filled-beziers", false, symbol)),
  };
};

const getLang = (symbol) => ({
  kind: symbol.getAttribute("kind"),
  names: buildDict(symbol, "name", "lang"),
  texts: buildDict(symbol, "text", "lang"),
});

const buildDict = (element, tagName, attr) =>
  Array.from(element.getElementsByTagName(tagName)).reduce((a, name) => {
    a[name.getAttribute(attr)] = name.textContent;
    return a;
  }, {});

const createSvgNode = (document, n) => {
  const node = document.createElementNS("http://www.w3.org/2000/svg", n.type);
  n.id && (node.id = n.id);
  n.attrs &&
    Object.keys(n.attrs).forEach((attrName) =>
      node.setAttribute(attrName, n.attrs[attrName])
    );
  n.children &&
    n.children.forEach((child) =>
      node.appendChild(createSvgNode(document, child))
    );

  return node;
};

const paths = (tag, fill, closed, symbol) =>
  Array.from(symbol.getElementsByTagName(tag)).map((p) => {
    const points = Array.from(p.getElementsByTagName("point"));

    return {
      type: "path",
      attrs: {
        stroke: "black",
        fill: fill ? "black" : "none",
        "stroke-width": p.getAttribute("thickness"),
        "stroke-linejoin":
          p.getAttribute("corners") !== "round" ? "miter" : "round",
        d: points
          .map((p, i) => `${i === 0 ? "M" : "L"} ${svgCoord(p)}`)
          .concat(closed ? ["Z"] : [])
          .join(" "),
      },
    };
  });

const beziers = (tag, fill, symbol) =>
  Array.from(symbol.getElementsByTagName(tag)).map((b) => {
    const points = Array.from(b.getElementsByTagName("point"));
    const bs = [];
    for (let i = 1; i <= points.length; i += 3) {
      bs.push(points.slice(i, i + 3));
    }

    return {
      type: "path",
      attrs: {
        stroke: "black",
        fill: fill ? "black" : "none",
        "stroke-width": b.getAttribute("thickness"),
        d: [`M ${svgCoord(points[0])}`]
          .concat(
            bs.map((b) =>
              b
                .map((p, i) => `${i === 0 ? "C " : ", "} ${svgCoord(p)}`)
                .join("")
            )
          )
          .join(" "),
      },
    };
  });

const circles = (tag, fill, symbol) =>
  Array.from(symbol.getElementsByTagName(tag)).map((c) => ({
    type: "circle",
    attrs: {
      cx: Number(c.getElementsByTagName("point")[0].getAttribute("x")),
      cy: -Number(c.getElementsByTagName("point")[0].getAttribute("y")),
      r: Number(c.getAttribute("radius")),
      stroke: "black",
      fill: fill ? "black" : "none",
      "stroke-width": c.getAttribute("thickness"),
    },
  }));

const getBounds = (symbol) => {
  const bounds = [
    Number.MAX_VALUE,
    Number.MAX_VALUE,
    -Number.MAX_VALUE,
    -Number.MAX_VALUE,
  ];

  const features = flatten(
    ["lines", "polygon", "filled-polygon", "beziers", "filled-beziers"].map(
      (tagName) => Array.from(symbol.getElementsByTagName(tagName))
    )
  );
  for (feature of features) {
    const r = Number(feature.getAttribute("thickness"));
    for (point of Array.from(feature.getElementsByTagName("point"))) {
      const cx = Number(point.getAttribute("x"));
      const cy = -Number(point.getAttribute("y"));
      extendBounds(cx + r, cy);
      extendBounds(cx - r, cy);
      extendBounds(cx, cy + r);
      extendBounds(cx, cy - r);
    }
  }
  const circles = flatten(
    ["circle", "filled-circle"].map((tagName) =>
      Array.from(symbol.getElementsByTagName(tagName))
    )
  );
  for (circle of circles) {
    const cx = Number(
      circle.getElementsByTagName("point")[0].getAttribute("x")
    );
    const cy = -Number(
      circle.getElementsByTagName("point")[0].getAttribute("y")
    );
    const r =
      Number(circle.getAttribute("radius")) +
      Number(circle.getAttribute("thickness"));
    extendBounds(cx + r, cy);
    extendBounds(cx - r, cy);
    extendBounds(cx, cy + r);
    extendBounds(cx, cy - r);
  }

  return bounds;

  function extendBounds(x, y) {
    bounds[0] = Math.min(bounds[0], x);
    bounds[1] = Math.min(bounds[1], y);
    bounds[2] = Math.max(bounds[2], x);
    bounds[3] = Math.max(bounds[3], y);
  }
};

const flatten = (xs) => Array.prototype.concat.apply([], xs);

const svgCoord = (p) =>
  `${Number(p.getAttribute("x"))} ${-Number(p.getAttribute("y"))}`;

const [symbolsPath, outputPath] = process.argv.slice(2);

const symbolXml = fs.readFileSync(symbolsPath, "utf8");
const doc = new DOMParser().parseFromString(symbolXml);
const domImpl = new DOMImplementation();

const lang = {};

Array.from(doc.getElementsByTagName("symbol")).forEach((s) => {
  const svg = getSvg(s);

  if (svg.children.length > 0) {
    const doc = domImpl.createDocument();
    doc.appendChild(
      doc.createProcessingInstruction("xml", 'version="1.0"', 'charset="utf-8"')
    );
    doc.appendChild(createSvgNode(doc, svg));
    const id = s.getAttribute("id");
    const svgPath = path.join(outputPath, `${id}.svg`);
    fs.writeFileSync(
      svgPath,
      new XMLSerializer().serializeToString(doc),
      "utf8"
    );
    lang[id] = getLang(s);
  }
});

fs.writeFileSync(
  path.join(outputPath, "lang.json"),
  JSON.stringify(lang, null, 2)
);
