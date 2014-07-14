provide *
provide-types *

import ast as A
import string-dict as SD

fun <T> identity(t :: T) -> T: t end

fun <A, B, R> fold2-strict(f :: (R, A, B -> R), base :: R, l1 :: List<A>, l2 :: List<B>) -> Option<R>:
  cases (List<A>) l1:
    | empty => cases (List<B>) l2:
        | empty       => some(base)
        | list(_, _)  => none
      end
    | list(a, ar) => cases (List<B>) l2:
        | empty       => none
        | list(b, br) => fold2-strict(f, f(base, a, b), ar, br)
      end
  end
end

fun <A, B, R> map2-strict(f :: (A, B -> R), l1 :: List<A>, l2 :: List<B>) -> Option<List<R>>:
  cases (List<A>) l1:
    | empty => cases (List<B>) l2:
        | empty       => some(empty)
        | list(_, _)  => none
      end
    | list(a, ar) => cases (List<B>) l2:
        | empty       => none
        | list(b, br) => fold2-strict(f, ar, br).and-then(lam(rest :: List<R>):
              some(link(f(a, b), rest))
            end)
      end
  end
end

fun <A, B> all2-strict(f :: (A, B -> Boolean), l1 :: List<A>, l2 :: List<B>) -> Boolean:
  doc: ```
  all2 returns false if any application of f returns false, or if the lengths differ.
  his behavior is choosen to maintain the short-circuiting semantics. If one wants to
  distinguish between lists of different lengths, and f returning false, use

  map2-strict(f, l1, l2).and-then(all(identity, _))

  ```
  cases (List<A>) l1:
    | empty => cases (List<B>) l2:
        | empty       => true
        | list(_, _)  => false
      end
    | list(a, ar) => cases (List<B>) l2:
        | empty       => false
        | list(b, br) => f(a, b) and all2-strict(a, b)
      end
  end
where:
  all2-strict(lam(n, m): false end, [list: 1, 2, 3], empty) is false
  all2-strict(lam(n, m): true  end, [list: 1, 2, 3], empty) is false
  all2-strict(lam(n, m): n > m end,        [list: 1, 2, 3], [list: 0, 1, 2]) is true
  all2-strict(lam(n, m): (n + m) == 3 end, [list: 1, 2, 3], [list: 2, 1, 0]) is true
  all2-strict(lam(n, m): n < m end,        [list: 1, 2, 3], [list: 0, 1, 2]) is false
  all2-strict(lam(_, _): true  end, empty, empty) is true
  all2-strict(lam(_, _): false end, empty, empty) is true
end

data Pair<L,R>:
  | pair(left :: L, right :: R)
sharing:
  on-left(self, f :: (L -> L)) -> Pair<L,R>:
    pair(f(self.left), self.right)
  end,
  on-right(self, f :: (R -> R)) -> Pair<L,R>:
    pair(self.left, f(self.right))
  end
end

data Comparison:
  | LessThan
  | Equal
  | GreaterThan
sharing:
  _comp(self, other):
    cases(Comparision) other:
      | LessThan    => cases(Comparision) self:
          | LessThan    => Equal
          | Equal       => GreaterThan
          | GreaterThan => GreaterThan
        end
      | Equal       => self
      | GreaterThan => cases(Comparision) self:
          | LessThan    => LessThan
          | Equal       => LessThan
          | GreaterThan => Equal
        end
    end
  end
end

fun <T> list-compare(a :: List<T>, b :: List<T>) -> Comparison:
  cases(List<T>) a:
    | empty => cases(List<T>) b:
        | empty   => Equal
        | link(_) => LessThan
      end
    | link(a-f, a-r) => cases(List<T>) b:
        | empty          => GreaterThan
        | link(b-f, b-r) => cases (Comparison) a-f._comp(b-f):
            | LessThan    => LessThan
            | GreaterThan => GreaterThan
            | Equal       => list-compare(a-r, b-r)
          end
      end
  end
end

fun fold-comparisons(l :: List<Comparison>) -> Comparison:
  cases (List<Comparison>) l:
    | empty      => Equals
    | link(f, r) => cases (Comparison) f:
        | Equals => fold-comparisons(r)
        | else   => f
      end
  end
end

data TypeVariable:
  | t-variable(l :: A.Loc, id :: String, upper-bound :: Type) # bound = Top is effectively unbounded
end

data TypeMember:
  | t-member(field-name :: String, typ :: Type)
end

data TypeVariant:
  | t-variant(fields      :: List<TypeMember>,
              with-fields :: List<TypeMember>)
end

data DataType:
  | t-datatype(params   :: List<TypeVariable>,
               variants :: SD.StringDict<TypeVariant>,
               fields   :: List<TypeMember>) # common (with-)fields, shared methods, etc
end

data Type:
  | t-name(l :: A.Loc, module-name :: Option<String>, id :: String)
  | t-var(id :: String)
  | t-arrow(l :: A.Loc, forall :: List<TypeVariable>, args :: List<Type>, ret :: Type)
  | t-app(l :: A.Loc, onto :: Type % (is-t-name), args :: List<Type> % is-link)
  | t-top
  | t-bot
sharing:
  satisfies-type(self, other :: Type) -> Boolean:
    cases(Type) self:
      | t-name(_, module-name, id) =>
        cases(Type) other:
          | t-top => true
          | t-name(_, other-module, other-id) =>
            (module-name == other-module) and (id == other-id)
          | else => false
        end
      | t-var(id) =>
        cases(Type) other:
          | t-top => true
          | t-var(other-id) => id == other-id
          | else => false
        end
      | t-arrow(_, forall, args, ret) =>
        cases(Type) other:
          | t-top => true
          | t-arrow(_, other-forall, other-args, other-ret) =>
            for fold2(res from true, this-arg from self.args, other-arg from other-args):
              res and other-arg.satisfies-type(this-arg)
            end and ret.satisfies-type(other-ret)
          | else => false
        end
      | t-app(_, onto, args) =>
        cases(Type) other:
          | t-top => true
          | t-app(_, other-onto, other-args) =>
            onto == other-onto and all2-strict(_ == _, args, other-args)
          | else => false
        end
      | t-top => is-t-top(other)
      | t-bot => true
    end
  end,
  tostring(self) -> String:
    cases(Type) self:
      | t-name(_, module-name, id) =>
        cases(Option<String>) module-name:
          | none    => id
          | some(m) => m + "." + id
        end
      | t-var(id) =>
        id
      | t-arrow(_, forall, args, ret) =>
        "(" + args.map(_.tostring()).join-str(", ") + " -> " + ret.tostring() + ")"
      | t-app(_, onto, args) =>
        onto.tostring() + "<" + args.map(_.tostring()).join-str(", ") + ">"
      | t-top =>
        "Top"
      | t-bot =>
        "Bot"
    end
  end,
  toloc(self) -> A.Loc:
    cases(Type) self:
      | t-name(l, _, _)     => l
      | t-arrow(l, _, _, _) => l
      | t-var(_)            => A.dummy-loc
      | t-app(l, _, _)      => l
      | t-top               => A.dummy-loc
      | t-bot               => A.dummy-loc
    end
  end,
  substitute(self, orig-typ :: Type, new-typ :: Type) -> Type:
    if self == orig-typ:
      new-typ
    else:
      cases(Type) self:
        | t-arrow(l, forall, args, ret) =>
          new-args = args.map(_.substitute(orig-typ, new-typ))
          new-ret  = ret.substitute(orig-typ, new-typ)
          t-arrow(l, forall, new-args, new-ret)
        | t-app(l, onto, args) =>
          new-args = args.map(_.substitute(orig-typ, new-typ))
          t-arrow(l, onto, new-args)
        | else =>
          self
      end
    end
  end,
  _lessthan     (self, other :: Type) -> Boolean: self._comp(other) == LessThan    end
  _lessequal    (self, other :: Type) -> Boolean: self._comp(other) <> GreaterThan end
  _greaterthan  (self, other :: Type) -> Boolean: self._comp(other) == GreaterThan end
  _greaterequal (self, other :: Type) -> Boolean: self._comp(other) <> LessThan    end
  _equals       (self, other :: Type) -> Boolean: self._comp(other) == Equals      end
  _comp(self, other :: Type) -> Comparison:
    cases(Type) self:
      | t-bot => cases(Type) other:
          | t-bot => Equals
          | else  => LessThan
        end
      | t-name(a-l, a-module-name, a-id) => cases(Type) other:
          | t-bot               => GreaterThan
          | t-name(b-l, b-module-name, b-id) => fold-comparisons([list:
                a-l._comp(b-l),
                a-module-name._comp(b-module-name)
              ])
          | t-var(_)            => LessThan
          | t-arrow(_, _, _, _) => LessThan
          | t-app(_, _, _)      => LessThan
          | t-top               => LessThan
        end
      | t-var(a-id) => cases(Type) other:
          | t-bot               => GreaterThan
          | t-name(_, _, _)     => GreaterThan
          | t-var(b-id) => a-id._comp(b-id)
          | t-arrow(_, _, _, _) => LessThan
          | t-app(_, _, _)      => LessThan
          | t-top               => LessThan
        end
      | t-arrow(a-l, a-forall, a-args, a-ret) => cases(Type) other:
          | t-bot               => GreaterThan
          | t-name(_, _, _)     => GreaterThan
          | t-var(_)            => GreaterThan
          | t-arrow(b-l, b-forall, b-args, b-ret) => fold-comparisons([list:
                a-l._comp(b-l),
                list-compare(a-forall, b-forall),
                list-compare(a-args, b-args),
                a-ret._comp(b-ret)
              ])
          | t-app(_, _, _)      => LessThan
          | t-top               => LessThan
        end
      | t-app(a-l, a-onto, a-args) =>
        cases(Type) other:
          | t-bot               => GreaterThan
          | t-name(_, _, _)     => GreaterThan
          | t-var(_)            => GreaterThan
          | t-arrow(_, _, _, _) => GreaterThan
          | t-app(b-l, b-onto, b-args) => fold-comparisons([list:
                a-l._comp(b-l),
                list-compare(a-forall, b-forall),
                list-compare(a-args, b-args),
                a-ret._comp(b-ret)
              ])
          | t-top               => LessThan
        end
      | t-top => cases(Type) other:
          | t-top => Equals
          | else  => GreaterThan
        end
    end
  end
end

t-number  = t-name(A.dummy-loc, none, "tglobal#Number")
t-string  = t-name(A.dummy-loc, none, "tglobal#String")
t-boolean = t-name(A.dummy-loc, none, "tglobal#Boolean")
t-srcloc  = t-name(A.dummy-loc, none, "Loc")

fun least-upper-bound(s :: Type, t :: Type) -> Type:
  if s.satisfies-type(t):
    t
  else if t.satisfies-type(s):
    s
  else:
    cases(Type) s:
      | t-arrow(_, s-forall, s-args, s-ret) =>
        cases(Type) t:
          | t-arrow(_, t-forall, t-args, t-ret) =>
            if s-forall == t-forall:
              cases (Option<List<Type>>) map2-strict(greatest-lower-bound, s-args, t-args):
                | some(m-args) =>
                  j-typ  = least-upper-bound(s-ret, t-ret)
                  t-arrow(A.dummy-loc, s-forall, m-args, j-typ)
                | else => t-top
              end
            else:
              t-top
            end
          | else => t-top
        end
      | t-app(_, s-onto, s-args) =>
        cases(Type) t:
          | t-app(_, t-onto, t-args) =>
            if s-onto == t-onto and s-args == t-args:
              t-app(A.dummy-loc, s-onto, s-args)
            else:
              t-top
            end
          | else => t-top
        end
      | else => t-top
    end
  end
end

fun greatest-lower-bound(s :: Type, t :: Type) -> Type:
  if s.satisfies-type(t):
    s
  else if t.satisfies-type(s):
    t
  else:
    cases(Type) s:
      | t-arrow(s-l, s-forall, s-args, s-ret) =>
        cases(Type) t:
           | t-arrow(_, t-forall, t-args, t-ret) =>
            if s-forall == t-forall:
              cases (Option<List<Type>>) map2-strict(least-upper-bound, s-args, t-args):
                | some(m-args) =>
                  j-typ  = greatest-lower-bound(s-ret, t-ret)
                  t-arrow(A.dummy-loc, s-forall, m-args, j-typ)
                | else => t-bot
              end
            else:
              t-bot
            end
          | else => t-bot
        end
      | t-app(_, s-onto, s-args) =>
        cases(Type) t:
          | t-app(_, t-onto, t-args) =>
            if s-onto == t-onto and s-args == t-args:
              t-app(A.dummy-loc, s-onto, s-args)
            else:
              t-bot
            end
          | else => t-bot
        end
      | else => t-bot
    end
  end
end
