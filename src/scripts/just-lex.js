const R = require("requirejs");

R(["../../build/phase1/js/pyret-tokenizer", "../../build/phase1/js/pyret-parser", "fs"], function(T, G, fs) {
  const data = fs.readFileSync(process.argv[2], {encoding: "utf-8"});
  const toks = T.Tokenizer;
  toks.tokenizeFrom(data);
  while (toks.hasNext())
    console.log(toks.next().toString(true));
});
