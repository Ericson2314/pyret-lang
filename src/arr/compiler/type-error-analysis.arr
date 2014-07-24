#lang pyret

provide *
provide-types *
import ast as A
import string-dict as SD
import srcloc as SL
import "compiler/compile-structs.arr" as C
import "compiler/type-structs.arr" as TS
import "compiler/type-check-structs.arr" as TCS
import "compiler/type-constraints.arr" as TC
import "compiler/list-aux.arr" as LA

identity                  = LA.identity
all2-strict               = LA.all2-strict
map2-strict               = LA.map2-strict
fold2-strict              = LA.fold2-strict

type Loc                  = SL.Srcloc

type Type                 = TS.Type
t-name                    = TS.t-name
t-var                     = TS.t-var
t-arrow                   = TS.t-arrow
t-top                     = TS.t-top
t-bot                     = TS.t-bot
t-app                     = TS.t-app
t-record                  = TS.t-record

type TypeVariable         = TS.TypeVariable
t-variable                = TS.t-variable

type TypeMember           = TS.TypeMember
t-member                  = TS.t-member

type TypeVariant          = TS.TypeVariant
t-variant                 = TS.t-variant
t-singleton-variant       = TS.t-singleton-variant

type DataType             = TS.DataType
t-datatype                = TS.t-datatype

type Pair                 = TS.Pair
pair                      = TS.pair


t-number                  = TS.t-number
t-string                  = TS.t-string
t-boolean                 = TS.t-boolean
t-srcloc                  = TS.t-srcloc

least-upper-bound         = TS.least-upper-bound
greatest-lower-bound      = TS.greatest-lower-bound

type TypeConstraint       = TC.TypeConstraint
type TypeConstraints      = TC.TypeConstraints
generate-constraints      = TC.generate-constraints
empty-type-constraints    = TC.empty-type-constraints

type SynthesisResult      = TCS.SynthesisResult
type CheckingResult       = TCS.CheckingResult
type FoldResult           = TCS.FoldResult
type CheckingMapResult    = TCS.CheckingMapResult

synthesis-result          = TCS.synthesis-result
synthesis-if-result       = TCS.synthesis-if-result
synthesis-binding-result  = TCS.synthesis-binding-result
synthesis-err             = TCS.synthesis-err
checking-result           = TCS.checking-result
checking-err              = TCS.checking-err
fold-result               = TCS.fold-result
fold-errors               = TCS.fold-errors
checking-map              = TCS.checking-map
checking-map-errors       = TCS.checking-map-errors

bind                      = TCS.bind
map-bind                  = TCS.map-bind
check-bind                = TCS.check-bind
synth-bind                = TCS.synth-bind
fold-bind                 = TCS.fold-bind

map-synthesis             = TCS.map-synthesis
foldl2-result             = TCS.foldl2-result
foldr-result              = TCS.foldr-result
map2-checking             = TCS.map2-checking
map-checking              = TCS.map-checking
map-result                = TCS.map-result

# record-view (dot access of stuff)
#synthesis-err([list: C.incorrect-type(obj-typ.tostring(), obj-typ.toloc(), "an object type", acess-expr.loc)])

# synthesis field (dot access)
#synthesis-err([list: C.object-missing-field(
#                field-name,
#                "{" + obj-fields.map(_.tostring()).join-str(", ") + "}", l, access-loc)])

fun analyze(bool :: synth-or-check,
        outer-expr :: Expr, inner-expr :: Expr,
#        outer-loc  :: Loc,  inner-loc  :: Loc,
        outer-type :: Option<Type>, inner-type :: Type) -> List<C.CompileError>:
  
end