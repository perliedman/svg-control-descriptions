SVG Control Descriptions
========================

[IOF Control Descriptions](https://orienteering.sport/iof/rules/control-descriptions/) for orienteering in SVG formats, with corresponding names in various languages.

In the [`symbols`](symbols/) directory, you will find SVG images of IOF's control descriptions, named according to this standard. You can also find [`lang.json`](symbols/lang.json) which contains the names of these symbols in various languages.

All data in this repository has been extracted from [Purple Pen](https://github.com/petergolde/PurplePen), a free course setting application for orienteering. More specifically, the symbol information has been extracted from [`symbols.xml`](https://github.com/petergolde/PurplePen/blob/master/src/PurplePen/symbols.xml), which contains the same information in the same format.

## License

Licensing of this data is a bit unclear. The best I can find is

> Purple Pen is completely free software.

and

> Purple Pen is open source software.

(Quoted from [Purple Pen's homepage](https://purplepen.golde.org/).) I interpret as this data is free to use.

## Running extraction

If/when Purple Pen update the symbols, you can run the script under `scripts` to extract the symbols and language:

```sh
cd scripts
npm install
node symbols.js [PATH TO symbols.xml] [OUTPUT PATH]
```
