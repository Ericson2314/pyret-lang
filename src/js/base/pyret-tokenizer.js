define(["../../../lib/jglr/jglr"], function(E) {
  const Grammar = E.Grammar
  const Nonterm = E.Nonterm
  const Token = E.Token
  const SrcLoc = E.SrcLoc
  const GenTokenizer = E.Tokenizer;
  const STICKY_REGEXP = E.STICKY_REGEXP;

  const escapes = new RegExp("^(.*?)\\\\([\\\\\"\'nrt]|u[0-9A-Fa-f]{1,4}|x[0-9A-Fa-f]{1,2}|[0-7]{1,3}|[\r\n]{1,2})");
  function fixEscapes(s) {
    var ret = "";
    var match = escapes.exec(s);
    while (match !== null) {
      var esc = match[2];
      ret += match[1];
      s = s.slice(match[0].length);
      if (esc === "\n") {}
      else if (esc === "\r") {}
      else if (esc === "\n\r") {}
      else if (esc === "\r\n") {}
      else if (esc === "n") { ret += "\n"; }
      else if (esc === "r") { ret += "\r"; }
      else if (esc === "t") { ret += "\t"; }
      else if (esc === "\"") { ret += "\""; }
      else if (esc === "'") { ret += "'"; }
      else if (esc === "\\") { ret += "\\"; }
      else if (esc[0] === 'u') { ret += String.fromCharCode(parseInt(esc.slice(1), 16)); }
      else if (esc[0] === 'x') { ret += String.fromCharCode(parseInt(esc.slice(1), 16)); }
      else { ret += String.fromCharCode(parseInt(esc.slice(2), 8)); }
      match = escapes.exec(s);
    }
    ret += s;
    return ret;
  }

  function Tokenizer(ignore_ws, Tokens) {
    GenTokenizer.call(this, ignore_ws, Tokens);
    this.parenIsForExp = true; // initialize this at the beginning of file to true
  }
  Tokenizer.prototype = Object.create(GenTokenizer.prototype);
  Tokenizer.prototype.tokenizeFrom = function(str) {
    GenTokenizer.prototype.tokenizeFrom.call(this, str);
    this.parenIsForExp = true;
  }
  Tokenizer.prototype.makeToken = function (tok_type, s, pos) {
    switch(tok_type) {
    case "STRING": s = fixEscapes(s); break;
    case "LONG_STRING": tok_type = "STRING"; break;
    case "PARENSPACE":
    case "PLUS": case "DASH": case "STAR": case "SLASH": case "LEQ": case "GEQ":
    case "EQUALEQUAL": case "LT": case "GT":
      // Trim off whitespace
      pos = SrcLoc.make(pos.endRow, pos.endCol - 1, pos.endChar - 1, pos.endRow, pos.endCol, pos.endChar);
      break;
    default:
      break;
    }
    return GenTokenizer.prototype.makeToken(tok_type, s, pos);
  }
  Tokenizer.prototype.postProcessMatch = function(tok, match) {
    var tok_type = tok.name;
    if (tok_type === "PAREN?") {
      for (var j = 0; j < this.Tokens.length; j++) {
        if (STICKY_REGEXP !== '') {
          var oldIndex = this.Tokens[j].val.lastIndex;
          this.Tokens[j].val.lastIndex = 0;
        }
        var op = this.Tokens[j].val.exec(match[0]);
        if (STICKY_REGEXP !== '') {
          this.Tokens[j].val.lastIndex = oldIndex;
        }
        if (op !== null) {
          tok_type = this.Tokens[j].name;
          if (tok_type == "LPAREN?")
            tok_type = this.parenIsForExp ? "PARENSPACE" : "PARENNOSPACE";
          break;
        }
      }
    } else if (tok_type == "LPAREN?") {
      tok_type = this.parenIsForExp ? "PARENSPACE" : "PARENNOSPACE";
    }
    this.parenIsForExp = !!tok.parenIsForExp;
    return tok_type;
  }



  function kw(str) { return "^(?:" + str + ")(?![-_a-zA-Z0-9])"; }
  function anyOf(strs) { return "(?:" + strs.join("|") + ")(?![-_a-zA-Z0-9])"; }
  function op(str) { return "^\\s+" + str + "(?=\\s)"; }

  const ws_after = "(?:\\s)"

  const slashable = "[\\\\nrt\"\']"

  const Tokens = [
    // NOTE: Don't include the following paren
    {name: "PAREN?", val: new RegExp("^\\((?=\\()", STICKY_REGEXP), parenIsForExp: true},
    {name: "PARENSPACE", val: new RegExp("^\\s+\\(", STICKY_REGEXP), parenIsForExp: true},
    {name: "LPAREN?", val: new RegExp("^\\(", STICKY_REGEXP), parenIsForExp: true},


    {name: "IMPORT", val: new RegExp(kw("import"), STICKY_REGEXP)},
    {name: "PROVIDE-TYPES", val: new RegExp(kw("provide-types"), STICKY_REGEXP)},
    {name: "PROVIDE", val: new RegExp(kw("provide"), STICKY_REGEXP)},
    {name: "AS", val: new RegExp(kw("as"), STICKY_REGEXP)},
    {name: "CONFIRM", val: new RegExp(kw("confirm"), STICKY_REGEXP)},
    {name: "BLESS", val: new RegExp(kw("bless"), STICKY_REGEXP)},
    {name: "NEWTYPE", val: new RegExp(kw("newtype"), STICKY_REGEXP)},
    {name: "TYPE-LET", val: new RegExp(kw("type-let"), STICKY_REGEXP)},
    {name: "TYPE", val: new RegExp(kw("type"), STICKY_REGEXP)},
    {name: "VAR", val: new RegExp(kw("var"), STICKY_REGEXP)},
    {name: "LETREC", val: new RegExp(kw("letrec"), STICKY_REGEXP)},
    {name: "LET", val: new RegExp(kw("let"), STICKY_REGEXP)},
    {name: "FUN", val: new RegExp(kw("fun"), STICKY_REGEXP)},
    {name: "LAM", val: new RegExp(kw("lam"), STICKY_REGEXP)},
    {name: "TRUE", val: new RegExp(kw("true"), STICKY_REGEXP)},
    {name: "FALSE", val: new RegExp(kw("false"), STICKY_REGEXP)},
    {name: "METHOD", val: new RegExp(kw("method"), STICKY_REGEXP)},
    {name: "DOC", val: new RegExp(kw("doc:"), STICKY_REGEXP)},
    {name: "WHERE", val: new RegExp(kw("where:"), STICKY_REGEXP)},
    {name: "CHECKCOLON", val: new RegExp(kw("check:"), STICKY_REGEXP)},
    {name: "CHECK", val: new RegExp(kw("check"), STICKY_REGEXP)},
    {name: "TRY", val: new RegExp(kw("try:"), STICKY_REGEXP)},
    {name: "EXCEPT", val: new RegExp(kw("except"), STICKY_REGEXP)},
    {name: "CASES", val: new RegExp(kw("cases"), STICKY_REGEXP)},
    {name: "WHEN", val: new RegExp(kw("when"), STICKY_REGEXP)},
    {name: "ASKCOLON", val: new RegExp(kw("ask:"), STICKY_REGEXP)},
    {name: "OTHERWISECOLON", val: new RegExp(kw("otherwise:"), STICKY_REGEXP)},
    {name: "IF", val: new RegExp(kw("if"), STICKY_REGEXP)},
    {name: "THENCOLON", val: new RegExp(kw("then:"), STICKY_REGEXP)},
    {name: "ELSECOLON", val: new RegExp(kw("else:"), STICKY_REGEXP)},
    {name: "ELSEIF", val: new RegExp(kw("else if"), STICKY_REGEXP)},
    {name: "ELSE", val: new RegExp(kw("else"), STICKY_REGEXP)},
    {name: "DATA", val: new RegExp(kw("data"), STICKY_REGEXP)},
    {name: "WITH", val: new RegExp(kw("with:"), STICKY_REGEXP)},
    {name: "SHARING", val: new RegExp(kw("sharing:"), STICKY_REGEXP)},
    {name: "SHADOW", val: new RegExp(kw("shadow"), STICKY_REGEXP)},
    {name: "MUTABLE", val: new RegExp(kw("mutable"), STICKY_REGEXP)},
    {name: "CYCLIC", val: new RegExp(kw("cyclic"), STICKY_REGEXP)},
    {name: "DATATYPE", val: new RegExp(kw("datatype"), STICKY_REGEXP)},
    {name: "WITHCONSTRUCTOR", val: new RegExp(kw("with constructor"), STICKY_REGEXP)},
    {name: "GRAPH", val: new RegExp(kw("graph:"), STICKY_REGEXP)},
    {name: "BLOCK", val: new RegExp(kw("block:"), STICKY_REGEXP)},
    {name: "FOR", val: new RegExp(kw("for"), STICKY_REGEXP)},
    {name: "FROM", val: new RegExp(kw("from"), STICKY_REGEXP)},
    {name: "END", val: new RegExp(kw("end"), STICKY_REGEXP)},
    {name: "LAZY", val: new RegExp(kw("lazy"), STICKY_REGEXP)},

    {name: "DOT", val: new RegExp("^\\.", STICKY_REGEXP)},
    {name: "BANG", val: new RegExp("^!", STICKY_REGEXP)},
    {name: "PERCENT", val: new RegExp("^%", STICKY_REGEXP)},
    {name: "COMMA", val: new RegExp("^,", STICKY_REGEXP), parenIsForExp: true},
    {name: "THINARROW", val: new RegExp("^->", STICKY_REGEXP)},
    {name: "THICKARROW", val: new RegExp("^=>" + ws_after, STICKY_REGEXP), parenIsForExp: true},
    {name: "COLONEQUALS", val: new RegExp("^:=", STICKY_REGEXP), parenIsForExp: true},
    {name: "COLONCOLON", val: new RegExp("^::" + ws_after, STICKY_REGEXP)},
    {name: "COLON", val: new RegExp("^:", STICKY_REGEXP), parenIsForExp: true},
    {name: "BAR", val: new RegExp("^\\|", STICKY_REGEXP)},

    {name: "RATIONAL", val: new RegExp("^-?[0-9]+/[0-9]+", STICKY_REGEXP)},
    {name: "NUMBER", val: new RegExp("^-?[0-9]+(?:\\.[0-9]+)?", STICKY_REGEXP)},

    // NOTE: Allow unescaped newlines
    {name: "LONG_STRING", val:  new RegExp("^```(?:" +
                                           "\\\\[01234567]{1,3}" +
                                           "|\\\\x[0-9a-fA-F]{1,2}" +
                                           "|\\\\u[0-9a-fA-f]{1,4}" +
                                           "|\\\\[\\\\nrt\"\']" +
                                           "|[^`])*```", STICKY_REGEXP)},
    {name: "STRING", val: new RegExp("^\"(?:" +
                                     "\\\\[01234567]{1,3}" +
                                     "|\\\\x[0-9a-fA-F]{1,2}" +
                                     "|\\\\u[0-9a-fA-f]{1,4}" +
                                     "|\\\\[\\\\nrt\"\']" +
                                     "|[^\\\\\"\n\r])*\"", STICKY_REGEXP)},
    {name: "STRING", val: new RegExp("^\'(?:" +
                                     "\\\\[01234567]{1,3}" +
                                     "|\\\\x[0-9a-fA-F]{1,2}" +
                                     "|\\\\u[0-9a-fA-f]{1,4}" +
                                     "|\\\\[\\\\nrt\"\']" +
                                     "|[^\\\\\'\n\r])*\'", STICKY_REGEXP)},

    {name: "CARET", val: new RegExp(op("\\^"), STICKY_REGEXP)},
    {name: "PLUS", val: new RegExp(op("\\+"), STICKY_REGEXP)},
    {name: "DASH", val: new RegExp(op("-"), STICKY_REGEXP)},
    {name: "STAR", val: new RegExp(op("\\*"), STICKY_REGEXP)},
    {name: "SLASH", val: new RegExp(op("/"), STICKY_REGEXP)},
    {name: "LEQ", val: new RegExp(op("<="), STICKY_REGEXP)},
    {name: "GEQ", val: new RegExp(op(">="), STICKY_REGEXP)},
    {name: "EQUALEQUAL", val: new RegExp(op("=="), STICKY_REGEXP)},
    {name: "NEQ", val: new RegExp(op("<>"), STICKY_REGEXP)},
    {name: "LT", val: new RegExp(op("<"), STICKY_REGEXP)},
    {name: "GT", val: new RegExp(op(">"), STICKY_REGEXP)},
    {name: "AND", val: new RegExp(op("and"), STICKY_REGEXP)},
    {name: "OR", val: new RegExp(op("or"), STICKY_REGEXP)},
    {name: "IS", val: new RegExp(op("is"), STICKY_REGEXP)},
    {name: "SATISFIES", val: new RegExp(op("satisfies"), STICKY_REGEXP)},
    {name: "RAISES", val: new RegExp(op("raises"), STICKY_REGEXP)},

    {name: "LBRACK", val: new RegExp("^\\[", STICKY_REGEXP)},
    {name: "RBRACK", val: new RegExp("^\\]", STICKY_REGEXP)},
    {name: "LBRACE", val: new RegExp("^\\{", STICKY_REGEXP)},
    {name: "RBRACE", val: new RegExp("^\\}", STICKY_REGEXP)},
    {name: "RPAREN", val: new RegExp("^\\)", STICKY_REGEXP)},
    {name: "LANGLE", val: new RegExp("^<", STICKY_REGEXP)},
    {name: "RANGLE", val: new RegExp("^>", STICKY_REGEXP)},

    {name: "EQUALS", val: new RegExp("^=", STICKY_REGEXP), parenIsForExp: true},

    {name: "COMMENT", val: new RegExp("^#.*(?:\\n|\\r|\\r\\n|\\n\\r|$)", STICKY_REGEXP)},
    {name: "WS", val: new RegExp("^\\s+", STICKY_REGEXP), parenIsForExp: true},

    {name: "SEMI", val: new RegExp("^;" + ws_after, STICKY_REGEXP), parenIsForExp: true},
    {name: "BACKSLASH", val: new RegExp("^\\\\", STICKY_REGEXP)},

    {name: "NAME", val: new RegExp("^[_a-zA-Z][-_a-zA-Z0-9]*", STICKY_REGEXP)},

    {name: "UNTERMINATED-STRING", val: new RegExp("^[\"\'].*", STICKY_REGEXP)},
    {name: "UNKNOWN", val: new RegExp("^[^]", STICKY_REGEXP)},
  ];


  return {
    'Tokenizer': new Tokenizer(true, Tokens)
  };
});
