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
    if (tok_type === "STRING") s = fixEscapes(s);
    else if (tok_type === "LONG_STRING") tok_type = "STRING";
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

  const slashable = "[\\\\nrt\"\']"

  const Tokens = [
    // NOTE: Don't include the following paren
    {name: "PAREN?",                    val: "^\\((?=\\()",    parenIsForExp: true},
    {name: "PARENSPACE",                val: "^\\s+\\(",       parenIsForExp: true},
    {name: "LPAREN?",                   val: "^\\(",           parenIsForExp: true},


    {name: "IMPORT",                    val: kw("import")},
    {name: "PROVIDE",                   val: kw("provide")},
    {name: "AS",                        val: kw("as")},
    {name: "VAR",                       val: kw("var")},
    {name: "VAL",                       val: kw("val")},
    {name: "LETREC",                    val: kw("letrec")},
    {name: "LET",                       val: kw("let")},
    {name: "FUN",                       val: kw("fun")},
    {name: "LAM",                       val: kw("lam")},
    {name: "TRUE",                      val: kw("true")},
    {name: "FALSE",                     val: kw("false")},
    {name: "METHOD",                    val: kw("method")},
    {name: "DOC",                       val: kw("doc:")},
    {name: "WHERE",                     val: kw("where:")},
    {name: "EXAMPLESCOLON",             val: kw("examples:")},
    {name: "CHECKCOLON",                val: kw("check:")},
    {name: "EXAMPLES",                  val: kw("examples")},
    {name: "CHECK",                     val: kw("check")},
    {name: "TRY",                       val: kw("try:")},
    {name: "EXCEPT",                    val: kw("except")},
    {name: "CASES",                     val: kw("cases")},
    {name: "WHEN",                      val: kw("when")},
    {name: "ASKCOLON",                  val: kw("ask:")},
    {name: "OTHERWISECOLON",            val: kw("otherwise:")},
    {name: "IF",                        val: kw("if")},
    {name: "THENCOLON",                 val: kw("then:")},
    {name: "ELSECOLON",                 val: kw("else:")},
    {name: "ELSEIF",                    val: kw("else if")},
    {name: "ELSE",                      val: kw("else")},
    {name: "DATA",                      val: kw("data")},
    {name: "WITH",                      val: kw("with:")},
    {name: "SHARING",                   val: kw("sharing:")},
    {name: "SHADOW",                    val: kw("shadow")},
    {name: "MUTABLE",                   val: kw("mutable")},
    {name: "CYCLIC",                    val: kw("cyclic")},
    {name: "DATATYPE",                  val: kw("datatype")},
    {name: "WITHCONSTRUCTOR",           val: kw("with constructor")},
    {name: "GRAPH",                     val: kw("graph:")},
    {name: "BLOCK",                     val: kw("block:")},
    {name: "FOR",                       val: kw("for")},
    {name: "FROM",                      val: kw("from")},
    {name: "END",                       val: kw("end")},
    {name: "LAZY",                      val: kw("lazy")},

    {name: "DOT",                       val: "^\\."},
    {name: "BANG",                      val: "^!"},
    {name: "PERCENT",                   val: "^%"},
    {name: "COMMA",                     val: "^,",             parenIsForExp: true},
    {name: "THINARROW",                 val: "^->"},
    {name: "THICKARROW",                val: "^=>" + ws_after, parenIsForExp: true},
    {name: "COLONEQUALS",               val: "^:=",            parenIsForExp: true},
    {name: "COLONCOLON",                val: "^::" + ws_after},
    {name: "COLON",                     val: "^:",             parenIsForExp: true},
    {name: "BAR",                       val: "^\\|"},

    {name: "RATIONAL",                  val: "^-?[0-9]+/[0-9]+"},
    {name: "NUMBER",                    val: "^-?[0-9]+(?:\\.[0-9]+)?"},
    // NOTE: Allow unescaped newlines
    {name: "LONG_STRING",               val: "^```(?:" +
                                             "\\\\[01234567]{1,3}" +
                                             "|\\\\x[0-9a-fA-F]{1,2}" +
                                             "|\\\\u[0-9a-fA-f]{1,4}" +
                                             "|\\\\[\\\\nrt\"\']" +
                                             "|[^`])*```"},
    {name: "STRING",                    val: "^\"(?:" +
                                             "\\\\[01234567]{1,3}" +
                                             "|\\\\x[0-9a-fA-F]{1,2}" +
                                             "|\\\\u[0-9a-fA-f]{1,4}" +
                                             "|\\\\[\\\\nrt\"\']" +
                                             "|[^\\\\\"\n\r])*\""},
    {name: "STRING",                    val: "^\'(?:" +
                                             "\\\\[01234567]{1,3}" +
                                             "|\\\\x[0-9a-fA-F]{1,2}" +
                                             "|\\\\u[0-9a-fA-f]{1,4}" +
                                             "|\\\\[\\\\nrt\"\']" +
                                             "|[^\\\\\'\n\r])*\'"},

    {name: "CARET",                     val: op("\\^"),        parenIsForExp: true},
    {name: "PLUS",                      val: op("\\+"),        parenIsForExp: true},
    {name: "DASH",                      val: op("-"),          parenIsForExp: true},
    {name: "STAR",                      val: op("\\*"),        parenIsForExp: true},
    {name: "SLASH",                     val: op("/"),          parenIsForExp: true},
    {name: "LEQ",                       val: op("<="),         parenIsForExp: true},
    {name: "GEQ",                       val: op(">="),         parenIsForExp: true},
    {name: "EQUALEQUAL",                val: op("=="),         parenIsForExp: true},
    {name: "NEQ",                       val: op("<>"),         parenIsForExp: true},
    {name: "LT",                        val: op("<"),          parenIsForExp: true},
    {name: "GT",                        val: op(">"),          parenIsForExp: true},
    {name: "AND",                       val: op("and"),        parenIsForExp: true},
    {name: "OR",                        val: op("or"),         parenIsForExp: true},
    {name: "IS",                        val: op("is"),         parenIsForExp: true},
    {name: "SATISFIES",                 val: op("satisfies"),  parenIsForExp: true},
    {name: "RAISES",                    val: op("raises"),     parenIsForExp: true},

    {name: "LBRACK",                    val: "^\\["},
    {name: "RBRACK",                    val: "^\\]"},
    {name: "LBRACE",                    val: "^\\{"},
    {name: "RBRACE",                    val: "^\\}"},
    {name: "RPAREN",                    val: "^\\)"},
    {name: "LANGLE",                    val: "^<"},
    {name: "RANGLE",                    val: "^>"},

    {name: "EQUALS",                    val: "^=",             parenIsForExp: true},

    {name: "COMMENT",                   val: "^#.*(?:\\n|\\r|\\r\\n|\\n\\r|$)"},
    {name: "WS",                        val: "^\\s+",          parenIsForExp: true},

    {name: "SEMI",                      val: "^;"},
    {name: "BACKSLASH",                 val: "^\\\\"},

    {name: "NAME",                      val: "^[_a-zA-Z][-_a-zA-Z0-9]*"},

    {name: "UNTERMINATED-STRING",       val: "^[\"\'].*"},
    {name: "UNKNOWN",                   val: "^[^]"},
  ];
  for (var i = 0; i < Tokens.length; i++) {
    var tok = Tokens[i];
    tok.val = new RegExp(tok.val, STICKY_REGEXP)
  }


  return {
    'Tokenizer': new Tokenizer(true, Tokens)
  };
});
