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

  const ws_after = "(?:\\s+)"

  function kw(str) { return "^(?:" + str + ")(?![-_a-zA-Z0-9])"; }
  function anyOf(strs) { return "(?:" + strs.join("|") + ")(?![-_a-zA-Z0-9])"; }
  function op(str) { return "^\\s+" + str + ws_after; }

  function reg(regexp) { return new RegExp(regexp, STICKY_REGEXP) }
  const slashable = "[\\\\nrt\"\']"

  const Tokens = [
    // NOTE: Don't include the following paren
    {name: "PAREN?",                    val: reg("^\\((?=\\()"),    parenIsForExp: true},
    {name: "PARENSPACE",                val: reg("^\\s+\\("),       parenIsForExp: true},
    {name: "LPAREN?",                   val: reg("^\\("),           parenIsForExp: true},


    {name: "IMPORT",                    val: reg(kw("import"))},
    {name: "PROVIDE-TYPES",             val: reg(kw("provide-types"))},
    {name: "PROVIDE",                   val: reg(kw("provide"))},
    {name: "AS",                        val: reg(kw("as"))},
    {name: "CONFIRM",                   val: reg(kw("confirm"))},
    {name: "BLESS",                     val: reg(kw("bless"))},
    {name: "NEWTYPE",                   val: reg(kw("newtype"))},
    {name: "TYPE-LET",                  val: reg(kw("type-let"))},
    {name: "TYPE",                      val: reg(kw("type"))},
    {name: "VAR",                       val: reg(kw("var"))},
    {name: "LETREC",                    val: reg(kw("letrec"))},
    {name: "LET",                       val: reg(kw("let"))},
    {name: "FUN",                       val: reg(kw("fun"))},
    {name: "LAM",                       val: reg(kw("lam"))},
    {name: "TRUE",                      val: reg(kw("true"))},
    {name: "FALSE",                     val: reg(kw("false"))},
    {name: "METHOD",                    val: reg(kw("method"))},
    {name: "DOC",                       val: reg(kw("doc:"))},
    {name: "WHERE",                     val: reg(kw("where:"))},
    {name: "CHECKCOLON",                val: reg(kw("check:"))},
    {name: "CHECK",                     val: reg(kw("check"))},
    {name: "TRY",                       val: reg(kw("try:"))},
    {name: "EXCEPT",                    val: reg(kw("except"))},
    {name: "CASES",                     val: reg(kw("cases"))},
    {name: "WHEN",                      val: reg(kw("when"))},
    {name: "ASKCOLON",                  val: reg(kw("ask:"))},
    {name: "OTHERWISECOLON",            val: reg(kw("otherwise:"))},
    {name: "IF",                        val: reg(kw("if"))},
    {name: "THENCOLON",                 val: reg(kw("then:"))},
    {name: "ELSECOLON",                 val: reg(kw("else:"))},
    {name: "ELSEIF",                    val: reg(kw("else if"))},
    {name: "ELSE",                      val: reg(kw("else"))},
    {name: "DATA",                      val: reg(kw("data"))},
    {name: "WITH",                      val: reg(kw("with:"))},
    {name: "SHARING",                   val: reg(kw("sharing:"))},
    {name: "SHADOW",                    val: reg(kw("shadow"))},
    {name: "MUTABLE",                   val: reg(kw("mutable"))},
    {name: "CYCLIC",                    val: reg(kw("cyclic"))},
    {name: "DATATYPE",                  val: reg(kw("datatype"))},
    {name: "WITHCONSTRUCTOR",           val: reg(kw("with constructor"))},
    {name: "GRAPH",                     val: reg(kw("graph:"))},
    {name: "BLOCK",                     val: reg(kw("block:"))},
    {name: "FOR",                       val: reg(kw("for"))},
    {name: "FROM",                      val: reg(kw("from"))},
    {name: "END",                       val: reg(kw("end"))},
    {name: "LAZY",                      val: reg(kw("lazy"))},

    {name: "DOT",                       val: reg("^\\.")},
    {name: "BANG",                      val: reg("^!")},
    {name: "PERCENT",                   val: reg("^%")},
    {name: "COMMA",                     val: reg("^,"),             parenIsForExp: true},
    {name: "THINARROW",                 val: reg("^->")},
    {name: "THICKARROW",                val: reg("^=>" + ws_after), parenIsForExp: true},
    {name: "COLONEQUALS",               val: reg("^:="),            parenIsForExp: true},
    {name: "COLONCOLON",                val: reg("^::" + ws_after)},
    {name: "COLON",                     val: reg("^:"),             parenIsForExp: true},
    {name: "BAR",                       val: reg("^\\|")},

    {name: "RATIONAL",                  val: reg("^-?[0-9]+/[0-9]+")},
    {name: "NUMBER",                    val: reg("^-?[0-9]+(?:\\.[0-9]+)?")},
    // NOTE: Allow unescaped newlines
    {name: "LONG_STRING",               val: reg("^```(?:" +
                                                 "\\\\[01234567]{1,3}" +
                                                 "|\\\\x[0-9a-fA-F]{1,2}" +
                                                 "|\\\\u[0-9a-fA-f]{1,4}" +
                                                 "|\\\\[\\\\nrt\"\']" +
                                                 "|[^`])*```")},
    {name: "STRING",                    val: reg("^\"(?:" +
                                                 "\\\\[01234567]{1,3}" +
                                                 "|\\\\x[0-9a-fA-F]{1,2}" +
                                                 "|\\\\u[0-9a-fA-f]{1,4}" +
                                                 "|\\\\[\\\\nrt\"\']" +
                                                 "|[^\\\\\"\n\r])*\"")},
    {name: "STRING",                    val: reg("^\'(?:" +
                                                 "\\\\[01234567]{1,3}" +
                                                 "|\\\\x[0-9a-fA-F]{1,2}" +
                                                 "|\\\\u[0-9a-fA-f]{1,4}" +
                                                 "|\\\\[\\\\nrt\"\']" +
                                                 "|[^\\\\\'\n\r])*\'")},

    {name: "CARET",                     val: reg(op("\\^")),        parenIsForExp: true},
    {name: "PLUS",                      val: reg(op("\\+")),        parenIsForExp: true},
    {name: "DASH",                      val: reg(op("-")),          parenIsForExp: true},
    {name: "STAR",                      val: reg(op("\\*")),        parenIsForExp: true},
    {name: "SLASH",                     val: reg(op("/")),          parenIsForExp: true},
    {name: "LEQ",                       val: reg(op("<=")),         parenIsForExp: true},
    {name: "GEQ",                       val: reg(op(">=")),         parenIsForExp: true},
    {name: "EQUALEQUAL",                val: reg(op("==")),         parenIsForExp: true},
    {name: "NEQ",                       val: reg(op("<>")),         parenIsForExp: true},
    {name: "LT",                        val: reg(op("<")),          parenIsForExp: true},
    {name: "GT",                        val: reg(op(">")),          parenIsForExp: true},
    {name: "AND",                       val: reg(op("and")),        parenIsForExp: true},
    {name: "OR",                        val: reg(op("or")),         parenIsForExp: true},
    {name: "IS",                        val: reg(op("is")),         parenIsForExp: true},
    {name: "SATISFIES",                 val: reg(op("satisfies")),  parenIsForExp: true},
    {name: "RAISES",                    val: reg(op("raises")),     parenIsForExp: true},

    {name: "LBRACK",                    val: reg("^\\[")},
    {name: "RBRACK",                    val: reg("^\\]")},
    {name: "LBRACE",                    val: reg("^\\{")},
    {name: "RBRACE",                    val: reg("^\\}")},
    {name: "RPAREN",                    val: reg("^\\)")},
    {name: "LANGLE",                    val: reg("^<")},
    {name: "RANGLE",                    val: reg("^>")},

    {name: "EQUALS",                    val: reg("^="),             parenIsForExp: true},

    {name: "COMMENT",                   val: reg("^#.*(?:\\n|\\r|\\r\\n|\\n\\r|$)")},
    {name: "WS",                        val: reg("^\\s+"),          parenIsForExp: true},

    {name: "SEMI",                      val: reg("^;")},
    {name: "BACKSLASH",                 val: reg("^\\\\")},

    {name: "NAME",                      val: reg("^[_a-zA-Z][-_a-zA-Z0-9]*")},

    {name: "UNTERMINATED-STRING",       val: reg("^[\"\'].*")},
    {name: "UNKNOWN",                   val: reg("^[^]")},
  ];


  return {
    'Tokenizer': new Tokenizer(true, Tokens)
  };
});
