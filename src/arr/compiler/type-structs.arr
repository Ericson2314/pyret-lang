provide *
provide-types *

import ast as A
import string-dict as SD
import "compiler/list-aux.arr" as LA

all2-strict  = LA.all2-strict
map2-strict  = LA.map2-strict
fold2-strict = LA.fold2-strict

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
  | less-than
  | equal
  | greater-than
sharing:
  _comp(self, other):
    cases(Comparison) other:
      | less-than    =>
        cases(Comparison) self:
          | less-than    => equal
          | equal        => greater-than
          | greater-than => greater-than
        end
      | equal       => self
      | greater-than =>
        cases(Comparison) self:
          | less-than    => less-than
          | equal        => less-than
          | greater-than => equal
        end
    end
  end
end

fun string-compare(a :: String, b :: String) -> Comparison:
  if a < b: less-than
  else if a > b: greater-than
  else: equal;
end

fun <T> list-compare(a :: List<T>, b :: List<T>) -> Comparison:
  cases(List<T>) a:
    | empty => cases(List<T>) b:
        | empty   => equal
        | link(_) => less-than
      end
    | link(a-f, a-r) => cases(List<T>) b:
        | empty          => greater-than
        | link(b-f, b-r) => cases (Comparison) a-f._comp(b-f):
            | less-than    => less-than
            | greater-than => greater-than
            | equal        => list-compare(a-r, b-r)
          end
      end
  end
end

fun <T> old-list-compare(a :: List<T>, b :: List<T>) -> Comparison:
  cases(List<T>) a:
    | empty => cases(List<T>) b:
        | empty   => equal
        | link(_) => less-than
      end
    | link(a-f, a-r) => cases(List<T>) b:
        | empty => greater-than
        | link(b-f, b-r) =>
          if a-f < b-f:       less-than
          else if a-f == b-f: list-compare(a-r, b-r)
          else:               greater-than
          end
      end
  end
end

fun fold-comparisons(l :: List<Comparison>) -> Comparison:
  cases (List<Comparison>) l:
    | empty      => equal
    | link(f, r) => cases (Comparison) f:
        | equal  => fold-comparisons(r)
        | else   => f
      end
  end
end

data TypeVariable:
  | t-variable(l :: A.Loc, id :: String, upper-bound :: Type) # bound = Top is effectively unbounded
sharing:
  tostring(self) -> String:
    self.id + " <: " + self.upper-bound.tostring()
  end
end

data TypeMember:
  | t-member(field-name :: String, typ :: Type) with:
    tostring(self):
      self.field-name + " : " + self.typ.tostring()
    end,
    substitute(self, x :: Type, r :: Type):
      t-member(self.field-name, self.typ.substitute(x, r))
    end
sharing:
  _comp(a, b :: TypeMember) -> Comparison:
    fold-comparisons([list:
        a.field-name._comp(b.field-name),
        a.typ._comp(b.typ)
      ])
  end
end

type TypeMembers = List<TypeMember>
empty-type-members = empty

fun type-members-lookup(type-members :: TypeMembers, field-name :: String) -> Option<TypeMember>:
  fun same-field(tm):
    tm.field-name == field-name
  end
  type-members.find(same-field)
end

data TypeVariant:
  | t-variant(l           :: A.Loc,
              name        :: String,
              fields      :: TypeMembers,
              with-fields :: TypeMembers) with:
    substitute(self, x :: Type, r :: Type):
      substitute = _.substitute(x, r)
      t-variant(self.l, self.name, self.fields.map(substitute), self.with-fields.map(substitute))
    end
  | t-singleton-variant(l           :: A.Loc,
                        name        :: String,
                        with-fields :: TypeMembers) with:
    fields: empty-type-members,
    substitute(self, x :: Type, r :: Type):
      substitute = _.substitute(x, r)
      t-singleton-variant(self.l, self.name, self.with-fields.map(substitute))
    end
end

fun type-variant-fields(tv :: TypeVariant) -> TypeMembers:
  cases(TypeVariant) tv:
    | t-variant(_, _, variant-fields, with-fields) => with-fields + variant-fields
    | t-singleton-variant(_, _, with-fields)       => with-fields
  end
end

data DataType:
  | t-datatype(name     :: String,
               params   :: List<TypeVariable>,
               variants :: List<TypeVariant>,
               fields   :: TypeMembers) with: # common (with-)fields, shared methods, etc
    lookup-variant(self, variant-name :: String) -> Option<TypeVariant>:
      fun same-name(tv):
        tv.name == variant-name
      end
      self.variants.find(same-name)
    end,
    introduce(self, args :: List<Type>) -> Option<DataType>:
      for fold2-strict(curr from self, arg from args, param from self.params):
        substitute = _.substitute(t-var(param.id), arg)
        t-datatype(curr.name, empty, curr.variants.map(substitute), curr.fields.map(substitute))
      end
    end
end

data Type:
  | t-unknown
  | t-name(l :: A.Loc, module-name :: Option<String>, id :: String)
  | t-var(id :: String)
  | t-arrow(l :: A.Loc, forall :: List<TypeVariable>, args :: List<Type>, ret :: Type)
  | t-app(l :: A.Loc, onto :: Type % (is-t-name), args :: List<Type> % (is-link))
  | t-top
  | t-bot
  | t-record(l :: A.Loc, fields :: TypeMembers)
sharing:
  tostring(self) -> String:
    cases(Type) self:
      | t-name(_, module-name, id) => cases(Option<String>) module-name:
          | none    => id
          | some(m) => m + "." + id
        end
      | t-var(id) => id

      | t-arrow(_, forall, args, ret) =>
        "(<" + forall.map(_.tostring()).join-str(", ") + ">"
          +      args.map(_.tostring()).join-str(", ")
          + " -> " + ret.tostring() + ")"

      | t-app(_, onto, args) =>
        onto.tostring() + "<" + args.map(_.tostring()).join-str(", ") + ">"

      | t-top => "Top"
      | t-bot => "Bot"
      | t-record(_, fields) =>
        "{"
          + for map(field from fields):
              field.tostring()
            end.join-str(", ")
          + "}"
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
      | t-record(l, _)      => l
    end
  end,
  substitute(self, orig-typ :: Type, new-typ :: Type) -> Type:
    if self == orig-typ:
      new-typ
    else:
      cases(Type) self:
        | t-arrow(l, forall, args, ret) => t-arrow(l, forall,
            args.map(_.substitute(orig-typ, new-typ)),
            ret.substitute(orig-typ, new-typ))

        | t-app(l, onto, args) => t-app(l,
            onto.substitute(orig-typ, new-typ),
            args.map(_.substitute(orig-typ, new-typ)))

        | else => self
      end
    end
  end,
  _lessthan     (self, other :: Type) -> Boolean: self._comp(other) == less-than    end,
  _lessequal    (self, other :: Type) -> Boolean: self._comp(other) <> greater-than end,
  _greaterthan  (self, other :: Type) -> Boolean: self._comp(other) == greater-than end,
  _greaterequal (self, other :: Type) -> Boolean: self._comp(other) <> less-than    end,
  _equal        (self, other :: Type) -> Boolean: self._comp(other) == equal        end,
  _comp(self, other :: Type) -> Comparison:
    cases(Type) self:
      | t-bot                                 => cases(Type) other:
          | t-bot => equal
          | else  => less-than
        end
      | t-name(a-l, a-module-name, a-id)      => cases(Type) other:
          | t-bot               => greater-than
          | t-name(b-l, b-module-name, b-id) =>
            fold-comparisons([list:
              string-compare(a-module-name.or-else(""), b-module-name.or-else("")),
              string-compare(a-id, b-id)
            ])
          | t-var(_)            => less-than
          | t-arrow(_, _, _, _) => less-than
          | t-app(_, _, _)      => less-than
          | t-record(_,_)       => less-than
          | t-top               => less-than
        end
      | t-var(a-id)                           => cases(Type) other:
          | t-bot               => greater-than
          | t-name(_, _, _)     => greater-than
          | t-var(b-id) => 
            if a-id < b-id: less-than
            else if a-id > b-id: greater-than
            else: equal;
          | t-arrow(_, _, _, _) => less-than
          | t-app(_, _, _)      => less-than
          | t-record(_,_)       => less-than
          | t-top               => less-than
        end
      | t-arrow(a-l, a-forall, a-args, a-ret) => cases(Type) other:
          | t-bot               => greater-than
          | t-name(_, _, _)     => greater-than
          | t-var(_)            => greater-than
          | t-arrow(b-l, b-forall, b-args, b-ret) => fold-comparisons([list:
                #a-l._comp(b-l),
                old-list-compare(a-forall, b-forall),
                old-list-compare(a-args, b-args),
                a-ret._comp(b-ret)
              ])
          | t-app(_, _, _)      => less-than
          | t-record(_,_)       => less-than
          | t-top               => less-than
        end
      | t-app(a-l, a-onto, a-args)            => cases(Type) other:
          | t-bot               => greater-than
          | t-name(_, _, _)     => greater-than
          | t-var(_)            => greater-than
          | t-arrow(_, _, _, _) => greater-than
          | t-app(b-l, b-onto, b-args) => fold-comparisons([list:
                #a-l._comp(b-l),
                old-list-compare(a-args, b-args),
                a-onto._comp(b-onto)
              ])
          | t-record(_,_)       => less-than
          | t-top               => less-than
        end
      | t-record(a-l, a-fields)               => cases(Type) other:
          | t-bot               => greater-than
          | t-name(_, _, _)     => greater-than
          | t-var(_)            => greater-than
          | t-arrow(_, _, _, _) => greater-than
          | t-app(_, _, _)      => greater-than
          | t-record(b-l, b-fields) => fold-comparisons([list:
                #a-l._comp(b-l),
                list-compare(a-fields, b-fields)
              ])
          | t-top               => less-than
        end
      | t-top                                 => cases(Type) other:
          | t-top => equal
          | else  => greater-than
        end
    end
  end
end

t-number  = t-name(A.dummy-loc, none, "tglobal#Number")
t-string  = t-name(A.dummy-loc, none, "tglobal#String")
t-boolean = t-name(A.dummy-loc, none, "tglobal#Boolean")
t-srcloc  = t-name(A.dummy-loc, none, "Loc")
