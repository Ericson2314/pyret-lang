var r = require("requirejs")
define(["js/runtime-anf", "./eval-matchers"], function(rtLib, e) {

  var _ = require('jasmine-node');
  var rt;
  var P;

  function wf_check(s) {
    return "where: blocks only allowed on named function declarations and data, not on " + s;
  }
  function performTest() {

    beforeEach(function() {
      rt = rtLib.makeRuntime({ stdout: function(str) { process.stdout.write(str); } });
      P =  e.makeEvalCheckers(this, rt);
    });
    describe("Well-formedness", function() {
      it("should be well-formed", function(done) {
        P.checkEvalsTo("true and false and true", rt.makeBoolean(false));
        P.checkEvalsTo("1 + 2 + 3 + 4", rt.makeNumber(10));
        P.checkEvalsTo("fun foo():\n" +
                       " var x = 10\n" +
                       " x\n" +
                       "end\n" +
                       "10",
                       rt.makeNumber(10));
        // returns a number because we are really just checking OK parse/wf,
        // and this is (void) otherwise
        P.checkEvalsTo("fun f(): nothing where: 5 + 2 is 7 end 42", rt.makeNumber(42));
        P.checkEvalsTo("fun f(): nothing where: 1 is 2 end 10", rt.makeNumber(10));

        P.wait(done);
      });
      it("mixed operators should be malformed", function(done) {
        P.checkCompileErrorMsg("true and false or true", "Cannot mix binary operators of different types");
        P.checkCompileErrorMsg("1 + 2 - 3", "Cannot mix binary operators of different types");
        P.checkCompileErrorMsg("1 + 2 + 3 * 4", "Cannot mix binary operators of different types");
        P.checkCompileErrorMsg("1 / 2 + 3 * 4 - 5", "Cannot mix binary operators of different types");

        P.wait(done);
      });
      it("nullary methods", function(done) {
        P.checkCompileErrorMsg("method(): nothing end", "Cannot have a method with zero arguments");
        P.checkCompileErrorMsg("{foo(): nothing end}", "Cannot have a method with zero arguments");

        P.wait(done);
      });
      it("multiple statements on a line", function(done) {
        P.checkCompileErrorMsg("fun f(x): f x end", "Found two expressions on the same line");
        P.checkCompileErrorMsg("fun f(x): f (x) end", "Found two expressions on the same line");
        P.checkEvalsTo("fun f(x): f\n (x) end\n10", rt.makeNumber(10));
        P.checkEvalsTo("fun f(x):\n  f\n  # a comment\n  (x)\nend\n10", rt.makeNumber(10));
        P.wait(done);
      });
      it("malformed blocks", function(done) {
        P.checkCompileErrorMsg("fun foo():\n" +
                               " x = 10\n" +
                               "end\n" +
                               "10",
                               "Cannot end a block in a let-binding");
        P.checkCompileErrorMsg("fun foo():\n" +
                               " var x = 10\n" +
                               "end\n" +
                               "10",
                               "Cannot end a block in a var-binding");
        P.checkCompileErrorMsg("fun foo():\n" +
                               " fun f(): nothing end\n" +
                               "end\n" +
                               "10",
                               "Cannot end a block in a fun-binding");
        P.checkCompileErrorMsg("lam(): x = 5 end", "Cannot end a block in a let-binding");
        P.checkCompileErrorMsg("lam(): var x = 5 end", "Cannot end a block in a var-binding");
        P.checkCompileErrorMsg("lam(): fun f(): nothing end end", "Cannot end a block in a fun-binding");
        P.checkCompileErrorMsg("lam(): x = 5\n fun f(): nothing end end", "Cannot end a block in a fun-binding");
        P.checkCompileErrorMsg("lam(): var x = 5\n y = 4\n fun f(): nothing end end", "Cannot end a block in a fun-binding");


        P.checkCompileErrorMsg("lam(): 1 is 2 end", "Cannot use `is` outside of a `check` or `where` block");
        P.checkCompileErrorMsg("lam(): 1 raises 2 end", "Cannot use a check-test form outside of a `check` or `where` block");

        P.checkCompileErrorMsg("lam():\n" +
                               "  data D:\n" +
                               "    | var1()\n" +
                               "  end\n" +
                               "end",
                               "top level");
        P.checkCompileErrorMsg("lam():\n" +
                               "  y = 10\n" +
                               "  x = 5\n" +
                               "  fun f(): nothing end\n" +
                               "  data D:\n" +
                               "    | var1()\n" +
                               "  end\n" +
                               "end",
                               "top level");
        P.checkCompileErrorMsg("lam():\n" +
                               "  y = 10\n" +
                               "  x = 5\n" +
                               "  fun f(): nothing end\n" +
                               "  graph:\n" +
                               "  z = 5\n" +
                               "  end\n" +
                               "end",
                               "Cannot end a block with a graph definition");
        P.checkCompileErrorMsg("block:\n" +
                               "  x = 5\n" +
                               "  y = 10\n" +
                               "end",
                               "Cannot end a block in a let-binding");
        P.checkCompileErrorMsg("block:\n" +
                               "  x = 5\n" +
                               "  graph: y = 10 end\n" +
                               "end",
                               "Cannot end a block with a graph definition");
        P.checkCompileErrorMsg("if x < y:\n" +
                               "  print('x less than y')\n" +
                               "end",
                               "Cannot have an `if` with a single branch");

        P.checkCompileErrorMsg("lam(): true where: 5 end", wf_check("anonymous functions"));
        P.checkCompileErrorMsg("method(self): nothing where: 5 end", wf_check("methods"));
        P.checkCompileErrorMsg("{m(self): nothing where: 5 end}", wf_check("methods"));

        P.wait(done)
      });
      it("should notice empty blocks", function(done) {
        P.checkCompileError("lam(): end", function(e) {
          expect(e.length).toEqual(1);
          return true;
        });
        P.checkCompileError("for each(elt from [list: ]): end", function(e) {
          expect(e.length).toEqual(1);
          return true;
        });
        P.checkCompileError("letrec x = 10: end", function(e) {
          expect(e.length).toEqual(1);
          return true;
        });
        P.checkCompileError("let x = 10: end", function(e) {
          expect(e.length).toEqual(1);
          return true;
        });
        P.checkCompileError("when true: end", function(e) {
          expect(e.length).toEqual(1);
          return true;
        });
        P.wait(done);
      });
      xit("malformed datatypes", function(done){
        P.checkCompileErrorMsg("datatype Foo:\n" +
                               "  | foo() with constructor(self): self end\n" +
                               "  | foo with constructor(self): self end\n" +
                               "end",
                               "Constructor name foo appeared more than once.");

        P.checkCompileErrorMsg("datatype Foo:\n" +
                               "  | foo() with constructor(self): self end\n" +
                               "  | bar() with constructor(self): self end\n" +
                               "  | baz() with constructor(self): self end\n" +
                               "  | foo(a) with constructor(self): self end\n" +
                               "end",
                               "Constructor name foo appeared more than once.");

        P.checkCompileErrorMsg("datatype Foo:\n" +
                               "  | bang with constructor(self): self end\n" +
                               "  | bar() with constructor(self): self end\n" +
                               "  | bang() with constructor(self): self end\n" +
                               "  | foo() with constructor(self): self end\n" +
                               "  | foo(a) with constructor(self): self end\n" +
                               "end",
                               "Constructor name bang appeared more than once.");

        P.wait(done);
      });
      it("malformed cases", function(done) {
        P.checkCompileErrorMsg("cases(List) [list: ]:\n" +
                               "  | empty => 1\n" +
                               "  | empty => 2\n" +
                               "end",
                               "Duplicate case for empty");

        P.checkCompileErrorMsg("cases(List) [list: ]:\n" +
                               "  | empty => 1\n" +
                               "  | link(f, r) => 2\n" +
                               "  | empty => 2\n" +
                               "end",
                               "Duplicate case for empty");

        P.checkCompileErrorMsg("cases(List) [list: ]:\n" +
                               "  | empty => 1\n" +
                               "  | empty => 2\n" +
                               "  | else => 3\n" +
                               "end",
                               "Duplicate case for empty");

        P.checkCompileErrorMsg("cases(List) [list: ]:\n" +
                               "  | link(f, r) => 2\n" +
                               "  | bogus => 'bogus'\n" +
                               "  | bogus2 => 'bogus'\n" +
                               "  | empty => 1\n" +
                               "  | bogus3 => 'bogus'\n" +
                               "  | empty => 2\n" +
                               "  | else => 3\n" +
                               "end",
                               "Duplicate case for empty");

        P.checkCompileErrorMsg("cases(List) [list: ]:\n" +
                               "  | empty => 2\n" +
                               "  | bogus => 'bogus'\n" +
                               "  | bogus2 => 'bogus'\n" +
                               "  | link(f, r) => 1\n" +
                               "  | bogus3 => 'bogus'\n" +
                               "  | link(_, _) => 2\n" +
                               "end",
                               "Duplicate case for link");


        P.wait(done);
      });
      it("reserved words", function(done) {
        var reservedNames = [
          "function",
          "break",
          "return",
          "do",
          "yield",
          "throw",
          "continue",
          "while",
          "class",
          "interface",
          "generator",
          "alias",
          "extends",
          "implements",
          "module",
          "package",
          "namespace",
          "use",
          "public",
          "private",
          "protected",
          "static",
          "const",
          "enum",
          "super",
          "export",
          "new",
          "try",
          "finally",
          "debug",
          "spy",
          "switch",
          "this",
          "match",
          "case",
          "with"
        ];
        for(var i = 0; i < reservedNames.length; i++) {
          var err = "cannot use " + reservedNames[i] + " as an identifier";
          P.checkCompileErrorMsg(reservedNames[i], err);
          P.checkCompileErrorMsg(reservedNames[i] + " = 5", err);
          P.checkCompileErrorMsg("fun f(" + reservedNames[i] + "): 5 end", err);
          P.checkCompileErrorMsg("fun " + reservedNames[i] + "(): 5 end", err);
          if (reservedNames[i] !== "type") {
            P.checkCompileErrorMsg("{ " + reservedNames[i] + " : 42 }", err);
            P.checkCompileErrorMsg("{ " + reservedNames[i] + "(self): 42 end }", err);
          }
        }

        P.wait(done);
      });
      it("fraction literals", function(done) {
        var err = "fraction literal with zero denominator"
        P.checkCompileErrorMsg("1/0", err);
        P.checkCompileErrorMsg("100/0", err);
        P.checkCompileErrorMsg("0/0", err);
        P.checkCompileErrorMsg("0/00000", err);
        P.wait(done);
      });

      // underscore tests

      const exprs = [
        "provide EXPR end",                                                 // s-module
        "provide-types {_  : Number}",                                      // s-module
        "provide-types {id : ANN}",                                         // s-module
        "import _         as I",                                            // s-module
        "import I         as _",                                            // s-module
        "import \"i.arr\" as _",                                            // s-module

        "let     id        = EXPR : id end",                                // s-let-expr
        "let     id :: ANN = 1    : id end",                                // s-let-expr
        "let     _         = 1    : 1  end",                                // s-let-expr

        "letrec  id        = EXPR : id end",                                // s-letrec
        "letrec  id :: ANN = 1    : id end",                                // s-letrec
        "letrec  _         = 1    : 1  end",                                // s-letrec
        "let var id        = EXPR : id end",                                // s-letrec
        "let var id :: ANN = 1    : id end",                                // s-letrec
        "let var _         = 1    : 1  end",                                // s-letrec

        ////////////////////////////////////////////////////////////////////// s-hint-exp

        "EXPR<_>",                                                          // s-instantiate
        "map<ANN>",                                                         // s-instantiate

        "lam(): EXPR end",                                                  // s-block

        "block: EXPR end",                                                  // s-user-block

        "fun    _()                    : 1    end",                         // s-fun
        "fun<_> whale()                : 1    end",                         // s-fun
        "fun    whale(EXPR)            : 1    end",                         // s-fun
        "fun    whale(e :: ANN)        : 1    end",                         // s-fun
        "fun    whale(e)        -> ANN : 1    end",                         // s-fun
        "fun    whale(e)               : EXPR end",                         // s-fun
        "fun    whale(e)               : 1    where: EXPR end",             // s-fun

        "type _ = Number",                                                  // s-type
        "type T = ANN",                                                     // s-type

        "newtype _ as Number",                                              // s-new-type
        "newtype N as ANN",                                                 // s-new-type

        "var _         = 1",                                                // s-var
        "var id        = EXPR",                                             // s-var
        "var id :: ANN = 1",                                                // s-var

        "_         = 1",                                                    // s-let
        "id        = EXPR",                                                 // s-let
        "id :: ANN = 1",                                                    // s-let

        "graph: _  = 1    end",                                             // s-graph
        "graph: id = EXPR end",                                             // s-graph

        ////////////////////////////////////////////////////////////////////// s-contract

        "when EXPR  : 1    end",                                            // s-when
        "when false : EXPR end",                                            // s-when

        "_  := 1",                                                          // s-assign
        "id := EXPR",                                                       // s-assign

        "ask: | EXPR  then: 1    end",                                      // s-if-pipe
        "ask: | false then: EXPR end",                                      // s-if-pipe

        "ask: | EXPR  then: 1    | otherwise: 1    end",                    // s-if-pipe-else
        "ask: | false then: EXPR | otherwise: 1    end",                    // s-if-pipe-else
        "ask: | false then: 1    | otherwise: EXPR end",                    // s-if-pipe-else

        "if EXPR  : 1    end",                                              // s-if
        "if false : EXPR end",                                              // s-if

        "if EXPR  : 1    else: 1    end",                                   // s-if-else
        "if false : EXPR else: 1    end",                                   // s-if-else
        "if false : 1    else: EXPR end",                                   // s-if-else

        "cases (ANN)    id   : | cat(a)        => a    end",                // s-cases
        "cases (Animal) EXPR : | cat(a)        => a    end",                // s-cases
        "cases (Animal) id   : | _             => 1    end",                // s-cases
        "cases (Animal) id   : | _(a)          => a    end",                // s-cases
        "cases (Animal) id   : | cat(a :: ANN) => a    end",                // s-cases
        "cases (Animal) id   : | cat(a)        => EXPR end",                // s-cases

        "cases (ANN)    id   : | cat(a)        => a    | else => 1    end", // s-cases-else
        "cases (Animal) EXPR : | cat(a)        => a    | else => 1    end", // s-cases-else
        "cases (Animal) id   : | _             => 1    | else => 1    end", // s-cases-else
        "cases (Animal) id   : | _(a)          => a    | else => 1    end", // s-cases-else
        "cases (Animal) id   : | cat(a :: ANN) => a    | else => 1    end", // s-cases-else
        "cases (Animal) id   : | cat(a)        => EXPR | else => 1    end", // s-cases-else
        "cases (Animal) id   : | cat(a)        => a    | else => EXPR end", // s-cases-else

        "try: 1    except(_)  : 1    end",                                  // s-try
        "try: EXPR except(id) : 1    end",                                  // s-try
        "try: 1    except(id) : EXPR end",                                  // s-try

        "(EXPR + 1    + 1)",                                                // s-op
        "(1    + EXPR + 1)",                                                // s-op
        "(1    + 1    + EXPR)",                                             // s-op

        "(EXPR)",                                                           // s-paren

        "lam<_> ()         : 1    end",                                     // s-fun
        "lam    (EXPR)     : 1    end",                                     // s-fun
        "lam    (e :: ANN) : 1    end",                                     // s-fun
        "lam    (e) -> ANN : 1    end",                                     // s-fun
        "lam    (e)        : EXPR end",                                     // s-fun
        "lam    (e)        : 1    where: EXPR end",                         // s-fun

        "{ _   ()          : 1    end }",                                   // s-method
        "{ meth(_)         : 1    end }",                                   // s-method
        "{ meth(a :: ANN)  : 1    end }",                                   // s-method
        "{ meth(a)         : EXPR end }",                                   // s-method

        "EXPR.{ id : 1    }",                                               // s-extend
        "a.{    _  : 1    }",                                               // s-extend
        "a.{    id : EXPR }",                                               // s-extend

        "EXPR!{ id : 1    }",                                               // s-update
        "a!{    _  : 1    }",                                               // s-update
        "a!{    id : EXPR }",                                               // s-update

        "{ _  : 1    }",                                                    // s-obj
        "{ id : EXPR }",                                                    // s-obj

        ////////////////////////////////////////////////////////////////////// s-array

        "EXPR(1)",                                                          // s-app
        "f(EXPR)",                                                          // a-app

        ////////////////////////////////////////////////////////////////////// s-prim-app

        ////////////////////////////////////////////////////////////////////// s-prim-val

        "_",                                                                // s-id

        "let var _ = 1: _ end",                                             // s-id-var

        "letrec  _ = 1: _ end",                                             // s-id-var

        ////////////////////////////////////////////////////////////////////// s-undefined

        ////////////////////////////////////////////////////////////////////// s-srcloc

        "1",                                                                // s-num

        "1/1",                                                              // s-frac

        "false",                                                            // s-frac

        "\"I'm a pyret\"",                                                  // s-str

        "EXPR.id",                                                          // s-dot
        "a._",                                                              // s-dot

        "EXPR!id",                                                          // s-get-bang
        "a!_",                                                              // s-get-bang

        ////////////////////////////////////////////////////////////////////// s-bracket

        "data _         : | cat(a)                                   end",  // s-data
        "data Animal<_> : | cat(a)                                   end",  // s-data
        "data Animal    : | _                                        end",  // s-data
        "data Animal    : | _(a)                                     end",  // s-data
        "data Animal    : | cat(a :: ANN)                            end",  // s-data
        "data Animal    : | cat(a) with: _            : 1            end",  // s-data
        "data Animal    : | cat(a) with: id           : EXPR         end",  // s-data
        "data Animal    : | cat(a) with: id           : EXPR         end",  // s-data
        "data Animal    : | cat(a) with: id(_)        : 1        end end",  // s-data
        "data Animal    : | cat(a) with: id(a :: ANN) : 1        end end",  // s-data
        "data Animal    : | cat(a) with: id(a)        : EXPR     end end",  // s-data
        "data Animal    : | cat(a) sharing: _            : 1         end",  // s-data
        "data Animal    : | cat(a) sharing: id           : EXPR      end",  // s-data
        "data Animal    : | cat(a) sharing: id           : EXPR      end",  // s-data
        "data Animal    : | cat(a) sharing: id(_)        : 1     end end",  // s-data
        "data Animal    : | cat(a) sharing: id(a :: ANN) : 1     end end",  // s-data
        "data Animal    : | cat(a) sharing: id(a)        : EXPR  end end",  // s-data
        "data Animal    : | cat(a) where: EXPR                       end",  // s-data

        ////////////////////////////////////////////////////////////////////// s-data-expr

        "for EXPR(z        from a)           : 1    end",                   // s-for
        "for fold(_        from a)           : 1    end",                   // s-for
        "for fold(z :: ANN from a)           : 1    end",                   // s-for
        "for fold(z        from EXPR)        : 1    end",                   // s-for
        "for fold(z        from a)    -> ANN : 1    end",                   // s-for
        "for fold(z        from a)           : EXPR end",                   // s-for

        "check \"_\": 1    end",                                            // s-check
        "check:       EXPR end"                                             // s-check
      ];

      const anns = [
        "_",                          // YE DREADED UNDERSCORE, BANE OF THE HIGH SEAS!
        "Any",                        // a-any
        "Number",                     // a-name
        "(ANN,    Number -> Number)", // a-arrow
        "(Number, ANN,   -> Number)", // a-arrow
        "(Number, Number -> ANN)",    // a-arrow
        "{ _  :: Number }",           // a-record
        "{ id :: ANN    }",           // a-record
        "List<ANN>",                  // a-app
        "ANN<Number>",                // a-app
        "ANN    % (pred)",            // a-pred
        "Number % (_)",               // a-pred
        "_.id",                       // a-dot
        "ID._"                        // a-dot
      ];

      const MAX_DEPTH = 3

      function test(prog) {
        it("underscore -- " + prog, function(done) {
          P.checkCompileErrorMsg(prog, "underscore");
          P.wait(done);
        });
      }

      function subs(depth_left, prog)
      {
        if (depth_left == 0)
        {
          test(prog.replace(new RegExp("EXPR|ANN", STICKY_REGEXP), "_"));
        }
        else if (prog.indexOf("ANN") != -1)
        {
          for (var i = 0; i < anns.length; ++i) {
            subst(depth_left - 1, prog.replace("ANN", anns[i]));
          }
        }
        else if (prog.indexOf("EXPR") != -1)
        {
          for (var i = 0; i < anns.length; ++i) {
            subst(depth_left - 1, prog.replace("ANN", anns[i]));
          }
        }
        else test(prog);
      }

      for (var i = 0; i < exprs.length; ++i) {
        subst(DEPTH, exprs[i]);
      }

    });
  }
  return { performTest: performTest };
});
