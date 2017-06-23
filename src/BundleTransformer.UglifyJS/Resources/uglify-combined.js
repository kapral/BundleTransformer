/*!
 * UglifyJS v2.8.29
 * http://github.com/mishoo/UglifyJS2
 *
 * Copyright 2012-2013, Mihai Bazon <mihai.bazon@gmail.com>
 * Released under the BSD license
 */

 var UglifyJS = (function(){
	"use strict";
 
	var exports = {};
 
	//#region URL: /lib/utils
	//"use strict";

	function array_to_hash(a) {
		var ret = Object.create(null);
		for (var i = 0; i < a.length; ++i)
			ret[a[i]] = true;
		return ret;
	};

	function slice(a, start) {
		return Array.prototype.slice.call(a, start || 0);
	};

	function characters(str) {
		return str.split("");
	};

	function member(name, array) {
		return array.indexOf(name) >= 0;
	};

	function find_if(func, array) {
		for (var i = 0, n = array.length; i < n; ++i) {
			if (func(array[i]))
				return array[i];
		}
	};

	function repeat_string(str, i) {
		if (i <= 0) return "";
		if (i == 1) return str;
		var d = repeat_string(str, i >> 1);
		d += d;
		if (i & 1) d += str;
		return d;
	};

	function configure_error_stack(fn) {
		Object.defineProperty(fn.prototype, "stack", {
			get: function() {
				var err = new Error(this.message);
				err.name = this.name;
				try {
					throw err;
				} catch(e) {
					return e.stack;
				}
			}
		});
	}

	function DefaultsError(msg, defs) {
		this.message = msg;
		this.defs = defs;
	};
	DefaultsError.prototype = Object.create(Error.prototype);
	DefaultsError.prototype.constructor = DefaultsError;
	DefaultsError.prototype.name = "DefaultsError";
	configure_error_stack(DefaultsError);

	DefaultsError.croak = function(msg, defs) {
		throw new DefaultsError(msg, defs);
	};

	function defaults(args, defs, croak) {
		if (args === true)
			args = {};
		var ret = args || {};
		if (croak) for (var i in ret) if (HOP(ret, i) && !HOP(defs, i))
			DefaultsError.croak("`" + i + "` is not a supported option", defs);
		for (var i in defs) if (HOP(defs, i)) {
			ret[i] = (args && HOP(args, i)) ? args[i] : defs[i];
		}
		return ret;
	};

	function merge(obj, ext) {
		var count = 0;
		for (var i in ext) if (HOP(ext, i)) {
			obj[i] = ext[i];
			count++;
		}
		return count;
	};

	function noop() {}
	function return_false() { return false; }
	function return_true() { return true; }
	function return_this() { return this; }
	function return_null() { return null; }

	var MAP = (function(){
		function MAP(a, f, backwards) {
			var ret = [], top = [], i;
			function doit() {
				var val = f(a[i], i);
				var is_last = val instanceof Last;
				if (is_last) val = val.v;
				if (val instanceof AtTop) {
					val = val.v;
					if (val instanceof Splice) {
						top.push.apply(top, backwards ? val.v.slice().reverse() : val.v);
					} else {
						top.push(val);
					}
				}
				else if (val !== skip) {
					if (val instanceof Splice) {
						ret.push.apply(ret, backwards ? val.v.slice().reverse() : val.v);
					} else {
						ret.push(val);
					}
				}
				return is_last;
			};
			if (a instanceof Array) {
				if (backwards) {
					for (i = a.length; --i >= 0;) if (doit()) break;
					ret.reverse();
					top.reverse();
				} else {
					for (i = 0; i < a.length; ++i) if (doit()) break;
				}
			}
			else {
				for (i in a) if (HOP(a, i)) if (doit()) break;
			}
			return top.concat(ret);
		};
		MAP.at_top = function(val) { return new AtTop(val) };
		MAP.splice = function(val) { return new Splice(val) };
		MAP.last = function(val) { return new Last(val) };
		var skip = MAP.skip = {};
		function AtTop(val) { this.v = val };
		function Splice(val) { this.v = val };
		function Last(val) { this.v = val };
		return MAP;
	})();

	function push_uniq(array, el) {
		if (array.indexOf(el) < 0)
			array.push(el);
	};

	function string_template(text, props) {
		return text.replace(/\{(.+?)\}/g, function(str, p){
			return props && props[p];
		});
	};

	function remove(array, el) {
		for (var i = array.length; --i >= 0;) {
			if (array[i] === el) array.splice(i, 1);
		}
	};

	function mergeSort(array, cmp) {
		if (array.length < 2) return array.slice();
		function merge(a, b) {
			var r = [], ai = 0, bi = 0, i = 0;
			while (ai < a.length && bi < b.length) {
				cmp(a[ai], b[bi]) <= 0
					? r[i++] = a[ai++]
					: r[i++] = b[bi++];
			}
			if (ai < a.length) r.push.apply(r, a.slice(ai));
			if (bi < b.length) r.push.apply(r, b.slice(bi));
			return r;
		};
		function _ms(a) {
			if (a.length <= 1)
				return a;
			var m = Math.floor(a.length / 2), left = a.slice(0, m), right = a.slice(m);
			left = _ms(left);
			right = _ms(right);
			return merge(left, right);
		};
		return _ms(array);
	};

	function set_difference(a, b) {
		return a.filter(function(el){
			return b.indexOf(el) < 0;
		});
	};

	function set_intersection(a, b) {
		return a.filter(function(el){
			return b.indexOf(el) >= 0;
		});
	};

	// this function is taken from Acorn [1], written by Marijn Haverbeke
	// [1] https://github.com/marijnh/acorn
	function makePredicate(words) {
		if (!(words instanceof Array)) words = words.split(" ");
		var f = "", cats = [];
		out: for (var i = 0; i < words.length; ++i) {
			for (var j = 0; j < cats.length; ++j)
				if (cats[j][0].length == words[i].length) {
					cats[j].push(words[i]);
					continue out;
				}
			cats.push([words[i]]);
		}
		function quote(word) {
			return JSON.stringify(word).replace(/[\u2028\u2029]/g, function(s) {
				switch (s) {
					case "\u2028": return "\\u2028";
					case "\u2029": return "\\u2029";
				}
				return s;
			});
		}
		function compareTo(arr) {
			if (arr.length == 1) return f += "return str === " + quote(arr[0]) + ";";
			f += "switch(str){";
			for (var i = 0; i < arr.length; ++i) f += "case " + quote(arr[i]) + ":";
			f += "return true}return false;";
		}
		// When there are more than three length categories, an outer
		// switch first dispatches on the lengths, to save on comparisons.
		if (cats.length > 3) {
			cats.sort(function(a, b) {return b.length - a.length;});
			f += "switch(str.length){";
			for (var i = 0; i < cats.length; ++i) {
				var cat = cats[i];
				f += "case " + cat[0].length + ":";
				compareTo(cat);
			}
			f += "}";
			// Otherwise, simply generate a flat `switch` statement.
		} else {
			compareTo(words);
		}
		return new Function("str", f);
	};

	function all(array, predicate) {
		for (var i = array.length; --i >= 0;)
			if (!predicate(array[i]))
				return false;
		return true;
	};

	function Dictionary() {
		this._values = Object.create(null);
		this._size = 0;
	};
	Dictionary.prototype = {
		set: function(key, val) {
			if (!this.has(key)) ++this._size;
			this._values["$" + key] = val;
			return this;
		},
		add: function(key, val) {
			if (this.has(key)) {
				this.get(key).push(val);
			} else {
				this.set(key, [ val ]);
			}
			return this;
		},
		get: function(key) { return this._values["$" + key] },
		del: function(key) {
			if (this.has(key)) {
				--this._size;
				delete this._values["$" + key];
			}
			return this;
		},
		has: function(key) { return ("$" + key) in this._values },
		each: function(f) {
			for (var i in this._values)
				f(this._values[i], i.substr(1));
		},
		size: function() {
			return this._size;
		},
		map: function(f) {
			var ret = [];
			for (var i in this._values)
				ret.push(f(this._values[i], i.substr(1)));
			return ret;
		},
		toObject: function() { return this._values }
	};
	Dictionary.fromObject = function(obj) {
		var dict = new Dictionary();
		dict._size = merge(dict._values, obj);
		return dict;
	};

	function HOP(obj, prop) {
		return Object.prototype.hasOwnProperty.call(obj, prop);
	}

	// return true if the node at the top of the stack (that means the
	// innermost node in the current output) is lexically the first in
	// a statement.
	function first_in_statement(stack) {
		var node = stack.parent(-1);
		for (var i = 0, p; p = stack.parent(i); i++) {
			if (p instanceof AST_Statement && p.body === node)
				return true;
			if ((p instanceof AST_Seq           && p.car === node        ) ||
				(p instanceof AST_Call          && p.expression === node && !(p instanceof AST_New) ) ||
				(p instanceof AST_Dot           && p.expression === node ) ||
				(p instanceof AST_Sub           && p.expression === node ) ||
				(p instanceof AST_Conditional   && p.condition === node  ) ||
				(p instanceof AST_Binary        && p.left === node       ) ||
				(p instanceof AST_UnaryPostfix  && p.expression === node ))
			{
				node = p;
			} else {
				return false;
			}
		}
	}
	//#endregion
	
	//#region URL: /lib/ast
	//"use strict";

	function DEFNODE(type, props, methods, base) {
		if (arguments.length < 4) base = AST_Node;
		if (!props) props = [];
		else props = props.split(/\s+/);
		var self_props = props;
		if (base && base.PROPS)
			props = props.concat(base.PROPS);
		var code = "return function AST_" + type + "(props){ if (props) { ";
		for (var i = props.length; --i >= 0;) {
			code += "this." + props[i] + " = props." + props[i] + ";";
		}
		var proto = base && new base;
		if (proto && proto.initialize || (methods && methods.initialize))
			code += "this.initialize();";
		code += "}}";
		var ctor = new Function(code)();
		if (proto) {
			ctor.prototype = proto;
			ctor.BASE = base;
		}
		if (base) base.SUBCLASSES.push(ctor);
		ctor.prototype.CTOR = ctor;
		ctor.PROPS = props || null;
		ctor.SELF_PROPS = self_props;
		ctor.SUBCLASSES = [];
		if (type) {
			ctor.prototype.TYPE = ctor.TYPE = type;
		}
		if (methods) for (i in methods) if (HOP(methods, i)) {
			if (/^\$/.test(i)) {
				ctor[i.substr(1)] = methods[i];
			} else {
				ctor.prototype[i] = methods[i];
			}
		}
		ctor.DEFMETHOD = function(name, method) {
			this.prototype[name] = method;
		};
		if (typeof exports !== "undefined") {
			exports["AST_" + type] = ctor;
		}
		return ctor;
	};

	var AST_Token = DEFNODE("Token", "type value line col pos endline endcol endpos nlb comments_before file raw", {
	}, null);

	var AST_Node = DEFNODE("Node", "start end", {
		_clone: function(deep) {
			if (deep) {
				var self = this.clone();
				return self.transform(new TreeTransformer(function(node) {
					if (node !== self) {
						return node.clone(true);
					}
				}));
			}
			return new this.CTOR(this);
		},
		clone: function(deep) {
			return this._clone(deep);
		},
		$documentation: "Base class of all AST nodes",
		$propdoc: {
			start: "[AST_Token] The first token of this node",
			end: "[AST_Token] The last token of this node"
		},
		_walk: function(visitor) {
			return visitor._visit(this);
		},
		walk: function(visitor) {
			return this._walk(visitor); // not sure the indirection will be any help
		}
	}, null);

	AST_Node.warn_function = null;
	AST_Node.warn = function(txt, props) {
		if (AST_Node.warn_function)
			AST_Node.warn_function(string_template(txt, props));
	};

	/* -----[ statements ]----- */

	var AST_Statement = DEFNODE("Statement", null, {
		$documentation: "Base class of all statements"
	});

	var AST_Debugger = DEFNODE("Debugger", null, {
		$documentation: "Represents a debugger statement"
	}, AST_Statement);

	var AST_Directive = DEFNODE("Directive", "value scope quote", {
		$documentation: "Represents a directive, like \"use strict\";",
		$propdoc: {
			value: "[string] The value of this directive as a plain string (it's not an AST_String!)",
			scope: "[AST_Scope/S] The scope that this directive affects",
			quote: "[string] the original quote character"
		}
	}, AST_Statement);

	var AST_SimpleStatement = DEFNODE("SimpleStatement", "body", {
		$documentation: "A statement consisting of an expression, i.e. a = 1 + 2",
		$propdoc: {
			body: "[AST_Node] an expression node (should not be instanceof AST_Statement)"
		},
		_walk: function(visitor) {
			return visitor._visit(this, function(){
				this.body._walk(visitor);
			});
		}
	}, AST_Statement);

	function walk_body(node, visitor) {
		var body = node.body;
		if (body instanceof AST_Statement) {
			body._walk(visitor);
		}
		else for (var i = 0, len = body.length; i < len; i++) {
			body[i]._walk(visitor);
		}
	};

	var AST_Block = DEFNODE("Block", "body", {
		$documentation: "A body of statements (usually bracketed)",
		$propdoc: {
			body: "[AST_Statement*] an array of statements"
		},
		_walk: function(visitor) {
			return visitor._visit(this, function(){
				walk_body(this, visitor);
			});
		}
	}, AST_Statement);

	var AST_BlockStatement = DEFNODE("BlockStatement", null, {
		$documentation: "A block statement"
	}, AST_Block);

	var AST_EmptyStatement = DEFNODE("EmptyStatement", null, {
		$documentation: "The empty statement (empty block or simply a semicolon)",
		_walk: function(visitor) {
			return visitor._visit(this);
		}
	}, AST_Statement);

	var AST_StatementWithBody = DEFNODE("StatementWithBody", "body", {
		$documentation: "Base class for all statements that contain one nested body: `For`, `ForIn`, `Do`, `While`, `With`",
		$propdoc: {
			body: "[AST_Statement] the body; this should always be present, even if it's an AST_EmptyStatement"
		},
		_walk: function(visitor) {
			return visitor._visit(this, function(){
				this.body._walk(visitor);
			});
		}
	}, AST_Statement);

	var AST_LabeledStatement = DEFNODE("LabeledStatement", "label", {
		$documentation: "Statement with a label",
		$propdoc: {
			label: "[AST_Label] a label definition"
		},
		_walk: function(visitor) {
			return visitor._visit(this, function(){
				this.label._walk(visitor);
				this.body._walk(visitor);
			});
		},
		clone: function(deep) {
			var node = this._clone(deep);
			if (deep) {
				var label = node.label;
				var def = this.label;
				node.walk(new TreeWalker(function(node) {
					if (node instanceof AST_LoopControl
						&& node.label && node.label.thedef === def) {
						node.label.thedef = label;
						label.references.push(node);
					}
				}));
			}
			return node;
		}
	}, AST_StatementWithBody);

	var AST_IterationStatement = DEFNODE("IterationStatement", null, {
		$documentation: "Internal class.  All loops inherit from it."
	}, AST_StatementWithBody);

	var AST_DWLoop = DEFNODE("DWLoop", "condition", {
		$documentation: "Base class for do/while statements",
		$propdoc: {
			condition: "[AST_Node] the loop condition.  Should not be instanceof AST_Statement"
		}
	}, AST_IterationStatement);

	var AST_Do = DEFNODE("Do", null, {
		$documentation: "A `do` statement",
		_walk: function(visitor) {
			return visitor._visit(this, function(){
				this.body._walk(visitor);
				this.condition._walk(visitor);
			});
		}
	}, AST_DWLoop);

	var AST_While = DEFNODE("While", null, {
		$documentation: "A `while` statement",
		_walk: function(visitor) {
			return visitor._visit(this, function(){
				this.condition._walk(visitor);
				this.body._walk(visitor);
			});
		}
	}, AST_DWLoop);

	var AST_For = DEFNODE("For", "init condition step", {
		$documentation: "A `for` statement",
		$propdoc: {
			init: "[AST_Node?] the `for` initialization code, or null if empty",
			condition: "[AST_Node?] the `for` termination clause, or null if empty",
			step: "[AST_Node?] the `for` update clause, or null if empty"
		},
		_walk: function(visitor) {
			return visitor._visit(this, function(){
				if (this.init) this.init._walk(visitor);
				if (this.condition) this.condition._walk(visitor);
				if (this.step) this.step._walk(visitor);
				this.body._walk(visitor);
			});
		}
	}, AST_IterationStatement);

	var AST_ForIn = DEFNODE("ForIn", "init name object", {
		$documentation: "A `for ... in` statement",
		$propdoc: {
			init: "[AST_Node] the `for/in` initialization code",
			name: "[AST_SymbolRef?] the loop variable, only if `init` is AST_Var",
			object: "[AST_Node] the object that we're looping through"
		},
		_walk: function(visitor) {
			return visitor._visit(this, function(){
				this.init._walk(visitor);
				this.object._walk(visitor);
				this.body._walk(visitor);
			});
		}
	}, AST_IterationStatement);

	var AST_With = DEFNODE("With", "expression", {
		$documentation: "A `with` statement",
		$propdoc: {
			expression: "[AST_Node] the `with` expression"
		},
		_walk: function(visitor) {
			return visitor._visit(this, function(){
				this.expression._walk(visitor);
				this.body._walk(visitor);
			});
		}
	}, AST_StatementWithBody);

	/* -----[ scope and functions ]----- */

	var AST_Scope = DEFNODE("Scope", "directives variables functions uses_with uses_eval parent_scope enclosed cname", {
		$documentation: "Base class for all statements introducing a lexical scope",
		$propdoc: {
			directives: "[string*/S] an array of directives declared in this scope",
			variables: "[Object/S] a map of name -> SymbolDef for all variables/functions defined in this scope",
			functions: "[Object/S] like `variables`, but only lists function declarations",
			uses_with: "[boolean/S] tells whether this scope uses the `with` statement",
			uses_eval: "[boolean/S] tells whether this scope contains a direct call to the global `eval`",
			parent_scope: "[AST_Scope?/S] link to the parent scope",
			enclosed: "[SymbolDef*/S] a list of all symbol definitions that are accessed from this scope or any subscopes",
			cname: "[integer/S] current index for mangling variables (used internally by the mangler)"
		}
	}, AST_Block);

	var AST_Toplevel = DEFNODE("Toplevel", "globals", {
		$documentation: "The toplevel scope",
		$propdoc: {
			globals: "[Object/S] a map of name -> SymbolDef for all undeclared names"
		},
		wrap_enclose: function(arg_parameter_pairs) {
			var self = this;
			var args = [];
			var parameters = [];

			arg_parameter_pairs.forEach(function(pair) {
				var splitAt = pair.lastIndexOf(":");

				args.push(pair.substr(0, splitAt));
				parameters.push(pair.substr(splitAt + 1));
			});

			var wrapped_tl = "(function(" + parameters.join(",") + "){ '$ORIG'; })(" + args.join(",") + ")";
			wrapped_tl = parse(wrapped_tl);
			wrapped_tl = wrapped_tl.transform(new TreeTransformer(function before(node){
				if (node instanceof AST_Directive && node.value == "$ORIG") {
					return MAP.splice(self.body);
				}
			}));
			return wrapped_tl;
		},
		wrap_commonjs: function(name, export_all) {
			var self = this;
			var to_export = [];
			if (export_all) {
				self.figure_out_scope();
				self.walk(new TreeWalker(function(node){
					if (node instanceof AST_SymbolDeclaration && node.definition().global) {
						if (!find_if(function(n){ return n.name == node.name }, to_export))
							to_export.push(node);
					}
				}));
			}
			var wrapped_tl = "(function(exports, global){ '$ORIG'; '$EXPORTS'; global['" + name + "'] = exports; }({}, (function(){return this}())))";
			wrapped_tl = parse(wrapped_tl);
			wrapped_tl = wrapped_tl.transform(new TreeTransformer(function before(node){
				if (node instanceof AST_Directive) {
					switch (node.value) {
					  case "$ORIG":
						return MAP.splice(self.body);
					  case "$EXPORTS":
						var body = [];
						to_export.forEach(function(sym){
							body.push(new AST_SimpleStatement({
								body: new AST_Assign({
									left: new AST_Sub({
										expression: new AST_SymbolRef({ name: "exports" }),
										property: new AST_String({ value: sym.name })
									}),
									operator: "=",
									right: new AST_SymbolRef(sym)
								})
							}));
						});
						return MAP.splice(body);
					}
				}
			}));
			return wrapped_tl;
		}
	}, AST_Scope);

	var AST_Lambda = DEFNODE("Lambda", "name argnames uses_arguments", {
		$documentation: "Base class for functions",
		$propdoc: {
			name: "[AST_SymbolDeclaration?] the name of this function",
			argnames: "[AST_SymbolFunarg*] array of function arguments",
			uses_arguments: "[boolean/S] tells whether this function accesses the arguments array"
		},
		_walk: function(visitor) {
			return visitor._visit(this, function(){
				if (this.name) this.name._walk(visitor);
				var argnames = this.argnames;
				for (var i = 0, len = argnames.length; i < len; i++) {
					argnames[i]._walk(visitor);
				}
				walk_body(this, visitor);
			});
		}
	}, AST_Scope);

	var AST_Accessor = DEFNODE("Accessor", null, {
		$documentation: "A setter/getter function.  The `name` property is always null."
	}, AST_Lambda);

	var AST_Function = DEFNODE("Function", null, {
		$documentation: "A function expression"
	}, AST_Lambda);

	var AST_Defun = DEFNODE("Defun", null, {
		$documentation: "A function definition"
	}, AST_Lambda);

	/* -----[ JUMPS ]----- */

	var AST_Jump = DEFNODE("Jump", null, {
		$documentation: "Base class for “jumps” (for now that's `return`, `throw`, `break` and `continue`)"
	}, AST_Statement);

	var AST_Exit = DEFNODE("Exit", "value", {
		$documentation: "Base class for “exits” (`return` and `throw`)",
		$propdoc: {
			value: "[AST_Node?] the value returned or thrown by this statement; could be null for AST_Return"
		},
		_walk: function(visitor) {
			return visitor._visit(this, this.value && function(){
				this.value._walk(visitor);
			});
		}
	}, AST_Jump);

	var AST_Return = DEFNODE("Return", null, {
		$documentation: "A `return` statement"
	}, AST_Exit);

	var AST_Throw = DEFNODE("Throw", null, {
		$documentation: "A `throw` statement"
	}, AST_Exit);

	var AST_LoopControl = DEFNODE("LoopControl", "label", {
		$documentation: "Base class for loop control statements (`break` and `continue`)",
		$propdoc: {
			label: "[AST_LabelRef?] the label, or null if none"
		},
		_walk: function(visitor) {
			return visitor._visit(this, this.label && function(){
				this.label._walk(visitor);
			});
		}
	}, AST_Jump);

	var AST_Break = DEFNODE("Break", null, {
		$documentation: "A `break` statement"
	}, AST_LoopControl);

	var AST_Continue = DEFNODE("Continue", null, {
		$documentation: "A `continue` statement"
	}, AST_LoopControl);

	/* -----[ IF ]----- */

	var AST_If = DEFNODE("If", "condition alternative", {
		$documentation: "A `if` statement",
		$propdoc: {
			condition: "[AST_Node] the `if` condition",
			alternative: "[AST_Statement?] the `else` part, or null if not present"
		},
		_walk: function(visitor) {
			return visitor._visit(this, function(){
				this.condition._walk(visitor);
				this.body._walk(visitor);
				if (this.alternative) this.alternative._walk(visitor);
			});
		}
	}, AST_StatementWithBody);

	/* -----[ SWITCH ]----- */

	var AST_Switch = DEFNODE("Switch", "expression", {
		$documentation: "A `switch` statement",
		$propdoc: {
			expression: "[AST_Node] the `switch` “discriminant”"
		},
		_walk: function(visitor) {
			return visitor._visit(this, function(){
				this.expression._walk(visitor);
				walk_body(this, visitor);
			});
		}
	}, AST_Block);

	var AST_SwitchBranch = DEFNODE("SwitchBranch", null, {
		$documentation: "Base class for `switch` branches"
	}, AST_Block);

	var AST_Default = DEFNODE("Default", null, {
		$documentation: "A `default` switch branch"
	}, AST_SwitchBranch);

	var AST_Case = DEFNODE("Case", "expression", {
		$documentation: "A `case` switch branch",
		$propdoc: {
			expression: "[AST_Node] the `case` expression"
		},
		_walk: function(visitor) {
			return visitor._visit(this, function(){
				this.expression._walk(visitor);
				walk_body(this, visitor);
			});
		}
	}, AST_SwitchBranch);

	/* -----[ EXCEPTIONS ]----- */

	var AST_Try = DEFNODE("Try", "bcatch bfinally", {
		$documentation: "A `try` statement",
		$propdoc: {
			bcatch: "[AST_Catch?] the catch block, or null if not present",
			bfinally: "[AST_Finally?] the finally block, or null if not present"
		},
		_walk: function(visitor) {
			return visitor._visit(this, function(){
				walk_body(this, visitor);
				if (this.bcatch) this.bcatch._walk(visitor);
				if (this.bfinally) this.bfinally._walk(visitor);
			});
		}
	}, AST_Block);

	var AST_Catch = DEFNODE("Catch", "argname", {
		$documentation: "A `catch` node; only makes sense as part of a `try` statement",
		$propdoc: {
			argname: "[AST_SymbolCatch] symbol for the exception"
		},
		_walk: function(visitor) {
			return visitor._visit(this, function(){
				this.argname._walk(visitor);
				walk_body(this, visitor);
			});
		}
	}, AST_Block);

	var AST_Finally = DEFNODE("Finally", null, {
		$documentation: "A `finally` node; only makes sense as part of a `try` statement"
	}, AST_Block);

	/* -----[ VAR/CONST ]----- */

	var AST_Definitions = DEFNODE("Definitions", "definitions", {
		$documentation: "Base class for `var` or `const` nodes (variable declarations/initializations)",
		$propdoc: {
			definitions: "[AST_VarDef*] array of variable definitions"
		},
		_walk: function(visitor) {
			return visitor._visit(this, function(){
				var definitions = this.definitions;
				for (var i = 0, len = definitions.length; i < len; i++) {
					definitions[i]._walk(visitor);
				}
			});
		}
	}, AST_Statement);

	var AST_Var = DEFNODE("Var", null, {
		$documentation: "A `var` statement"
	}, AST_Definitions);

	var AST_Const = DEFNODE("Const", null, {
		$documentation: "A `const` statement"
	}, AST_Definitions);

	var AST_VarDef = DEFNODE("VarDef", "name value", {
		$documentation: "A variable declaration; only appears in a AST_Definitions node",
		$propdoc: {
			name: "[AST_SymbolVar|AST_SymbolConst] name of the variable",
			value: "[AST_Node?] initializer, or null of there's no initializer"
		},
		_walk: function(visitor) {
			return visitor._visit(this, function(){
				this.name._walk(visitor);
				if (this.value) this.value._walk(visitor);
			});
		}
	});

	/* -----[ OTHER ]----- */

	var AST_Call = DEFNODE("Call", "expression args", {
		$documentation: "A function call expression",
		$propdoc: {
			expression: "[AST_Node] expression to invoke as function",
			args: "[AST_Node*] array of arguments"
		},
		_walk: function(visitor) {
			return visitor._visit(this, function(){
				this.expression._walk(visitor);
				var args = this.args;
				for (var i = 0, len = args.length; i < len; i++) {
					args[i]._walk(visitor);
				}
			});
		}
	});

	var AST_New = DEFNODE("New", null, {
		$documentation: "An object instantiation.  Derives from a function call since it has exactly the same properties"
	}, AST_Call);

	var AST_Seq = DEFNODE("Seq", "car cdr", {
		$documentation: "A sequence expression (two comma-separated expressions)",
		$propdoc: {
			car: "[AST_Node] first element in sequence",
			cdr: "[AST_Node] second element in sequence"
		},
		$cons: function(x, y) {
			var seq = new AST_Seq(x);
			seq.car = x;
			seq.cdr = y;
			return seq;
		},
		$from_array: function(array) {
			if (array.length == 0) return null;
			if (array.length == 1) return array[0].clone();
			var list = null;
			for (var i = array.length; --i >= 0;) {
				list = AST_Seq.cons(array[i], list);
			}
			var p = list;
			while (p) {
				if (p.cdr && !p.cdr.cdr) {
					p.cdr = p.cdr.car;
					break;
				}
				p = p.cdr;
			}
			return list;
		},
		to_array: function() {
			var p = this, a = [];
			while (p) {
				a.push(p.car);
				if (p.cdr && !(p.cdr instanceof AST_Seq)) {
					a.push(p.cdr);
					break;
				}
				p = p.cdr;
			}
			return a;
		},
		add: function(node) {
			var p = this;
			while (p) {
				if (!(p.cdr instanceof AST_Seq)) {
					var cell = AST_Seq.cons(p.cdr, node);
					return p.cdr = cell;
				}
				p = p.cdr;
			}
		},
		len: function() {
			if (this.cdr instanceof AST_Seq) {
				return this.cdr.len() + 1;
			} else {
				return 2;
			}
		},
		_walk: function(visitor) {
			return visitor._visit(this, function(){
				this.car._walk(visitor);
				if (this.cdr) this.cdr._walk(visitor);
			});
		}
	});

	var AST_PropAccess = DEFNODE("PropAccess", "expression property", {
		$documentation: "Base class for property access expressions, i.e. `a.foo` or `a[\"foo\"]`",
		$propdoc: {
			expression: "[AST_Node] the “container” expression",
			property: "[AST_Node|string] the property to access.  For AST_Dot this is always a plain string, while for AST_Sub it's an arbitrary AST_Node"
		}
	});

	var AST_Dot = DEFNODE("Dot", null, {
		$documentation: "A dotted property access expression",
		_walk: function(visitor) {
			return visitor._visit(this, function(){
				this.expression._walk(visitor);
			});
		}
	}, AST_PropAccess);

	var AST_Sub = DEFNODE("Sub", null, {
		$documentation: "Index-style property access, i.e. `a[\"foo\"]`",
		_walk: function(visitor) {
			return visitor._visit(this, function(){
				this.expression._walk(visitor);
				this.property._walk(visitor);
			});
		}
	}, AST_PropAccess);

	var AST_Unary = DEFNODE("Unary", "operator expression", {
		$documentation: "Base class for unary expressions",
		$propdoc: {
			operator: "[string] the operator",
			expression: "[AST_Node] expression that this unary operator applies to"
		},
		_walk: function(visitor) {
			return visitor._visit(this, function(){
				this.expression._walk(visitor);
			});
		}
	});

	var AST_UnaryPrefix = DEFNODE("UnaryPrefix", null, {
		$documentation: "Unary prefix expression, i.e. `typeof i` or `++i`"
	}, AST_Unary);

	var AST_UnaryPostfix = DEFNODE("UnaryPostfix", null, {
		$documentation: "Unary postfix expression, i.e. `i++`"
	}, AST_Unary);

	var AST_Binary = DEFNODE("Binary", "left operator right", {
		$documentation: "Binary expression, i.e. `a + b`",
		$propdoc: {
			left: "[AST_Node] left-hand side expression",
			operator: "[string] the operator",
			right: "[AST_Node] right-hand side expression"
		},
		_walk: function(visitor) {
			return visitor._visit(this, function(){
				this.left._walk(visitor);
				this.right._walk(visitor);
			});
		}
	});

	var AST_Conditional = DEFNODE("Conditional", "condition consequent alternative", {
		$documentation: "Conditional expression using the ternary operator, i.e. `a ? b : c`",
		$propdoc: {
			condition: "[AST_Node]",
			consequent: "[AST_Node]",
			alternative: "[AST_Node]"
		},
		_walk: function(visitor) {
			return visitor._visit(this, function(){
				this.condition._walk(visitor);
				this.consequent._walk(visitor);
				this.alternative._walk(visitor);
			});
		}
	});

	var AST_Assign = DEFNODE("Assign", null, {
		$documentation: "An assignment expression — `a = b + 5`"
	}, AST_Binary);

	/* -----[ LITERALS ]----- */

	var AST_Array = DEFNODE("Array", "elements", {
		$documentation: "An array literal",
		$propdoc: {
			elements: "[AST_Node*] array of elements"
		},
		_walk: function(visitor) {
			return visitor._visit(this, function(){
				var elements = this.elements;
				for (var i = 0, len = elements.length; i < len; i++) {
					elements[i]._walk(visitor);
				}
			});
		}
	});

	var AST_Object = DEFNODE("Object", "properties", {
		$documentation: "An object literal",
		$propdoc: {
			properties: "[AST_ObjectProperty*] array of properties"
		},
		_walk: function(visitor) {
			return visitor._visit(this, function(){
				var properties = this.properties;
				for (var i = 0, len = properties.length; i < len; i++) {
					properties[i]._walk(visitor);
				}
			});
		}
	});

	var AST_ObjectProperty = DEFNODE("ObjectProperty", "key value", {
		$documentation: "Base class for literal object properties",
		$propdoc: {
			key: "[string] the property name converted to a string for ObjectKeyVal.  For setters and getters this is an AST_SymbolAccessor.",
			value: "[AST_Node] property value.  For setters and getters this is an AST_Accessor."
		},
		_walk: function(visitor) {
			return visitor._visit(this, function(){
				this.value._walk(visitor);
			});
		}
	});

	var AST_ObjectKeyVal = DEFNODE("ObjectKeyVal", "quote", {
		$documentation: "A key: value object property",
		$propdoc: {
			quote: "[string] the original quote character"
		}
	}, AST_ObjectProperty);

	var AST_ObjectSetter = DEFNODE("ObjectSetter", null, {
		$documentation: "An object setter property"
	}, AST_ObjectProperty);

	var AST_ObjectGetter = DEFNODE("ObjectGetter", null, {
		$documentation: "An object getter property"
	}, AST_ObjectProperty);

	var AST_Symbol = DEFNODE("Symbol", "scope name thedef", {
		$propdoc: {
			name: "[string] name of this symbol",
			scope: "[AST_Scope/S] the current scope (not necessarily the definition scope)",
			thedef: "[SymbolDef/S] the definition of this symbol"
		},
		$documentation: "Base class for all symbols"
	});

	var AST_SymbolAccessor = DEFNODE("SymbolAccessor", null, {
		$documentation: "The name of a property accessor (setter/getter function)"
	}, AST_Symbol);

	var AST_SymbolDeclaration = DEFNODE("SymbolDeclaration", "init", {
		$documentation: "A declaration symbol (symbol in var/const, function name or argument, symbol in catch)"
	}, AST_Symbol);

	var AST_SymbolVar = DEFNODE("SymbolVar", null, {
		$documentation: "Symbol defining a variable"
	}, AST_SymbolDeclaration);

	var AST_SymbolConst = DEFNODE("SymbolConst", null, {
		$documentation: "A constant declaration"
	}, AST_SymbolDeclaration);

	var AST_SymbolFunarg = DEFNODE("SymbolFunarg", null, {
		$documentation: "Symbol naming a function argument"
	}, AST_SymbolVar);

	var AST_SymbolDefun = DEFNODE("SymbolDefun", null, {
		$documentation: "Symbol defining a function"
	}, AST_SymbolDeclaration);

	var AST_SymbolLambda = DEFNODE("SymbolLambda", null, {
		$documentation: "Symbol naming a function expression"
	}, AST_SymbolDeclaration);

	var AST_SymbolCatch = DEFNODE("SymbolCatch", null, {
		$documentation: "Symbol naming the exception in catch"
	}, AST_SymbolDeclaration);

	var AST_Label = DEFNODE("Label", "references", {
		$documentation: "Symbol naming a label (declaration)",
		$propdoc: {
			references: "[AST_LoopControl*] a list of nodes referring to this label"
		},
		initialize: function() {
			this.references = [];
			this.thedef = this;
		}
	}, AST_Symbol);

	var AST_SymbolRef = DEFNODE("SymbolRef", null, {
		$documentation: "Reference to some symbol (not definition/declaration)"
	}, AST_Symbol);

	var AST_LabelRef = DEFNODE("LabelRef", null, {
		$documentation: "Reference to a label symbol"
	}, AST_Symbol);

	var AST_This = DEFNODE("This", null, {
		$documentation: "The `this` symbol"
	}, AST_Symbol);

	var AST_Constant = DEFNODE("Constant", null, {
		$documentation: "Base class for all constants",
		getValue: function() {
			return this.value;
		}
	});

	var AST_String = DEFNODE("String", "value quote", {
		$documentation: "A string literal",
		$propdoc: {
			value: "[string] the contents of this string",
			quote: "[string] the original quote character"
		}
	}, AST_Constant);

	var AST_Number = DEFNODE("Number", "value literal", {
		$documentation: "A number literal",
		$propdoc: {
			value: "[number] the numeric value",
			literal: "[string] numeric value as string (optional)"
		}
	}, AST_Constant);

	var AST_RegExp = DEFNODE("RegExp", "value", {
		$documentation: "A regexp literal",
		$propdoc: {
			value: "[RegExp] the actual regexp"
		}
	}, AST_Constant);

	var AST_Atom = DEFNODE("Atom", null, {
		$documentation: "Base class for atoms"
	}, AST_Constant);

	var AST_Null = DEFNODE("Null", null, {
		$documentation: "The `null` atom",
		value: null
	}, AST_Atom);

	var AST_NaN = DEFNODE("NaN", null, {
		$documentation: "The impossible value",
		value: 0/0
	}, AST_Atom);

	var AST_Undefined = DEFNODE("Undefined", null, {
		$documentation: "The `undefined` value",
		value: (function(){}())
	}, AST_Atom);

	var AST_Hole = DEFNODE("Hole", null, {
		$documentation: "A hole in an array",
		value: (function(){}())
	}, AST_Atom);

	var AST_Infinity = DEFNODE("Infinity", null, {
		$documentation: "The `Infinity` value",
		value: 1/0
	}, AST_Atom);

	var AST_Boolean = DEFNODE("Boolean", null, {
		$documentation: "Base class for booleans"
	}, AST_Atom);

	var AST_False = DEFNODE("False", null, {
		$documentation: "The `false` atom",
		value: false
	}, AST_Boolean);

	var AST_True = DEFNODE("True", null, {
		$documentation: "The `true` atom",
		value: true
	}, AST_Boolean);

	/* -----[ TreeWalker ]----- */

	function TreeWalker(callback) {
		this.visit = callback;
		this.stack = [];
		this.directives = Object.create(null);
	};
	TreeWalker.prototype = {
		_visit: function(node, descend) {
			this.push(node);
			var ret = this.visit(node, descend ? function(){
				descend.call(node);
			} : noop);
			if (!ret && descend) {
				descend.call(node);
			}
			this.pop(node);
			return ret;
		},
		parent: function(n) {
			return this.stack[this.stack.length - 2 - (n || 0)];
		},
		push: function (node) {
			if (node instanceof AST_Lambda) {
				this.directives = Object.create(this.directives);
			} else if (node instanceof AST_Directive && !this.directives[node.value]) {
				this.directives[node.value] = node;
			}
			this.stack.push(node);
		},
		pop: function(node) {
			this.stack.pop();
			if (node instanceof AST_Lambda) {
				this.directives = Object.getPrototypeOf(this.directives);
			}
		},
		self: function() {
			return this.stack[this.stack.length - 1];
		},
		find_parent: function(type) {
			var stack = this.stack;
			for (var i = stack.length; --i >= 0;) {
				var x = stack[i];
				if (x instanceof type) return x;
			}
		},
		has_directive: function(type) {
			var dir = this.directives[type];
			if (dir) return dir;
			var node = this.stack[this.stack.length - 1];
			if (node instanceof AST_Scope) {
				for (var i = 0; i < node.body.length; ++i) {
					var st = node.body[i];
					if (!(st instanceof AST_Directive)) break;
					if (st.value == type) return st;
				}
			}
		},
		in_boolean_context: function() {
			var stack = this.stack;
			var i = stack.length, self = stack[--i];
			while (i > 0) {
				var p = stack[--i];
				if ((p instanceof AST_If           && p.condition === self) ||
					(p instanceof AST_Conditional  && p.condition === self) ||
					(p instanceof AST_DWLoop       && p.condition === self) ||
					(p instanceof AST_For          && p.condition === self) ||
					(p instanceof AST_UnaryPrefix  && p.operator == "!" && p.expression === self))
				{
					return true;
				}
				if (!(p instanceof AST_Binary && (p.operator == "&&" || p.operator == "||")))
					return false;
				self = p;
			}
		},
		loopcontrol_target: function(node) {
			var stack = this.stack;
			if (node.label) for (var i = stack.length; --i >= 0;) {
				var x = stack[i];
				if (x instanceof AST_LabeledStatement && x.label.name == node.label.name)
					return x.body;
			} else for (var i = stack.length; --i >= 0;) {
				var x = stack[i];
				if (x instanceof AST_IterationStatement
					|| node instanceof AST_Break && x instanceof AST_Switch)
					return x;
			}
		}
	};
	//#endregion
	
	//#region URL: /lib/parse
	//"use strict";

	var KEYWORDS = 'break case catch const continue debugger default delete do else finally for function if in instanceof new return switch throw try typeof var void while with';
	var KEYWORDS_ATOM = 'false null true';
	var RESERVED_WORDS = 'abstract boolean byte char class double enum export extends final float goto implements import int interface let long native package private protected public short static super synchronized this throws transient volatile yield'
		+ " " + KEYWORDS_ATOM + " " + KEYWORDS;
	var KEYWORDS_BEFORE_EXPRESSION = 'return new delete throw else case';

	KEYWORDS = makePredicate(KEYWORDS);
	RESERVED_WORDS = makePredicate(RESERVED_WORDS);
	KEYWORDS_BEFORE_EXPRESSION = makePredicate(KEYWORDS_BEFORE_EXPRESSION);
	KEYWORDS_ATOM = makePredicate(KEYWORDS_ATOM);

	var OPERATOR_CHARS = makePredicate(characters("+-*&%=<>!?|~^"));

	var RE_HEX_NUMBER = /^0x[0-9a-f]+$/i;
	var RE_OCT_NUMBER = /^0[0-7]+$/;

	var OPERATORS = makePredicate([
		"in",
		"instanceof",
		"typeof",
		"new",
		"void",
		"delete",
		"++",
		"--",
		"+",
		"-",
		"!",
		"~",
		"&",
		"|",
		"^",
		"*",
		"/",
		"%",
		">>",
		"<<",
		">>>",
		"<",
		">",
		"<=",
		">=",
		"==",
		"===",
		"!=",
		"!==",
		"?",
		"=",
		"+=",
		"-=",
		"/=",
		"*=",
		"%=",
		">>=",
		"<<=",
		">>>=",
		"|=",
		"^=",
		"&=",
		"&&",
		"||"
	]);

	var WHITESPACE_CHARS = makePredicate(characters(" \u00a0\n\r\t\f\u000b\u200b\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\uFEFF"));

	var NEWLINE_CHARS = makePredicate(characters("\n\r\u2028\u2029"));

	var PUNC_BEFORE_EXPRESSION = makePredicate(characters("[{(,;:"));

	var PUNC_CHARS = makePredicate(characters("[]{}(),;:"));

	var REGEXP_MODIFIERS = makePredicate(characters("gmsiy"));

	/* -----[ Tokenizer ]----- */

	// regexps adapted from http://xregexp.com/plugins/#unicode
	var UNICODE = {
		letter: new RegExp("[\\u0041-\\u005A\\u0061-\\u007A\\u00AA\\u00B5\\u00BA\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02C1\\u02C6-\\u02D1\\u02E0-\\u02E4\\u02EC\\u02EE\\u0370-\\u0374\\u0376\\u0377\\u037A-\\u037D\\u037F\\u0386\\u0388-\\u038A\\u038C\\u038E-\\u03A1\\u03A3-\\u03F5\\u03F7-\\u0481\\u048A-\\u052F\\u0531-\\u0556\\u0559\\u0561-\\u0587\\u05D0-\\u05EA\\u05F0-\\u05F2\\u0620-\\u064A\\u066E\\u066F\\u0671-\\u06D3\\u06D5\\u06E5\\u06E6\\u06EE\\u06EF\\u06FA-\\u06FC\\u06FF\\u0710\\u0712-\\u072F\\u074D-\\u07A5\\u07B1\\u07CA-\\u07EA\\u07F4\\u07F5\\u07FA\\u0800-\\u0815\\u081A\\u0824\\u0828\\u0840-\\u0858\\u08A0-\\u08B2\\u0904-\\u0939\\u093D\\u0950\\u0958-\\u0961\\u0971-\\u0980\\u0985-\\u098C\\u098F\\u0990\\u0993-\\u09A8\\u09AA-\\u09B0\\u09B2\\u09B6-\\u09B9\\u09BD\\u09CE\\u09DC\\u09DD\\u09DF-\\u09E1\\u09F0\\u09F1\\u0A05-\\u0A0A\\u0A0F\\u0A10\\u0A13-\\u0A28\\u0A2A-\\u0A30\\u0A32\\u0A33\\u0A35\\u0A36\\u0A38\\u0A39\\u0A59-\\u0A5C\\u0A5E\\u0A72-\\u0A74\\u0A85-\\u0A8D\\u0A8F-\\u0A91\\u0A93-\\u0AA8\\u0AAA-\\u0AB0\\u0AB2\\u0AB3\\u0AB5-\\u0AB9\\u0ABD\\u0AD0\\u0AE0\\u0AE1\\u0B05-\\u0B0C\\u0B0F\\u0B10\\u0B13-\\u0B28\\u0B2A-\\u0B30\\u0B32\\u0B33\\u0B35-\\u0B39\\u0B3D\\u0B5C\\u0B5D\\u0B5F-\\u0B61\\u0B71\\u0B83\\u0B85-\\u0B8A\\u0B8E-\\u0B90\\u0B92-\\u0B95\\u0B99\\u0B9A\\u0B9C\\u0B9E\\u0B9F\\u0BA3\\u0BA4\\u0BA8-\\u0BAA\\u0BAE-\\u0BB9\\u0BD0\\u0C05-\\u0C0C\\u0C0E-\\u0C10\\u0C12-\\u0C28\\u0C2A-\\u0C39\\u0C3D\\u0C58\\u0C59\\u0C60\\u0C61\\u0C85-\\u0C8C\\u0C8E-\\u0C90\\u0C92-\\u0CA8\\u0CAA-\\u0CB3\\u0CB5-\\u0CB9\\u0CBD\\u0CDE\\u0CE0\\u0CE1\\u0CF1\\u0CF2\\u0D05-\\u0D0C\\u0D0E-\\u0D10\\u0D12-\\u0D3A\\u0D3D\\u0D4E\\u0D60\\u0D61\\u0D7A-\\u0D7F\\u0D85-\\u0D96\\u0D9A-\\u0DB1\\u0DB3-\\u0DBB\\u0DBD\\u0DC0-\\u0DC6\\u0E01-\\u0E30\\u0E32\\u0E33\\u0E40-\\u0E46\\u0E81\\u0E82\\u0E84\\u0E87\\u0E88\\u0E8A\\u0E8D\\u0E94-\\u0E97\\u0E99-\\u0E9F\\u0EA1-\\u0EA3\\u0EA5\\u0EA7\\u0EAA\\u0EAB\\u0EAD-\\u0EB0\\u0EB2\\u0EB3\\u0EBD\\u0EC0-\\u0EC4\\u0EC6\\u0EDC-\\u0EDF\\u0F00\\u0F40-\\u0F47\\u0F49-\\u0F6C\\u0F88-\\u0F8C\\u1000-\\u102A\\u103F\\u1050-\\u1055\\u105A-\\u105D\\u1061\\u1065\\u1066\\u106E-\\u1070\\u1075-\\u1081\\u108E\\u10A0-\\u10C5\\u10C7\\u10CD\\u10D0-\\u10FA\\u10FC-\\u1248\\u124A-\\u124D\\u1250-\\u1256\\u1258\\u125A-\\u125D\\u1260-\\u1288\\u128A-\\u128D\\u1290-\\u12B0\\u12B2-\\u12B5\\u12B8-\\u12BE\\u12C0\\u12C2-\\u12C5\\u12C8-\\u12D6\\u12D8-\\u1310\\u1312-\\u1315\\u1318-\\u135A\\u1380-\\u138F\\u13A0-\\u13F4\\u1401-\\u166C\\u166F-\\u167F\\u1681-\\u169A\\u16A0-\\u16EA\\u16EE-\\u16F8\\u1700-\\u170C\\u170E-\\u1711\\u1720-\\u1731\\u1740-\\u1751\\u1760-\\u176C\\u176E-\\u1770\\u1780-\\u17B3\\u17D7\\u17DC\\u1820-\\u1877\\u1880-\\u18A8\\u18AA\\u18B0-\\u18F5\\u1900-\\u191E\\u1950-\\u196D\\u1970-\\u1974\\u1980-\\u19AB\\u19C1-\\u19C7\\u1A00-\\u1A16\\u1A20-\\u1A54\\u1AA7\\u1B05-\\u1B33\\u1B45-\\u1B4B\\u1B83-\\u1BA0\\u1BAE\\u1BAF\\u1BBA-\\u1BE5\\u1C00-\\u1C23\\u1C4D-\\u1C4F\\u1C5A-\\u1C7D\\u1CE9-\\u1CEC\\u1CEE-\\u1CF1\\u1CF5\\u1CF6\\u1D00-\\u1DBF\\u1E00-\\u1F15\\u1F18-\\u1F1D\\u1F20-\\u1F45\\u1F48-\\u1F4D\\u1F50-\\u1F57\\u1F59\\u1F5B\\u1F5D\\u1F5F-\\u1F7D\\u1F80-\\u1FB4\\u1FB6-\\u1FBC\\u1FBE\\u1FC2-\\u1FC4\\u1FC6-\\u1FCC\\u1FD0-\\u1FD3\\u1FD6-\\u1FDB\\u1FE0-\\u1FEC\\u1FF2-\\u1FF4\\u1FF6-\\u1FFC\\u2071\\u207F\\u2090-\\u209C\\u2102\\u2107\\u210A-\\u2113\\u2115\\u2119-\\u211D\\u2124\\u2126\\u2128\\u212A-\\u212D\\u212F-\\u2139\\u213C-\\u213F\\u2145-\\u2149\\u214E\\u2160-\\u2188\\u2C00-\\u2C2E\\u2C30-\\u2C5E\\u2C60-\\u2CE4\\u2CEB-\\u2CEE\\u2CF2\\u2CF3\\u2D00-\\u2D25\\u2D27\\u2D2D\\u2D30-\\u2D67\\u2D6F\\u2D80-\\u2D96\\u2DA0-\\u2DA6\\u2DA8-\\u2DAE\\u2DB0-\\u2DB6\\u2DB8-\\u2DBE\\u2DC0-\\u2DC6\\u2DC8-\\u2DCE\\u2DD0-\\u2DD6\\u2DD8-\\u2DDE\\u2E2F\\u3005-\\u3007\\u3021-\\u3029\\u3031-\\u3035\\u3038-\\u303C\\u3041-\\u3096\\u309D-\\u309F\\u30A1-\\u30FA\\u30FC-\\u30FF\\u3105-\\u312D\\u3131-\\u318E\\u31A0-\\u31BA\\u31F0-\\u31FF\\u3400-\\u4DB5\\u4E00-\\u9FCC\\uA000-\\uA48C\\uA4D0-\\uA4FD\\uA500-\\uA60C\\uA610-\\uA61F\\uA62A\\uA62B\\uA640-\\uA66E\\uA67F-\\uA69D\\uA6A0-\\uA6EF\\uA717-\\uA71F\\uA722-\\uA788\\uA78B-\\uA78E\\uA790-\\uA7AD\\uA7B0\\uA7B1\\uA7F7-\\uA801\\uA803-\\uA805\\uA807-\\uA80A\\uA80C-\\uA822\\uA840-\\uA873\\uA882-\\uA8B3\\uA8F2-\\uA8F7\\uA8FB\\uA90A-\\uA925\\uA930-\\uA946\\uA960-\\uA97C\\uA984-\\uA9B2\\uA9CF\\uA9E0-\\uA9E4\\uA9E6-\\uA9EF\\uA9FA-\\uA9FE\\uAA00-\\uAA28\\uAA40-\\uAA42\\uAA44-\\uAA4B\\uAA60-\\uAA76\\uAA7A\\uAA7E-\\uAAAF\\uAAB1\\uAAB5\\uAAB6\\uAAB9-\\uAABD\\uAAC0\\uAAC2\\uAADB-\\uAADD\\uAAE0-\\uAAEA\\uAAF2-\\uAAF4\\uAB01-\\uAB06\\uAB09-\\uAB0E\\uAB11-\\uAB16\\uAB20-\\uAB26\\uAB28-\\uAB2E\\uAB30-\\uAB5A\\uAB5C-\\uAB5F\\uAB64\\uAB65\\uABC0-\\uABE2\\uAC00-\\uD7A3\\uD7B0-\\uD7C6\\uD7CB-\\uD7FB\\uF900-\\uFA6D\\uFA70-\\uFAD9\\uFB00-\\uFB06\\uFB13-\\uFB17\\uFB1D\\uFB1F-\\uFB28\\uFB2A-\\uFB36\\uFB38-\\uFB3C\\uFB3E\\uFB40\\uFB41\\uFB43\\uFB44\\uFB46-\\uFBB1\\uFBD3-\\uFD3D\\uFD50-\\uFD8F\\uFD92-\\uFDC7\\uFDF0-\\uFDFB\\uFE70-\\uFE74\\uFE76-\\uFEFC\\uFF21-\\uFF3A\\uFF41-\\uFF5A\\uFF66-\\uFFBE\\uFFC2-\\uFFC7\\uFFCA-\\uFFCF\\uFFD2-\\uFFD7\\uFFDA-\\uFFDC]"),
		digit: new RegExp("[\\u0030-\\u0039\\u0660-\\u0669\\u06F0-\\u06F9\\u07C0-\\u07C9\\u0966-\\u096F\\u09E6-\\u09EF\\u0A66-\\u0A6F\\u0AE6-\\u0AEF\\u0B66-\\u0B6F\\u0BE6-\\u0BEF\\u0C66-\\u0C6F\\u0CE6-\\u0CEF\\u0D66-\\u0D6F\\u0DE6-\\u0DEF\\u0E50-\\u0E59\\u0ED0-\\u0ED9\\u0F20-\\u0F29\\u1040-\\u1049\\u1090-\\u1099\\u17E0-\\u17E9\\u1810-\\u1819\\u1946-\\u194F\\u19D0-\\u19D9\\u1A80-\\u1A89\\u1A90-\\u1A99\\u1B50-\\u1B59\\u1BB0-\\u1BB9\\u1C40-\\u1C49\\u1C50-\\u1C59\\uA620-\\uA629\\uA8D0-\\uA8D9\\uA900-\\uA909\\uA9D0-\\uA9D9\\uA9F0-\\uA9F9\\uAA50-\\uAA59\\uABF0-\\uABF9\\uFF10-\\uFF19]"),
		non_spacing_mark: new RegExp("[\\u0300-\\u036F\\u0483-\\u0487\\u0591-\\u05BD\\u05BF\\u05C1\\u05C2\\u05C4\\u05C5\\u05C7\\u0610-\\u061A\\u064B-\\u065E\\u0670\\u06D6-\\u06DC\\u06DF-\\u06E4\\u06E7\\u06E8\\u06EA-\\u06ED\\u0711\\u0730-\\u074A\\u07A6-\\u07B0\\u07EB-\\u07F3\\u0816-\\u0819\\u081B-\\u0823\\u0825-\\u0827\\u0829-\\u082D\\u0900-\\u0902\\u093C\\u0941-\\u0948\\u094D\\u0951-\\u0955\\u0962\\u0963\\u0981\\u09BC\\u09C1-\\u09C4\\u09CD\\u09E2\\u09E3\\u0A01\\u0A02\\u0A3C\\u0A41\\u0A42\\u0A47\\u0A48\\u0A4B-\\u0A4D\\u0A51\\u0A70\\u0A71\\u0A75\\u0A81\\u0A82\\u0ABC\\u0AC1-\\u0AC5\\u0AC7\\u0AC8\\u0ACD\\u0AE2\\u0AE3\\u0B01\\u0B3C\\u0B3F\\u0B41-\\u0B44\\u0B4D\\u0B56\\u0B62\\u0B63\\u0B82\\u0BC0\\u0BCD\\u0C3E-\\u0C40\\u0C46-\\u0C48\\u0C4A-\\u0C4D\\u0C55\\u0C56\\u0C62\\u0C63\\u0CBC\\u0CBF\\u0CC6\\u0CCC\\u0CCD\\u0CE2\\u0CE3\\u0D41-\\u0D44\\u0D4D\\u0D62\\u0D63\\u0DCA\\u0DD2-\\u0DD4\\u0DD6\\u0E31\\u0E34-\\u0E3A\\u0E47-\\u0E4E\\u0EB1\\u0EB4-\\u0EB9\\u0EBB\\u0EBC\\u0EC8-\\u0ECD\\u0F18\\u0F19\\u0F35\\u0F37\\u0F39\\u0F71-\\u0F7E\\u0F80-\\u0F84\\u0F86\\u0F87\\u0F90-\\u0F97\\u0F99-\\u0FBC\\u0FC6\\u102D-\\u1030\\u1032-\\u1037\\u1039\\u103A\\u103D\\u103E\\u1058\\u1059\\u105E-\\u1060\\u1071-\\u1074\\u1082\\u1085\\u1086\\u108D\\u109D\\u135F\\u1712-\\u1714\\u1732-\\u1734\\u1752\\u1753\\u1772\\u1773\\u17B7-\\u17BD\\u17C6\\u17C9-\\u17D3\\u17DD\\u180B-\\u180D\\u18A9\\u1920-\\u1922\\u1927\\u1928\\u1932\\u1939-\\u193B\\u1A17\\u1A18\\u1A56\\u1A58-\\u1A5E\\u1A60\\u1A62\\u1A65-\\u1A6C\\u1A73-\\u1A7C\\u1A7F\\u1B00-\\u1B03\\u1B34\\u1B36-\\u1B3A\\u1B3C\\u1B42\\u1B6B-\\u1B73\\u1B80\\u1B81\\u1BA2-\\u1BA5\\u1BA8\\u1BA9\\u1C2C-\\u1C33\\u1C36\\u1C37\\u1CD0-\\u1CD2\\u1CD4-\\u1CE0\\u1CE2-\\u1CE8\\u1CED\\u1DC0-\\u1DE6\\u1DFD-\\u1DFF\\u20D0-\\u20DC\\u20E1\\u20E5-\\u20F0\\u2CEF-\\u2CF1\\u2DE0-\\u2DFF\\u302A-\\u302F\\u3099\\u309A\\uA66F\\uA67C\\uA67D\\uA6F0\\uA6F1\\uA802\\uA806\\uA80B\\uA825\\uA826\\uA8C4\\uA8E0-\\uA8F1\\uA926-\\uA92D\\uA947-\\uA951\\uA980-\\uA982\\uA9B3\\uA9B6-\\uA9B9\\uA9BC\\uAA29-\\uAA2E\\uAA31\\uAA32\\uAA35\\uAA36\\uAA43\\uAA4C\\uAAB0\\uAAB2-\\uAAB4\\uAAB7\\uAAB8\\uAABE\\uAABF\\uAAC1\\uABE5\\uABE8\\uABED\\uFB1E\\uFE00-\\uFE0F\\uFE20-\\uFE26]"),
		space_combining_mark: new RegExp("[\\u0903\\u093E-\\u0940\\u0949-\\u094C\\u094E\\u0982\\u0983\\u09BE-\\u09C0\\u09C7\\u09C8\\u09CB\\u09CC\\u09D7\\u0A03\\u0A3E-\\u0A40\\u0A83\\u0ABE-\\u0AC0\\u0AC9\\u0ACB\\u0ACC\\u0B02\\u0B03\\u0B3E\\u0B40\\u0B47\\u0B48\\u0B4B\\u0B4C\\u0B57\\u0BBE\\u0BBF\\u0BC1\\u0BC2\\u0BC6-\\u0BC8\\u0BCA-\\u0BCC\\u0BD7\\u0C01-\\u0C03\\u0C41-\\u0C44\\u0C82\\u0C83\\u0CBE\\u0CC0-\\u0CC4\\u0CC7\\u0CC8\\u0CCA\\u0CCB\\u0CD5\\u0CD6\\u0D02\\u0D03\\u0D3E-\\u0D40\\u0D46-\\u0D48\\u0D4A-\\u0D4C\\u0D57\\u0D82\\u0D83\\u0DCF-\\u0DD1\\u0DD8-\\u0DDF\\u0DF2\\u0DF3\\u0F3E\\u0F3F\\u0F7F\\u102B\\u102C\\u1031\\u1038\\u103B\\u103C\\u1056\\u1057\\u1062-\\u1064\\u1067-\\u106D\\u1083\\u1084\\u1087-\\u108C\\u108F\\u109A-\\u109C\\u17B6\\u17BE-\\u17C5\\u17C7\\u17C8\\u1923-\\u1926\\u1929-\\u192B\\u1930\\u1931\\u1933-\\u1938\\u19B0-\\u19C0\\u19C8\\u19C9\\u1A19-\\u1A1B\\u1A55\\u1A57\\u1A61\\u1A63\\u1A64\\u1A6D-\\u1A72\\u1B04\\u1B35\\u1B3B\\u1B3D-\\u1B41\\u1B43\\u1B44\\u1B82\\u1BA1\\u1BA6\\u1BA7\\u1BAA\\u1C24-\\u1C2B\\u1C34\\u1C35\\u1CE1\\u1CF2\\uA823\\uA824\\uA827\\uA880\\uA881\\uA8B4-\\uA8C3\\uA952\\uA953\\uA983\\uA9B4\\uA9B5\\uA9BA\\uA9BB\\uA9BD-\\uA9C0\\uAA2F\\uAA30\\uAA33\\uAA34\\uAA4D\\uAA7B\\uABE3\\uABE4\\uABE6\\uABE7\\uABE9\\uABEA\\uABEC]"),
		connector_punctuation: new RegExp("[\\u005F\\u203F\\u2040\\u2054\\uFE33\\uFE34\\uFE4D-\\uFE4F\\uFF3F]")
	};

	function is_letter(code) {
		return (code >= 97 && code <= 122)
			|| (code >= 65 && code <= 90)
			|| (code >= 0xaa && UNICODE.letter.test(String.fromCharCode(code)));
	};

	function is_digit(code) {
		return code >= 48 && code <= 57;
	};

	function is_alphanumeric_char(code) {
		return is_digit(code) || is_letter(code);
	};

	function is_unicode_digit(code) {
		return UNICODE.digit.test(String.fromCharCode(code));
	}

	function is_unicode_combining_mark(ch) {
		return UNICODE.non_spacing_mark.test(ch) || UNICODE.space_combining_mark.test(ch);
	};

	function is_unicode_connector_punctuation(ch) {
		return UNICODE.connector_punctuation.test(ch);
	};

	function is_identifier(name) {
		return !RESERVED_WORDS(name) && /^[a-z_$][a-z0-9_$]*$/i.test(name);
	};

	function is_identifier_start(code) {
		return code == 36 || code == 95 || is_letter(code);
	};

	function is_identifier_char(ch) {
		var code = ch.charCodeAt(0);
		return is_identifier_start(code)
			|| is_digit(code)
			|| code == 8204 // \u200c: zero-width non-joiner <ZWNJ>
			|| code == 8205 // \u200d: zero-width joiner <ZWJ> (in my ECMA-262 PDF, this is also 200c)
			|| is_unicode_combining_mark(ch)
			|| is_unicode_connector_punctuation(ch)
			|| is_unicode_digit(code)
		;
	};

	function is_identifier_string(str){
		return /^[a-z_$][a-z0-9_$]*$/i.test(str);
	};

	function parse_js_number(num) {
		if (RE_HEX_NUMBER.test(num)) {
			return parseInt(num.substr(2), 16);
		} else if (RE_OCT_NUMBER.test(num)) {
			return parseInt(num.substr(1), 8);
		} else {
			var val = parseFloat(num);
			if (val == num) return val;
		}
	};

	function JS_Parse_Error(message, filename, line, col, pos) {
		this.message = message;
		this.filename = filename;
		this.line = line;
		this.col = col;
		this.pos = pos;
	};
	JS_Parse_Error.prototype = Object.create(Error.prototype);
	JS_Parse_Error.prototype.constructor = JS_Parse_Error;
	JS_Parse_Error.prototype.name = "SyntaxError";
	configure_error_stack(JS_Parse_Error);

	function js_error(message, filename, line, col, pos) {
		throw new JS_Parse_Error(message, filename, line, col, pos);
	};

	function is_token(token, type, val) {
		return token.type == type && (val == null || token.value == val);
	};

	var EX_EOF = {};

	function tokenizer($TEXT, filename, html5_comments, shebang) {

		var S = {
			text            : $TEXT,
			filename        : filename,
			pos             : 0,
			tokpos          : 0,
			line            : 1,
			tokline         : 0,
			col             : 0,
			tokcol          : 0,
			newline_before  : false,
			regex_allowed   : false,
			comments_before : [],
			directives      : {},
			directive_stack : []
		};

		function peek() { return S.text.charAt(S.pos); };

		function next(signal_eof, in_string) {
			var ch = S.text.charAt(S.pos++);
			if (signal_eof && !ch)
				throw EX_EOF;
			if (NEWLINE_CHARS(ch)) {
				S.newline_before = S.newline_before || !in_string;
				++S.line;
				S.col = 0;
				if (!in_string && ch == "\r" && peek() == "\n") {
					// treat a \r\n sequence as a single \n
					++S.pos;
					ch = "\n";
				}
			} else {
				++S.col;
			}
			return ch;
		};

		function forward(i) {
			while (i-- > 0) next();
		};

		function looking_at(str) {
			return S.text.substr(S.pos, str.length) == str;
		};

		function find_eol() {
			var text = S.text;
			for (var i = S.pos, n = S.text.length; i < n; ++i) {
				var ch = text[i];
				if (NEWLINE_CHARS(ch))
					return i;
			}
			return -1;
		};

		function find(what, signal_eof) {
			var pos = S.text.indexOf(what, S.pos);
			if (signal_eof && pos == -1) throw EX_EOF;
			return pos;
		};

		function start_token() {
			S.tokline = S.line;
			S.tokcol = S.col;
			S.tokpos = S.pos;
		};

		var prev_was_dot = false;
		function token(type, value, is_comment) {
			S.regex_allowed = ((type == "operator" && !UNARY_POSTFIX(value)) ||
							   (type == "keyword" && KEYWORDS_BEFORE_EXPRESSION(value)) ||
							   (type == "punc" && PUNC_BEFORE_EXPRESSION(value)));
			if (type == "punc" && value == ".") {
				prev_was_dot = true;
			} else if (!is_comment) {
				prev_was_dot = false;
			}
			var ret = {
				type    : type,
				value   : value,
				line    : S.tokline,
				col     : S.tokcol,
				pos     : S.tokpos,
				endline : S.line,
				endcol  : S.col,
				endpos  : S.pos,
				nlb     : S.newline_before,
				file    : filename
			};
			if (/^(?:num|string|regexp)$/i.test(type)) {
				ret.raw = $TEXT.substring(ret.pos, ret.endpos);
			}
			if (!is_comment) {
				ret.comments_before = S.comments_before;
				S.comments_before = [];
				// make note of any newlines in the comments that came before
				for (var i = 0, len = ret.comments_before.length; i < len; i++) {
					ret.nlb = ret.nlb || ret.comments_before[i].nlb;
				}
			}
			S.newline_before = false;
			return new AST_Token(ret);
		};

		function skip_whitespace() {
			while (WHITESPACE_CHARS(peek()))
				next();
		};

		function read_while(pred) {
			var ret = "", ch, i = 0;
			while ((ch = peek()) && pred(ch, i++))
				ret += next();
			return ret;
		};

		function parse_error(err) {
			js_error(err, filename, S.tokline, S.tokcol, S.tokpos);
		};

		function read_num(prefix) {
			var has_e = false, after_e = false, has_x = false, has_dot = prefix == ".";
			var num = read_while(function(ch, i){
				var code = ch.charCodeAt(0);
				switch (code) {
				  case 120: case 88: // xX
					return has_x ? false : (has_x = true);
				  case 101: case 69: // eE
					return has_x ? true : has_e ? false : (has_e = after_e = true);
				  case 45: // -
					return after_e || (i == 0 && !prefix);
				  case 43: // +
					return after_e;
				  case (after_e = false, 46): // .
					return (!has_dot && !has_x && !has_e) ? (has_dot = true) : false;
				}
				return is_alphanumeric_char(code);
			});
			if (prefix) num = prefix + num;
			if (RE_OCT_NUMBER.test(num) && next_token.has_directive("use strict")) {
				parse_error("Legacy octal literals are not allowed in strict mode");
			}
			var valid = parse_js_number(num);
			if (!isNaN(valid)) {
				return token("num", valid);
			} else {
				parse_error("Invalid syntax: " + num);
			}
		};

		function read_escaped_char(in_string) {
			var ch = next(true, in_string);
			switch (ch.charCodeAt(0)) {
			  case 110 : return "\n";
			  case 114 : return "\r";
			  case 116 : return "\t";
			  case 98  : return "\b";
			  case 118 : return "\u000b"; // \v
			  case 102 : return "\f";
			  case 120 : return String.fromCharCode(hex_bytes(2)); // \x
			  case 117 : return String.fromCharCode(hex_bytes(4)); // \u
			  case 10  : return ""; // newline
			  case 13  :            // \r
				if (peek() == "\n") { // DOS newline
					next(true, in_string);
					return "";
				}
			}
			if (ch >= "0" && ch <= "7")
				return read_octal_escape_sequence(ch);
			return ch;
		};

		function read_octal_escape_sequence(ch) {
			// Read
			var p = peek();
			if (p >= "0" && p <= "7") {
				ch += next(true);
				if (ch[0] <= "3" && (p = peek()) >= "0" && p <= "7")
					ch += next(true);
			}

			// Parse
			if (ch === "0") return "\0";
			if (ch.length > 0 && next_token.has_directive("use strict"))
				parse_error("Legacy octal escape sequences are not allowed in strict mode");
			return String.fromCharCode(parseInt(ch, 8));
		}

		function hex_bytes(n) {
			var num = 0;
			for (; n > 0; --n) {
				var digit = parseInt(next(true), 16);
				if (isNaN(digit))
					parse_error("Invalid hex-character pattern in string");
				num = (num << 4) | digit;
			}
			return num;
		};

		var read_string = with_eof_error("Unterminated string constant", function(quote_char){
			var quote = next(), ret = "";
			for (;;) {
				var ch = next(true, true);
				if (ch == "\\") ch = read_escaped_char(true);
				else if (NEWLINE_CHARS(ch)) parse_error("Unterminated string constant");
				else if (ch == quote) break;
				ret += ch;
			}
			var tok = token("string", ret);
			tok.quote = quote_char;
			return tok;
		});

		function skip_line_comment(type) {
			var regex_allowed = S.regex_allowed;
			var i = find_eol(), ret;
			if (i == -1) {
				ret = S.text.substr(S.pos);
				S.pos = S.text.length;
			} else {
				ret = S.text.substring(S.pos, i);
				S.pos = i;
			}
			S.col = S.tokcol + (S.pos - S.tokpos);
			S.comments_before.push(token(type, ret, true));
			S.regex_allowed = regex_allowed;
			return next_token;
		};

		var skip_multiline_comment = with_eof_error("Unterminated multiline comment", function(){
			var regex_allowed = S.regex_allowed;
			var i = find("*/", true);
			var text = S.text.substring(S.pos, i).replace(/\r\n|\r|\u2028|\u2029/g, '\n');
			// update stream position
			forward(text.length /* doesn't count \r\n as 2 char while S.pos - i does */ + 2);
			S.comments_before.push(token("comment2", text, true));
			S.regex_allowed = regex_allowed;
			return next_token;
		});

		function read_name() {
			var backslash = false, name = "", ch, escaped = false, hex;
			while ((ch = peek()) != null) {
				if (!backslash) {
					if (ch == "\\") escaped = backslash = true, next();
					else if (is_identifier_char(ch)) name += next();
					else break;
				}
				else {
					if (ch != "u") parse_error("Expecting UnicodeEscapeSequence -- uXXXX");
					ch = read_escaped_char();
					if (!is_identifier_char(ch)) parse_error("Unicode char: " + ch.charCodeAt(0) + " is not valid in identifier");
					name += ch;
					backslash = false;
				}
			}
			if (KEYWORDS(name) && escaped) {
				hex = name.charCodeAt(0).toString(16).toUpperCase();
				name = "\\u" + "0000".substr(hex.length) + hex + name.slice(1);
			}
			return name;
		};

		var read_regexp = with_eof_error("Unterminated regular expression", function(regexp){
			var prev_backslash = false, ch, in_class = false;
			while ((ch = next(true))) if (NEWLINE_CHARS(ch)) {
				parse_error("Unexpected line terminator");
			} else if (prev_backslash) {
				regexp += "\\" + ch;
				prev_backslash = false;
			} else if (ch == "[") {
				in_class = true;
				regexp += ch;
			} else if (ch == "]" && in_class) {
				in_class = false;
				regexp += ch;
			} else if (ch == "/" && !in_class) {
				break;
			} else if (ch == "\\") {
				prev_backslash = true;
			} else {
				regexp += ch;
			}
			var mods = read_name();
			try {
			  return token("regexp", new RegExp(regexp, mods));
			} catch(e) {
			  parse_error(e.message);
			}
		});

		function read_operator(prefix) {
			function grow(op) {
				if (!peek()) return op;
				var bigger = op + peek();
				if (OPERATORS(bigger)) {
					next();
					return grow(bigger);
				} else {
					return op;
				}
			};
			return token("operator", grow(prefix || next()));
		};

		function handle_slash() {
			next();
			switch (peek()) {
			  case "/":
				next();
				return skip_line_comment("comment1");
			  case "*":
				next();
				return skip_multiline_comment();
			}
			return S.regex_allowed ? read_regexp("") : read_operator("/");
		};

		function handle_dot() {
			next();
			return is_digit(peek().charCodeAt(0))
				? read_num(".")
				: token("punc", ".");
		};

		function read_word() {
			var word = read_name();
			if (prev_was_dot) return token("name", word);
			return KEYWORDS_ATOM(word) ? token("atom", word)
				: !KEYWORDS(word) ? token("name", word)
				: OPERATORS(word) ? token("operator", word)
				: token("keyword", word);
		};

		function with_eof_error(eof_error, cont) {
			return function(x) {
				try {
					return cont(x);
				} catch(ex) {
					if (ex === EX_EOF) parse_error(eof_error);
					else throw ex;
				}
			};
		};

		function next_token(force_regexp) {
			if (force_regexp != null)
				return read_regexp(force_regexp);
			if (shebang && S.pos == 0 && looking_at("#!")) {
				start_token();
				forward(2);
				skip_line_comment("comment5");
			}
			for (;;) {
				skip_whitespace();
				start_token();
				if (html5_comments) {
					if (looking_at("<!--")) {
						forward(4);
						skip_line_comment("comment3");
						continue;
					}
					if (looking_at("-->") && S.newline_before) {
						forward(3);
						skip_line_comment("comment4");
						continue;
					}
				}
				var ch = peek();
				if (!ch) return token("eof");
				var code = ch.charCodeAt(0);
				switch (code) {
				  case 34: case 39: return read_string(ch);
				  case 46: return handle_dot();
				  case 47: {
					  var tok = handle_slash();
					  if (tok === next_token) continue;
					  return tok;
				  }
				}
				if (is_digit(code)) return read_num();
				if (PUNC_CHARS(ch)) return token("punc", next());
				if (OPERATOR_CHARS(ch)) return read_operator();
				if (code == 92 || is_identifier_start(code)) return read_word();
				break;
			}
			parse_error("Unexpected character '" + ch + "'");
		};

		next_token.context = function(nc) {
			if (nc) S = nc;
			return S;
		};

		next_token.add_directive = function(directive) {
			S.directive_stack[S.directive_stack.length - 1].push(directive);

			if (S.directives[directive] === undefined) {
				S.directives[directive] = 1;
			} else {
				S.directives[directive]++;
			}
		}

		next_token.push_directives_stack = function() {
			S.directive_stack.push([]);
		}

		next_token.pop_directives_stack = function() {
			var directives = S.directive_stack[S.directive_stack.length - 1];

			for (var i = 0; i < directives.length; i++) {
				S.directives[directives[i]]--;
			}

			S.directive_stack.pop();
		}

		next_token.has_directive = function(directive) {
			return S.directives[directive] !== undefined &&
				S.directives[directive] > 0;
		}

		return next_token;

	};

	/* -----[ Parser (constants) ]----- */

	var UNARY_PREFIX = makePredicate([
		"typeof",
		"void",
		"delete",
		"--",
		"++",
		"!",
		"~",
		"-",
		"+"
	]);

	var UNARY_POSTFIX = makePredicate([ "--", "++" ]);

	var ASSIGNMENT = makePredicate([ "=", "+=", "-=", "/=", "*=", "%=", ">>=", "<<=", ">>>=", "|=", "^=", "&=" ]);

	var PRECEDENCE = (function(a, ret){
		for (var i = 0; i < a.length; ++i) {
			var b = a[i];
			for (var j = 0; j < b.length; ++j) {
				ret[b[j]] = i + 1;
			}
		}
		return ret;
	})(
		[
			["||"],
			["&&"],
			["|"],
			["^"],
			["&"],
			["==", "===", "!=", "!=="],
			["<", ">", "<=", ">=", "in", "instanceof"],
			[">>", "<<", ">>>"],
			["+", "-"],
			["*", "/", "%"]
		],
		{}
	);

	var STATEMENTS_WITH_LABELS = array_to_hash([ "for", "do", "while", "switch" ]);

	var ATOMIC_START_TOKEN = array_to_hash([ "atom", "num", "string", "regexp", "name" ]);

	/* -----[ Parser ]----- */

	function parse($TEXT, options) {

		options = defaults(options, {
			bare_returns   : false,
			cli            : false,
			expression     : false,
			filename       : null,
			html5_comments : true,
			shebang        : true,
			strict         : false,
			toplevel       : null
		});

		var S = {
			input         : (typeof $TEXT == "string"
							 ? tokenizer($TEXT, options.filename,
										 options.html5_comments, options.shebang)
							 : $TEXT),
			token         : null,
			prev          : null,
			peeked        : null,
			in_function   : 0,
			in_directives : true,
			in_loop       : 0,
			labels        : []
		};

		S.token = next();

		function is(type, value) {
			return is_token(S.token, type, value);
		};

		function peek() { return S.peeked || (S.peeked = S.input()); };

		function next() {
			S.prev = S.token;
			if (S.peeked) {
				S.token = S.peeked;
				S.peeked = null;
			} else {
				S.token = S.input();
			}
			S.in_directives = S.in_directives && (
				S.token.type == "string" || is("punc", ";")
			);
			return S.token;
		};

		function prev() {
			return S.prev;
		};

		function croak(msg, line, col, pos) {
			var ctx = S.input.context();
			js_error(msg,
					 ctx.filename,
					 line != null ? line : ctx.tokline,
					 col != null ? col : ctx.tokcol,
					 pos != null ? pos : ctx.tokpos);
		};

		function token_error(token, msg) {
			croak(msg, token.line, token.col);
		};

		function unexpected(token) {
			if (token == null)
				token = S.token;
			token_error(token, "Unexpected token: " + token.type + " (" + token.value + ")");
		};

		function expect_token(type, val) {
			if (is(type, val)) {
				return next();
			}
			token_error(S.token, "Unexpected token " + S.token.type + " «" + S.token.value + "»" + ", expected " + type + " «" + val + "»");
		};

		function expect(punc) { return expect_token("punc", punc); };

		function can_insert_semicolon() {
			return !options.strict && (
				S.token.nlb || is("eof") || is("punc", "}")
			);
		};

		function semicolon(optional) {
			if (is("punc", ";")) next();
			else if (!optional && !can_insert_semicolon()) unexpected();
		};

		function parenthesised() {
			expect("(");
			var exp = expression(true);
			expect(")");
			return exp;
		};

		function embed_tokens(parser) {
			return function() {
				var start = S.token;
				var expr = parser();
				var end = prev();
				expr.start = start;
				expr.end = end;
				return expr;
			};
		};

		function handle_regexp() {
			if (is("operator", "/") || is("operator", "/=")) {
				S.peeked = null;
				S.token = S.input(S.token.value.substr(1)); // force regexp
			}
		};

		var statement = embed_tokens(function() {
			handle_regexp();
			switch (S.token.type) {
			  case "string":
				if (S.in_directives) {
					var token = peek();
					if (S.token.raw.indexOf("\\") == -1
						&& (token.nlb
							|| is_token(token, "eof")
							|| is_token(token, "punc", ";")
							|| is_token(token, "punc", "}"))) {
						S.input.add_directive(S.token.value);
					} else {
						S.in_directives = false;
					}
				}
				var dir = S.in_directives, stat = simple_statement();
				return dir ? new AST_Directive(stat.body) : stat;
			  case "num":
			  case "regexp":
			  case "operator":
			  case "atom":
				return simple_statement();

			  case "name":
				return is_token(peek(), "punc", ":")
					? labeled_statement()
					: simple_statement();

			  case "punc":
				switch (S.token.value) {
				  case "{":
					return new AST_BlockStatement({
						start : S.token,
						body  : block_(),
						end   : prev()
					});
				  case "[":
				  case "(":
					return simple_statement();
				  case ";":
					S.in_directives = false;
					next();
					return new AST_EmptyStatement();
				  default:
					unexpected();
				}

			  case "keyword":
				switch (S.token.value) {
				  case "break":
					next();
					return break_cont(AST_Break);

				  case "continue":
					next();
					return break_cont(AST_Continue);

				  case "debugger":
					next();
					semicolon();
					return new AST_Debugger();

				  case "do":
					next();
					var body = in_loop(statement);
					expect_token("keyword", "while");
					var condition = parenthesised();
					semicolon(true);
					return new AST_Do({
						body      : body,
						condition : condition
					});

				  case "while":
					next();
					return new AST_While({
						condition : parenthesised(),
						body      : in_loop(statement)
					});

				  case "for":
					next();
					return for_();

				  case "function":
					next();
					return function_(AST_Defun);

				  case "if":
					next();
					return if_();

				  case "return":
					if (S.in_function == 0 && !options.bare_returns)
						croak("'return' outside of function");
					next();
					var value = null;
					if (is("punc", ";")) {
						next();
					} else if (!can_insert_semicolon()) {
						value = expression(true);
						semicolon();
					}
					return new AST_Return({
						value: value
					});

				  case "switch":
					next();
					return new AST_Switch({
						expression : parenthesised(),
						body       : in_loop(switch_body_)
					});

				  case "throw":
					next();
					if (S.token.nlb)
						croak("Illegal newline after 'throw'");
					var value = expression(true);
					semicolon();
					return new AST_Throw({
						value: value
					});

				  case "try":
					next();
					return try_();

				  case "var":
					next();
					var node = var_();
					semicolon();
					return node;

				  case "const":
					next();
					var node = const_();
					semicolon();
					return node;

				  case "with":
					if (S.input.has_directive("use strict")) {
						croak("Strict mode may not include a with statement");
					}
					next();
					return new AST_With({
						expression : parenthesised(),
						body       : statement()
					});
				}
			}
			unexpected();
		});

		function labeled_statement() {
			var label = as_symbol(AST_Label);
			if (find_if(function(l){ return l.name == label.name }, S.labels)) {
				// ECMA-262, 12.12: An ECMAScript program is considered
				// syntactically incorrect if it contains a
				// LabelledStatement that is enclosed by a
				// LabelledStatement with the same Identifier as label.
				croak("Label " + label.name + " defined twice");
			}
			expect(":");
			S.labels.push(label);
			var stat = statement();
			S.labels.pop();
			if (!(stat instanceof AST_IterationStatement)) {
				// check for `continue` that refers to this label.
				// those should be reported as syntax errors.
				// https://github.com/mishoo/UglifyJS2/issues/287
				label.references.forEach(function(ref){
					if (ref instanceof AST_Continue) {
						ref = ref.label.start;
						croak("Continue label `" + label.name + "` refers to non-IterationStatement.",
							  ref.line, ref.col, ref.pos);
					}
				});
			}
			return new AST_LabeledStatement({ body: stat, label: label });
		};

		function simple_statement(tmp) {
			return new AST_SimpleStatement({ body: (tmp = expression(true), semicolon(), tmp) });
		};

		function break_cont(type) {
			var label = null, ldef;
			if (!can_insert_semicolon()) {
				label = as_symbol(AST_LabelRef, true);
			}
			if (label != null) {
				ldef = find_if(function(l){ return l.name == label.name }, S.labels);
				if (!ldef)
					croak("Undefined label " + label.name);
				label.thedef = ldef;
			}
			else if (S.in_loop == 0)
				croak(type.TYPE + " not inside a loop or switch");
			semicolon();
			var stat = new type({ label: label });
			if (ldef) ldef.references.push(stat);
			return stat;
		};

		function for_() {
			expect("(");
			var init = null;
			if (!is("punc", ";")) {
				init = is("keyword", "var")
					? (next(), var_(true))
					: expression(true, true);
				if (is("operator", "in")) {
					if (init instanceof AST_Var && init.definitions.length > 1)
						croak("Only one variable declaration allowed in for..in loop");
					next();
					return for_in(init);
				}
			}
			return regular_for(init);
		};

		function regular_for(init) {
			expect(";");
			var test = is("punc", ";") ? null : expression(true);
			expect(";");
			var step = is("punc", ")") ? null : expression(true);
			expect(")");
			return new AST_For({
				init      : init,
				condition : test,
				step      : step,
				body      : in_loop(statement)
			});
		};

		function for_in(init) {
			var lhs = init instanceof AST_Var ? init.definitions[0].name : null;
			var obj = expression(true);
			expect(")");
			return new AST_ForIn({
				init   : init,
				name   : lhs,
				object : obj,
				body   : in_loop(statement)
			});
		};

		var function_ = function(ctor) {
			var in_statement = ctor === AST_Defun;
			var name = is("name") ? as_symbol(in_statement ? AST_SymbolDefun : AST_SymbolLambda) : null;
			if (in_statement && !name)
				unexpected();
			expect("(");
			return new ctor({
				name: name,
				argnames: (function(first, a){
					while (!is("punc", ")")) {
						if (first) first = false; else expect(",");
						a.push(as_symbol(AST_SymbolFunarg));
					}
					next();
					return a;
				})(true, []),
				body: (function(loop, labels){
					++S.in_function;
					S.in_directives = true;
					S.input.push_directives_stack();
					S.in_loop = 0;
					S.labels = [];
					var a = block_();
					S.input.pop_directives_stack();
					--S.in_function;
					S.in_loop = loop;
					S.labels = labels;
					return a;
				})(S.in_loop, S.labels)
			});
		};

		function if_() {
			var cond = parenthesised(), body = statement(), belse = null;
			if (is("keyword", "else")) {
				next();
				belse = statement();
			}
			return new AST_If({
				condition   : cond,
				body        : body,
				alternative : belse
			});
		};

		function block_() {
			expect("{");
			var a = [];
			while (!is("punc", "}")) {
				if (is("eof")) unexpected();
				a.push(statement());
			}
			next();
			return a;
		};

		function switch_body_() {
			expect("{");
			var a = [], cur = null, branch = null, tmp;
			while (!is("punc", "}")) {
				if (is("eof")) unexpected();
				if (is("keyword", "case")) {
					if (branch) branch.end = prev();
					cur = [];
					branch = new AST_Case({
						start      : (tmp = S.token, next(), tmp),
						expression : expression(true),
						body       : cur
					});
					a.push(branch);
					expect(":");
				}
				else if (is("keyword", "default")) {
					if (branch) branch.end = prev();
					cur = [];
					branch = new AST_Default({
						start : (tmp = S.token, next(), expect(":"), tmp),
						body  : cur
					});
					a.push(branch);
				}
				else {
					if (!cur) unexpected();
					cur.push(statement());
				}
			}
			if (branch) branch.end = prev();
			next();
			return a;
		};

		function try_() {
			var body = block_(), bcatch = null, bfinally = null;
			if (is("keyword", "catch")) {
				var start = S.token;
				next();
				expect("(");
				var name = as_symbol(AST_SymbolCatch);
				expect(")");
				bcatch = new AST_Catch({
					start   : start,
					argname : name,
					body    : block_(),
					end     : prev()
				});
			}
			if (is("keyword", "finally")) {
				var start = S.token;
				next();
				bfinally = new AST_Finally({
					start : start,
					body  : block_(),
					end   : prev()
				});
			}
			if (!bcatch && !bfinally)
				croak("Missing catch/finally blocks");
			return new AST_Try({
				body     : body,
				bcatch   : bcatch,
				bfinally : bfinally
			});
		};

		function vardefs(no_in, in_const) {
			var a = [];
			for (;;) {
				a.push(new AST_VarDef({
					start : S.token,
					name  : as_symbol(in_const ? AST_SymbolConst : AST_SymbolVar),
					value : is("operator", "=") ? (next(), expression(false, no_in)) : null,
					end   : prev()
				}));
				if (!is("punc", ","))
					break;
				next();
			}
			return a;
		};

		var var_ = function(no_in) {
			return new AST_Var({
				start       : prev(),
				definitions : vardefs(no_in, false),
				end         : prev()
			});
		};

		var const_ = function() {
			return new AST_Const({
				start       : prev(),
				definitions : vardefs(false, true),
				end         : prev()
			});
		};

		var new_ = function(allow_calls) {
			var start = S.token;
			expect_token("operator", "new");
			var newexp = expr_atom(false), args;
			if (is("punc", "(")) {
				next();
				args = expr_list(")");
			} else {
				args = [];
			}
			return subscripts(new AST_New({
				start      : start,
				expression : newexp,
				args       : args,
				end        : prev()
			}), allow_calls);
		};

		function as_atom_node() {
			var tok = S.token, ret;
			switch (tok.type) {
			  case "name":
			  case "keyword":
				ret = _make_symbol(AST_SymbolRef);
				break;
			  case "num":
				ret = new AST_Number({ start: tok, end: tok, value: tok.value });
				break;
			  case "string":
				ret = new AST_String({
					start : tok,
					end   : tok,
					value : tok.value,
					quote : tok.quote
				});
				break;
			  case "regexp":
				ret = new AST_RegExp({ start: tok, end: tok, value: tok.value });
				break;
			  case "atom":
				switch (tok.value) {
				  case "false":
					ret = new AST_False({ start: tok, end: tok });
					break;
				  case "true":
					ret = new AST_True({ start: tok, end: tok });
					break;
				  case "null":
					ret = new AST_Null({ start: tok, end: tok });
					break;
				}
				break;
			  case "operator":
				if (!is_identifier_string(tok.value)) {
					croak("Invalid getter/setter name: " + tok.value,
						tok.line, tok.col, tok.pos);
				}
				ret = _make_symbol(AST_SymbolRef);
				break;
			}
			next();
			return ret;
		};

		var expr_atom = function(allow_calls) {
			if (is("operator", "new")) {
				return new_(allow_calls);
			}
			var start = S.token;
			if (is("punc")) {
				switch (start.value) {
				  case "(":
					next();
					var ex = expression(true);
					ex.start = start;
					ex.end = S.token;
					expect(")");
					return subscripts(ex, allow_calls);
				  case "[":
					return subscripts(array_(), allow_calls);
				  case "{":
					return subscripts(object_(), allow_calls);
				}
				unexpected();
			}
			if (is("keyword", "function")) {
				next();
				var func = function_(AST_Function);
				func.start = start;
				func.end = prev();
				return subscripts(func, allow_calls);
			}
			if (ATOMIC_START_TOKEN[S.token.type]) {
				return subscripts(as_atom_node(), allow_calls);
			}
			unexpected();
		};

		function expr_list(closing, allow_trailing_comma, allow_empty) {
			var first = true, a = [];
			while (!is("punc", closing)) {
				if (first) first = false; else expect(",");
				if (allow_trailing_comma && is("punc", closing)) break;
				if (is("punc", ",") && allow_empty) {
					a.push(new AST_Hole({ start: S.token, end: S.token }));
				} else {
					a.push(expression(false));
				}
			}
			next();
			return a;
		};

		var array_ = embed_tokens(function() {
			expect("[");
			return new AST_Array({
				elements: expr_list("]", !options.strict, true)
			});
		});

		var create_accessor = embed_tokens(function() {
			return function_(AST_Accessor);
		});

		var object_ = embed_tokens(function() {
			expect("{");
			var first = true, a = [];
			while (!is("punc", "}")) {
				if (first) first = false; else expect(",");
				if (!options.strict && is("punc", "}"))
					// allow trailing comma
					break;
				var start = S.token;
				var type = start.type;
				var name = as_property_name();
				if (type == "name" && !is("punc", ":")) {
					var key = new AST_SymbolAccessor({
						start: S.token,
						name: as_property_name(),
						end: prev()
					});
					if (name == "get") {
						a.push(new AST_ObjectGetter({
							start : start,
							key   : key,
							value : create_accessor(),
							end   : prev()
						}));
						continue;
					}
					if (name == "set") {
						a.push(new AST_ObjectSetter({
							start : start,
							key   : key,
							value : create_accessor(),
							end   : prev()
						}));
						continue;
					}
				}
				expect(":");
				a.push(new AST_ObjectKeyVal({
					start : start,
					quote : start.quote,
					key   : name,
					value : expression(false),
					end   : prev()
				}));
			}
			next();
			return new AST_Object({ properties: a });
		});

		function as_property_name() {
			var tmp = S.token;
			switch (tmp.type) {
			  case "operator":
				if (!KEYWORDS(tmp.value)) unexpected();
			  case "num":
			  case "string":
			  case "name":
			  case "keyword":
			  case "atom":
				next();
				return tmp.value;
			  default:
				unexpected();
			}
		};

		function as_name() {
			var tmp = S.token;
			if (tmp.type != "name") unexpected();
			next();
			return tmp.value;
		};

		function _make_symbol(type) {
			var name = S.token.value;
			return new (name == "this" ? AST_This : type)({
				name  : String(name),
				start : S.token,
				end   : S.token
			});
		};

		function as_symbol(type, noerror) {
			if (!is("name")) {
				if (!noerror) croak("Name expected");
				return null;
			}
			var sym = _make_symbol(type);
			next();
			return sym;
		};

		var subscripts = function(expr, allow_calls) {
			var start = expr.start;
			if (is("punc", ".")) {
				next();
				return subscripts(new AST_Dot({
					start      : start,
					expression : expr,
					property   : as_name(),
					end        : prev()
				}), allow_calls);
			}
			if (is("punc", "[")) {
				next();
				var prop = expression(true);
				expect("]");
				return subscripts(new AST_Sub({
					start      : start,
					expression : expr,
					property   : prop,
					end        : prev()
				}), allow_calls);
			}
			if (allow_calls && is("punc", "(")) {
				next();
				return subscripts(new AST_Call({
					start      : start,
					expression : expr,
					args       : expr_list(")"),
					end        : prev()
				}), true);
			}
			return expr;
		};

		var maybe_unary = function(allow_calls) {
			var start = S.token;
			if (is("operator") && UNARY_PREFIX(start.value)) {
				next();
				handle_regexp();
				var ex = make_unary(AST_UnaryPrefix, start, maybe_unary(allow_calls));
				ex.start = start;
				ex.end = prev();
				return ex;
			}
			var val = expr_atom(allow_calls);
			while (is("operator") && UNARY_POSTFIX(S.token.value) && !S.token.nlb) {
				val = make_unary(AST_UnaryPostfix, S.token, val);
				val.start = start;
				val.end = S.token;
				next();
			}
			return val;
		};

		function make_unary(ctor, token, expr) {
			var op = token.value;
			if ((op == "++" || op == "--") && !is_assignable(expr))
				croak("Invalid use of " + op + " operator", token.line, token.col, token.pos);
			return new ctor({ operator: op, expression: expr });
		};

		var expr_op = function(left, min_prec, no_in) {
			var op = is("operator") ? S.token.value : null;
			if (op == "in" && no_in) op = null;
			var prec = op != null ? PRECEDENCE[op] : null;
			if (prec != null && prec > min_prec) {
				next();
				var right = expr_op(maybe_unary(true), prec, no_in);
				return expr_op(new AST_Binary({
					start    : left.start,
					left     : left,
					operator : op,
					right    : right,
					end      : right.end
				}), min_prec, no_in);
			}
			return left;
		};

		function expr_ops(no_in) {
			return expr_op(maybe_unary(true), 0, no_in);
		};

		var maybe_conditional = function(no_in) {
			var start = S.token;
			var expr = expr_ops(no_in);
			if (is("operator", "?")) {
				next();
				var yes = expression(false);
				expect(":");
				return new AST_Conditional({
					start       : start,
					condition   : expr,
					consequent  : yes,
					alternative : expression(false, no_in),
					end         : prev()
				});
			}
			return expr;
		};

		function is_assignable(expr) {
			if (options.cli) return true;
			return expr instanceof AST_PropAccess || expr instanceof AST_SymbolRef;
		};

		var maybe_assign = function(no_in) {
			var start = S.token;
			var left = maybe_conditional(no_in), val = S.token.value;
			if (is("operator") && ASSIGNMENT(val)) {
				if (is_assignable(left)) {
					next();
					return new AST_Assign({
						start    : start,
						left     : left,
						operator : val,
						right    : maybe_assign(no_in),
						end      : prev()
					});
				}
				croak("Invalid assignment");
			}
			return left;
		};

		var expression = function(commas, no_in) {
			var start = S.token;
			var expr = maybe_assign(no_in);
			if (commas && is("punc", ",")) {
				next();
				return new AST_Seq({
					start  : start,
					car    : expr,
					cdr    : expression(true, no_in),
					end    : peek()
				});
			}
			return expr;
		};

		function in_loop(cont) {
			++S.in_loop;
			var ret = cont();
			--S.in_loop;
			return ret;
		};

		if (options.expression) {
			return expression(true);
		}

		return (function(){
			var start = S.token;
			var body = [];
			S.input.push_directives_stack();
			while (!is("eof"))
				body.push(statement());
			S.input.pop_directives_stack();
			var end = prev();
			var toplevel = options.toplevel;
			if (toplevel) {
				toplevel.body = toplevel.body.concat(body);
				toplevel.end = end;
			} else {
				toplevel = new AST_Toplevel({ start: start, body: body, end: end });
			}
			return toplevel;
		})();

	};
	//#endregion
	
	//#region URL: /lib/transform
	//"use strict";

	// Tree transformer helpers.

	function TreeTransformer(before, after) {
		TreeWalker.call(this);
		this.before = before;
		this.after = after;
	}
	TreeTransformer.prototype = new TreeWalker;

	(function(undefined){

		function _(node, descend) {
			node.DEFMETHOD("transform", function(tw, in_list){
				var x, y;
				tw.push(this);
				if (tw.before) x = tw.before(this, descend, in_list);
				if (x === undefined) {
					if (!tw.after) {
						x = this;
						descend(x, tw);
					} else {
						tw.stack[tw.stack.length - 1] = x = this;
						descend(x, tw);
						y = tw.after(x, in_list);
						if (y !== undefined) x = y;
					}
				}
				tw.pop(this);
				return x;
			});
		};

		function do_list(list, tw) {
			return MAP(list, function(node){
				return node.transform(tw, true);
			});
		};

		_(AST_Node, noop);

		_(AST_LabeledStatement, function(self, tw){
			self.label = self.label.transform(tw);
			self.body = self.body.transform(tw);
		});

		_(AST_SimpleStatement, function(self, tw){
			self.body = self.body.transform(tw);
		});

		_(AST_Block, function(self, tw){
			self.body = do_list(self.body, tw);
		});

		_(AST_DWLoop, function(self, tw){
			self.condition = self.condition.transform(tw);
			self.body = self.body.transform(tw);
		});

		_(AST_For, function(self, tw){
			if (self.init) self.init = self.init.transform(tw);
			if (self.condition) self.condition = self.condition.transform(tw);
			if (self.step) self.step = self.step.transform(tw);
			self.body = self.body.transform(tw);
		});

		_(AST_ForIn, function(self, tw){
			self.init = self.init.transform(tw);
			self.object = self.object.transform(tw);
			self.body = self.body.transform(tw);
		});

		_(AST_With, function(self, tw){
			self.expression = self.expression.transform(tw);
			self.body = self.body.transform(tw);
		});

		_(AST_Exit, function(self, tw){
			if (self.value) self.value = self.value.transform(tw);
		});

		_(AST_LoopControl, function(self, tw){
			if (self.label) self.label = self.label.transform(tw);
		});

		_(AST_If, function(self, tw){
			self.condition = self.condition.transform(tw);
			self.body = self.body.transform(tw);
			if (self.alternative) self.alternative = self.alternative.transform(tw);
		});

		_(AST_Switch, function(self, tw){
			self.expression = self.expression.transform(tw);
			self.body = do_list(self.body, tw);
		});

		_(AST_Case, function(self, tw){
			self.expression = self.expression.transform(tw);
			self.body = do_list(self.body, tw);
		});

		_(AST_Try, function(self, tw){
			self.body = do_list(self.body, tw);
			if (self.bcatch) self.bcatch = self.bcatch.transform(tw);
			if (self.bfinally) self.bfinally = self.bfinally.transform(tw);
		});

		_(AST_Catch, function(self, tw){
			self.argname = self.argname.transform(tw);
			self.body = do_list(self.body, tw);
		});

		_(AST_Definitions, function(self, tw){
			self.definitions = do_list(self.definitions, tw);
		});

		_(AST_VarDef, function(self, tw){
			self.name = self.name.transform(tw);
			if (self.value) self.value = self.value.transform(tw);
		});

		_(AST_Lambda, function(self, tw){
			if (self.name) self.name = self.name.transform(tw);
			self.argnames = do_list(self.argnames, tw);
			self.body = do_list(self.body, tw);
		});

		_(AST_Call, function(self, tw){
			self.expression = self.expression.transform(tw);
			self.args = do_list(self.args, tw);
		});

		_(AST_Seq, function(self, tw){
			self.car = self.car.transform(tw);
			self.cdr = self.cdr.transform(tw);
		});

		_(AST_Dot, function(self, tw){
			self.expression = self.expression.transform(tw);
		});

		_(AST_Sub, function(self, tw){
			self.expression = self.expression.transform(tw);
			self.property = self.property.transform(tw);
		});

		_(AST_Unary, function(self, tw){
			self.expression = self.expression.transform(tw);
		});

		_(AST_Binary, function(self, tw){
			self.left = self.left.transform(tw);
			self.right = self.right.transform(tw);
		});

		_(AST_Conditional, function(self, tw){
			self.condition = self.condition.transform(tw);
			self.consequent = self.consequent.transform(tw);
			self.alternative = self.alternative.transform(tw);
		});

		_(AST_Array, function(self, tw){
			self.elements = do_list(self.elements, tw);
		});

		_(AST_Object, function(self, tw){
			self.properties = do_list(self.properties, tw);
		});

		_(AST_ObjectProperty, function(self, tw){
			self.value = self.value.transform(tw);
		});

	})();
	//#endregion
	
	//#region URL: /lib/scope
	//"use strict";

	function SymbolDef(scope, index, orig) {
		this.name = orig.name;
		this.orig = [ orig ];
		this.scope = scope;
		this.references = [];
		this.global = false;
		this.mangled_name = null;
		this.undeclared = false;
		this.index = index;
		this.id = SymbolDef.next_id++;
	};

	SymbolDef.next_id = 1;

	SymbolDef.prototype = {
		unmangleable: function(options) {
			if (!options) options = {};

			return (this.global && !options.toplevel)
				|| this.undeclared
				|| (!options.eval && (this.scope.uses_eval || this.scope.uses_with))
				|| (options.keep_fnames
					&& (this.orig[0] instanceof AST_SymbolLambda
						|| this.orig[0] instanceof AST_SymbolDefun));
		},
		mangle: function(options) {
			var cache = options.cache && options.cache.props;
			if (this.global && cache && cache.has(this.name)) {
				this.mangled_name = cache.get(this.name);
			}
			else if (!this.mangled_name && !this.unmangleable(options)) {
				var s = this.scope;
				var sym = this.orig[0];
				if (!options.screw_ie8 && sym instanceof AST_SymbolLambda)
					s = s.parent_scope;
				var def;
				if (this.defun && (def = this.defun.variables.get(this.name))) {
					this.mangled_name = def.mangled_name || def.name;
				} else
					this.mangled_name = s.next_mangled(options, this);
				if (this.global && cache) {
					cache.set(this.name, this.mangled_name);
				}
			}
		}
	};

	AST_Toplevel.DEFMETHOD("figure_out_scope", function(options){
		options = defaults(options, {
			cache: null,
			screw_ie8: true
		});

		// pass 1: setup scope chaining and handle definitions
		var self = this;
		var scope = self.parent_scope = null;
		var labels = new Dictionary();
		var defun = null;
		var tw = new TreeWalker(function(node, descend){
			if (node instanceof AST_Catch) {
				var save_scope = scope;
				scope = new AST_Scope(node);
				scope.init_scope_vars(save_scope);
				descend();
				scope = save_scope;
				return true;
			}
			if (node instanceof AST_Scope) {
				node.init_scope_vars(scope);
				var save_scope = scope;
				var save_defun = defun;
				var save_labels = labels;
				defun = scope = node;
				labels = new Dictionary();
				descend();
				scope = save_scope;
				defun = save_defun;
				labels = save_labels;
				return true;        // don't descend again in TreeWalker
			}
			if (node instanceof AST_LabeledStatement) {
				var l = node.label;
				if (labels.has(l.name)) {
					throw new Error(string_template("Label {name} defined twice", l));
				}
				labels.set(l.name, l);
				descend();
				labels.del(l.name);
				return true;        // no descend again
			}
			if (node instanceof AST_With) {
				for (var s = scope; s; s = s.parent_scope)
					s.uses_with = true;
				return;
			}
			if (node instanceof AST_Symbol) {
				node.scope = scope;
			}
			if (node instanceof AST_Label) {
				node.thedef = node;
				node.references = [];
			}
			if (node instanceof AST_SymbolLambda) {
				defun.def_function(node);
			}
			else if (node instanceof AST_SymbolDefun) {
				// Careful here, the scope where this should be defined is
				// the parent scope.  The reason is that we enter a new
				// scope when we encounter the AST_Defun node (which is
				// instanceof AST_Scope) but we get to the symbol a bit
				// later.
				(node.scope = defun.parent_scope).def_function(node);
			}
			else if (node instanceof AST_SymbolVar
				|| node instanceof AST_SymbolConst) {
				defun.def_variable(node);
				if (defun !== scope) {
					node.mark_enclosed(options);
					var def = scope.find_variable(node);
					if (node.thedef !== def) {
						node.thedef = def;
						node.reference(options);
					}
				}
			}
			else if (node instanceof AST_SymbolCatch) {
				scope.def_variable(node).defun = defun;
			}
			else if (node instanceof AST_LabelRef) {
				var sym = labels.get(node.name);
				if (!sym) throw new Error(string_template("Undefined label {name} [{line},{col}]", {
					name: node.name,
					line: node.start.line,
					col: node.start.col
				}));
				node.thedef = sym;
			}
		});
		self.walk(tw);

		// pass 2: find back references and eval
		var func = null;
		var globals = self.globals = new Dictionary();
		var tw = new TreeWalker(function(node, descend){
			if (node instanceof AST_Lambda) {
				var prev_func = func;
				func = node;
				descend();
				func = prev_func;
				return true;
			}
			if (node instanceof AST_LoopControl && node.label) {
				node.label.thedef.references.push(node);
				return true;
			}
			if (node instanceof AST_SymbolRef) {
				var name = node.name;
				if (name == "eval" && tw.parent() instanceof AST_Call) {
					for (var s = node.scope; s && !s.uses_eval; s = s.parent_scope) {
						s.uses_eval = true;
					}
				}
				var sym = node.scope.find_variable(name);
				if (node.scope instanceof AST_Lambda && name == "arguments") {
					node.scope.uses_arguments = true;
				}
				if (!sym) {
					sym = self.def_global(node);
				}
				node.thedef = sym;
				node.reference(options);
				return true;
			}
		});
		self.walk(tw);

		// pass 3: fix up any scoping issue with IE8
		if (!options.screw_ie8) {
			self.walk(new TreeWalker(function(node, descend) {
				if (node instanceof AST_SymbolCatch) {
					var name = node.name;
					var refs = node.thedef.references;
					var scope = node.thedef.defun;
					var def = scope.find_variable(name) || self.globals.get(name) || scope.def_variable(node);
					refs.forEach(function(ref) {
						ref.thedef = def;
						ref.reference(options);
					});
					node.thedef = def;
					return true;
				}
			}));
		}

		if (options.cache) {
			this.cname = options.cache.cname;
		}
	});

	AST_Toplevel.DEFMETHOD("def_global", function(node){
		var globals = this.globals, name = node.name;
		if (globals.has(name)) {
			return globals.get(name);
		} else {
			var g = new SymbolDef(this, globals.size(), node);
			g.undeclared = true;
			g.global = true;
			globals.set(name, g);
			return g;
		}
	});

	AST_Scope.DEFMETHOD("init_scope_vars", function(parent_scope){
		this.variables = new Dictionary();  // map name to AST_SymbolVar (variables defined in this scope; includes functions)
		this.functions = new Dictionary();  // map name to AST_SymbolDefun (functions defined in this scope)
		this.uses_with = false;             // will be set to true if this or some nested scope uses the `with` statement
		this.uses_eval = false;             // will be set to true if this or nested scope uses the global `eval`
		this.parent_scope = parent_scope;   // the parent scope
		this.enclosed = [];                 // a list of variables from this or outer scope(s) that are referenced from this or inner scopes
		this.cname = -1;                    // the current index for mangling functions/variables
	});

	AST_Lambda.DEFMETHOD("init_scope_vars", function(){
		AST_Scope.prototype.init_scope_vars.apply(this, arguments);
		this.uses_arguments = false;
		this.def_variable(new AST_SymbolVar({
			name: "arguments",
			start: this.start,
			end: this.end
		}));
	});

	AST_Symbol.DEFMETHOD("mark_enclosed", function(options) {
		var def = this.definition();
		var s = this.scope;
		while (s) {
			push_uniq(s.enclosed, def);
			if (options.keep_fnames) {
				s.functions.each(function(d) {
					push_uniq(def.scope.enclosed, d);
				});
			}
			if (s === def.scope) break;
			s = s.parent_scope;
		}
	});

	AST_Symbol.DEFMETHOD("reference", function(options) {
		this.definition().references.push(this);
		this.mark_enclosed(options);
	});

	AST_Scope.DEFMETHOD("find_variable", function(name){
		if (name instanceof AST_Symbol) name = name.name;
		return this.variables.get(name)
			|| (this.parent_scope && this.parent_scope.find_variable(name));
	});

	AST_Scope.DEFMETHOD("def_function", function(symbol){
		this.functions.set(symbol.name, this.def_variable(symbol));
	});

	AST_Scope.DEFMETHOD("def_variable", function(symbol){
		var def;
		if (!this.variables.has(symbol.name)) {
			def = new SymbolDef(this, this.variables.size(), symbol);
			this.variables.set(symbol.name, def);
			def.global = !this.parent_scope;
		} else {
			def = this.variables.get(symbol.name);
			def.orig.push(symbol);
		}
		return symbol.thedef = def;
	});

	AST_Scope.DEFMETHOD("next_mangled", function(options){
		var ext = this.enclosed;
		out: while (true) {
			var m = base54(++this.cname);
			if (!is_identifier(m)) continue; // skip over "do"

			// https://github.com/mishoo/UglifyJS2/issues/242 -- do not
			// shadow a name excepted from mangling.
			if (options.except.indexOf(m) >= 0) continue;

			// we must ensure that the mangled name does not shadow a name
			// from some parent scope that is referenced in this or in
			// inner scopes.
			for (var i = ext.length; --i >= 0;) {
				var sym = ext[i];
				var name = sym.mangled_name || (sym.unmangleable(options) && sym.name);
				if (m == name) continue out;
			}
			return m;
		}
	});

	AST_Function.DEFMETHOD("next_mangled", function(options, def){
		// #179, #326
		// in Safari strict mode, something like (function x(x){...}) is a syntax error;
		// a function expression's argument cannot shadow the function expression's name

		var tricky_def = def.orig[0] instanceof AST_SymbolFunarg && this.name && this.name.definition();

		// the function's mangled_name is null when keep_fnames is true
		var tricky_name = tricky_def ? tricky_def.mangled_name || tricky_def.name : null;

		while (true) {
			var name = AST_Lambda.prototype.next_mangled.call(this, options, def);
			if (!tricky_name || tricky_name != name)
				return name;
		}
	});

	AST_Symbol.DEFMETHOD("unmangleable", function(options){
		return this.definition().unmangleable(options);
	});

	// labels are always mangleable
	AST_Label.DEFMETHOD("unmangleable", function(){
		return false;
	});

	AST_Symbol.DEFMETHOD("unreferenced", function(){
		return this.definition().references.length == 0
			&& !(this.scope.uses_eval || this.scope.uses_with);
	});

	AST_Symbol.DEFMETHOD("undeclared", function(){
		return this.definition().undeclared;
	});

	AST_LabelRef.DEFMETHOD("undeclared", function(){
		return false;
	});

	AST_Label.DEFMETHOD("undeclared", function(){
		return false;
	});

	AST_Symbol.DEFMETHOD("definition", function(){
		return this.thedef;
	});

	AST_Symbol.DEFMETHOD("global", function(){
		return this.definition().global;
	});

	AST_Toplevel.DEFMETHOD("_default_mangler_options", function(options){
		return defaults(options, {
			eval        : false,
			except      : [],
			keep_fnames : false,
			screw_ie8   : true,
			sort        : false, // Ignored. Flag retained for backwards compatibility.
			toplevel    : false
		});
	});

	AST_Toplevel.DEFMETHOD("mangle_names", function(options){
		options = this._default_mangler_options(options);

		// Never mangle arguments
		options.except.push('arguments');

		// We only need to mangle declaration nodes.  Special logic wired
		// into the code generator will display the mangled name if it's
		// present (and for AST_SymbolRef-s it'll use the mangled name of
		// the AST_SymbolDeclaration that it points to).
		var lname = -1;
		var to_mangle = [];

		if (options.cache) {
			this.globals.each(function(symbol){
				if (options.except.indexOf(symbol.name) < 0) {
					to_mangle.push(symbol);
				}
			});
		}

		var tw = new TreeWalker(function(node, descend){
			if (node instanceof AST_LabeledStatement) {
				// lname is incremented when we get to the AST_Label
				var save_nesting = lname;
				descend();
				lname = save_nesting;
				return true;        // don't descend again in TreeWalker
			}
			if (node instanceof AST_Scope) {
				var p = tw.parent(), a = [];
				node.variables.each(function(symbol){
					if (options.except.indexOf(symbol.name) < 0) {
						a.push(symbol);
					}
				});
				to_mangle.push.apply(to_mangle, a);
				return;
			}
			if (node instanceof AST_Label) {
				var name;
				do name = base54(++lname); while (!is_identifier(name));
				node.mangled_name = name;
				return true;
			}
			if (options.screw_ie8 && node instanceof AST_SymbolCatch) {
				to_mangle.push(node.definition());
				return;
			}
		});
		this.walk(tw);
		to_mangle.forEach(function(def){ def.mangle(options) });

		if (options.cache) {
			options.cache.cname = this.cname;
		}
	});

	AST_Toplevel.DEFMETHOD("compute_char_frequency", function(options){
		options = this._default_mangler_options(options);
		var tw = new TreeWalker(function(node){
			if (node instanceof AST_Constant)
				base54.consider(node.print_to_string());
			else if (node instanceof AST_Return)
				base54.consider("return");
			else if (node instanceof AST_Throw)
				base54.consider("throw");
			else if (node instanceof AST_Continue)
				base54.consider("continue");
			else if (node instanceof AST_Break)
				base54.consider("break");
			else if (node instanceof AST_Debugger)
				base54.consider("debugger");
			else if (node instanceof AST_Directive)
				base54.consider(node.value);
			else if (node instanceof AST_While)
				base54.consider("while");
			else if (node instanceof AST_Do)
				base54.consider("do while");
			else if (node instanceof AST_If) {
				base54.consider("if");
				if (node.alternative) base54.consider("else");
			}
			else if (node instanceof AST_Var)
				base54.consider("var");
			else if (node instanceof AST_Const)
				base54.consider("const");
			else if (node instanceof AST_Lambda)
				base54.consider("function");
			else if (node instanceof AST_For)
				base54.consider("for");
			else if (node instanceof AST_ForIn)
				base54.consider("for in");
			else if (node instanceof AST_Switch)
				base54.consider("switch");
			else if (node instanceof AST_Case)
				base54.consider("case");
			else if (node instanceof AST_Default)
				base54.consider("default");
			else if (node instanceof AST_With)
				base54.consider("with");
			else if (node instanceof AST_ObjectSetter)
				base54.consider("set" + node.key);
			else if (node instanceof AST_ObjectGetter)
				base54.consider("get" + node.key);
			else if (node instanceof AST_ObjectKeyVal)
				base54.consider(node.key);
			else if (node instanceof AST_New)
				base54.consider("new");
			else if (node instanceof AST_This)
				base54.consider("this");
			else if (node instanceof AST_Try)
				base54.consider("try");
			else if (node instanceof AST_Catch)
				base54.consider("catch");
			else if (node instanceof AST_Finally)
				base54.consider("finally");
			else if (node instanceof AST_Symbol && node.unmangleable(options))
				base54.consider(node.name);
			else if (node instanceof AST_Unary || node instanceof AST_Binary)
				base54.consider(node.operator);
			else if (node instanceof AST_Dot)
				base54.consider(node.property);
		});
		this.walk(tw);
		base54.sort();
	});

	var base54 = (function() {
		var string = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$_0123456789";
		var chars, frequency;
		function reset() {
			frequency = Object.create(null);
			chars = string.split("").map(function(ch){ return ch.charCodeAt(0) });
			chars.forEach(function(ch){ frequency[ch] = 0 });
		}
		base54.consider = function(str){
			for (var i = str.length; --i >= 0;) {
				var code = str.charCodeAt(i);
				if (code in frequency) ++frequency[code];
			}
		};
		base54.sort = function() {
			chars = mergeSort(chars, function(a, b){
				if (is_digit(a) && !is_digit(b)) return 1;
				if (is_digit(b) && !is_digit(a)) return -1;
				return frequency[b] - frequency[a];
			});
		};
		base54.reset = reset;
		reset();
		base54.get = function(){ return chars };
		base54.freq = function(){ return frequency };
		function base54(num) {
			var ret = "", base = 54;
			num++;
			do {
				num--;
				ret += String.fromCharCode(chars[num % base]);
				num = Math.floor(num / base);
				base = 64;
			} while (num > 0);
			return ret;
		};
		return base54;
	})();

	AST_Toplevel.DEFMETHOD("scope_warnings", function(options){
		options = defaults(options, {
			assign_to_global : true,
			eval             : true,
			func_arguments   : true,
			nested_defuns    : true,
			undeclared       : false, // this makes a lot of noise
			unreferenced     : true
		});
		var tw = new TreeWalker(function(node){
			if (options.undeclared
				&& node instanceof AST_SymbolRef
				&& node.undeclared())
			{
				// XXX: this also warns about JS standard names,
				// i.e. Object, Array, parseInt etc.  Should add a list of
				// exceptions.
				AST_Node.warn("Undeclared symbol: {name} [{file}:{line},{col}]", {
					name: node.name,
					file: node.start.file,
					line: node.start.line,
					col: node.start.col
				});
			}
			if (options.assign_to_global)
			{
				var sym = null;
				if (node instanceof AST_Assign && node.left instanceof AST_SymbolRef)
					sym = node.left;
				else if (node instanceof AST_ForIn && node.init instanceof AST_SymbolRef)
					sym = node.init;
				if (sym
					&& (sym.undeclared()
						|| (sym.global() && sym.scope !== sym.definition().scope))) {
					AST_Node.warn("{msg}: {name} [{file}:{line},{col}]", {
						msg: sym.undeclared() ? "Accidental global?" : "Assignment to global",
						name: sym.name,
						file: sym.start.file,
						line: sym.start.line,
						col: sym.start.col
					});
				}
			}
			if (options.eval
				&& node instanceof AST_SymbolRef
				&& node.undeclared()
				&& node.name == "eval") {
				AST_Node.warn("Eval is used [{file}:{line},{col}]", node.start);
			}
			if (options.unreferenced
				&& (node instanceof AST_SymbolDeclaration || node instanceof AST_Label)
				&& !(node instanceof AST_SymbolCatch)
				&& node.unreferenced()) {
				AST_Node.warn("{type} {name} is declared but not referenced [{file}:{line},{col}]", {
					type: node instanceof AST_Label ? "Label" : "Symbol",
					name: node.name,
					file: node.start.file,
					line: node.start.line,
					col: node.start.col
				});
			}
			if (options.func_arguments
				&& node instanceof AST_Lambda
				&& node.uses_arguments) {
				AST_Node.warn("arguments used in function {name} [{file}:{line},{col}]", {
					name: node.name ? node.name.name : "anonymous",
					file: node.start.file,
					line: node.start.line,
					col: node.start.col
				});
			}
			if (options.nested_defuns
				&& node instanceof AST_Defun
				&& !(tw.parent() instanceof AST_Scope)) {
				AST_Node.warn("Function {name} declared in nested statement \"{type}\" [{file}:{line},{col}]", {
					name: node.name.name,
					type: tw.parent().TYPE,
					file: node.start.file,
					line: node.start.line,
					col: node.start.col
				});
			}
		});
		this.walk(tw);
	});
	//#endregion
	
	//#region URL: /lib/output
	//"use strict";

	var EXPECT_DIRECTIVE = /^$|[;{][\s\n]*$/;

	function is_some_comments(comment) {
		// multiline comment
		return comment.type == "comment2" && /@preserve|@license|@cc_on/i.test(comment.value);
	}

	function OutputStream(options) {

		options = defaults(options, {
			ascii_only       : false,
			beautify         : false,
			bracketize       : false,
			comments         : false,
			indent_level     : 4,
			indent_start     : 0,
			inline_script    : true,
			keep_quoted_props: false,
			max_line_len     : false,
			preamble         : null,
			preserve_line    : false,
			quote_keys       : false,
			quote_style      : 0,
			screw_ie8        : true,
			semicolons       : true,
			shebang          : true,
			source_map       : null,
			space_colon      : true,
			unescape_regexps : false,
			width            : 80,
			wrap_iife        : false
		}, true);

		// Convert comment option to RegExp if neccessary and set up comments filter
		var comment_filter = return_false; // Default case, throw all comments away
		if (options.comments) {
			var comments = options.comments;
			if (typeof options.comments === "string" && /^\/.*\/[a-zA-Z]*$/.test(options.comments)) {
				var regex_pos = options.comments.lastIndexOf("/");
				comments = new RegExp(
					options.comments.substr(1, regex_pos - 1),
					options.comments.substr(regex_pos + 1)
				);
			}
			if (comments instanceof RegExp) {
				comment_filter = function(comment) {
					return comment.type != "comment5" && comments.test(comment.value);
				};
			}
			else if (typeof comments === "function") {
				comment_filter = function(comment) {
					return comment.type != "comment5" && comments(this, comment);
				};
			}
			else if (comments === "some") {
				comment_filter = is_some_comments;
			} else { // NOTE includes "all" option
				comment_filter = return_true;
			}
		}

		var indentation = 0;
		var current_col = 0;
		var current_line = 1;
		var current_pos = 0;
		var OUTPUT = "";

		function to_ascii(str, identifier) {
			return str.replace(/[\u0000-\u001f\u007f-\uffff]/g, function(ch) {
				var code = ch.charCodeAt(0).toString(16);
				if (code.length <= 2 && !identifier) {
					while (code.length < 2) code = "0" + code;
					return "\\x" + code;
				} else {
					while (code.length < 4) code = "0" + code;
					return "\\u" + code;
				}
			});
		};

		function make_string(str, quote) {
			var dq = 0, sq = 0;
			str = str.replace(/[\\\b\f\n\r\v\t\x22\x27\u2028\u2029\0\ufeff]/g,
			  function(s, i){
				switch (s) {
				  case '"': ++dq; return '"';
				  case "'": ++sq; return "'";
				  case "\\": return "\\\\";
				  case "\n": return "\\n";
				  case "\r": return "\\r";
				  case "\t": return "\\t";
				  case "\b": return "\\b";
				  case "\f": return "\\f";
				  case "\x0B": return options.screw_ie8 ? "\\v" : "\\x0B";
				  case "\u2028": return "\\u2028";
				  case "\u2029": return "\\u2029";
				  case "\ufeff": return "\\ufeff";
				  case "\0":
					  return /[0-7]/.test(str.charAt(i+1)) ? "\\x00" : "\\0";
				}
				return s;
			});
			function quote_single() {
				return "'" + str.replace(/\x27/g, "\\'") + "'";
			}
			function quote_double() {
				return '"' + str.replace(/\x22/g, '\\"') + '"';
			}
			if (options.ascii_only) str = to_ascii(str);
			switch (options.quote_style) {
			  case 1:
				return quote_single();
			  case 2:
				return quote_double();
			  case 3:
				return quote == "'" ? quote_single() : quote_double();
			  default:
				return dq > sq ? quote_single() : quote_double();
			}
		};

		function encode_string(str, quote) {
			var ret = make_string(str, quote);
			if (options.inline_script) {
				ret = ret.replace(/<\x2fscript([>\/\t\n\f\r ])/gi, "<\\/script$1");
				ret = ret.replace(/\x3c!--/g, "\\x3c!--");
				ret = ret.replace(/--\x3e/g, "--\\x3e");
			}
			return ret;
		};

		function make_name(name) {
			name = name.toString();
			if (options.ascii_only)
				name = to_ascii(name, true);
			return name;
		};

		function make_indent(back) {
			return repeat_string(" ", options.indent_start + indentation - back * options.indent_level);
		};

		/* -----[ beautification/minification ]----- */

		var might_need_space = false;
		var might_need_semicolon = false;
		var might_add_newline = 0;
		var last = "";

		var ensure_line_len = options.max_line_len ? function() {
			if (current_col > options.max_line_len) {
				if (might_add_newline) {
					var left = OUTPUT.slice(0, might_add_newline);
					var right = OUTPUT.slice(might_add_newline);
					OUTPUT = left + "\n" + right;
					current_line++;
					current_pos++;
					current_col = right.length;
				}
				if (current_col > options.max_line_len) {
					AST_Node.warn("Output exceeds {max_line_len} characters", options);
				}
			}
			might_add_newline = 0;
		} : noop;

		var requireSemicolonChars = makePredicate("( [ + * / - , .");

		function print(str) {
			str = String(str);
			var ch = str.charAt(0);
			var prev = last.charAt(last.length - 1);
			if (might_need_semicolon) {
				might_need_semicolon = false;

				if (prev == ":" && ch == "}" || (!ch || ";}".indexOf(ch) < 0) && prev != ";") {
					if (options.semicolons || requireSemicolonChars(ch)) {
						OUTPUT += ";";
						current_col++;
						current_pos++;
					} else {
						ensure_line_len();
						OUTPUT += "\n";
						current_pos++;
						current_line++;
						current_col = 0;

						if (/^\s+$/.test(str)) {
							// reset the semicolon flag, since we didn't print one
							// now and might still have to later
							might_need_semicolon = true;
						}
					}

					if (!options.beautify)
						might_need_space = false;
				}
			}

			if (!options.beautify && options.preserve_line && stack[stack.length - 1]) {
				var target_line = stack[stack.length - 1].start.line;
				while (current_line < target_line) {
					ensure_line_len();
					OUTPUT += "\n";
					current_pos++;
					current_line++;
					current_col = 0;
					might_need_space = false;
				}
			}

			if (might_need_space) {
				if ((is_identifier_char(prev)
						&& (is_identifier_char(ch) || ch == "\\"))
					|| (ch == "/" && ch == prev)
					|| ((ch == "+" || ch == "-") && ch == last))
				{
					OUTPUT += " ";
					current_col++;
					current_pos++;
				}
				might_need_space = false;
			}
			OUTPUT += str;
			current_pos += str.length;
			var a = str.split(/\r?\n/), n = a.length - 1;
			current_line += n;
			current_col += a[0].length;
			if (n > 0) {
				ensure_line_len();
				current_col = a[n].length;
			}
			last = str;
		};

		var space = options.beautify ? function() {
			print(" ");
		} : function() {
			might_need_space = true;
		};

		var indent = options.beautify ? function(half) {
			if (options.beautify) {
				print(make_indent(half ? 0.5 : 0));
			}
		} : noop;

		var with_indent = options.beautify ? function(col, cont) {
			if (col === true) col = next_indent();
			var save_indentation = indentation;
			indentation = col;
			var ret = cont();
			indentation = save_indentation;
			return ret;
		} : function(col, cont) { return cont() };

		var newline = options.beautify ? function() {
			print("\n");
		} : options.max_line_len ? function() {
			ensure_line_len();
			might_add_newline = OUTPUT.length;
		} : noop;

		var semicolon = options.beautify ? function() {
			print(";");
		} : function() {
			might_need_semicolon = true;
		};

		function force_semicolon() {
			might_need_semicolon = false;
			print(";");
		};

		function next_indent() {
			return indentation + options.indent_level;
		};

		function with_block(cont) {
			var ret;
			print("{");
			newline();
			with_indent(next_indent(), function(){
				ret = cont();
			});
			indent();
			print("}");
			return ret;
		};

		function with_parens(cont) {
			print("(");
			//XXX: still nice to have that for argument lists
			//var ret = with_indent(current_col, cont);
			var ret = cont();
			print(")");
			return ret;
		};

		function with_square(cont) {
			print("[");
			//var ret = with_indent(current_col, cont);
			var ret = cont();
			print("]");
			return ret;
		};

		function comma() {
			print(",");
			space();
		};

		function colon() {
			print(":");
			if (options.space_colon) space();
		};

		var add_mapping = options.source_map ? function(token, name) {
			try {
				if (token) options.source_map.add(
					token.file || "?",
					current_line, current_col,
					token.line, token.col,
					(!name && token.type == "name") ? token.value : name
				);
			} catch(ex) {
				AST_Node.warn("Couldn't figure out mapping for {file}:{line},{col} → {cline},{ccol} [{name}]", {
					file: token.file,
					line: token.line,
					col: token.col,
					cline: current_line,
					ccol: current_col,
					name: name || ""
				})
			}
		} : noop;

		function get() {
			if (might_add_newline) {
				ensure_line_len();
			}
			return OUTPUT;
		};

		var stack = [];
		return {
			get             : get,
			toString        : get,
			indent          : indent,
			indentation     : function() { return indentation },
			current_width   : function() { return current_col - indentation },
			should_break    : function() { return options.width && this.current_width() >= options.width },
			newline         : newline,
			print           : print,
			space           : space,
			comma           : comma,
			colon           : colon,
			last            : function() { return last },
			semicolon       : semicolon,
			force_semicolon : force_semicolon,
			to_ascii        : to_ascii,
			print_name      : function(name) { print(make_name(name)) },
			print_string    : function(str, quote, escape_directive) {
				var encoded = encode_string(str, quote);
				if (escape_directive === true && encoded.indexOf("\\") === -1) {
					// Insert semicolons to break directive prologue
					if (!EXPECT_DIRECTIVE.test(OUTPUT)) {
						force_semicolon();
					}
					force_semicolon();
				}
				print(encoded);
			},
			encode_string   : encode_string,
			next_indent     : next_indent,
			with_indent     : with_indent,
			with_block      : with_block,
			with_parens     : with_parens,
			with_square     : with_square,
			add_mapping     : add_mapping,
			option          : function(opt) { return options[opt] },
			comment_filter  : comment_filter,
			line            : function() { return current_line },
			col             : function() { return current_col },
			pos             : function() { return current_pos },
			push_node       : function(node) { stack.push(node) },
			pop_node        : function() { return stack.pop() },
			parent          : function(n) {
				return stack[stack.length - 2 - (n || 0)];
			}
		};

	};

	/* -----[ code generators ]----- */

	(function(){

		/* -----[ utils ]----- */

		function DEFPRINT(nodetype, generator) {
			nodetype.DEFMETHOD("_codegen", generator);
		};

		var use_asm = false;
		var in_directive = false;

		AST_Node.DEFMETHOD("print", function(stream, force_parens){
			var self = this, generator = self._codegen, prev_use_asm = use_asm;
			if (self instanceof AST_Directive && self.value == "use asm" && stream.parent() instanceof AST_Scope) {
				use_asm = true;
			}
			function doit() {
				self.add_comments(stream);
				self.add_source_map(stream);
				generator(self, stream);
			}
			stream.push_node(self);
			if (force_parens || self.needs_parens(stream)) {
				stream.with_parens(doit);
			} else {
				doit();
			}
			stream.pop_node();
			if (self instanceof AST_Scope) {
				use_asm = prev_use_asm;
			}
		});

		AST_Node.DEFMETHOD("print_to_string", function(options){
			var s = OutputStream(options);
			if (!options) s._readonly = true;
			this.print(s);
			return s.get();
		});

		/* -----[ comments ]----- */

		AST_Node.DEFMETHOD("add_comments", function(output){
			if (output._readonly) return;
			var self = this;
			var start = self.start;
			if (start && !start._comments_dumped) {
				start._comments_dumped = true;
				var comments = start.comments_before || [];

				// XXX: ugly fix for https://github.com/mishoo/UglifyJS2/issues/112
				//               and https://github.com/mishoo/UglifyJS2/issues/372
				if (self instanceof AST_Exit && self.value) {
					self.value.walk(new TreeWalker(function(node){
						if (node.start && node.start.comments_before) {
							comments = comments.concat(node.start.comments_before);
							node.start.comments_before = [];
						}
						if (node instanceof AST_Function ||
							node instanceof AST_Array ||
							node instanceof AST_Object)
						{
							return true; // don't go inside.
						}
					}));
				}

				if (output.pos() == 0) {
					if (comments.length > 0 && output.option("shebang") && comments[0].type == "comment5") {
						output.print("#!" + comments.shift().value + "\n");
						output.indent();
					}
					var preamble = output.option("preamble");
					if (preamble) {
						output.print(preamble.replace(/\r\n?|[\n\u2028\u2029]|\s*$/g, "\n"));
					}
				}

				comments = comments.filter(output.comment_filter, self);

				// Keep single line comments after nlb, after nlb
				if (!output.option("beautify") && comments.length > 0 &&
					/comment[134]/.test(comments[0].type) &&
					output.col() !== 0 && comments[0].nlb)
				{
					output.print("\n");
				}

				comments.forEach(function(c){
					if (/comment[134]/.test(c.type)) {
						output.print("//" + c.value + "\n");
						output.indent();
					}
					else if (c.type == "comment2") {
						output.print("/*" + c.value + "*/");
						if (start.nlb) {
							output.print("\n");
							output.indent();
						} else {
							output.space();
						}
					}
				});
			}
		});

		/* -----[ PARENTHESES ]----- */

		function PARENS(nodetype, func) {
			if (Array.isArray(nodetype)) {
				nodetype.forEach(function(nodetype){
					PARENS(nodetype, func);
				});
			} else {
				nodetype.DEFMETHOD("needs_parens", func);
			}
		};

		PARENS(AST_Node, function(){
			return false;
		});

		// a function expression needs parens around it when it's provably
		// the first token to appear in a statement.
		PARENS(AST_Function, function(output){
			if (first_in_statement(output)) {
				return true;
			}

			if (output.option('wrap_iife')) {
				var p = output.parent();
				return p instanceof AST_Call && p.expression === this;
			}

			return false;
		});

		// same goes for an object literal, because otherwise it would be
		// interpreted as a block of code.
		PARENS(AST_Object, function(output){
			return first_in_statement(output);
		});

		PARENS(AST_Unary, function(output){
			var p = output.parent();
			return p instanceof AST_PropAccess && p.expression === this
				|| p instanceof AST_Call && p.expression === this;
		});

		PARENS(AST_Seq, function(output){
			var p = output.parent();
			return p instanceof AST_Call             // (foo, bar)() or foo(1, (2, 3), 4)
				|| p instanceof AST_Unary            // !(foo, bar, baz)
				|| p instanceof AST_Binary           // 1 + (2, 3) + 4 ==> 8
				|| p instanceof AST_VarDef           // var a = (1, 2), b = a + a; ==> b == 4
				|| p instanceof AST_PropAccess       // (1, {foo:2}).foo or (1, {foo:2})["foo"] ==> 2
				|| p instanceof AST_Array            // [ 1, (2, 3), 4 ] ==> [ 1, 3, 4 ]
				|| p instanceof AST_ObjectProperty   // { foo: (1, 2) }.foo ==> 2
				|| p instanceof AST_Conditional      /* (false, true) ? (a = 10, b = 20) : (c = 30)
													  * ==> 20 (side effect, set a := 10 and b := 20) */
			;
		});

		PARENS(AST_Binary, function(output){
			var p = output.parent();
			// (foo && bar)()
			if (p instanceof AST_Call && p.expression === this)
				return true;
			// typeof (foo && bar)
			if (p instanceof AST_Unary)
				return true;
			// (foo && bar)["prop"], (foo && bar).prop
			if (p instanceof AST_PropAccess && p.expression === this)
				return true;
			// this deals with precedence: 3 * (2 + 1)
			if (p instanceof AST_Binary) {
				var po = p.operator, pp = PRECEDENCE[po];
				var so = this.operator, sp = PRECEDENCE[so];
				if (pp > sp
					|| (pp == sp
						&& this === p.right)) {
					return true;
				}
			}
		});

		PARENS(AST_PropAccess, function(output){
			var p = output.parent();
			if (p instanceof AST_New && p.expression === this) {
				// i.e. new (foo.bar().baz)
				//
				// if there's one call into this subtree, then we need
				// parens around it too, otherwise the call will be
				// interpreted as passing the arguments to the upper New
				// expression.
				try {
					this.walk(new TreeWalker(function(node){
						if (node instanceof AST_Call) throw p;
					}));
				} catch(ex) {
					if (ex !== p) throw ex;
					return true;
				}
			}
		});

		PARENS(AST_Call, function(output){
			var p = output.parent(), p1;
			if (p instanceof AST_New && p.expression === this)
				return true;

			// workaround for Safari bug.
			// https://bugs.webkit.org/show_bug.cgi?id=123506
			return this.expression instanceof AST_Function
				&& p instanceof AST_PropAccess
				&& p.expression === this
				&& (p1 = output.parent(1)) instanceof AST_Assign
				&& p1.left === p;
		});

		PARENS(AST_New, function(output){
			var p = output.parent();
			if (!need_constructor_parens(this, output)
				&& (p instanceof AST_PropAccess // (new Date).getTime(), (new Date)["getTime"]()
					|| p instanceof AST_Call && p.expression === this)) // (new foo)(bar)
				return true;
		});

		PARENS(AST_Number, function(output){
			var p = output.parent();
			if (p instanceof AST_PropAccess && p.expression === this) {
				var value = this.getValue();
				if (value < 0 || /^0/.test(make_num(value))) {
					return true;
				}
			}
		});

		PARENS([ AST_Assign, AST_Conditional ], function (output){
			var p = output.parent();
			// !(a = false) → true
			if (p instanceof AST_Unary)
				return true;
			// 1 + (a = 2) + 3 → 6, side effect setting a = 2
			if (p instanceof AST_Binary && !(p instanceof AST_Assign))
				return true;
			// (a = func)() —or— new (a = Object)()
			if (p instanceof AST_Call && p.expression === this)
				return true;
			// (a = foo) ? bar : baz
			if (p instanceof AST_Conditional && p.condition === this)
				return true;
			// (a = foo)["prop"] —or— (a = foo).prop
			if (p instanceof AST_PropAccess && p.expression === this)
				return true;
		});

		/* -----[ PRINTERS ]----- */

		DEFPRINT(AST_Directive, function(self, output){
			output.print_string(self.value, self.quote);
			output.semicolon();
		});
		DEFPRINT(AST_Debugger, function(self, output){
			output.print("debugger");
			output.semicolon();
		});

		/* -----[ statements ]----- */

		function display_body(body, is_toplevel, output, allow_directives) {
			var last = body.length - 1;
			in_directive = allow_directives;
			body.forEach(function(stmt, i){
				if (in_directive === true && !(stmt instanceof AST_Directive ||
					stmt instanceof AST_EmptyStatement ||
					(stmt instanceof AST_SimpleStatement && stmt.body instanceof AST_String)
				)) {
					in_directive = false;
				}
				if (!(stmt instanceof AST_EmptyStatement)) {
					output.indent();
					stmt.print(output);
					if (!(i == last && is_toplevel)) {
						output.newline();
						if (is_toplevel) output.newline();
					}
				}
				if (in_directive === true &&
					stmt instanceof AST_SimpleStatement &&
					stmt.body instanceof AST_String
				) {
					in_directive = false;
				}
			});
			in_directive = false;
		};

		AST_StatementWithBody.DEFMETHOD("_do_print_body", function(output){
			force_statement(this.body, output);
		});

		DEFPRINT(AST_Statement, function(self, output){
			self.body.print(output);
			output.semicolon();
		});
		DEFPRINT(AST_Toplevel, function(self, output){
			display_body(self.body, true, output, true);
			output.print("");
		});
		DEFPRINT(AST_LabeledStatement, function(self, output){
			self.label.print(output);
			output.colon();
			self.body.print(output);
		});
		DEFPRINT(AST_SimpleStatement, function(self, output){
			self.body.print(output);
			output.semicolon();
		});
		function print_bracketed(body, output, allow_directives) {
			if (body.length > 0) output.with_block(function(){
				display_body(body, false, output, allow_directives);
			});
			else output.print("{}");
		};
		DEFPRINT(AST_BlockStatement, function(self, output){
			print_bracketed(self.body, output);
		});
		DEFPRINT(AST_EmptyStatement, function(self, output){
			output.semicolon();
		});
		DEFPRINT(AST_Do, function(self, output){
			output.print("do");
			output.space();
			make_block(self.body, output);
			output.space();
			output.print("while");
			output.space();
			output.with_parens(function(){
				self.condition.print(output);
			});
			output.semicolon();
		});
		DEFPRINT(AST_While, function(self, output){
			output.print("while");
			output.space();
			output.with_parens(function(){
				self.condition.print(output);
			});
			output.space();
			self._do_print_body(output);
		});
		DEFPRINT(AST_For, function(self, output){
			output.print("for");
			output.space();
			output.with_parens(function(){
				if (self.init) {
					if (self.init instanceof AST_Definitions) {
						self.init.print(output);
					} else {
						parenthesize_for_noin(self.init, output, true);
					}
					output.print(";");
					output.space();
				} else {
					output.print(";");
				}
				if (self.condition) {
					self.condition.print(output);
					output.print(";");
					output.space();
				} else {
					output.print(";");
				}
				if (self.step) {
					self.step.print(output);
				}
			});
			output.space();
			self._do_print_body(output);
		});
		DEFPRINT(AST_ForIn, function(self, output){
			output.print("for");
			output.space();
			output.with_parens(function(){
				self.init.print(output);
				output.space();
				output.print("in");
				output.space();
				self.object.print(output);
			});
			output.space();
			self._do_print_body(output);
		});
		DEFPRINT(AST_With, function(self, output){
			output.print("with");
			output.space();
			output.with_parens(function(){
				self.expression.print(output);
			});
			output.space();
			self._do_print_body(output);
		});

		/* -----[ functions ]----- */
		AST_Lambda.DEFMETHOD("_do_print", function(output, nokeyword){
			var self = this;
			if (!nokeyword) {
				output.print("function");
			}
			if (self.name) {
				output.space();
				self.name.print(output);
			}
			output.with_parens(function(){
				self.argnames.forEach(function(arg, i){
					if (i) output.comma();
					arg.print(output);
				});
			});
			output.space();
			print_bracketed(self.body, output, true);
		});
		DEFPRINT(AST_Lambda, function(self, output){
			self._do_print(output);
		});

		/* -----[ exits ]----- */
		AST_Exit.DEFMETHOD("_do_print", function(output, kind){
			output.print(kind);
			if (this.value) {
				output.space();
				this.value.print(output);
			}
			output.semicolon();
		});
		DEFPRINT(AST_Return, function(self, output){
			self._do_print(output, "return");
		});
		DEFPRINT(AST_Throw, function(self, output){
			self._do_print(output, "throw");
		});

		/* -----[ loop control ]----- */
		AST_LoopControl.DEFMETHOD("_do_print", function(output, kind){
			output.print(kind);
			if (this.label) {
				output.space();
				this.label.print(output);
			}
			output.semicolon();
		});
		DEFPRINT(AST_Break, function(self, output){
			self._do_print(output, "break");
		});
		DEFPRINT(AST_Continue, function(self, output){
			self._do_print(output, "continue");
		});

		/* -----[ if ]----- */
		function make_then(self, output) {
			var b = self.body;
			if (output.option("bracketize")
				|| !output.option("screw_ie8") && b instanceof AST_Do)
				return make_block(b, output);
			// The squeezer replaces "block"-s that contain only a single
			// statement with the statement itself; technically, the AST
			// is correct, but this can create problems when we output an
			// IF having an ELSE clause where the THEN clause ends in an
			// IF *without* an ELSE block (then the outer ELSE would refer
			// to the inner IF).  This function checks for this case and
			// adds the block brackets if needed.
			if (!b) return output.force_semicolon();
			while (true) {
				if (b instanceof AST_If) {
					if (!b.alternative) {
						make_block(self.body, output);
						return;
					}
					b = b.alternative;
				}
				else if (b instanceof AST_StatementWithBody) {
					b = b.body;
				}
				else break;
			}
			force_statement(self.body, output);
		};
		DEFPRINT(AST_If, function(self, output){
			output.print("if");
			output.space();
			output.with_parens(function(){
				self.condition.print(output);
			});
			output.space();
			if (self.alternative) {
				make_then(self, output);
				output.space();
				output.print("else");
				output.space();
				if (self.alternative instanceof AST_If)
					self.alternative.print(output);
				else
					force_statement(self.alternative, output);
			} else {
				self._do_print_body(output);
			}
		});

		/* -----[ switch ]----- */
		DEFPRINT(AST_Switch, function(self, output){
			output.print("switch");
			output.space();
			output.with_parens(function(){
				self.expression.print(output);
			});
			output.space();
			var last = self.body.length - 1;
			if (last < 0) output.print("{}");
			else output.with_block(function(){
				self.body.forEach(function(branch, i){
					output.indent(true);
					branch.print(output);
					if (i < last && branch.body.length > 0)
						output.newline();
				});
			});
		});
		AST_SwitchBranch.DEFMETHOD("_do_print_body", function(output){
			output.newline();
			this.body.forEach(function(stmt){
				output.indent();
				stmt.print(output);
				output.newline();
			});
		});
		DEFPRINT(AST_Default, function(self, output){
			output.print("default:");
			self._do_print_body(output);
		});
		DEFPRINT(AST_Case, function(self, output){
			output.print("case");
			output.space();
			self.expression.print(output);
			output.print(":");
			self._do_print_body(output);
		});

		/* -----[ exceptions ]----- */
		DEFPRINT(AST_Try, function(self, output){
			output.print("try");
			output.space();
			print_bracketed(self.body, output);
			if (self.bcatch) {
				output.space();
				self.bcatch.print(output);
			}
			if (self.bfinally) {
				output.space();
				self.bfinally.print(output);
			}
		});
		DEFPRINT(AST_Catch, function(self, output){
			output.print("catch");
			output.space();
			output.with_parens(function(){
				self.argname.print(output);
			});
			output.space();
			print_bracketed(self.body, output);
		});
		DEFPRINT(AST_Finally, function(self, output){
			output.print("finally");
			output.space();
			print_bracketed(self.body, output);
		});

		/* -----[ var/const ]----- */
		AST_Definitions.DEFMETHOD("_do_print", function(output, kind){
			output.print(kind);
			output.space();
			this.definitions.forEach(function(def, i){
				if (i) output.comma();
				def.print(output);
			});
			var p = output.parent();
			var in_for = p instanceof AST_For || p instanceof AST_ForIn;
			var avoid_semicolon = in_for && p.init === this;
			if (!avoid_semicolon)
				output.semicolon();
		});
		DEFPRINT(AST_Var, function(self, output){
			self._do_print(output, "var");
		});
		DEFPRINT(AST_Const, function(self, output){
			self._do_print(output, "const");
		});

		function parenthesize_for_noin(node, output, noin) {
			if (!noin) node.print(output);
			else try {
				// need to take some precautions here:
				//    https://github.com/mishoo/UglifyJS2/issues/60
				node.walk(new TreeWalker(function(node){
					if (node instanceof AST_Binary && node.operator == "in")
						throw output;
				}));
				node.print(output);
			} catch(ex) {
				if (ex !== output) throw ex;
				node.print(output, true);
			}
		};

		DEFPRINT(AST_VarDef, function(self, output){
			self.name.print(output);
			if (self.value) {
				output.space();
				output.print("=");
				output.space();
				var p = output.parent(1);
				var noin = p instanceof AST_For || p instanceof AST_ForIn;
				parenthesize_for_noin(self.value, output, noin);
			}
		});

		/* -----[ other expressions ]----- */
		DEFPRINT(AST_Call, function(self, output){
			self.expression.print(output);
			if (self instanceof AST_New && !need_constructor_parens(self, output))
				return;
			output.with_parens(function(){
				self.args.forEach(function(expr, i){
					if (i) output.comma();
					expr.print(output);
				});
			});
		});
		DEFPRINT(AST_New, function(self, output){
			output.print("new");
			output.space();
			AST_Call.prototype._codegen(self, output);
		});

		AST_Seq.DEFMETHOD("_do_print", function(output){
			this.car.print(output);
			if (this.cdr) {
				output.comma();
				if (output.should_break()) {
					output.newline();
					output.indent();
				}
				this.cdr.print(output);
			}
		});
		DEFPRINT(AST_Seq, function(self, output){
			self._do_print(output);
			// var p = output.parent();
			// if (p instanceof AST_Statement) {
			//     output.with_indent(output.next_indent(), function(){
			//         self._do_print(output);
			//     });
			// } else {
			//     self._do_print(output);
			// }
		});
		DEFPRINT(AST_Dot, function(self, output){
			var expr = self.expression;
			expr.print(output);
			if (expr instanceof AST_Number && expr.getValue() >= 0) {
				if (!/[xa-f.)]/i.test(output.last())) {
					output.print(".");
				}
			}
			output.print(".");
			// the name after dot would be mapped about here.
			output.add_mapping(self.end);
			output.print_name(self.property);
		});
		DEFPRINT(AST_Sub, function(self, output){
			self.expression.print(output);
			output.print("[");
			self.property.print(output);
			output.print("]");
		});
		DEFPRINT(AST_UnaryPrefix, function(self, output){
			var op = self.operator;
			output.print(op);
			if (/^[a-z]/i.test(op)
				|| (/[+-]$/.test(op)
					&& self.expression instanceof AST_UnaryPrefix
					&& /^[+-]/.test(self.expression.operator))) {
				output.space();
			}
			self.expression.print(output);
		});
		DEFPRINT(AST_UnaryPostfix, function(self, output){
			self.expression.print(output);
			output.print(self.operator);
		});
		DEFPRINT(AST_Binary, function(self, output){
			var op = self.operator;
			self.left.print(output);
			if (op[0] == ">" /* ">>" ">>>" ">" ">=" */
				&& self.left instanceof AST_UnaryPostfix
				&& self.left.operator == "--") {
				// space is mandatory to avoid outputting -->
				output.print(" ");
			} else {
				// the space is optional depending on "beautify"
				output.space();
			}
			output.print(op);
			if ((op == "<" || op == "<<")
				&& self.right instanceof AST_UnaryPrefix
				&& self.right.operator == "!"
				&& self.right.expression instanceof AST_UnaryPrefix
				&& self.right.expression.operator == "--") {
				// space is mandatory to avoid outputting <!--
				output.print(" ");
			} else {
				// the space is optional depending on "beautify"
				output.space();
			}
			self.right.print(output);
		});
		DEFPRINT(AST_Conditional, function(self, output){
			self.condition.print(output);
			output.space();
			output.print("?");
			output.space();
			self.consequent.print(output);
			output.space();
			output.colon();
			self.alternative.print(output);
		});

		/* -----[ literals ]----- */
		DEFPRINT(AST_Array, function(self, output){
			output.with_square(function(){
				var a = self.elements, len = a.length;
				if (len > 0) output.space();
				a.forEach(function(exp, i){
					if (i) output.comma();
					exp.print(output);
					// If the final element is a hole, we need to make sure it
					// doesn't look like a trailing comma, by inserting an actual
					// trailing comma.
					if (i === len - 1 && exp instanceof AST_Hole)
					  output.comma();
				});
				if (len > 0) output.space();
			});
		});
		DEFPRINT(AST_Object, function(self, output){
			if (self.properties.length > 0) output.with_block(function(){
				self.properties.forEach(function(prop, i){
					if (i) {
						output.print(",");
						output.newline();
					}
					output.indent();
					prop.print(output);
				});
				output.newline();
			});
			else output.print("{}");
		});

		function print_property_name(key, quote, output) {
			if (output.option("quote_keys")) {
				output.print_string(key + "");
			} else if ((typeof key == "number"
						|| !output.option("beautify")
						&& +key + "" == key)
					   && parseFloat(key) >= 0) {
				output.print(make_num(key));
			} else if (RESERVED_WORDS(key) ? output.option("screw_ie8") : is_identifier_string(key)) {
				if (quote && output.option("keep_quoted_props")) {
					output.print_string(key, quote);
				} else {
					output.print_name(key);
				}
			} else {
				output.print_string(key, quote);
			}
		}

		DEFPRINT(AST_ObjectKeyVal, function(self, output){
			print_property_name(self.key, self.quote, output);
			output.colon();
			self.value.print(output);
		});
		AST_ObjectProperty.DEFMETHOD("_print_getter_setter", function(type, output) {
			output.print(type);
			output.space();
			print_property_name(this.key.name, this.quote, output);
			this.value._do_print(output, true);
		});
		DEFPRINT(AST_ObjectSetter, function(self, output){
			self._print_getter_setter("set", output);
		});
		DEFPRINT(AST_ObjectGetter, function(self, output){
			self._print_getter_setter("get", output);
		});
		DEFPRINT(AST_Symbol, function(self, output){
			var def = self.definition();
			output.print_name(def ? def.mangled_name || def.name : self.name);
		});
		DEFPRINT(AST_Hole, noop);
		DEFPRINT(AST_This, function(self, output){
			output.print("this");
		});
		DEFPRINT(AST_Constant, function(self, output){
			output.print(self.getValue());
		});
		DEFPRINT(AST_String, function(self, output){
			output.print_string(self.getValue(), self.quote, in_directive);
		});
		DEFPRINT(AST_Number, function(self, output){
			if (use_asm && self.start && self.start.raw != null) {
				output.print(self.start.raw);
			} else {
				output.print(make_num(self.getValue()));
			}
		});

		function regexp_safe_literal(code) {
			return [
				0x5c   , // \
				0x2f   , // /
				0x2e   , // .
				0x2b   , // +
				0x2a   , // *
				0x3f   , // ?
				0x28   , // (
				0x29   , // )
				0x5b   , // [
				0x5d   , // ]
				0x7b   , // {
				0x7d   , // }
				0x24   , // $
				0x5e   , // ^
				0x3a   , // :
				0x7c   , // |
				0x21   , // !
				0x0a   , // \n
				0x0d   , // \r
				0x00   , // \0
				0xfeff , // Unicode BOM
				0x2028 , // unicode "line separator"
				0x2029 , // unicode "paragraph separator"
			].indexOf(code) < 0;
		};

		DEFPRINT(AST_RegExp, function(self, output){
			var str = self.getValue().toString();
			if (output.option("ascii_only")) {
				str = output.to_ascii(str);
			} else if (output.option("unescape_regexps")) {
				str = str.split("\\\\").map(function(str){
					return str.replace(/\\u[0-9a-fA-F]{4}|\\x[0-9a-fA-F]{2}/g, function(s){
						var code = parseInt(s.substr(2), 16);
						return regexp_safe_literal(code) ? String.fromCharCode(code) : s;
					});
				}).join("\\\\");
			}
			output.print(str);
			var p = output.parent();
			if (p instanceof AST_Binary && /^in/.test(p.operator) && p.left === self)
				output.print(" ");
		});

		function force_statement(stat, output) {
			if (output.option("bracketize")) {
				make_block(stat, output);
			} else {
				if (!stat || stat instanceof AST_EmptyStatement)
					output.force_semicolon();
				else
					stat.print(output);
			}
		};

		// self should be AST_New.  decide if we want to show parens or not.
		function need_constructor_parens(self, output) {
			// Always print parentheses with arguments
			if (self.args.length > 0) return true;

			return output.option("beautify");
		};

		function best_of(a) {
			var best = a[0], len = best.length;
			for (var i = 1; i < a.length; ++i) {
				if (a[i].length < len) {
					best = a[i];
					len = best.length;
				}
			}
			return best;
		};

		function make_num(num) {
			var str = num.toString(10), a = [ str.replace(/^0\./, ".").replace('e+', 'e') ], m;
			if (Math.floor(num) === num) {
				if (num >= 0) {
					a.push("0x" + num.toString(16).toLowerCase(), // probably pointless
						   "0" + num.toString(8)); // same.
				} else {
					a.push("-0x" + (-num).toString(16).toLowerCase(), // probably pointless
						   "-0" + (-num).toString(8)); // same.
				}
				if ((m = /^(.*?)(0+)$/.exec(num))) {
					a.push(m[1] + "e" + m[2].length);
				}
			} else if ((m = /^0?\.(0+)(.*)$/.exec(num))) {
				a.push(m[2] + "e-" + (m[1].length + m[2].length),
					   str.substr(str.indexOf(".")));
			}
			return best_of(a);
		};

		function make_block(stmt, output) {
			if (!stmt || stmt instanceof AST_EmptyStatement)
				output.print("{}");
			else if (stmt instanceof AST_BlockStatement)
				stmt.print(output);
			else output.with_block(function(){
				output.indent();
				stmt.print(output);
				output.newline();
			});
		};

		/* -----[ source map generators ]----- */

		function DEFMAP(nodetype, generator) {
			nodetype.DEFMETHOD("add_source_map", function(stream){
				generator(this, stream);
			});
		};

		// We could easily add info for ALL nodes, but it seems to me that
		// would be quite wasteful, hence this noop in the base class.
		DEFMAP(AST_Node, noop);

		function basic_sourcemap_gen(self, output) {
			output.add_mapping(self.start);
		};

		// XXX: I'm not exactly sure if we need it for all of these nodes,
		// or if we should add even more.

		DEFMAP(AST_Directive, basic_sourcemap_gen);
		DEFMAP(AST_Debugger, basic_sourcemap_gen);
		DEFMAP(AST_Symbol, basic_sourcemap_gen);
		DEFMAP(AST_Jump, basic_sourcemap_gen);
		DEFMAP(AST_StatementWithBody, basic_sourcemap_gen);
		DEFMAP(AST_LabeledStatement, noop); // since the label symbol will mark it
		DEFMAP(AST_Lambda, basic_sourcemap_gen);
		DEFMAP(AST_Switch, basic_sourcemap_gen);
		DEFMAP(AST_SwitchBranch, basic_sourcemap_gen);
		DEFMAP(AST_BlockStatement, basic_sourcemap_gen);
		DEFMAP(AST_Toplevel, noop);
		DEFMAP(AST_New, basic_sourcemap_gen);
		DEFMAP(AST_Try, basic_sourcemap_gen);
		DEFMAP(AST_Catch, basic_sourcemap_gen);
		DEFMAP(AST_Finally, basic_sourcemap_gen);
		DEFMAP(AST_Definitions, basic_sourcemap_gen);
		DEFMAP(AST_Constant, basic_sourcemap_gen);
		DEFMAP(AST_ObjectSetter, function(self, output){
			output.add_mapping(self.start, self.key.name);
		});
		DEFMAP(AST_ObjectGetter, function(self, output){
			output.add_mapping(self.start, self.key.name);
		});
		DEFMAP(AST_ObjectProperty, function(self, output){
			output.add_mapping(self.start, self.key);
		});

	})();
	//#endregion
	
	//#region URL: /lib/compress
	//"use strict";

	function Compressor(options, false_by_default) {
		if (!(this instanceof Compressor))
			return new Compressor(options, false_by_default);
		TreeTransformer.call(this, this.before, this.after);
		this.options = defaults(options, {
			angular       : false,
			booleans      : !false_by_default,
			cascade       : !false_by_default,
			collapse_vars : !false_by_default,
			comparisons   : !false_by_default,
			conditionals  : !false_by_default,
			dead_code     : !false_by_default,
			drop_console  : false,
			drop_debugger : !false_by_default,
			evaluate      : !false_by_default,
			expression    : false,
			global_defs   : {},
			hoist_funs    : !false_by_default,
			hoist_vars    : false,
			if_return     : !false_by_default,
			join_vars     : !false_by_default,
			keep_fargs    : true,
			keep_fnames   : false,
			keep_infinity : false,
			loops         : !false_by_default,
			negate_iife   : !false_by_default,
			passes        : 1,
			properties    : !false_by_default,
			pure_getters  : !false_by_default && "strict",
			pure_funcs    : null,
			reduce_vars   : !false_by_default,
			screw_ie8     : true,
			sequences     : !false_by_default,
			side_effects  : !false_by_default,
			switches      : !false_by_default,
			top_retain    : null,
			toplevel      : !!(options && options["top_retain"]),
			unsafe        : false,
			unsafe_comps  : false,
			unsafe_math   : false,
			unsafe_proto  : false,
			unsafe_regexp : false,
			unused        : !false_by_default,
			warnings      : true
		}, true);
		var pure_funcs = this.options["pure_funcs"];
		if (typeof pure_funcs == "function") {
			this.pure_funcs = pure_funcs;
		} else {
			this.pure_funcs = pure_funcs ? function(node) {
				return pure_funcs.indexOf(node.expression.print_to_string()) < 0;
			} : return_true;
		}
		var top_retain = this.options["top_retain"];
		if (top_retain instanceof RegExp) {
			this.top_retain = function(def) {
				return top_retain.test(def.name);
			};
		} else if (typeof top_retain == "function") {
			this.top_retain = top_retain;
		} else if (top_retain) {
			if (typeof top_retain == "string") {
				top_retain = top_retain.split(/,/);
			}
			this.top_retain = function(def) {
				return top_retain.indexOf(def.name) >= 0;
			};
		}
		var sequences = this.options["sequences"];
		this.sequences_limit = sequences == 1 ? 200 : sequences | 0;
		this.warnings_produced = {};
	};

	Compressor.prototype = new TreeTransformer;
	merge(Compressor.prototype, {
		option: function(key) { return this.options[key] },
		compress: function(node) {
			if (this.option("expression")) {
				node = node.process_expression(true);
			}
			var passes = +this.options.passes || 1;
			for (var pass = 0; pass < passes && pass < 3; ++pass) {
				if (pass > 0 || this.option("reduce_vars"))
					node.reset_opt_flags(this, true);
				node = node.transform(this);
			}
			if (this.option("expression")) {
				node = node.process_expression(false);
			}
			return node;
		},
		info: function() {
			if (this.options.warnings == "verbose") {
				AST_Node.warn.apply(AST_Node, arguments);
			}
		},
		warn: function(text, props) {
			if (this.options.warnings) {
				// only emit unique warnings
				var message = string_template(text, props);
				if (!(message in this.warnings_produced)) {
					this.warnings_produced[message] = true;
					AST_Node.warn.apply(AST_Node, arguments);
				}
			}
		},
		clear_warnings: function() {
			this.warnings_produced = {};
		},
		before: function(node, descend, in_list) {
			if (node._squeezed) return node;
			var was_scope = false;
			if (node instanceof AST_Scope) {
				node = node.hoist_declarations(this);
				was_scope = true;
			}
			// Before https://github.com/mishoo/UglifyJS2/pull/1602 AST_Node.optimize()
			// would call AST_Node.transform() if a different instance of AST_Node is
			// produced after OPT().
			// This corrupts TreeWalker.stack, which cause AST look-ups to malfunction.
			// Migrate and defer all children's AST_Node.transform() to below, which
			// will now happen after this parent AST_Node has been properly substituted
			// thus gives a consistent AST snapshot.
			descend(node, this);
			// Existing code relies on how AST_Node.optimize() worked, and omitting the
			// following replacement call would result in degraded efficiency of both
			// output and performance.
			descend(node, this);
			var opt = node.optimize(this);
			if (was_scope && opt instanceof AST_Scope) {
				opt.drop_unused(this);
				descend(opt, this);
			}
			if (opt === node) opt._squeezed = true;
			return opt;
		}
	});

	(function(){

		function OPT(node, optimizer) {
			node.DEFMETHOD("optimize", function(compressor){
				var self = this;
				if (self._optimized) return self;
				if (compressor.has_directive("use asm")) return self;
				var opt = optimizer(self, compressor);
				opt._optimized = true;
				return opt;
			});
		};

		OPT(AST_Node, function(self, compressor){
			return self;
		});

		AST_Node.DEFMETHOD("equivalent_to", function(node){
			return this.TYPE == node.TYPE && this.print_to_string() == node.print_to_string();
		});

		AST_Node.DEFMETHOD("process_expression", function(insert, compressor) {
			var self = this;
			var tt = new TreeTransformer(function(node) {
				if (insert && node instanceof AST_SimpleStatement) {
					return make_node(AST_Return, node, {
						value: node.body
					});
				}
				if (!insert && node instanceof AST_Return) {
					if (compressor) {
						var value = node.value && node.value.drop_side_effect_free(compressor, true);
						return value ? make_node(AST_SimpleStatement, node, {
							body: value
						}) : make_node(AST_EmptyStatement, node);
					}
					return make_node(AST_SimpleStatement, node, {
						body: node.value || make_node(AST_UnaryPrefix, node, {
							operator: "void",
							expression: make_node(AST_Number, node, {
								value: 0
							})
						})
					});
				}
				if (node instanceof AST_Lambda && node !== self) {
					return node;
				}
				if (node instanceof AST_Block) {
					var index = node.body.length - 1;
					if (index >= 0) {
						node.body[index] = node.body[index].transform(tt);
					}
				}
				if (node instanceof AST_If) {
					node.body = node.body.transform(tt);
					if (node.alternative) {
						node.alternative = node.alternative.transform(tt);
					}
				}
				if (node instanceof AST_With) {
					node.body = node.body.transform(tt);
				}
				return node;
			});
			return self.transform(tt);
		});

		AST_Node.DEFMETHOD("reset_opt_flags", function(compressor, rescan){
			var reduce_vars = rescan && compressor.option("reduce_vars");
			var toplevel = compressor.option("toplevel");
			var safe_ids = Object.create(null);
			var suppressor = new TreeWalker(function(node) {
				if (node instanceof AST_Symbol) {
					var d = node.definition();
					if (node instanceof AST_SymbolRef) d.references.push(node);
					d.fixed = false;
				}
			});
			var tw = new TreeWalker(function(node, descend){
				node._squeezed = false;
				node._optimized = false;
				if (reduce_vars) {
					if (node instanceof AST_Toplevel) node.globals.each(reset_def);
					if (node instanceof AST_Scope) node.variables.each(reset_def);
					if (node instanceof AST_SymbolRef) {
						var d = node.definition();
						d.references.push(node);
						if (d.fixed === undefined || !is_safe(d)
							|| is_modified(node, 0, node.fixed_value() instanceof AST_Lambda)) {
							d.fixed = false;
						} else {
							var parent = tw.parent();
							if (parent instanceof AST_Assign && parent.operator == "=" && node === parent.right
								|| parent instanceof AST_Call && node !== parent.expression
								|| parent instanceof AST_Return && node === parent.value && node.scope !== d.scope
								|| parent instanceof AST_VarDef && node === parent.value) {
								d.escaped = true;
							}
						}
					}
					if (node instanceof AST_SymbolCatch) {
						node.definition().fixed = false;
					}
					if (node instanceof AST_VarDef) {
						var d = node.name.definition();
						if (d.fixed == null) {
							if (node.value) {
								d.fixed = function() {
									return node.value;
								};
								mark(d, false);
								descend();
							} else {
								d.fixed = null;
							}
							mark(d, true);
							return true;
						} else if (node.value) {
							d.fixed = false;
						}
					}
					if (node instanceof AST_Defun) {
						var d = node.name.definition();
						if (!toplevel && d.global || is_safe(d)) {
							d.fixed = false;
						} else {
							d.fixed = node;
							mark(d, true);
						}
						var save_ids = safe_ids;
						safe_ids = Object.create(null);
						descend();
						safe_ids = save_ids;
						return true;
					}
					if (node instanceof AST_Function) {
						push();
						var iife;
						if (!node.name
							&& (iife = tw.parent()) instanceof AST_Call
							&& iife.expression === node) {
							// Virtually turn IIFE parameters into variable definitions:
							//   (function(a,b) {...})(c,d) => (function() {var a=c,b=d; ...})()
							// So existing transformation rules can work on them.
							node.argnames.forEach(function(arg, i) {
								var d = arg.definition();
								if (!node.uses_arguments && d.fixed === undefined) {
									d.fixed = function() {
										return iife.args[i] || make_node(AST_Undefined, iife);
									};
									mark(d, true);
								} else {
									d.fixed = false;
								}
							});
						}
						descend();
						pop();
						return true;
					}
					if (node instanceof AST_Accessor) {
						var save_ids = safe_ids;
						safe_ids = Object.create(null);
						descend();
						safe_ids = save_ids;
						return true;
					}
					if (node instanceof AST_Binary
						&& (node.operator == "&&" || node.operator == "||")) {
						node.left.walk(tw);
						push();
						node.right.walk(tw);
						pop();
						return true;
					}
					if (node instanceof AST_Conditional) {
						node.condition.walk(tw);
						push();
						node.consequent.walk(tw);
						pop();
						push();
						node.alternative.walk(tw);
						pop();
						return true;
					}
					if (node instanceof AST_If || node instanceof AST_DWLoop) {
						node.condition.walk(tw);
						push();
						node.body.walk(tw);
						pop();
						if (node.alternative) {
							push();
							node.alternative.walk(tw);
							pop();
						}
						return true;
					}
					if (node instanceof AST_LabeledStatement) {
						push();
						node.body.walk(tw);
						pop();
						return true;
					}
					if (node instanceof AST_For) {
						if (node.init) node.init.walk(tw);
						push();
						if (node.condition) node.condition.walk(tw);
						node.body.walk(tw);
						if (node.step) node.step.walk(tw);
						pop();
						return true;
					}
					if (node instanceof AST_ForIn) {
						node.init.walk(suppressor);
						node.object.walk(tw);
						push();
						node.body.walk(tw);
						pop();
						return true;
					}
					if (node instanceof AST_Try) {
						push();
						walk_body(node, tw);
						pop();
						if (node.bcatch) {
							push();
							node.bcatch.walk(tw);
							pop();
						}
						if (node.bfinally) node.bfinally.walk(tw);
						return true;
					}
					if (node instanceof AST_SwitchBranch) {
						push();
						descend();
						pop();
						return true;
					}
				}
			});
			this.walk(tw);

			function mark(def, safe) {
				safe_ids[def.id] = safe;
			}

			function is_safe(def) {
				if (safe_ids[def.id]) {
					if (def.fixed == null) {
						var orig = def.orig[0];
						if (orig instanceof AST_SymbolFunarg || orig.name == "arguments") return false;
						def.fixed = make_node(AST_Undefined, orig);
					}
					return true;
				}
			}

			function push() {
				safe_ids = Object.create(safe_ids);
			}

			function pop() {
				safe_ids = Object.getPrototypeOf(safe_ids);
			}

			function reset_def(def) {
				def.escaped = false;
				if (def.scope.uses_eval) {
					def.fixed = false;
				} else if (toplevel || !def.global || def.orig[0] instanceof AST_SymbolConst) {
					def.fixed = undefined;
				} else {
					def.fixed = false;
				}
				def.references = [];
				def.should_replace = undefined;
			}

			function is_modified(node, level, func) {
				var parent = tw.parent(level);
				if (is_lhs(node, parent)
					|| !func && parent instanceof AST_Call && parent.expression === node) {
					return true;
				} else if (parent instanceof AST_PropAccess && parent.expression === node) {
					return !func && is_modified(parent, level + 1);
				}
			}
		});

		AST_SymbolRef.DEFMETHOD("fixed_value", function() {
			var fixed = this.definition().fixed;
			if (!fixed || fixed instanceof AST_Node) return fixed;
			return fixed();
		});

		function is_reference_const(ref) {
			if (!(ref instanceof AST_SymbolRef)) return false;
			var orig = ref.definition().orig;
			for (var i = orig.length; --i >= 0;) {
				if (orig[i] instanceof AST_SymbolConst) return true;
			}
		}

		function find_variable(compressor, name) {
			var scope, i = 0;
			while (scope = compressor.parent(i++)) {
				if (scope instanceof AST_Scope) break;
				if (scope instanceof AST_Catch) {
					scope = scope.argname.definition().scope;
					break;
				}
			}
			return scope.find_variable(name);
		}

		function make_node(ctor, orig, props) {
			if (!props) props = {};
			if (orig) {
				if (!props.start) props.start = orig.start;
				if (!props.end) props.end = orig.end;
			}
			return new ctor(props);
		};

		function make_node_from_constant(val, orig) {
			switch (typeof val) {
			  case "string":
				return make_node(AST_String, orig, {
					value: val
				});
			  case "number":
				if (isNaN(val)) return make_node(AST_NaN, orig);
				if (isFinite(val)) {
					return 1 / val < 0 ? make_node(AST_UnaryPrefix, orig, {
						operator: "-",
						expression: make_node(AST_Number, orig, { value: -val })
					}) : make_node(AST_Number, orig, { value: val });
				}
				return val < 0 ? make_node(AST_UnaryPrefix, orig, {
					operator: "-",
					expression: make_node(AST_Infinity, orig)
				}) : make_node(AST_Infinity, orig);
			  case "boolean":
				return make_node(val ? AST_True : AST_False, orig);
			  case "undefined":
				return make_node(AST_Undefined, orig);
			  default:
				if (val === null) {
					return make_node(AST_Null, orig, { value: null });
				}
				if (val instanceof RegExp) {
					return make_node(AST_RegExp, orig, { value: val });
				}
				throw new Error(string_template("Can't handle constant of type: {type}", {
					type: typeof val
				}));
			}
		};

		// we shouldn't compress (1,func)(something) to
		// func(something) because that changes the meaning of
		// the func (becomes lexical instead of global).
		function maintain_this_binding(parent, orig, val) {
			if (parent instanceof AST_UnaryPrefix && parent.operator == "delete"
				|| parent instanceof AST_Call && parent.expression === orig
					&& (val instanceof AST_PropAccess || val instanceof AST_SymbolRef && val.name == "eval")) {
				return make_node(AST_Seq, orig, {
					car: make_node(AST_Number, orig, {
						value: 0
					}),
					cdr: val
				});
			}
			return val;
		}

		function as_statement_array(thing) {
			if (thing === null) return [];
			if (thing instanceof AST_BlockStatement) return thing.body;
			if (thing instanceof AST_EmptyStatement) return [];
			if (thing instanceof AST_Statement) return [ thing ];
			throw new Error("Can't convert thing to statement array");
		};

		function is_empty(thing) {
			if (thing === null) return true;
			if (thing instanceof AST_EmptyStatement) return true;
			if (thing instanceof AST_BlockStatement) return thing.body.length == 0;
			return false;
		};

		function loop_body(x) {
			if (x instanceof AST_Switch) return x;
			if (x instanceof AST_For || x instanceof AST_ForIn || x instanceof AST_DWLoop) {
				return (x.body instanceof AST_BlockStatement ? x.body : x);
			}
			return x;
		};

		function is_iife_call(node) {
			if (node instanceof AST_Call && !(node instanceof AST_New)) {
				return node.expression instanceof AST_Function || is_iife_call(node.expression);
			}
			return false;
		}

		function tighten_body(statements, compressor) {
			var CHANGED, max_iter = 10;
			do {
				CHANGED = false;
				if (compressor.option("angular")) {
					statements = process_for_angular(statements);
				}
				statements = eliminate_spurious_blocks(statements);
				if (compressor.option("dead_code")) {
					statements = eliminate_dead_code(statements, compressor);
				}
				if (compressor.option("if_return")) {
					statements = handle_if_return(statements, compressor);
				}
				if (compressor.sequences_limit > 0) {
					statements = sequencesize(statements, compressor);
				}
				if (compressor.option("join_vars")) {
					statements = join_consecutive_vars(statements, compressor);
				}
				if (compressor.option("collapse_vars")) {
					statements = collapse_single_use_vars(statements, compressor);
				}
			} while (CHANGED && max_iter-- > 0);

			return statements;

			function collapse_single_use_vars(statements, compressor) {
				// Iterate statements backwards looking for a statement with a var/const
				// declaration immediately preceding it. Grab the rightmost var definition
				// and if it has exactly one reference then attempt to replace its reference
				// in the statement with the var value and then erase the var definition.

				var self = compressor.self();
				var var_defs_removed = false;
				var toplevel = compressor.option("toplevel");
				for (var stat_index = statements.length; --stat_index >= 0;) {
					var stat = statements[stat_index];
					if (stat instanceof AST_Definitions) continue;

					// Process child blocks of statement if present.
					[stat, stat.body, stat.alternative, stat.bcatch, stat.bfinally].forEach(function(node) {
						node && node.body && collapse_single_use_vars(node.body, compressor);
					});

					// The variable definition must precede a statement.
					if (stat_index <= 0) break;
					var prev_stat_index = stat_index - 1;
					var prev_stat = statements[prev_stat_index];
					if (!(prev_stat instanceof AST_Definitions)) continue;
					var var_defs = prev_stat.definitions;
					if (var_defs == null) continue;

					var var_names_seen = {};
					var side_effects_encountered = false;
					var lvalues_encountered = false;
					var lvalues = {};

					// Scan variable definitions from right to left.
					for (var var_defs_index = var_defs.length; --var_defs_index >= 0;) {

						// Obtain var declaration and var name with basic sanity check.
						var var_decl = var_defs[var_defs_index];
						if (var_decl.value == null) break;
						var var_name = var_decl.name.name;
						if (!var_name || !var_name.length) break;

						// Bail if we've seen a var definition of same name before.
						if (var_name in var_names_seen) break;
						var_names_seen[var_name] = true;

						// Only interested in cases with just one reference to the variable.
						var def = self.find_variable && self.find_variable(var_name);
						if (!def || !def.references || def.references.length !== 1
							|| var_name == "arguments" || (!toplevel && def.global)) {
							side_effects_encountered = true;
							continue;
						}
						var ref = def.references[0];

						// Don't replace ref if eval() or with statement in scope.
						if (ref.scope.uses_eval || ref.scope.uses_with) break;

						// Constant single use vars can be replaced in any scope.
						if (var_decl.value.is_constant()) {
							var ctt = new TreeTransformer(function(node) {
								var parent = ctt.parent();
								if (parent instanceof AST_IterationStatement
									&& (parent.condition === node || parent.init === node)) {
									return node;
								}
								if (node === ref)
									return replace_var(node, parent, true);
							});
							stat.transform(ctt);
							continue;
						}

						// Restrict var replacement to constants if side effects encountered.
						if (side_effects_encountered |= lvalues_encountered) continue;

						var value_has_side_effects = var_decl.value.has_side_effects(compressor);
						// Non-constant single use vars can only be replaced in same scope.
						if (ref.scope !== self) {
							side_effects_encountered |= value_has_side_effects;
							continue;
						}

						// Detect lvalues in var value.
						var tw = new TreeWalker(function(node){
							if (node instanceof AST_SymbolRef && is_lvalue(node, tw.parent())) {
								lvalues[node.name] = lvalues_encountered = true;
							}
						});
						var_decl.value.walk(tw);

						// Replace the non-constant single use var in statement if side effect free.
						var unwind = false;
						var tt = new TreeTransformer(
							function preorder(node) {
								if (unwind) return node;
								var parent = tt.parent();
								if (node instanceof AST_Lambda
									|| node instanceof AST_Try
									|| node instanceof AST_With
									|| node instanceof AST_Case
									|| node instanceof AST_IterationStatement
									|| (parent instanceof AST_If          && node !== parent.condition)
									|| (parent instanceof AST_Conditional && node !== parent.condition)
									|| (node instanceof AST_SymbolRef
										&& value_has_side_effects
										&& !are_references_in_scope(node.definition(), self))
									|| (parent instanceof AST_Binary
										&& (parent.operator == "&&" || parent.operator == "||")
										&& node === parent.right)
									|| (parent instanceof AST_Switch && node !== parent.expression)) {
									return side_effects_encountered = unwind = true, node;
								}
								function are_references_in_scope(def, scope) {
									if (def.orig.length === 1
										&& def.orig[0] instanceof AST_SymbolDefun) return true;
									if (def.scope !== scope) return false;
									var refs = def.references;
									for (var i = 0, len = refs.length; i < len; i++) {
										if (refs[i].scope !== scope) return false;
									}
									return true;
								}
							},
							function postorder(node) {
								if (unwind) return node;
								if (node === ref)
									return unwind = true, replace_var(node, tt.parent(), false);
								if (side_effects_encountered |= node.has_side_effects(compressor))
									return unwind = true, node;
								if (lvalues_encountered && node instanceof AST_SymbolRef && node.name in lvalues) {
									side_effects_encountered = true;
									return unwind = true, node;
								}
							}
						);
						stat.transform(tt);
					}
				}

				// Remove extraneous empty statments in block after removing var definitions.
				// Leave at least one statement in `statements`.
				if (var_defs_removed) for (var i = statements.length; --i >= 0;) {
					if (statements.length > 1 && statements[i] instanceof AST_EmptyStatement)
						statements.splice(i, 1);
				}

				return statements;

				function is_lvalue(node, parent) {
					return node instanceof AST_SymbolRef && is_lhs(node, parent);
				}
				function replace_var(node, parent, is_constant) {
					if (is_lvalue(node, parent)) return node;

					// Remove var definition and return its value to the TreeTransformer to replace.
					var value = maintain_this_binding(parent, node, var_decl.value);
					var_decl.value = null;

					var_defs.splice(var_defs_index, 1);
					if (var_defs.length === 0) {
						statements[prev_stat_index] = make_node(AST_EmptyStatement, self);
						var_defs_removed = true;
					}
					// Further optimize statement after substitution.
					stat.reset_opt_flags(compressor);

					compressor.info("Collapsing " + (is_constant ? "constant" : "variable") +
						" " + var_name + " [{file}:{line},{col}]", node.start);
					CHANGED = true;
					return value;
				}
			}

			function process_for_angular(statements) {
				function has_inject(comment) {
					return /@ngInject/.test(comment.value);
				}
				function make_arguments_names_list(func) {
					return func.argnames.map(function(sym){
						return make_node(AST_String, sym, { value: sym.name });
					});
				}
				function make_array(orig, elements) {
					return make_node(AST_Array, orig, { elements: elements });
				}
				function make_injector(func, name) {
					return make_node(AST_SimpleStatement, func, {
						body: make_node(AST_Assign, func, {
							operator: "=",
							left: make_node(AST_Dot, name, {
								expression: make_node(AST_SymbolRef, name, name),
								property: "$inject"
							}),
							right: make_array(func, make_arguments_names_list(func))
						})
					});
				}
				function check_expression(body) {
					if (body && body.args) {
						// if this is a function call check all of arguments passed
						body.args.forEach(function(argument, index, array) {
							var comments = argument.start.comments_before;
							// if the argument is function preceded by @ngInject
							if (argument instanceof AST_Lambda && comments.length && has_inject(comments[0])) {
								// replace the function with an array of names of its parameters and function at the end
								array[index] = make_array(argument, make_arguments_names_list(argument).concat(argument));
							}
						});
						// if this is chained call check previous one recursively
						if (body.expression && body.expression.expression) {
							check_expression(body.expression.expression);
						}
					}
				}
				return statements.reduce(function(a, stat){
					a.push(stat);

					if (stat.body && stat.body.args) {
						check_expression(stat.body);
					} else {
						var token = stat.start;
						var comments = token.comments_before;
						if (comments && comments.length > 0) {
							var last = comments.pop();
							if (has_inject(last)) {
								// case 1: defun
								if (stat instanceof AST_Defun) {
									a.push(make_injector(stat, stat.name));
								}
								else if (stat instanceof AST_Definitions) {
									stat.definitions.forEach(function(def) {
										if (def.value && def.value instanceof AST_Lambda) {
											a.push(make_injector(def.value, def.name));
										}
									});
								}
								else {
									compressor.warn("Unknown statement marked with @ngInject [{file}:{line},{col}]", token);
								}
							}
						}
					}

					return a;
				}, []);
			}

			function eliminate_spurious_blocks(statements) {
				var seen_dirs = [];
				return statements.reduce(function(a, stat){
					if (stat instanceof AST_BlockStatement) {
						CHANGED = true;
						a.push.apply(a, eliminate_spurious_blocks(stat.body));
					} else if (stat instanceof AST_EmptyStatement) {
						CHANGED = true;
					} else if (stat instanceof AST_Directive) {
						if (seen_dirs.indexOf(stat.value) < 0) {
							a.push(stat);
							seen_dirs.push(stat.value);
						} else {
							CHANGED = true;
						}
					} else {
						a.push(stat);
					}
					return a;
				}, []);
			};

			function handle_if_return(statements, compressor) {
				var self = compressor.self();
				var multiple_if_returns = has_multiple_if_returns(statements);
				var in_lambda = self instanceof AST_Lambda;
				var ret = []; // Optimized statements, build from tail to front
				loop: for (var i = statements.length; --i >= 0;) {
					var stat = statements[i];
					switch (true) {
					  case (in_lambda && stat instanceof AST_Return && !stat.value && ret.length == 0):
						CHANGED = true;
						// note, ret.length is probably always zero
						// because we drop unreachable code before this
						// step.  nevertheless, it's good to check.
						continue loop;
					  case stat instanceof AST_If:
						if (stat.body instanceof AST_Return) {
							//---
							// pretty silly case, but:
							// if (foo()) return; return; ==> foo(); return;
							if (((in_lambda && ret.length == 0)
								 || (ret[0] instanceof AST_Return && !ret[0].value))
								&& !stat.body.value && !stat.alternative) {
								CHANGED = true;
								var cond = make_node(AST_SimpleStatement, stat.condition, {
									body: stat.condition
								});
								ret.unshift(cond);
								continue loop;
							}
							//---
							// if (foo()) return x; return y; ==> return foo() ? x : y;
							if (ret[0] instanceof AST_Return && stat.body.value && ret[0].value && !stat.alternative) {
								CHANGED = true;
								stat = stat.clone();
								stat.alternative = ret[0];
								ret[0] = stat.transform(compressor);
								continue loop;
							}
							//---
							// if (foo()) return x; [ return ; ] ==> return foo() ? x : undefined;
							if (multiple_if_returns && (ret.length == 0 || ret[0] instanceof AST_Return)
								&& stat.body.value && !stat.alternative && in_lambda) {
								CHANGED = true;
								stat = stat.clone();
								stat.alternative = ret[0] || make_node(AST_Return, stat, {
									value: null
								});
								ret[0] = stat.transform(compressor);
								continue loop;
							}
							//---
							// if (foo()) return; [ else x... ]; y... ==> if (!foo()) { x...; y... }
							if (!stat.body.value && in_lambda) {
								CHANGED = true;
								stat = stat.clone();
								stat.condition = stat.condition.negate(compressor);
								var body = as_statement_array(stat.alternative).concat(ret);
								var funs = extract_functions_from_statement_array(body);
								stat.body = make_node(AST_BlockStatement, stat, {
									body: body
								});
								stat.alternative = null;
								ret = funs.concat([ stat.transform(compressor) ]);
								continue loop;
							}

							//---
							// if (a) return b; if (c) return d; e; ==> return a ? b : c ? d : void e;
							//
							// if sequences is not enabled, this can lead to an endless loop (issue #866).
							// however, with sequences on this helps producing slightly better output for
							// the example code.
							if (compressor.option("sequences")
								&& i > 0 && statements[i - 1] instanceof AST_If && statements[i - 1].body instanceof AST_Return
								&& ret.length == 1 && in_lambda && ret[0] instanceof AST_SimpleStatement
								&& !stat.alternative) {
								CHANGED = true;
								ret.push(make_node(AST_Return, ret[0], {
									value: null
								}).transform(compressor));
								ret.unshift(stat);
								continue loop;
							}
						}

						var ab = aborts(stat.body);
						var lct = ab instanceof AST_LoopControl ? compressor.loopcontrol_target(ab) : null;
						if (ab && ((ab instanceof AST_Return && !ab.value && in_lambda)
								   || (ab instanceof AST_Continue && self === loop_body(lct))
								   || (ab instanceof AST_Break && lct instanceof AST_BlockStatement && self === lct))) {
							if (ab.label) {
								remove(ab.label.thedef.references, ab);
							}
							CHANGED = true;
							var body = as_statement_array(stat.body).slice(0, -1);
							stat = stat.clone();
							stat.condition = stat.condition.negate(compressor);
							stat.body = make_node(AST_BlockStatement, stat, {
								body: as_statement_array(stat.alternative).concat(ret)
							});
							stat.alternative = make_node(AST_BlockStatement, stat, {
								body: body
							});
							ret = [ stat.transform(compressor) ];
							continue loop;
						}

						var ab = aborts(stat.alternative);
						var lct = ab instanceof AST_LoopControl ? compressor.loopcontrol_target(ab) : null;
						if (ab && ((ab instanceof AST_Return && !ab.value && in_lambda)
								   || (ab instanceof AST_Continue && self === loop_body(lct))
								   || (ab instanceof AST_Break && lct instanceof AST_BlockStatement && self === lct))) {
							if (ab.label) {
								remove(ab.label.thedef.references, ab);
							}
							CHANGED = true;
							stat = stat.clone();
							stat.body = make_node(AST_BlockStatement, stat.body, {
								body: as_statement_array(stat.body).concat(ret)
							});
							stat.alternative = make_node(AST_BlockStatement, stat.alternative, {
								body: as_statement_array(stat.alternative).slice(0, -1)
							});
							ret = [ stat.transform(compressor) ];
							continue loop;
						}

						ret.unshift(stat);
						break;
					  default:
						ret.unshift(stat);
						break;
					}
				}
				return ret;

				function has_multiple_if_returns(statements) {
					var n = 0;
					for (var i = statements.length; --i >= 0;) {
						var stat = statements[i];
						if (stat instanceof AST_If && stat.body instanceof AST_Return) {
							if (++n > 1) return true;
						}
					}
					return false;
				}
			};

			function eliminate_dead_code(statements, compressor) {
				var has_quit = false;
				var orig = statements.length;
				var self = compressor.self();
				statements = statements.reduce(function(a, stat){
					if (has_quit) {
						extract_declarations_from_unreachable_code(compressor, stat, a);
					} else {
						if (stat instanceof AST_LoopControl) {
							var lct = compressor.loopcontrol_target(stat);
							if ((stat instanceof AST_Break
								 && !(lct instanceof AST_IterationStatement)
								 && loop_body(lct) === self) || (stat instanceof AST_Continue
																 && loop_body(lct) === self)) {
								if (stat.label) {
									remove(stat.label.thedef.references, stat);
								}
							} else {
								a.push(stat);
							}
						} else {
							a.push(stat);
						}
						if (aborts(stat)) has_quit = true;
					}
					return a;
				}, []);
				CHANGED = statements.length != orig;
				return statements;
			};

			function sequencesize(statements, compressor) {
				if (statements.length < 2) return statements;
				var seq = [], ret = [];
				function push_seq() {
					seq = AST_Seq.from_array(seq);
					if (seq) ret.push(make_node(AST_SimpleStatement, seq, {
						body: seq
					}));
					seq = [];
				};
				statements.forEach(function(stat){
					if (stat instanceof AST_SimpleStatement) {
						if (seqLength(seq) >= compressor.sequences_limit) push_seq();
						var body = stat.body;
						if (seq.length > 0) body = body.drop_side_effect_free(compressor);
						if (body) seq.push(body);
					} else {
						push_seq();
						ret.push(stat);
					}
				});
				push_seq();
				ret = sequencesize_2(ret, compressor);
				CHANGED = ret.length != statements.length;
				return ret;
			};

			function seqLength(a) {
				for (var len = 0, i = 0; i < a.length; ++i) {
					var stat = a[i];
					if (stat instanceof AST_Seq) {
						len += stat.len();
					} else {
						len++;
					}
				}
				return len;
			};

			function sequencesize_2(statements, compressor) {
				function cons_seq(right) {
					ret.pop();
					var left = prev.body;
					if (left instanceof AST_Seq) {
						left.add(right);
					} else {
						left = AST_Seq.cons(left, right);
					}
					return left.transform(compressor);
				};
				var ret = [], prev = null;
				statements.forEach(function(stat){
					if (prev) {
						if (stat instanceof AST_For) {
							var opera = {};
							try {
								prev.body.walk(new TreeWalker(function(node){
									if (node instanceof AST_Binary && node.operator == "in")
										throw opera;
								}));
								if (stat.init && !(stat.init instanceof AST_Definitions)) {
									stat.init = cons_seq(stat.init);
								}
								else if (!stat.init) {
									stat.init = prev.body.drop_side_effect_free(compressor);
									ret.pop();
								}
							} catch(ex) {
								if (ex !== opera) throw ex;
							}
						}
						else if (stat instanceof AST_If) {
							stat.condition = cons_seq(stat.condition);
						}
						else if (stat instanceof AST_With) {
							stat.expression = cons_seq(stat.expression);
						}
						else if (stat instanceof AST_Exit && stat.value) {
							stat.value = cons_seq(stat.value);
						}
						else if (stat instanceof AST_Exit) {
							stat.value = cons_seq(make_node(AST_Undefined, stat).transform(compressor));
						}
						else if (stat instanceof AST_Switch) {
							stat.expression = cons_seq(stat.expression);
						}
					}
					ret.push(stat);
					prev = stat instanceof AST_SimpleStatement ? stat : null;
				});
				return ret;
			};

			function join_consecutive_vars(statements, compressor) {
				var prev = null;
				return statements.reduce(function(a, stat){
					if (stat instanceof AST_Definitions && prev && prev.TYPE == stat.TYPE) {
						prev.definitions = prev.definitions.concat(stat.definitions);
						CHANGED = true;
					}
					else if (stat instanceof AST_For
							 && prev instanceof AST_Var
							 && (!stat.init || stat.init.TYPE == prev.TYPE)) {
						CHANGED = true;
						a.pop();
						if (stat.init) {
							stat.init.definitions = prev.definitions.concat(stat.init.definitions);
						} else {
							stat.init = prev;
						}
						a.push(stat);
						prev = stat;
					}
					else {
						prev = stat;
						a.push(stat);
					}
					return a;
				}, []);
			};

		};

		function extract_functions_from_statement_array(statements) {
			var funs = [];
			for (var i = statements.length - 1; i >= 0; --i) {
				var stat = statements[i];
				if (stat instanceof AST_Defun) {
					statements.splice(i, 1);
					funs.unshift(stat);
				}
			}
			return funs;
		}

		function extract_declarations_from_unreachable_code(compressor, stat, target) {
			if (!(stat instanceof AST_Defun)) {
				compressor.warn("Dropping unreachable code [{file}:{line},{col}]", stat.start);
			}
			stat.walk(new TreeWalker(function(node){
				if (node instanceof AST_Definitions) {
					compressor.warn("Declarations in unreachable code! [{file}:{line},{col}]", node.start);
					node.remove_initializers();
					target.push(node);
					return true;
				}
				if (node instanceof AST_Defun) {
					target.push(node);
					return true;
				}
				if (node instanceof AST_Scope) {
					return true;
				}
			}));
		};

		function is_undefined(node, compressor) {
			return node.is_undefined
				|| node instanceof AST_Undefined
				|| node instanceof AST_UnaryPrefix
					&& node.operator == "void"
					&& !node.expression.has_side_effects(compressor);
		}

		// may_throw_on_access()
		// returns true if this node may be null, undefined or contain `AST_Accessor`
		(function(def) {
			AST_Node.DEFMETHOD("may_throw_on_access", function(compressor) {
				var pure_getters = compressor.option("pure_getters");
				return !pure_getters || this._throw_on_access(pure_getters);
			});

			function is_strict(pure_getters) {
				return /strict/.test(pure_getters);
			}

			def(AST_Node, is_strict);
			def(AST_Null, return_true);
			def(AST_Undefined, return_true);
			def(AST_Constant, return_false);
			def(AST_Array, return_false);
			def(AST_Object, function(pure_getters) {
				if (!is_strict(pure_getters)) return false;
				for (var i = this.properties.length; --i >=0;)
					if (this.properties[i].value instanceof AST_Accessor) return true;
				return false;
			});
			def(AST_Function, return_false);
			def(AST_UnaryPostfix, return_false);
			def(AST_UnaryPrefix, function() {
				return this.operator == "void";
			});
			def(AST_Binary, function(pure_getters) {
				switch (this.operator) {
				  case "&&":
					return this.left._throw_on_access(pure_getters);
				  case "||":
					return this.left._throw_on_access(pure_getters)
						&& this.right._throw_on_access(pure_getters);
				  default:
					return false;
				}
			})
			def(AST_Assign, function(pure_getters) {
				return this.operator == "="
					&& this.right._throw_on_access(pure_getters);
			})
			def(AST_Conditional, function(pure_getters) {
				return this.consequent._throw_on_access(pure_getters)
					|| this.alternative._throw_on_access(pure_getters);
			})
			def(AST_Seq, function(pure_getters) {
				return this.cdr._throw_on_access(pure_getters);
			});
			def(AST_SymbolRef, function(pure_getters) {
				if (this.is_undefined) return true;
				if (!is_strict(pure_getters)) return false;
				var fixed = this.fixed_value();
				return !fixed || fixed._throw_on_access(pure_getters);
			});
		})(function(node, func) {
			node.DEFMETHOD("_throw_on_access", func);
		});

		/* -----[ boolean/negation helpers ]----- */

		// methods to determine whether an expression has a boolean result type
		(function (def){
			var unary_bool = [ "!", "delete" ];
			var binary_bool = [ "in", "instanceof", "==", "!=", "===", "!==", "<", "<=", ">=", ">" ];
			def(AST_Node, return_false);
			def(AST_UnaryPrefix, function(){
				return member(this.operator, unary_bool);
			});
			def(AST_Binary, function(){
				return member(this.operator, binary_bool) ||
					( (this.operator == "&&" || this.operator == "||") &&
					  this.left.is_boolean() && this.right.is_boolean() );
			});
			def(AST_Conditional, function(){
				return this.consequent.is_boolean() && this.alternative.is_boolean();
			});
			def(AST_Assign, function(){
				return this.operator == "=" && this.right.is_boolean();
			});
			def(AST_Seq, function(){
				return this.cdr.is_boolean();
			});
			def(AST_True, return_true);
			def(AST_False, return_true);
		})(function(node, func){
			node.DEFMETHOD("is_boolean", func);
		});

		// methods to determine if an expression has a numeric result type
		(function (def){
			def(AST_Node, return_false);
			def(AST_Number, return_true);
			var unary = makePredicate("+ - ~ ++ --");
			def(AST_Unary, function(){
				return unary(this.operator);
			});
			var binary = makePredicate("- * / % & | ^ << >> >>>");
			def(AST_Binary, function(compressor){
				return binary(this.operator) || this.operator == "+"
					&& this.left.is_number(compressor)
					&& this.right.is_number(compressor);
			});
			def(AST_Assign, function(compressor){
				return binary(this.operator.slice(0, -1))
					|| this.operator == "=" && this.right.is_number(compressor);
			});
			def(AST_Seq, function(compressor){
				return this.cdr.is_number(compressor);
			});
			def(AST_Conditional, function(compressor){
				return this.consequent.is_number(compressor) && this.alternative.is_number(compressor);
			});
		})(function(node, func){
			node.DEFMETHOD("is_number", func);
		});

		// methods to determine if an expression has a string result type
		(function (def){
			def(AST_Node, return_false);
			def(AST_String, return_true);
			def(AST_UnaryPrefix, function(){
				return this.operator == "typeof";
			});
			def(AST_Binary, function(compressor){
				return this.operator == "+" &&
					(this.left.is_string(compressor) || this.right.is_string(compressor));
			});
			def(AST_Assign, function(compressor){
				return (this.operator == "=" || this.operator == "+=") && this.right.is_string(compressor);
			});
			def(AST_Seq, function(compressor){
				return this.cdr.is_string(compressor);
			});
			def(AST_Conditional, function(compressor){
				return this.consequent.is_string(compressor) && this.alternative.is_string(compressor);
			});
		})(function(node, func){
			node.DEFMETHOD("is_string", func);
		});

		var unary_side_effects = makePredicate("delete ++ --");

		function is_lhs(node, parent) {
			if (parent instanceof AST_Unary && unary_side_effects(parent.operator)) return parent.expression;
			if (parent instanceof AST_Assign && parent.left === node) return node;
		}

		(function (def){
			AST_Node.DEFMETHOD("resolve_defines", function(compressor) {
				if (!compressor.option("global_defs")) return;
				var def = this._find_defs(compressor, "");
				if (def) {
					var node, parent = this, level = 0;
					do {
						node = parent;
						parent = compressor.parent(level++);
					} while (parent instanceof AST_PropAccess && parent.expression === node);
					if (is_lhs(node, parent)) {
						compressor.warn('global_defs ' + this.print_to_string() + ' redefined [{file}:{line},{col}]', this.start);
					} else {
						return def;
					}
				}
			});
			function to_node(value, orig) {
				if (value instanceof AST_Node) return make_node(value.CTOR, orig, value);
				if (Array.isArray(value)) return make_node(AST_Array, orig, {
					elements: value.map(function(value) {
						return to_node(value, orig);
					})
				});
				if (value && typeof value == "object") {
					var props = [];
					for (var key in value) {
						props.push(make_node(AST_ObjectKeyVal, orig, {
							key: key,
							value: to_node(value[key], orig)
						}));
					}
					return make_node(AST_Object, orig, {
						properties: props
					});
				}
				return make_node_from_constant(value, orig);
			}
			def(AST_Node, noop);
			def(AST_Dot, function(compressor, suffix){
				return this.expression._find_defs(compressor, "." + this.property + suffix);
			});
			def(AST_SymbolRef, function(compressor, suffix){
				if (!this.global()) return;
				var name;
				var defines = compressor.option("global_defs");
				if (defines && HOP(defines, (name = this.name + suffix))) {
					var node = to_node(defines[name], this);
					var top = compressor.find_parent(AST_Toplevel);
					node.walk(new TreeWalker(function(node) {
						if (node instanceof AST_SymbolRef) {
							node.scope = top;
							node.thedef = top.def_global(node);
						}
					}));
					return node;
				}
			});
		})(function(node, func){
			node.DEFMETHOD("_find_defs", func);
		});

		function best_of_expression(ast1, ast2) {
			return ast1.print_to_string().length >
				ast2.print_to_string().length
				? ast2 : ast1;
		}

		function best_of_statement(ast1, ast2) {
			return best_of_expression(make_node(AST_SimpleStatement, ast1, {
				body: ast1
			}), make_node(AST_SimpleStatement, ast2, {
				body: ast2
			})).body;
		}

		function best_of(compressor, ast1, ast2) {
			return (first_in_statement(compressor) ? best_of_statement : best_of_expression)(ast1, ast2);
		}

		// methods to evaluate a constant expression
		(function (def){
			// If the node has been successfully reduced to a constant,
			// then its value is returned; otherwise the element itself
			// is returned.
			// They can be distinguished as constant value is never a
			// descendant of AST_Node.
			AST_Node.DEFMETHOD("evaluate", function(compressor){
				if (!compressor.option("evaluate")) return this;
				try {
					var val = this._eval(compressor);
					return !val || val instanceof RegExp || typeof val != "object" ? val : this;
				} catch(ex) {
					if (ex !== def) throw ex;
					return this;
				}
			});
			var unaryPrefix = makePredicate("! ~ - + void");
			AST_Node.DEFMETHOD("is_constant", function(){
				// Accomodate when compress option evaluate=false
				// as well as the common constant expressions !0 and -1
				if (this instanceof AST_Constant) {
					return !(this instanceof AST_RegExp);
				} else {
					return this instanceof AST_UnaryPrefix
						&& this.expression instanceof AST_Constant
						&& unaryPrefix(this.operator);
				}
			});
			// Obtain the constant value of an expression already known to be constant.
			// Result only valid iff this.is_constant() is true.
			AST_Node.DEFMETHOD("constant_value", function(compressor){
				// Accomodate when option evaluate=false.
				if (this instanceof AST_Constant && !(this instanceof AST_RegExp)) {
					return this.value;
				}
				// Accomodate the common constant expressions !0 and -1 when option evaluate=false.
				if (this instanceof AST_UnaryPrefix
					&& this.expression instanceof AST_Constant) switch (this.operator) {
				  case "!":
					return !this.expression.value;
				  case "~":
					return ~this.expression.value;
				  case "-":
					return -this.expression.value;
				  case "+":
					return +this.expression.value;
				  default:
					throw new Error(string_template("Cannot evaluate unary expression {value}", {
						value: this.print_to_string()
					}));
				}
				var result = this.evaluate(compressor);
				if (result !== this) {
					return result;
				}
				throw new Error(string_template("Cannot evaluate constant [{file}:{line},{col}]", this.start));
			});
			def(AST_Statement, function(){
				throw new Error(string_template("Cannot evaluate a statement [{file}:{line},{col}]", this.start));
			});
			def(AST_Lambda, function(){
				throw def;
			});
			function ev(node, compressor) {
				if (!compressor) throw new Error("Compressor must be passed");

				return node._eval(compressor);
			};
			def(AST_Node, function(){
				throw def;          // not constant
			});
			def(AST_Constant, function(){
				return this.getValue();
			});
			def(AST_Array, function(compressor){
				if (compressor.option("unsafe")) {
					return this.elements.map(function(element) {
						return ev(element, compressor);
					});
				}
				throw def;
			});
			def(AST_Object, function(compressor){
				if (compressor.option("unsafe")) {
					var val = {};
					for (var i = 0, len = this.properties.length; i < len; i++) {
						var prop = this.properties[i];
						var key = prop.key;
						if (key instanceof AST_Symbol) {
							key = key.name;
						} else if (key instanceof AST_Node) {
							key = ev(key, compressor);
						}
						if (typeof Object.prototype[key] === 'function') {
							throw def;
						}
						val[key] = ev(prop.value, compressor);
					}
					return val;
				}
				throw def;
			});
			def(AST_UnaryPrefix, function(compressor){
				var e = this.expression;
				switch (this.operator) {
				  case "!": return !ev(e, compressor);
				  case "typeof":
					// Function would be evaluated to an array and so typeof would
					// incorrectly return 'object'. Hence making is a special case.
					if (e instanceof AST_Function) return typeof function(){};

					e = ev(e, compressor);

					// typeof <RegExp> returns "object" or "function" on different platforms
					// so cannot evaluate reliably
					if (e instanceof RegExp) throw def;

					return typeof e;
				  case "void": return void ev(e, compressor);
				  case "~": return ~ev(e, compressor);
				  case "-": return -ev(e, compressor);
				  case "+": return +ev(e, compressor);
				}
				throw def;
			});
			def(AST_Binary, function(c){
				var left = this.left, right = this.right, result;
				switch (this.operator) {
				  case "&&"  : result = ev(left, c) &&  ev(right, c); break;
				  case "||"  : result = ev(left, c) ||  ev(right, c); break;
				  case "|"   : result = ev(left, c) |   ev(right, c); break;
				  case "&"   : result = ev(left, c) &   ev(right, c); break;
				  case "^"   : result = ev(left, c) ^   ev(right, c); break;
				  case "+"   : result = ev(left, c) +   ev(right, c); break;
				  case "*"   : result = ev(left, c) *   ev(right, c); break;
				  case "/"   : result = ev(left, c) /   ev(right, c); break;
				  case "%"   : result = ev(left, c) %   ev(right, c); break;
				  case "-"   : result = ev(left, c) -   ev(right, c); break;
				  case "<<"  : result = ev(left, c) <<  ev(right, c); break;
				  case ">>"  : result = ev(left, c) >>  ev(right, c); break;
				  case ">>>" : result = ev(left, c) >>> ev(right, c); break;
				  case "=="  : result = ev(left, c) ==  ev(right, c); break;
				  case "===" : result = ev(left, c) === ev(right, c); break;
				  case "!="  : result = ev(left, c) !=  ev(right, c); break;
				  case "!==" : result = ev(left, c) !== ev(right, c); break;
				  case "<"   : result = ev(left, c) <   ev(right, c); break;
				  case "<="  : result = ev(left, c) <=  ev(right, c); break;
				  case ">"   : result = ev(left, c) >   ev(right, c); break;
				  case ">="  : result = ev(left, c) >=  ev(right, c); break;
				  default:
					  throw def;
				}
				if (isNaN(result) && c.find_parent(AST_With)) {
					// leave original expression as is
					throw def;
				}
				return result;
			});
			def(AST_Conditional, function(compressor){
				return ev(this.condition, compressor)
					? ev(this.consequent, compressor)
					: ev(this.alternative, compressor);
			});
			def(AST_SymbolRef, function(compressor){
				if (!compressor.option("reduce_vars") || this._evaluating) throw def;
				this._evaluating = true;
				try {
					var fixed = this.fixed_value();
					if (!fixed) throw def;
					var value = ev(fixed, compressor);
					if (!HOP(fixed, "_eval")) fixed._eval = function() {
						return value;
					};
					if (value && typeof value == "object" && this.definition().escaped) throw def;
					return value;
				} finally {
					this._evaluating = false;
				}
			});
			def(AST_PropAccess, function(compressor){
				if (compressor.option("unsafe")) {
					var key = this.property;
					if (key instanceof AST_Node) {
						key = ev(key, compressor);
					}
					var val = ev(this.expression, compressor);
					if (val && HOP(val, key)) {
						return val[key];
					}
				}
				throw def;
			});
		})(function(node, func){
			node.DEFMETHOD("_eval", func);
		});

		// method to negate an expression
		(function(def){
			function basic_negation(exp) {
				return make_node(AST_UnaryPrefix, exp, {
					operator: "!",
					expression: exp
				});
			}
			function best(orig, alt, first_in_statement) {
				var negated = basic_negation(orig);
				if (first_in_statement) {
					var stat = make_node(AST_SimpleStatement, alt, {
						body: alt
					});
					return best_of_expression(negated, stat) === stat ? alt : negated;
				}
				return best_of_expression(negated, alt);
			}
			def(AST_Node, function(){
				return basic_negation(this);
			});
			def(AST_Statement, function(){
				throw new Error("Cannot negate a statement");
			});
			def(AST_Function, function(){
				return basic_negation(this);
			});
			def(AST_UnaryPrefix, function(){
				if (this.operator == "!")
					return this.expression;
				return basic_negation(this);
			});
			def(AST_Seq, function(compressor){
				var self = this.clone();
				self.cdr = self.cdr.negate(compressor);
				return self;
			});
			def(AST_Conditional, function(compressor, first_in_statement){
				var self = this.clone();
				self.consequent = self.consequent.negate(compressor);
				self.alternative = self.alternative.negate(compressor);
				return best(this, self, first_in_statement);
			});
			def(AST_Binary, function(compressor, first_in_statement){
				var self = this.clone(), op = this.operator;
				if (compressor.option("unsafe_comps")) {
					switch (op) {
					  case "<=" : self.operator = ">"  ; return self;
					  case "<"  : self.operator = ">=" ; return self;
					  case ">=" : self.operator = "<"  ; return self;
					  case ">"  : self.operator = "<=" ; return self;
					}
				}
				switch (op) {
				  case "==" : self.operator = "!="; return self;
				  case "!=" : self.operator = "=="; return self;
				  case "===": self.operator = "!=="; return self;
				  case "!==": self.operator = "==="; return self;
				  case "&&":
					self.operator = "||";
					self.left = self.left.negate(compressor, first_in_statement);
					self.right = self.right.negate(compressor);
					return best(this, self, first_in_statement);
				  case "||":
					self.operator = "&&";
					self.left = self.left.negate(compressor, first_in_statement);
					self.right = self.right.negate(compressor);
					return best(this, self, first_in_statement);
				}
				return basic_negation(this);
			});
		})(function(node, func){
			node.DEFMETHOD("negate", function(compressor, first_in_statement){
				return func.call(this, compressor, first_in_statement);
			});
		});

		AST_Call.DEFMETHOD("has_pure_annotation", function(compressor) {
			if (!compressor.option("side_effects")) return false;
			if (this.pure !== undefined) return this.pure;
			var pure = false;
			var comments, last_comment;
			if (this.start
				&& (comments = this.start.comments_before)
				&& comments.length
				&& /[@#]__PURE__/.test((last_comment = comments[comments.length - 1]).value)) {
				pure = last_comment;
			}
			return this.pure = pure;
		});

		// determine if expression has side effects
		(function(def){
			def(AST_Node, return_true);

			def(AST_EmptyStatement, return_false);
			def(AST_Constant, return_false);
			def(AST_This, return_false);

			def(AST_Call, function(compressor){
				if (!this.has_pure_annotation(compressor) && compressor.pure_funcs(this)) return true;
				for (var i = this.args.length; --i >= 0;) {
					if (this.args[i].has_side_effects(compressor))
						return true;
				}
				return false;
			});

			function any(list, compressor) {
				for (var i = list.length; --i >= 0;)
					if (list[i].has_side_effects(compressor))
						return true;
				return false;
			}

			def(AST_Block, function(compressor){
				return any(this.body, compressor);
			});
			def(AST_Switch, function(compressor){
				return this.expression.has_side_effects(compressor)
					|| any(this.body, compressor);
			});
			def(AST_Case, function(compressor){
				return this.expression.has_side_effects(compressor)
					|| any(this.body, compressor);
			});
			def(AST_Try, function(compressor){
				return any(this.body, compressor)
					|| this.bcatch && this.bcatch.has_side_effects(compressor)
					|| this.bfinally && this.bfinally.has_side_effects(compressor);
			});
			def(AST_If, function(compressor){
				return this.condition.has_side_effects(compressor)
					|| this.body && this.body.has_side_effects(compressor)
					|| this.alternative && this.alternative.has_side_effects(compressor);
			});
			def(AST_LabeledStatement, function(compressor){
				return this.body.has_side_effects(compressor);
			});
			def(AST_SimpleStatement, function(compressor){
				return this.body.has_side_effects(compressor);
			});
			def(AST_Defun, return_true);
			def(AST_Function, return_false);
			def(AST_Binary, function(compressor){
				return this.left.has_side_effects(compressor)
					|| this.right.has_side_effects(compressor);
			});
			def(AST_Assign, return_true);
			def(AST_Conditional, function(compressor){
				return this.condition.has_side_effects(compressor)
					|| this.consequent.has_side_effects(compressor)
					|| this.alternative.has_side_effects(compressor);
			});
			def(AST_Unary, function(compressor){
				return unary_side_effects(this.operator)
					|| this.expression.has_side_effects(compressor);
			});
			def(AST_SymbolRef, function(compressor){
				return this.undeclared();
			});
			def(AST_Object, function(compressor){
				return any(this.properties, compressor);
			});
			def(AST_ObjectProperty, function(compressor){
				return this.value.has_side_effects(compressor);
			});
			def(AST_Array, function(compressor){
				return any(this.elements, compressor);
			});
			def(AST_Dot, function(compressor){
				return this.expression.may_throw_on_access(compressor)
					|| this.expression.has_side_effects(compressor);
			});
			def(AST_Sub, function(compressor){
				return this.expression.may_throw_on_access(compressor)
					|| this.expression.has_side_effects(compressor)
					|| this.property.has_side_effects(compressor);
			});
			def(AST_Seq, function(compressor){
				return this.car.has_side_effects(compressor)
					|| this.cdr.has_side_effects(compressor);
			});
		})(function(node, func){
			node.DEFMETHOD("has_side_effects", func);
		});

		// tell me if a statement aborts
		function aborts(thing) {
			return thing && thing.aborts();
		};
		(function(def){
			def(AST_Statement, return_null);
			def(AST_Jump, return_this);
			function block_aborts(){
				var n = this.body.length;
				return n > 0 && aborts(this.body[n - 1]);
			};
			def(AST_BlockStatement, block_aborts);
			def(AST_SwitchBranch, block_aborts);
			def(AST_If, function(){
				return this.alternative && aborts(this.body) && aborts(this.alternative) && this;
			});
		})(function(node, func){
			node.DEFMETHOD("aborts", func);
		});

		/* -----[ optimizers ]----- */

		OPT(AST_Directive, function(self, compressor){
			if (compressor.has_directive(self.value) !== self) {
				return make_node(AST_EmptyStatement, self);
			}
			return self;
		});

		OPT(AST_Debugger, function(self, compressor){
			if (compressor.option("drop_debugger"))
				return make_node(AST_EmptyStatement, self);
			return self;
		});

		OPT(AST_LabeledStatement, function(self, compressor){
			if (self.body instanceof AST_Break
				&& compressor.loopcontrol_target(self.body) === self.body) {
				return make_node(AST_EmptyStatement, self);
			}
			return self.label.references.length == 0 ? self.body : self;
		});

		OPT(AST_Block, function(self, compressor){
			self.body = tighten_body(self.body, compressor);
			return self;
		});

		OPT(AST_BlockStatement, function(self, compressor){
			self.body = tighten_body(self.body, compressor);
			switch (self.body.length) {
			  case 1: return self.body[0];
			  case 0: return make_node(AST_EmptyStatement, self);
			}
			return self;
		});

		AST_Scope.DEFMETHOD("drop_unused", function(compressor){
			var self = this;
			if (compressor.has_directive("use asm")) return self;
			var toplevel = compressor.option("toplevel");
			if (compressor.option("unused")
				&& (!(self instanceof AST_Toplevel) || toplevel)
				&& !self.uses_eval
				&& !self.uses_with) {
				var assign_as_unused = !/keep_assign/.test(compressor.option("unused"));
				var drop_funcs = /funcs/.test(toplevel);
				var drop_vars = /vars/.test(toplevel);
				if (!(self instanceof AST_Toplevel) || toplevel == true) {
					drop_funcs = drop_vars = true;
				}
				var in_use = [];
				var in_use_ids = Object.create(null); // avoid expensive linear scans of in_use
				if (self instanceof AST_Toplevel && compressor.top_retain) {
					self.variables.each(function(def) {
						if (compressor.top_retain(def) && !(def.id in in_use_ids)) {
							in_use_ids[def.id] = true;
							in_use.push(def);
						}
					});
				}
				var initializations = new Dictionary();
				// pass 1: find out which symbols are directly used in
				// this scope (not in nested scopes).
				var scope = this;
				var tw = new TreeWalker(function(node, descend){
					if (node !== self) {
						if (node instanceof AST_Defun) {
							if (!drop_funcs && scope === self) {
								var node_def = node.name.definition();
								if (!(node_def.id in in_use_ids)) {
									in_use_ids[node_def.id] = true;
									in_use.push(node_def);
								}
							}
							initializations.add(node.name.name, node);
							return true; // don't go in nested scopes
						}
						if (node instanceof AST_Definitions && scope === self) {
							node.definitions.forEach(function(def){
								if (!drop_vars) {
									var node_def = def.name.definition();
									if (!(node_def.id in in_use_ids)) {
										in_use_ids[node_def.id] = true;
										in_use.push(node_def);
									}
								}
								if (def.value) {
									initializations.add(def.name.name, def.value);
									if (def.value.has_side_effects(compressor)) {
										def.value.walk(tw);
									}
								}
							});
							return true;
						}
						if (assign_as_unused
							&& node instanceof AST_Assign
							&& node.operator == "="
							&& node.left instanceof AST_SymbolRef
							&& !is_reference_const(node.left)
							&& scope === self) {
							node.right.walk(tw);
							return true;
						}
						if (node instanceof AST_SymbolRef) {
							var node_def = node.definition();
							if (!(node_def.id in in_use_ids)) {
								in_use_ids[node_def.id] = true;
								in_use.push(node_def);
							}
							return true;
						}
						if (node instanceof AST_Scope) {
							var save_scope = scope;
							scope = node;
							descend();
							scope = save_scope;
							return true;
						}
					}
				});
				self.walk(tw);
				// pass 2: for every used symbol we need to walk its
				// initialization code to figure out if it uses other
				// symbols (that may not be in_use).
				for (var i = 0; i < in_use.length; ++i) {
					in_use[i].orig.forEach(function(decl){
						// undeclared globals will be instanceof AST_SymbolRef
						var init = initializations.get(decl.name);
						if (init) init.forEach(function(init){
							var tw = new TreeWalker(function(node){
								if (node instanceof AST_SymbolRef) {
									var node_def = node.definition();
									if (!(node_def.id in in_use_ids)) {
										in_use_ids[node_def.id] = true;
										in_use.push(node_def);
									}
								}
							});
							init.walk(tw);
						});
					});
				}
				// pass 3: we should drop declarations not in_use
				var tt = new TreeTransformer(
					function before(node, descend, in_list) {
						if (node instanceof AST_Function
							&& node.name
							&& !compressor.option("keep_fnames")) {
							var def = node.name.definition();
							// any declarations with same name will overshadow
							// name of this anonymous function and can therefore
							// never be used anywhere
							if (!(def.id in in_use_ids) || def.orig.length > 1)
								node.name = null;
						}
						if (node instanceof AST_Lambda && !(node instanceof AST_Accessor)) {
							var trim = !compressor.option("keep_fargs");
							for (var a = node.argnames, i = a.length; --i >= 0;) {
								var sym = a[i];
								if (!(sym.definition().id in in_use_ids)) {
									sym.__unused = true;
									if (trim) {
										a.pop();
										compressor[sym.unreferenced() ? "warn" : "info"]("Dropping unused function argument {name} [{file}:{line},{col}]", {
											name : sym.name,
											file : sym.start.file,
											line : sym.start.line,
											col  : sym.start.col
										});
									}
								}
								else {
									trim = false;
								}
							}
						}
						if (drop_funcs && node instanceof AST_Defun && node !== self) {
							if (!(node.name.definition().id in in_use_ids)) {
								compressor[node.name.unreferenced() ? "warn" : "info"]("Dropping unused function {name} [{file}:{line},{col}]", {
									name : node.name.name,
									file : node.name.start.file,
									line : node.name.start.line,
									col  : node.name.start.col
								});
								return make_node(AST_EmptyStatement, node);
							}
							return node;
						}
						if (drop_vars && node instanceof AST_Definitions && !(tt.parent() instanceof AST_ForIn && tt.parent().init === node)) {
							var def = node.definitions.filter(function(def){
								if (def.value) def.value = def.value.transform(tt);
								var sym = def.name.definition();
								if (sym.id in in_use_ids) return true;
								if (sym.orig[0] instanceof AST_SymbolCatch) {
									def.value = def.value && def.value.drop_side_effect_free(compressor);
									return true;
								}
								var w = {
									name : def.name.name,
									file : def.name.start.file,
									line : def.name.start.line,
									col  : def.name.start.col
								};
								if (def.value && (def._unused_side_effects = def.value.drop_side_effect_free(compressor))) {
									compressor.warn("Side effects in initialization of unused variable {name} [{file}:{line},{col}]", w);
									return true;
								}
								compressor[def.name.unreferenced() ? "warn" : "info"]("Dropping unused variable {name} [{file}:{line},{col}]", w);
								return false;
							});
							// place uninitialized names at the start
							def = mergeSort(def, function(a, b){
								if (!a.value && b.value) return -1;
								if (!b.value && a.value) return 1;
								return 0;
							});
							// for unused names whose initialization has
							// side effects, we can cascade the init. code
							// into the next one, or next statement.
							var side_effects = [];
							for (var i = 0; i < def.length;) {
								var x = def[i];
								if (x._unused_side_effects) {
									side_effects.push(x._unused_side_effects);
									def.splice(i, 1);
								} else {
									if (side_effects.length > 0) {
										side_effects.push(x.value);
										x.value = AST_Seq.from_array(side_effects);
										side_effects = [];
									}
									++i;
								}
							}
							if (side_effects.length > 0) {
								side_effects = make_node(AST_BlockStatement, node, {
									body: [ make_node(AST_SimpleStatement, node, {
										body: AST_Seq.from_array(side_effects)
									}) ]
								});
							} else {
								side_effects = null;
							}
							if (def.length == 0 && !side_effects) {
								return make_node(AST_EmptyStatement, node);
							}
							if (def.length == 0) {
								return in_list ? MAP.splice(side_effects.body) : side_effects;
							}
							node.definitions = def;
							if (side_effects) {
								side_effects.body.unshift(node);
								return in_list ? MAP.splice(side_effects.body) : side_effects;
							}
							return node;
						}
						if (drop_vars && assign_as_unused
							&& node instanceof AST_Assign
							&& node.operator == "="
							&& node.left instanceof AST_SymbolRef) {
							var def = node.left.definition();
							if (!(def.id in in_use_ids)
								&& self.variables.get(def.name) === def) {
								return maintain_this_binding(tt.parent(), node, node.right.transform(tt));
							}
						}
						// certain combination of unused name + side effect leads to:
						//    https://github.com/mishoo/UglifyJS2/issues/44
						//    https://github.com/mishoo/UglifyJS2/issues/1830
						// that's an invalid AST.
						// We fix it at this stage by moving the `var` outside the `for`.
						if (node instanceof AST_For) {
							descend(node, this);
							if (node.init instanceof AST_BlockStatement) {
								var block = node.init;
								node.init = block.body.pop();
								block.body.push(node);
								return in_list ? MAP.splice(block.body) : block;
							} else if (is_empty(node.init)) {
								node.init = null;
							}
							return node;
						}
						if (node instanceof AST_LabeledStatement && node.body instanceof AST_For) {
							descend(node, this);
							if (node.body instanceof AST_BlockStatement) {
								var block = node.body;
								node.body = block.body.pop();
								block.body.push(node);
								return in_list ? MAP.splice(block.body) : block;
							}
							return node;
						}
						if (node instanceof AST_Scope && node !== self)
							return node;
					}
				);
				self.transform(tt);
			}
		});

		AST_Scope.DEFMETHOD("hoist_declarations", function(compressor){
			var self = this;
			if (compressor.has_directive("use asm")) return self;
			var hoist_funs = compressor.option("hoist_funs");
			var hoist_vars = compressor.option("hoist_vars");
			if (hoist_funs || hoist_vars) {
				var dirs = [];
				var hoisted = [];
				var vars = new Dictionary(), vars_found = 0, var_decl = 0;
				// let's count var_decl first, we seem to waste a lot of
				// space if we hoist `var` when there's only one.
				self.walk(new TreeWalker(function(node){
					if (node instanceof AST_Scope && node !== self)
						return true;
					if (node instanceof AST_Var) {
						++var_decl;
						return true;
					}
				}));
				hoist_vars = hoist_vars && var_decl > 1;
				var tt = new TreeTransformer(
					function before(node) {
						if (node !== self) {
							if (node instanceof AST_Directive) {
								dirs.push(node);
								return make_node(AST_EmptyStatement, node);
							}
							if (node instanceof AST_Defun && hoist_funs) {
								hoisted.push(node);
								return make_node(AST_EmptyStatement, node);
							}
							if (node instanceof AST_Var && hoist_vars) {
								node.definitions.forEach(function(def){
									vars.set(def.name.name, def);
									++vars_found;
								});
								var seq = node.to_assignments(compressor);
								var p = tt.parent();
								if (p instanceof AST_ForIn && p.init === node) {
									if (seq == null) {
										var def = node.definitions[0].name;
										return make_node(AST_SymbolRef, def, def);
									}
									return seq;
								}
								if (p instanceof AST_For && p.init === node) {
									return seq;
								}
								if (!seq) return make_node(AST_EmptyStatement, node);
								return make_node(AST_SimpleStatement, node, {
									body: seq
								});
							}
							if (node instanceof AST_Scope)
								return node; // to avoid descending in nested scopes
						}
					}
				);
				self = self.transform(tt);
				if (vars_found > 0) {
					// collect only vars which don't show up in self's arguments list
					var defs = [];
					vars.each(function(def, name){
						if (self instanceof AST_Lambda
							&& find_if(function(x){ return x.name == def.name.name },
									   self.argnames)) {
							vars.del(name);
						} else {
							def = def.clone();
							def.value = null;
							defs.push(def);
							vars.set(name, def);
						}
					});
					if (defs.length > 0) {
						// try to merge in assignments
						for (var i = 0; i < self.body.length;) {
							if (self.body[i] instanceof AST_SimpleStatement) {
								var expr = self.body[i].body, sym, assign;
								if (expr instanceof AST_Assign
									&& expr.operator == "="
									&& (sym = expr.left) instanceof AST_Symbol
									&& vars.has(sym.name))
								{
									var def = vars.get(sym.name);
									if (def.value) break;
									def.value = expr.right;
									remove(defs, def);
									defs.push(def);
									self.body.splice(i, 1);
									continue;
								}
								if (expr instanceof AST_Seq
									&& (assign = expr.car) instanceof AST_Assign
									&& assign.operator == "="
									&& (sym = assign.left) instanceof AST_Symbol
									&& vars.has(sym.name))
								{
									var def = vars.get(sym.name);
									if (def.value) break;
									def.value = assign.right;
									remove(defs, def);
									defs.push(def);
									self.body[i].body = expr.cdr;
									continue;
								}
							}
							if (self.body[i] instanceof AST_EmptyStatement) {
								self.body.splice(i, 1);
								continue;
							}
							if (self.body[i] instanceof AST_BlockStatement) {
								var tmp = [ i, 1 ].concat(self.body[i].body);
								self.body.splice.apply(self.body, tmp);
								continue;
							}
							break;
						}
						defs = make_node(AST_Var, self, {
							definitions: defs
						});
						hoisted.push(defs);
					};
				}
				self.body = dirs.concat(hoisted, self.body);
			}
			return self;
		});

		// drop_side_effect_free()
		// remove side-effect-free parts which only affects return value
		(function(def){
			// Drop side-effect-free elements from an array of expressions.
			// Returns an array of expressions with side-effects or null
			// if all elements were dropped. Note: original array may be
			// returned if nothing changed.
			function trim(nodes, compressor, first_in_statement) {
				var ret = [], changed = false;
				for (var i = 0, len = nodes.length; i < len; i++) {
					var node = nodes[i].drop_side_effect_free(compressor, first_in_statement);
					changed |= node !== nodes[i];
					if (node) {
						ret.push(node);
						first_in_statement = false;
					}
				}
				return changed ? ret.length ? ret : null : nodes;
			}

			def(AST_Node, return_this);
			def(AST_Constant, return_null);
			def(AST_This, return_null);
			def(AST_Call, function(compressor, first_in_statement){
				if (!this.has_pure_annotation(compressor) && compressor.pure_funcs(this)) {
					if (this.expression instanceof AST_Function
						&& (!this.expression.name || !this.expression.name.definition().references.length)) {
						var node = this.clone();
						node.expression = node.expression.process_expression(false, compressor);
						return node;
					}
					return this;
				}
				if (this.pure) {
					compressor.warn("Dropping __PURE__ call [{file}:{line},{col}]", this.start);
					this.pure.value = this.pure.value.replace(/[@#]__PURE__/g, ' ');
				}
				var args = trim(this.args, compressor, first_in_statement);
				return args && AST_Seq.from_array(args);
			});
			def(AST_Accessor, return_null);
			def(AST_Function, return_null);
			def(AST_Binary, function(compressor, first_in_statement){
				var right = this.right.drop_side_effect_free(compressor);
				if (!right) return this.left.drop_side_effect_free(compressor, first_in_statement);
				switch (this.operator) {
				  case "&&":
				  case "||":
					if (right === this.right) return this;
					var node = this.clone();
					node.right = right;
					return node;
				  default:
					var left = this.left.drop_side_effect_free(compressor, first_in_statement);
					if (!left) return this.right.drop_side_effect_free(compressor, first_in_statement);
					return make_node(AST_Seq, this, {
						car: left,
						cdr: right
					});
				}
			});
			def(AST_Assign, return_this);
			def(AST_Conditional, function(compressor){
				var consequent = this.consequent.drop_side_effect_free(compressor);
				var alternative = this.alternative.drop_side_effect_free(compressor);
				if (consequent === this.consequent && alternative === this.alternative) return this;
				if (!consequent) return alternative ? make_node(AST_Binary, this, {
					operator: "||",
					left: this.condition,
					right: alternative
				}) : this.condition.drop_side_effect_free(compressor);
				if (!alternative) return make_node(AST_Binary, this, {
					operator: "&&",
					left: this.condition,
					right: consequent
				});
				var node = this.clone();
				node.consequent = consequent;
				node.alternative = alternative;
				return node;
			});
			def(AST_Unary, function(compressor, first_in_statement){
				if (unary_side_effects(this.operator)) return this;
				if (this.operator == "typeof" && this.expression instanceof AST_SymbolRef) return null;
				var expression = this.expression.drop_side_effect_free(compressor, first_in_statement);
				if (first_in_statement
					&& this instanceof AST_UnaryPrefix
					&& is_iife_call(expression)) {
					if (expression === this.expression && this.operator.length === 1) return this;
					return make_node(AST_UnaryPrefix, this, {
						operator: this.operator.length === 1 ? this.operator : "!",
						expression: expression
					});
				}
				return expression;
			});
			def(AST_SymbolRef, function() {
				return this.undeclared() ? this : null;
			});
			def(AST_Object, function(compressor, first_in_statement){
				var values = trim(this.properties, compressor, first_in_statement);
				return values && AST_Seq.from_array(values);
			});
			def(AST_ObjectProperty, function(compressor, first_in_statement){
				return this.value.drop_side_effect_free(compressor, first_in_statement);
			});
			def(AST_Array, function(compressor, first_in_statement){
				var values = trim(this.elements, compressor, first_in_statement);
				return values && AST_Seq.from_array(values);
			});
			def(AST_Dot, function(compressor, first_in_statement){
				if (this.expression.may_throw_on_access(compressor)) return this;
				return this.expression.drop_side_effect_free(compressor, first_in_statement);
			});
			def(AST_Sub, function(compressor, first_in_statement){
				if (this.expression.may_throw_on_access(compressor)) return this;
				var expression = this.expression.drop_side_effect_free(compressor, first_in_statement);
				if (!expression) return this.property.drop_side_effect_free(compressor, first_in_statement);
				var property = this.property.drop_side_effect_free(compressor);
				if (!property) return expression;
				return make_node(AST_Seq, this, {
					car: expression,
					cdr: property
				});
			});
			def(AST_Seq, function(compressor){
				var cdr = this.cdr.drop_side_effect_free(compressor);
				if (cdr === this.cdr) return this;
				if (!cdr) return this.car;
				return make_node(AST_Seq, this, {
					car: this.car,
					cdr: cdr
				});
			});
		})(function(node, func){
			node.DEFMETHOD("drop_side_effect_free", func);
		});

		OPT(AST_SimpleStatement, function(self, compressor){
			if (compressor.option("side_effects")) {
				var body = self.body;
				var node = body.drop_side_effect_free(compressor, true);
				if (!node) {
					compressor.warn("Dropping side-effect-free statement [{file}:{line},{col}]", self.start);
					return make_node(AST_EmptyStatement, self);
				}
				if (node !== body) {
					return make_node(AST_SimpleStatement, self, { body: node });
				}
			}
			return self;
		});

		OPT(AST_DWLoop, function(self, compressor){
			if (!compressor.option("loops")) return self;
			var cond = self.condition.evaluate(compressor);
			if (cond !== self.condition) {
				if (cond) {
					return make_node(AST_For, self, {
						body: self.body
					});
				}
				if (compressor.option("dead_code") && self instanceof AST_While) {
					var a = [];
					extract_declarations_from_unreachable_code(compressor, self.body, a);
					return make_node(AST_BlockStatement, self, { body: a }).optimize(compressor);
				}
				if (self instanceof AST_Do) {
					var has_loop_control = false;
					var tw = new TreeWalker(function(node) {
						if (node instanceof AST_Scope || has_loop_control) return true;
						if (node instanceof AST_LoopControl && tw.loopcontrol_target(node) === self)
							return has_loop_control = true;
					});
					var parent = compressor.parent();
					(parent instanceof AST_LabeledStatement ? parent : self).walk(tw);
					if (!has_loop_control) return self.body;
				}
			}
			if (self instanceof AST_While) {
				return make_node(AST_For, self, self).optimize(compressor);
			}
			return self;
		});

		function if_break_in_loop(self, compressor) {
			function drop_it(rest) {
				rest = as_statement_array(rest);
				if (self.body instanceof AST_BlockStatement) {
					self.body = self.body.clone();
					self.body.body = rest.concat(self.body.body.slice(1));
					self.body = self.body.transform(compressor);
				} else {
					self.body = make_node(AST_BlockStatement, self.body, {
						body: rest
					}).transform(compressor);
				}
				if_break_in_loop(self, compressor);
			}
			var first = self.body instanceof AST_BlockStatement ? self.body.body[0] : self.body;
			if (first instanceof AST_If) {
				if (first.body instanceof AST_Break
					&& compressor.loopcontrol_target(first.body) === compressor.self()) {
					if (self.condition) {
						self.condition = make_node(AST_Binary, self.condition, {
							left: self.condition,
							operator: "&&",
							right: first.condition.negate(compressor)
						});
					} else {
						self.condition = first.condition.negate(compressor);
					}
					drop_it(first.alternative);
				}
				else if (first.alternative instanceof AST_Break
						 && compressor.loopcontrol_target(first.alternative) === compressor.self()) {
					if (self.condition) {
						self.condition = make_node(AST_Binary, self.condition, {
							left: self.condition,
							operator: "&&",
							right: first.condition
						});
					} else {
						self.condition = first.condition;
					}
					drop_it(first.body);
				}
			}
		};

		OPT(AST_For, function(self, compressor){
			if (!compressor.option("loops")) return self;
			if (self.condition) {
				var cond = self.condition.evaluate(compressor);
				if (compressor.option("dead_code") && !cond) {
					var a = [];
					if (self.init instanceof AST_Statement) {
						a.push(self.init);
					}
					else if (self.init) {
						a.push(make_node(AST_SimpleStatement, self.init, {
							body: self.init
						}));
					}
					extract_declarations_from_unreachable_code(compressor, self.body, a);
					return make_node(AST_BlockStatement, self, { body: a }).optimize(compressor);
				}
				if (cond !== self.condition) {
					cond = make_node_from_constant(cond, self.condition).transform(compressor);
					self.condition = best_of_expression(cond, self.condition);
				}
			}
			if_break_in_loop(self, compressor);
			return self;
		});

		OPT(AST_If, function(self, compressor){
			if (is_empty(self.alternative)) self.alternative = null;

			if (!compressor.option("conditionals")) return self;
			// if condition can be statically determined, warn and drop
			// one of the blocks.  note, statically determined implies
			// “has no side effects”; also it doesn't work for cases like
			// `x && true`, though it probably should.
			var cond = self.condition.evaluate(compressor);
			if (cond !== self.condition) {
				if (cond) {
					compressor.warn("Condition always true [{file}:{line},{col}]", self.condition.start);
					if (compressor.option("dead_code")) {
						var a = [];
						if (self.alternative) {
							extract_declarations_from_unreachable_code(compressor, self.alternative, a);
						}
						a.push(self.body);
						return make_node(AST_BlockStatement, self, { body: a }).optimize(compressor);
					}
				} else {
					compressor.warn("Condition always false [{file}:{line},{col}]", self.condition.start);
					if (compressor.option("dead_code")) {
						var a = [];
						extract_declarations_from_unreachable_code(compressor, self.body, a);
						if (self.alternative) a.push(self.alternative);
						return make_node(AST_BlockStatement, self, { body: a }).optimize(compressor);
					}
				}
				cond = make_node_from_constant(cond, self.condition).transform(compressor);
				self.condition = best_of_expression(cond, self.condition);
			}
			var negated = self.condition.negate(compressor);
			var self_condition_length = self.condition.print_to_string().length;
			var negated_length = negated.print_to_string().length;
			var negated_is_best = negated_length < self_condition_length;
			if (self.alternative && negated_is_best) {
				negated_is_best = false; // because we already do the switch here.
				// no need to swap values of self_condition_length and negated_length
				// here because they are only used in an equality comparison later on.
				self.condition = negated;
				var tmp = self.body;
				self.body = self.alternative || make_node(AST_EmptyStatement, self);
				self.alternative = tmp;
			}
			if (is_empty(self.body) && is_empty(self.alternative)) {
				return make_node(AST_SimpleStatement, self.condition, {
					body: self.condition.clone()
				}).optimize(compressor);
			}
			if (self.body instanceof AST_SimpleStatement
				&& self.alternative instanceof AST_SimpleStatement) {
				return make_node(AST_SimpleStatement, self, {
					body: make_node(AST_Conditional, self, {
						condition   : self.condition,
						consequent  : self.body.body,
						alternative : self.alternative.body
					})
				}).optimize(compressor);
			}
			if (is_empty(self.alternative) && self.body instanceof AST_SimpleStatement) {
				if (self_condition_length === negated_length && !negated_is_best
					&& self.condition instanceof AST_Binary && self.condition.operator == "||") {
					// although the code length of self.condition and negated are the same,
					// negated does not require additional surrounding parentheses.
					// see https://github.com/mishoo/UglifyJS2/issues/979
					negated_is_best = true;
				}
				if (negated_is_best) return make_node(AST_SimpleStatement, self, {
					body: make_node(AST_Binary, self, {
						operator : "||",
						left     : negated,
						right    : self.body.body
					})
				}).optimize(compressor);
				return make_node(AST_SimpleStatement, self, {
					body: make_node(AST_Binary, self, {
						operator : "&&",
						left     : self.condition,
						right    : self.body.body
					})
				}).optimize(compressor);
			}
			if (self.body instanceof AST_EmptyStatement
				&& self.alternative instanceof AST_SimpleStatement) {
				return make_node(AST_SimpleStatement, self, {
					body: make_node(AST_Binary, self, {
						operator : "||",
						left     : self.condition,
						right    : self.alternative.body
					})
				}).optimize(compressor);
			}
			if (self.body instanceof AST_Exit
				&& self.alternative instanceof AST_Exit
				&& self.body.TYPE == self.alternative.TYPE) {
				return make_node(self.body.CTOR, self, {
					value: make_node(AST_Conditional, self, {
						condition   : self.condition,
						consequent  : self.body.value || make_node(AST_Undefined, self.body),
						alternative : self.alternative.value || make_node(AST_Undefined, self.alternative)
					}).transform(compressor)
				}).optimize(compressor);
			}
			if (self.body instanceof AST_If
				&& !self.body.alternative
				&& !self.alternative) {
				self = make_node(AST_If, self, {
					condition: make_node(AST_Binary, self.condition, {
						operator: "&&",
						left: self.condition,
						right: self.body.condition
					}),
					body: self.body.body,
					alternative: null
				});
			}
			if (aborts(self.body)) {
				if (self.alternative) {
					var alt = self.alternative;
					self.alternative = null;
					return make_node(AST_BlockStatement, self, {
						body: [ self, alt ]
					}).optimize(compressor);
				}
			}
			if (aborts(self.alternative)) {
				var body = self.body;
				self.body = self.alternative;
				self.condition = negated_is_best ? negated : self.condition.negate(compressor);
				self.alternative = null;
				return make_node(AST_BlockStatement, self, {
					body: [ self, body ]
				}).optimize(compressor);
			}
			return self;
		});

		OPT(AST_Switch, function(self, compressor){
			if (!compressor.option("switches")) return self;
			var branch;
			var value = self.expression.evaluate(compressor);
			if (value !== self.expression) {
				var expression = make_node_from_constant(value, self.expression).transform(compressor);
				self.expression = best_of_expression(expression, self.expression);
			}
			if (!compressor.option("dead_code")) return self;
			var decl = [];
			var body = [];
			var default_branch;
			var exact_match;
			for (var i = 0, len = self.body.length; i < len && !exact_match; i++) {
				branch = self.body[i];
				if (branch instanceof AST_Default) {
					if (!default_branch) {
						default_branch = branch;
					} else {
						eliminate_branch(branch, body[body.length - 1]);
					}
				} else if (value !== self.expression) {
					var exp = branch.expression.evaluate(compressor);
					if (exp === value) {
						exact_match = branch;
						if (default_branch) {
							var default_index = body.indexOf(default_branch);
							body.splice(default_index, 1);
							eliminate_branch(default_branch, body[default_index - 1]);
							default_branch = null;
						}
					} else if (exp !== branch.expression) {
						eliminate_branch(branch, body[body.length - 1]);
						continue;
					}
				}
				if (aborts(branch)) {
					var prev = body[body.length - 1];
					if (aborts(prev) && prev.body.length == branch.body.length
						&& make_node(AST_BlockStatement, prev, prev).equivalent_to(make_node(AST_BlockStatement, branch, branch))) {
						prev.body = [];
					}
				}
				body.push(branch);
			}
			while (i < len) eliminate_branch(self.body[i++], body[body.length - 1]);
			if (body.length > 0) {
				body[0].body = decl.concat(body[0].body);
			}
			self.body = body;
			while (branch = body[body.length - 1]) {
				var stat = branch.body[branch.body.length - 1];
				if (stat instanceof AST_Break && compressor.loopcontrol_target(stat) === self)
					branch.body.pop();
				if (branch.body.length || branch instanceof AST_Case
					&& (default_branch || branch.expression.has_side_effects(compressor))) break;
				if (body.pop() === default_branch) default_branch = null;
			}
			if (body.length == 0) {
				return make_node(AST_BlockStatement, self, {
					body: decl.concat(make_node(AST_SimpleStatement, self.expression, {
						body: self.expression
					}))
				}).optimize(compressor);
			}
			if (body.length == 1 && (body[0] === exact_match || body[0] === default_branch)) {
				var has_break = false;
				var tw = new TreeWalker(function(node) {
					if (has_break
						|| node instanceof AST_Lambda
						|| node instanceof AST_SimpleStatement) return true;
					if (node instanceof AST_Break && tw.loopcontrol_target(node) === self)
						has_break = true;
				});
				self.walk(tw);
				if (!has_break) {
					body = body[0].body.slice();
					body.unshift(make_node(AST_SimpleStatement, self.expression, {
						body: self.expression
					}));
					return make_node(AST_BlockStatement, self, {
						body: body
					}).optimize(compressor);
				}
			}
			return self;

			function eliminate_branch(branch, prev) {
				if (prev && !aborts(prev)) {
					prev.body = prev.body.concat(branch.body);
				} else {
					extract_declarations_from_unreachable_code(compressor, branch, decl);
				}
			}
		});

		OPT(AST_Try, function(self, compressor){
			self.body = tighten_body(self.body, compressor);
			if (self.bcatch && self.bfinally && all(self.bfinally.body, is_empty)) self.bfinally = null;
			if (all(self.body, is_empty)) {
				var body = [];
				if (self.bcatch) extract_declarations_from_unreachable_code(compressor, self.bcatch, body);
				if (self.bfinally) body = body.concat(self.bfinally.body);
				return make_node(AST_BlockStatement, self, {
					body: body
				}).optimize(compressor);
			}
			return self;
		});

		AST_Definitions.DEFMETHOD("remove_initializers", function(){
			this.definitions.forEach(function(def){ def.value = null });
		});

		AST_Definitions.DEFMETHOD("to_assignments", function(compressor){
			var reduce_vars = compressor.option("reduce_vars");
			var assignments = this.definitions.reduce(function(a, def){
				if (def.value) {
					var name = make_node(AST_SymbolRef, def.name, def.name);
					a.push(make_node(AST_Assign, def, {
						operator : "=",
						left     : name,
						right    : def.value
					}));
					if (reduce_vars) name.definition().fixed = false;
				}
				return a;
			}, []);
			if (assignments.length == 0) return null;
			return AST_Seq.from_array(assignments);
		});

		OPT(AST_Definitions, function(self, compressor){
			if (self.definitions.length == 0)
				return make_node(AST_EmptyStatement, self);
			return self;
		});

		OPT(AST_Call, function(self, compressor){
			var exp = self.expression;
			if (compressor.option("reduce_vars")
				&& exp instanceof AST_SymbolRef) {
				var def = exp.definition();
				var fixed = exp.fixed_value();
				if (fixed instanceof AST_Defun) {
					def.fixed = fixed = make_node(AST_Function, fixed, fixed).clone(true);
				}
				if (fixed instanceof AST_Function) {
					exp = fixed;
					if (compressor.option("unused")
						&& def.references.length == 1
						&& !(def.scope.uses_arguments
							&& def.orig[0] instanceof AST_SymbolFunarg)
						&& !def.scope.uses_eval
						&& compressor.find_parent(AST_Scope) === def.scope) {
						self.expression = exp;
					}
				}
			}
			if (compressor.option("unused")
				&& exp instanceof AST_Function
				&& !exp.uses_arguments
				&& !exp.uses_eval) {
				var pos = 0, last = 0;
				for (var i = 0, len = self.args.length; i < len; i++) {
					var trim = i >= exp.argnames.length;
					if (trim || exp.argnames[i].__unused) {
						var node = self.args[i].drop_side_effect_free(compressor);
						if (node) {
							self.args[pos++] = node;
						} else if (!trim) {
							self.args[pos++] = make_node(AST_Number, self.args[i], {
								value: 0
							});
							continue;
						}
					} else {
						self.args[pos++] = self.args[i];
					}
					last = pos;
				}
				self.args.length = last;
			}
			if (compressor.option("unsafe")) {
				if (exp instanceof AST_SymbolRef && exp.undeclared()) {
					switch (exp.name) {
					  case "Array":
						if (self.args.length != 1) {
							return make_node(AST_Array, self, {
								elements: self.args
							}).optimize(compressor);
						}
						break;
					  case "Object":
						if (self.args.length == 0) {
							return make_node(AST_Object, self, {
								properties: []
							});
						}
						break;
					  case "String":
						if (self.args.length == 0) return make_node(AST_String, self, {
							value: ""
						});
						if (self.args.length <= 1) return make_node(AST_Binary, self, {
							left: self.args[0],
							operator: "+",
							right: make_node(AST_String, self, { value: "" })
						}).optimize(compressor);
						break;
					  case "Number":
						if (self.args.length == 0) return make_node(AST_Number, self, {
							value: 0
						});
						if (self.args.length == 1) return make_node(AST_UnaryPrefix, self, {
							expression: self.args[0],
							operator: "+"
						}).optimize(compressor);
					  case "Boolean":
						if (self.args.length == 0) return make_node(AST_False, self);
						if (self.args.length == 1) return make_node(AST_UnaryPrefix, self, {
							expression: make_node(AST_UnaryPrefix, self, {
								expression: self.args[0],
								operator: "!"
							}),
							operator: "!"
						}).optimize(compressor);
						break;
					  case "Function":
						// new Function() => function(){}
						if (self.args.length == 0) return make_node(AST_Function, self, {
							argnames: [],
							body: []
						});
						if (all(self.args, function(x){ return x instanceof AST_String })) {
							// quite a corner-case, but we can handle it:
							//   https://github.com/mishoo/UglifyJS2/issues/203
							// if the code argument is a constant, then we can minify it.
							try {
								var code = "(function(" + self.args.slice(0, -1).map(function(arg){
									return arg.value;
								}).join(",") + "){" + self.args[self.args.length - 1].value + "})()";
								var ast = parse(code);
								ast.figure_out_scope({ screw_ie8: compressor.option("screw_ie8") });
								var comp = new Compressor(compressor.options);
								ast = ast.transform(comp);
								ast.figure_out_scope({ screw_ie8: compressor.option("screw_ie8") });
								ast.mangle_names();
								var fun;
								try {
									ast.walk(new TreeWalker(function(node){
										if (node instanceof AST_Lambda) {
											fun = node;
											throw ast;
										}
									}));
								} catch(ex) {
									if (ex !== ast) throw ex;
								};
								if (!fun) return self;
								var args = fun.argnames.map(function(arg, i){
									return make_node(AST_String, self.args[i], {
										value: arg.print_to_string()
									});
								});
								var code = OutputStream();
								AST_BlockStatement.prototype._codegen.call(fun, fun, code);
								code = code.toString().replace(/^\{|\}$/g, "");
								args.push(make_node(AST_String, self.args[self.args.length - 1], {
									value: code
								}));
								self.args = args;
								return self;
							} catch(ex) {
								if (ex instanceof JS_Parse_Error) {
									compressor.warn("Error parsing code passed to new Function [{file}:{line},{col}]", self.args[self.args.length - 1].start);
									compressor.warn(ex.toString());
								} else {
									console.log(ex);
									throw ex;
								}
							}
						}
						break;
					}
				}
				else if (exp instanceof AST_Dot && exp.property == "toString" && self.args.length == 0) {
					return make_node(AST_Binary, self, {
						left: make_node(AST_String, self, { value: "" }),
						operator: "+",
						right: exp.expression
					}).optimize(compressor);
				}
				else if (exp instanceof AST_Dot && exp.expression instanceof AST_Array && exp.property == "join") EXIT: {
					var separator;
					if (self.args.length > 0) {
						separator = self.args[0].evaluate(compressor);
						if (separator === self.args[0]) break EXIT; // not a constant
					}
					var elements = [];
					var consts = [];
					exp.expression.elements.forEach(function(el) {
						var value = el.evaluate(compressor);
						if (value !== el) {
							consts.push(value);
						} else {
							if (consts.length > 0) {
								elements.push(make_node(AST_String, self, {
									value: consts.join(separator)
								}));
								consts.length = 0;
							}
							elements.push(el);
						}
					});
					if (consts.length > 0) {
						elements.push(make_node(AST_String, self, {
							value: consts.join(separator)
						}));
					}
					if (elements.length == 0) return make_node(AST_String, self, { value: "" });
					if (elements.length == 1) {
						if (elements[0].is_string(compressor)) {
							return elements[0];
						}
						return make_node(AST_Binary, elements[0], {
							operator : "+",
							left     : make_node(AST_String, self, { value: "" }),
							right    : elements[0]
						});
					}
					if (separator == "") {
						var first;
						if (elements[0].is_string(compressor)
							|| elements[1].is_string(compressor)) {
							first = elements.shift();
						} else {
							first = make_node(AST_String, self, { value: "" });
						}
						return elements.reduce(function(prev, el){
							return make_node(AST_Binary, el, {
								operator : "+",
								left     : prev,
								right    : el
							});
						}, first).optimize(compressor);
					}
					// need this awkward cloning to not affect original element
					// best_of will decide which one to get through.
					var node = self.clone();
					node.expression = node.expression.clone();
					node.expression.expression = node.expression.expression.clone();
					node.expression.expression.elements = elements;
					return best_of(compressor, self, node);
				}
				else if (exp instanceof AST_Dot && exp.expression.is_string(compressor) && exp.property == "charAt") {
					var arg = self.args[0];
					var index = arg ? arg.evaluate(compressor) : 0;
					if (index !== arg) {
						return make_node(AST_Sub, exp, {
							expression: exp.expression,
							property: make_node_from_constant(index | 0, arg || exp)
						}).optimize(compressor);
					}
				}
			}
			if (exp instanceof AST_Function) {
				if (exp.body[0] instanceof AST_Return) {
					var value = exp.body[0].value;
					if (!value || value.is_constant()) {
						var args = self.args.concat(value || make_node(AST_Undefined, self));
						return AST_Seq.from_array(args).transform(compressor);
					}
				}
				if (compressor.option("side_effects") && all(exp.body, is_empty)) {
					var args = self.args.concat(make_node(AST_Undefined, self));
					return AST_Seq.from_array(args).transform(compressor);
				}
			}
			if (compressor.option("drop_console")) {
				if (exp instanceof AST_PropAccess) {
					var name = exp.expression;
					while (name.expression) {
						name = name.expression;
					}
					if (name instanceof AST_SymbolRef
						&& name.name == "console"
						&& name.undeclared()) {
						return make_node(AST_Undefined, self).optimize(compressor);
					}
				}
			}
			if (compressor.option("negate_iife")
				&& compressor.parent() instanceof AST_SimpleStatement
				&& is_iife_call(self)) {
				return self.negate(compressor, true);
			}
			return self;
		});

		OPT(AST_New, function(self, compressor){
			if (compressor.option("unsafe")) {
				var exp = self.expression;
				if (exp instanceof AST_SymbolRef && exp.undeclared()) {
					switch (exp.name) {
					  case "Object":
					  case "RegExp":
					  case "Function":
					  case "Error":
					  case "Array":
						return make_node(AST_Call, self, self).transform(compressor);
					}
				}
			}
			return self;
		});

		OPT(AST_Seq, function(self, compressor){
			if (!compressor.option("side_effects"))
				return self;
			self.car = self.car.drop_side_effect_free(compressor, first_in_statement(compressor));
			if (!self.car) return maintain_this_binding(compressor.parent(), self, self.cdr);
			if (compressor.option("cascade")) {
				var left;
				if (self.car instanceof AST_Assign
					&& !self.car.left.has_side_effects(compressor)) {
					left = self.car.left;
				} else if (self.car instanceof AST_Unary
					&& (self.car.operator == "++" || self.car.operator == "--")) {
					left = self.car.expression;
				}
				if (left
					&& !(left instanceof AST_SymbolRef
						&& (left.definition().orig[0] instanceof AST_SymbolLambda
							|| is_reference_const(left)))) {
					var parent, field;
					var cdr = self.cdr;
					while (true) {
						if (cdr.equivalent_to(left)) {
							var car = self.car instanceof AST_UnaryPostfix ? make_node(AST_UnaryPrefix, self.car, {
								operator: self.car.operator,
								expression: left
							}) : self.car;
							if (parent) {
								parent[field] = car;
								return self.cdr;
							}
							return car;
						}
						if (cdr instanceof AST_Binary && !(cdr instanceof AST_Assign)) {
							if (cdr.left.is_constant()) {
								if (cdr.operator == "||" || cdr.operator == "&&") break;
								field = "right";
							} else {
								field = "left";
							}
						} else if (cdr instanceof AST_Call
							|| cdr instanceof AST_Unary && !unary_side_effects(cdr.operator)) {
							field = "expression";
						} else break;
						parent = cdr;
						cdr = cdr[field];
					}
				}
			}
			if (is_undefined(self.cdr, compressor)) {
				return make_node(AST_UnaryPrefix, self, {
					operator   : "void",
					expression : self.car
				});
			}
			return self;
		});

		AST_Unary.DEFMETHOD("lift_sequences", function(compressor){
			if (compressor.option("sequences")) {
				if (this.expression instanceof AST_Seq) {
					var seq = this.expression;
					var x = seq.to_array();
					var e = this.clone();
					e.expression = x.pop();
					x.push(e);
					seq = AST_Seq.from_array(x).transform(compressor);
					return seq;
				}
			}
			return this;
		});

		OPT(AST_UnaryPostfix, function(self, compressor){
			return self.lift_sequences(compressor);
		});

		OPT(AST_UnaryPrefix, function(self, compressor){
			var e = self.expression;
			if (self.operator == "delete"
				&& !(e instanceof AST_SymbolRef
					|| e instanceof AST_PropAccess
					|| e instanceof AST_NaN
					|| e instanceof AST_Infinity
					|| e instanceof AST_Undefined)) {
				if (e instanceof AST_Seq) {
					e = e.to_array();
					e.push(make_node(AST_True, self));
					return AST_Seq.from_array(e).optimize(compressor);
				}
				return make_node(AST_Seq, self, {
					car: e,
					cdr: make_node(AST_True, self)
				}).optimize(compressor);
			}
			var seq = self.lift_sequences(compressor);
			if (seq !== self) {
				return seq;
			}
			if (compressor.option("side_effects") && self.operator == "void") {
				e = e.drop_side_effect_free(compressor);
				if (e) {
					self.expression = e;
					return self;
				} else {
					return make_node(AST_Undefined, self).optimize(compressor);
				}
			}
			if (compressor.option("booleans") && compressor.in_boolean_context()) {
				switch (self.operator) {
				  case "!":
					if (e instanceof AST_UnaryPrefix && e.operator == "!") {
						// !!foo ==> foo, if we're in boolean context
						return e.expression;
					}
					if (e instanceof AST_Binary) {
						self = best_of(compressor, self, e.negate(compressor, first_in_statement(compressor)));
					}
					break;
				  case "typeof":
					// typeof always returns a non-empty string, thus it's
					// always true in booleans
					compressor.warn("Boolean expression always true [{file}:{line},{col}]", self.start);
					return (e instanceof AST_SymbolRef ? make_node(AST_True, self) : make_node(AST_Seq, self, {
						car: e,
						cdr: make_node(AST_True, self)
					})).optimize(compressor);
				}
			}
			if (self.operator == "-" && e instanceof AST_Infinity) {
				e = e.transform(compressor);
			}
			if (e instanceof AST_Binary
				&& (self.operator == "+" || self.operator == "-")
				&& (e.operator == "*" || e.operator == "/" || e.operator == "%")) {
				return make_node(AST_Binary, self, {
					operator: e.operator,
					left: make_node(AST_UnaryPrefix, e.left, {
						operator: self.operator,
						expression: e.left
					}),
					right: e.right
				});
			}
			// avoids infinite recursion of numerals
			if (self.operator != "-"
				|| !(e instanceof AST_Number || e instanceof AST_Infinity)) {
				var ev = self.evaluate(compressor);
				if (ev !== self) {
					ev = make_node_from_constant(ev, self).optimize(compressor);
					return best_of(compressor, ev, self);
				}
			}
			return self;
		});

		AST_Binary.DEFMETHOD("lift_sequences", function(compressor){
			if (compressor.option("sequences")) {
				if (this.left instanceof AST_Seq) {
					var seq = this.left;
					var x = seq.to_array();
					var e = this.clone();
					e.left = x.pop();
					x.push(e);
					return AST_Seq.from_array(x).optimize(compressor);
				}
				if (this.right instanceof AST_Seq && !this.left.has_side_effects(compressor)) {
					var assign = this.operator == "=" && this.left instanceof AST_SymbolRef;
					var root = this.right.clone();
					var cursor, seq = root;
					while (assign || !seq.car.has_side_effects(compressor)) {
						cursor = seq;
						if (seq.cdr instanceof AST_Seq) {
							seq = seq.cdr = seq.cdr.clone();
						} else break;
					}
					if (cursor) {
						var e = this.clone();
						e.right = cursor.cdr;
						cursor.cdr = e;
						return root.optimize(compressor);
					}
				}
			}
			return this;
		});

		var commutativeOperators = makePredicate("== === != !== * & | ^");

		OPT(AST_Binary, function(self, compressor){
			function reversible() {
				return self.left.is_constant()
					|| self.right.is_constant()
					|| !self.left.has_side_effects(compressor)
						&& !self.right.has_side_effects(compressor);
			}
			function reverse(op) {
				if (reversible()) {
					if (op) self.operator = op;
					var tmp = self.left;
					self.left = self.right;
					self.right = tmp;
				}
			}
			if (commutativeOperators(self.operator)) {
				if (self.right.is_constant()
					&& !self.left.is_constant()) {
					// if right is a constant, whatever side effects the
					// left side might have could not influence the
					// result.  hence, force switch.

					if (!(self.left instanceof AST_Binary
						  && PRECEDENCE[self.left.operator] >= PRECEDENCE[self.operator])) {
						reverse();
					}
				}
			}
			self = self.lift_sequences(compressor);
			if (compressor.option("comparisons")) switch (self.operator) {
			  case "===":
			  case "!==":
				if ((self.left.is_string(compressor) && self.right.is_string(compressor)) ||
					(self.left.is_number(compressor) && self.right.is_number(compressor)) ||
					(self.left.is_boolean() && self.right.is_boolean())) {
					self.operator = self.operator.substr(0, 2);
				}
				// XXX: intentionally falling down to the next case
			  case "==":
			  case "!=":
				// "undefined" == typeof x => undefined === x
				if (self.left instanceof AST_String
					&& self.left.value == "undefined"
					&& self.right instanceof AST_UnaryPrefix
					&& self.right.operator == "typeof") {
					var expr = self.right.expression;
					if (expr instanceof AST_SymbolRef ? !expr.undeclared()
						: !(expr instanceof AST_PropAccess) || compressor.option("screw_ie8")) {
						self.right = expr;
						self.left = make_node(AST_Undefined, self.left).optimize(compressor);
						if (self.operator.length == 2) self.operator += "=";
					}
				}
				break;
			}
			if (compressor.option("booleans") && self.operator == "+" && compressor.in_boolean_context()) {
				var ll = self.left.evaluate(compressor);
				var rr = self.right.evaluate(compressor);
				if (ll && typeof ll == "string") {
					compressor.warn("+ in boolean context always true [{file}:{line},{col}]", self.start);
					return make_node(AST_Seq, self, {
						car: self.right,
						cdr: make_node(AST_True, self)
					}).optimize(compressor);
				}
				if (rr && typeof rr == "string") {
					compressor.warn("+ in boolean context always true [{file}:{line},{col}]", self.start);
					return make_node(AST_Seq, self, {
						car: self.left,
						cdr: make_node(AST_True, self)
					}).optimize(compressor);
				}
			}
			if (compressor.option("comparisons") && self.is_boolean()) {
				if (!(compressor.parent() instanceof AST_Binary)
					|| compressor.parent() instanceof AST_Assign) {
					var negated = make_node(AST_UnaryPrefix, self, {
						operator: "!",
						expression: self.negate(compressor, first_in_statement(compressor))
					});
					self = best_of(compressor, self, negated);
				}
				if (compressor.option("unsafe_comps")) {
					switch (self.operator) {
					  case "<": reverse(">"); break;
					  case "<=": reverse(">="); break;
					}
				}
			}
			if (self.operator == "+") {
				if (self.right instanceof AST_String
					&& self.right.getValue() == ""
					&& self.left.is_string(compressor)) {
					return self.left;
				}
				if (self.left instanceof AST_String
					&& self.left.getValue() == ""
					&& self.right.is_string(compressor)) {
					return self.right;
				}
				if (self.left instanceof AST_Binary
					&& self.left.operator == "+"
					&& self.left.left instanceof AST_String
					&& self.left.left.getValue() == ""
					&& self.right.is_string(compressor)) {
					self.left = self.left.right;
					return self.transform(compressor);
				}
			}
			if (compressor.option("evaluate")) {
				switch (self.operator) {
				  case "&&":
					var ll = self.left.evaluate(compressor);
					if (!ll) {
						compressor.warn("Condition left of && always false [{file}:{line},{col}]", self.start);
						return maintain_this_binding(compressor.parent(), self, self.left).optimize(compressor);
					} else if (ll !== self.left) {
						compressor.warn("Condition left of && always true [{file}:{line},{col}]", self.start);
						return maintain_this_binding(compressor.parent(), self, self.right).optimize(compressor);
					}
					if (compressor.option("booleans") && compressor.in_boolean_context()) {
						var rr = self.right.evaluate(compressor);
						if (!rr) {
							compressor.warn("Boolean && always false [{file}:{line},{col}]", self.start);
							return make_node(AST_Seq, self, {
								car: self.left,
								cdr: make_node(AST_False, self)
							}).optimize(compressor);
						} else if (rr !== self.right) {
							compressor.warn("Dropping side-effect-free && in boolean context [{file}:{line},{col}]", self.start);
							return self.left.optimize(compressor);
						}
					}
					break;
				  case "||":
					var ll = self.left.evaluate(compressor);
					if (!ll) {
						compressor.warn("Condition left of || always false [{file}:{line},{col}]", self.start);
						return maintain_this_binding(compressor.parent(), self, self.right).optimize(compressor);
					} else if (ll !== self.left) {
						compressor.warn("Condition left of || always true [{file}:{line},{col}]", self.start);
						return maintain_this_binding(compressor.parent(), self, self.left).optimize(compressor);
					}
					if (compressor.option("booleans") && compressor.in_boolean_context()) {
						var rr = self.right.evaluate(compressor);
						if (!rr) {
							compressor.warn("Dropping side-effect-free || in boolean context [{file}:{line},{col}]", self.start);
							return self.left.optimize(compressor);
						} else if (rr !== self.right) {
							compressor.warn("Boolean || always true [{file}:{line},{col}]", self.start);
							return make_node(AST_Seq, self, {
								car: self.left,
								cdr: make_node(AST_True, self)
							}).optimize(compressor);
						}
					}
					break;
				}
				var associative = true;
				switch (self.operator) {
				  case "+":
					// "foo" + ("bar" + x) => "foobar" + x
					if (self.left instanceof AST_Constant
						&& self.right instanceof AST_Binary
						&& self.right.operator == "+"
						&& self.right.left instanceof AST_Constant
						&& self.right.is_string(compressor)) {
						self = make_node(AST_Binary, self, {
							operator: "+",
							left: make_node(AST_String, self.left, {
								value: "" + self.left.getValue() + self.right.left.getValue(),
								start: self.left.start,
								end: self.right.left.end
							}),
							right: self.right.right
						});
					}
					// (x + "foo") + "bar" => x + "foobar"
					if (self.right instanceof AST_Constant
						&& self.left instanceof AST_Binary
						&& self.left.operator == "+"
						&& self.left.right instanceof AST_Constant
						&& self.left.is_string(compressor)) {
						self = make_node(AST_Binary, self, {
							operator: "+",
							left: self.left.left,
							right: make_node(AST_String, self.right, {
								value: "" + self.left.right.getValue() + self.right.getValue(),
								start: self.left.right.start,
								end: self.right.end
							})
						});
					}
					// (x + "foo") + ("bar" + y) => (x + "foobar") + y
					if (self.left instanceof AST_Binary
						&& self.left.operator == "+"
						&& self.left.is_string(compressor)
						&& self.left.right instanceof AST_Constant
						&& self.right instanceof AST_Binary
						&& self.right.operator == "+"
						&& self.right.left instanceof AST_Constant
						&& self.right.is_string(compressor)) {
						self = make_node(AST_Binary, self, {
							operator: "+",
							left: make_node(AST_Binary, self.left, {
								operator: "+",
								left: self.left.left,
								right: make_node(AST_String, self.left.right, {
									value: "" + self.left.right.getValue() + self.right.left.getValue(),
									start: self.left.right.start,
									end: self.right.left.end
								})
							}),
							right: self.right.right
						});
					}
					// a + -b => a - b
					if (self.right instanceof AST_UnaryPrefix
						&& self.right.operator == "-"
						&& self.left.is_number(compressor)) {
						self = make_node(AST_Binary, self, {
							operator: "-",
							left: self.left,
							right: self.right.expression
						});
						break;
					}
					// -a + b => b - a
					if (self.left instanceof AST_UnaryPrefix
						&& self.left.operator == "-"
						&& reversible()
						&& self.right.is_number(compressor)) {
						self = make_node(AST_Binary, self, {
							operator: "-",
							left: self.right,
							right: self.left.expression
						});
						break;
					}
				  case "*":
					associative = compressor.option("unsafe_math");
				  case "&":
				  case "|":
				  case "^":
					// a + +b => +b + a
					if (self.left.is_number(compressor)
						&& self.right.is_number(compressor)
						&& reversible()
						&& !(self.left instanceof AST_Binary
							&& self.left.operator != self.operator
							&& PRECEDENCE[self.left.operator] >= PRECEDENCE[self.operator])) {
						var reversed = make_node(AST_Binary, self, {
							operator: self.operator,
							left: self.right,
							right: self.left
						});
						if (self.right instanceof AST_Constant
							&& !(self.left instanceof AST_Constant)) {
							self = best_of(compressor, reversed, self);
						} else {
							self = best_of(compressor, self, reversed);
						}
					}
					if (associative && self.is_number(compressor)) {
						// a + (b + c) => (a + b) + c
						if (self.right instanceof AST_Binary
							&& self.right.operator == self.operator) {
							self = make_node(AST_Binary, self, {
								operator: self.operator,
								left: make_node(AST_Binary, self.left, {
									operator: self.operator,
									left: self.left,
									right: self.right.left,
									start: self.left.start,
									end: self.right.left.end
								}),
								right: self.right.right
							});
						}
						// (n + 2) + 3 => 5 + n
						// (2 * n) * 3 => 6 + n
						if (self.right instanceof AST_Constant
							&& self.left instanceof AST_Binary
							&& self.left.operator == self.operator) {
							if (self.left.left instanceof AST_Constant) {
								self = make_node(AST_Binary, self, {
									operator: self.operator,
									left: make_node(AST_Binary, self.left, {
										operator: self.operator,
										left: self.left.left,
										right: self.right,
										start: self.left.left.start,
										end: self.right.end
									}),
									right: self.left.right
								});
							} else if (self.left.right instanceof AST_Constant) {
								self = make_node(AST_Binary, self, {
									operator: self.operator,
									left: make_node(AST_Binary, self.left, {
										operator: self.operator,
										left: self.left.right,
										right: self.right,
										start: self.left.right.start,
										end: self.right.end
									}),
									right: self.left.left
								});
							}
						}
						// (a | 1) | (2 | d) => (3 | a) | b
						if (self.left instanceof AST_Binary
							&& self.left.operator == self.operator
							&& self.left.right instanceof AST_Constant
							&& self.right instanceof AST_Binary
							&& self.right.operator == self.operator
							&& self.right.left instanceof AST_Constant) {
							self = make_node(AST_Binary, self, {
								operator: self.operator,
								left: make_node(AST_Binary, self.left, {
									operator: self.operator,
									left: make_node(AST_Binary, self.left.left, {
										operator: self.operator,
										left: self.left.right,
										right: self.right.left,
										start: self.left.right.start,
										end: self.right.left.end
									}),
									right: self.left.left
								}),
								right: self.right.right
							});
						}
					}
				}
			}
			// x && (y && z)  ==>  x && y && z
			// x || (y || z)  ==>  x || y || z
			// x + ("y" + z)  ==>  x + "y" + z
			// "x" + (y + "z")==>  "x" + y + "z"
			if (self.right instanceof AST_Binary
				&& self.right.operator == self.operator
				&& (self.operator == "&&"
					|| self.operator == "||"
					|| (self.operator == "+"
						&& (self.right.left.is_string(compressor)
							|| (self.left.is_string(compressor)
								&& self.right.right.is_string(compressor))))))
			{
				self.left = make_node(AST_Binary, self.left, {
					operator : self.operator,
					left     : self.left,
					right    : self.right.left
				});
				self.right = self.right.right;
				return self.transform(compressor);
			}
			var ev = self.evaluate(compressor);
			if (ev !== self) {
				ev = make_node_from_constant(ev, self).optimize(compressor);
				return best_of(compressor, ev, self);
			}
			return self;
		});

		OPT(AST_SymbolRef, function(self, compressor){
			var def = self.resolve_defines(compressor);
			if (def) {
				return def.optimize(compressor);
			}
			// testing against !self.scope.uses_with first is an optimization
			if (compressor.option("screw_ie8")
				&& self.undeclared()
				&& (!self.scope.uses_with || !compressor.find_parent(AST_With))) {
				switch (self.name) {
				  case "undefined":
					return make_node(AST_Undefined, self).optimize(compressor);
				  case "NaN":
					return make_node(AST_NaN, self).optimize(compressor);
				  case "Infinity":
					return make_node(AST_Infinity, self).optimize(compressor);
				}
			}
			if (compressor.option("evaluate")
				&& compressor.option("reduce_vars")
				&& is_lhs(self, compressor.parent()) !== self) {
				var d = self.definition();
				var fixed = self.fixed_value();
				if (fixed) {
					if (d.should_replace === undefined) {
						var init = fixed.evaluate(compressor);
						if (init !== fixed && (compressor.option("unsafe_regexp") || !(init instanceof RegExp))) {
							init = make_node_from_constant(init, fixed);
							var value = init.optimize(compressor).print_to_string().length;
							var fn;
							if (has_symbol_ref(fixed)) {
								fn = function() {
									var result = init.optimize(compressor);
									return result === init ? result.clone(true) : result;
								};
							} else {
								value = Math.min(value, fixed.print_to_string().length);
								fn = function() {
									var result = best_of_expression(init.optimize(compressor), fixed);
									return result === init || result === fixed ? result.clone(true) : result;
								};
							}
							var name = d.name.length;
							var overhead = 0;
							if (compressor.option("unused") && (!d.global || compressor.option("toplevel"))) {
								overhead = (name + 2 + value) / d.references.length;
							}
							d.should_replace = value <= name + overhead ? fn : false;
						} else {
							d.should_replace = false;
						}
					}
					if (d.should_replace) {
						return d.should_replace();
					}
				}
			}
			return self;

			function has_symbol_ref(value) {
				var found;
				value.walk(new TreeWalker(function(node) {
					if (node instanceof AST_SymbolRef) found = true;
					if (found) return true;
				}));
				return found;
			}
		});

		function is_atomic(lhs, self) {
			return lhs instanceof AST_SymbolRef || lhs.TYPE === self.TYPE;
		}

		OPT(AST_Undefined, function(self, compressor){
			if (compressor.option("unsafe")) {
				var undef = find_variable(compressor, "undefined");
				if (undef) {
					var ref = make_node(AST_SymbolRef, self, {
						name   : "undefined",
						scope  : undef.scope,
						thedef : undef
					});
					ref.is_undefined = true;
					return ref;
				}
			}
			var lhs = is_lhs(compressor.self(), compressor.parent());
			if (lhs && is_atomic(lhs, self)) return self;
			return make_node(AST_UnaryPrefix, self, {
				operator: "void",
				expression: make_node(AST_Number, self, {
					value: 0
				})
			});
		});

		OPT(AST_Infinity, function(self, compressor){
			var lhs = is_lhs(compressor.self(), compressor.parent());
			if (lhs && is_atomic(lhs, self)) return self;
			if (compressor.option("keep_infinity")
				&& !(lhs && !is_atomic(lhs, self))
				&& !find_variable(compressor, "Infinity"))
				return self;
			return make_node(AST_Binary, self, {
				operator: "/",
				left: make_node(AST_Number, self, {
					value: 1
				}),
				right: make_node(AST_Number, self, {
					value: 0
				})
			});
		});

		OPT(AST_NaN, function(self, compressor){
			var lhs = is_lhs(compressor.self(), compressor.parent());
			if (lhs && !is_atomic(lhs, self)
				|| find_variable(compressor, "NaN")) {
				return make_node(AST_Binary, self, {
					operator: "/",
					left: make_node(AST_Number, self, {
						value: 0
					}),
					right: make_node(AST_Number, self, {
						value: 0
					})
				});
			}
			return self;
		});

		var ASSIGN_OPS = [ '+', '-', '/', '*', '%', '>>', '<<', '>>>', '|', '^', '&' ];
		var ASSIGN_OPS_COMMUTATIVE = [ '*', '|', '^', '&' ];
		OPT(AST_Assign, function(self, compressor){
			self = self.lift_sequences(compressor);
			if (self.operator == "=" && self.left instanceof AST_SymbolRef && self.right instanceof AST_Binary) {
				// x = expr1 OP expr2
				if (self.right.left instanceof AST_SymbolRef
					&& self.right.left.name == self.left.name
					&& member(self.right.operator, ASSIGN_OPS)) {
					// x = x - 2  --->  x -= 2
					self.operator = self.right.operator + "=";
					self.right = self.right.right;
				}
				else if (self.right.right instanceof AST_SymbolRef
					&& self.right.right.name == self.left.name
					&& member(self.right.operator, ASSIGN_OPS_COMMUTATIVE)
					&& !self.right.left.has_side_effects(compressor)) {
					// x = 2 & x  --->  x &= 2
					self.operator = self.right.operator + "=";
					self.right = self.right.left;
				}
			}
			return self;
		});

		OPT(AST_Conditional, function(self, compressor){
			if (!compressor.option("conditionals")) return self;
			if (self.condition instanceof AST_Seq) {
				var car = self.condition.car;
				self.condition = self.condition.cdr;
				return AST_Seq.cons(car, self);
			}
			var cond = self.condition.evaluate(compressor);
			if (cond !== self.condition) {
				if (cond) {
					compressor.warn("Condition always true [{file}:{line},{col}]", self.start);
					return maintain_this_binding(compressor.parent(), self, self.consequent);
				} else {
					compressor.warn("Condition always false [{file}:{line},{col}]", self.start);
					return maintain_this_binding(compressor.parent(), self, self.alternative);
				}
			}
			var negated = cond.negate(compressor, first_in_statement(compressor));
			if (best_of(compressor, cond, negated) === negated) {
				self = make_node(AST_Conditional, self, {
					condition: negated,
					consequent: self.alternative,
					alternative: self.consequent
				});
			}
			var condition = self.condition;
			var consequent = self.consequent;
			var alternative = self.alternative;
			// x?x:y --> x||y
			if (condition instanceof AST_SymbolRef
				&& consequent instanceof AST_SymbolRef
				&& condition.definition() === consequent.definition()) {
				return make_node(AST_Binary, self, {
					operator: "||",
					left: condition,
					right: alternative
				});
			}
			// if (foo) exp = something; else exp = something_else;
			//                   |
			//                   v
			// exp = foo ? something : something_else;
			if (consequent instanceof AST_Assign
				&& alternative instanceof AST_Assign
				&& consequent.operator == alternative.operator
				&& consequent.left.equivalent_to(alternative.left)
				&& (!self.condition.has_side_effects(compressor)
					|| consequent.operator == "="
						&& !consequent.left.has_side_effects(compressor))) {
				return make_node(AST_Assign, self, {
					operator: consequent.operator,
					left: consequent.left,
					right: make_node(AST_Conditional, self, {
						condition: self.condition,
						consequent: consequent.right,
						alternative: alternative.right
					})
				});
			}
			// x ? y(a) : y(b) --> y(x ? a : b)
			if (consequent instanceof AST_Call
				&& alternative.TYPE === consequent.TYPE
				&& consequent.args.length == 1
				&& alternative.args.length == 1
				&& consequent.expression.equivalent_to(alternative.expression)
				&& !consequent.expression.has_side_effects(compressor)) {
				consequent.args[0] = make_node(AST_Conditional, self, {
					condition: self.condition,
					consequent: consequent.args[0],
					alternative: alternative.args[0]
				});
				return consequent;
			}
			// x?y?z:a:a --> x&&y?z:a
			if (consequent instanceof AST_Conditional
				&& consequent.alternative.equivalent_to(alternative)) {
				return make_node(AST_Conditional, self, {
					condition: make_node(AST_Binary, self, {
						left: self.condition,
						operator: "&&",
						right: consequent.condition
					}),
					consequent: consequent.consequent,
					alternative: alternative
				});
			}
			// x ? y : y --> x, y
			if (consequent.equivalent_to(alternative)) {
				return make_node(AST_Seq, self, {
					car: self.condition,
					cdr: consequent
				}).optimize(compressor);
			}

			if (is_true(self.consequent)) {
				if (is_false(self.alternative)) {
					// c ? true : false ---> !!c
					return booleanize(self.condition);
				}
				// c ? true : x ---> !!c || x
				return make_node(AST_Binary, self, {
					operator: "||",
					left: booleanize(self.condition),
					right: self.alternative
				});
			}
			if (is_false(self.consequent)) {
				if (is_true(self.alternative)) {
					// c ? false : true ---> !c
					return booleanize(self.condition.negate(compressor));
				}
				// c ? false : x ---> !c && x
				return make_node(AST_Binary, self, {
					operator: "&&",
					left: booleanize(self.condition.negate(compressor)),
					right: self.alternative
				});
			}
			if (is_true(self.alternative)) {
				// c ? x : true ---> !c || x
				return make_node(AST_Binary, self, {
					operator: "||",
					left: booleanize(self.condition.negate(compressor)),
					right: self.consequent
				});
			}
			if (is_false(self.alternative)) {
				// c ? x : false ---> !!c && x
				return make_node(AST_Binary, self, {
					operator: "&&",
					left: booleanize(self.condition),
					right: self.consequent
				});
			}

			return self;

			function booleanize(node) {
				if (node.is_boolean()) return node;
				// !!expression
				return make_node(AST_UnaryPrefix, node, {
					operator: "!",
					expression: node.negate(compressor)
				});
			}

			// AST_True or !0
			function is_true(node) {
				return node instanceof AST_True
					|| (node instanceof AST_UnaryPrefix
						&& node.operator == "!"
						&& node.expression instanceof AST_Constant
						&& !node.expression.value);
			}
			// AST_False or !1
			function is_false(node) {
				return node instanceof AST_False
					|| (node instanceof AST_UnaryPrefix
						&& node.operator == "!"
						&& node.expression instanceof AST_Constant
						&& !!node.expression.value);
			}
		});

		OPT(AST_Boolean, function(self, compressor){
			if (compressor.option("booleans")) {
				var p = compressor.parent();
				if (p instanceof AST_Binary && (p.operator == "=="
												|| p.operator == "!=")) {
					compressor.warn("Non-strict equality against boolean: {operator} {value} [{file}:{line},{col}]", {
						operator : p.operator,
						value    : self.value,
						file     : p.start.file,
						line     : p.start.line,
						col      : p.start.col
					});
					return make_node(AST_Number, self, {
						value: +self.value
					});
				}
				return make_node(AST_UnaryPrefix, self, {
					operator: "!",
					expression: make_node(AST_Number, self, {
						value: 1 - self.value
					})
				});
			}
			return self;
		});

		OPT(AST_Sub, function(self, compressor){
			var prop = self.property;
			if (prop instanceof AST_String && compressor.option("properties")) {
				prop = prop.getValue();
				if (RESERVED_WORDS(prop) ? compressor.option("screw_ie8") : is_identifier_string(prop)) {
					return make_node(AST_Dot, self, {
						expression : self.expression,
						property   : prop
					}).optimize(compressor);
				}
				var v = parseFloat(prop);
				if (!isNaN(v) && v.toString() == prop) {
					self.property = make_node(AST_Number, self.property, {
						value: v
					});
				}
			}
			var ev = self.evaluate(compressor);
			if (ev !== self) {
				ev = make_node_from_constant(ev, self).optimize(compressor);
				return best_of(compressor, ev, self);
			}
			return self;
		});

		OPT(AST_Dot, function(self, compressor){
			var def = self.resolve_defines(compressor);
			if (def) {
				return def.optimize(compressor);
			}
			var prop = self.property;
			if (RESERVED_WORDS(prop) && !compressor.option("screw_ie8")) {
				return make_node(AST_Sub, self, {
					expression : self.expression,
					property   : make_node(AST_String, self, {
						value: prop
					})
				}).optimize(compressor);
			}
			if (compressor.option("unsafe_proto")
				&& self.expression instanceof AST_Dot
				&& self.expression.property == "prototype") {
				var exp = self.expression.expression;
				if (exp instanceof AST_SymbolRef && exp.undeclared()) switch (exp.name) {
				  case "Array":
					self.expression = make_node(AST_Array, self.expression, {
						elements: []
					});
					break;
				  case "Object":
					self.expression = make_node(AST_Object, self.expression, {
						properties: []
					});
					break;
				  case "String":
					self.expression = make_node(AST_String, self.expression, {
						value: ""
					});
					break;
				}
			}
			var ev = self.evaluate(compressor);
			if (ev !== self) {
				ev = make_node_from_constant(ev, self).optimize(compressor);
				return best_of(compressor, ev, self);
			}
			return self;
		});

		function literals_in_boolean_context(self, compressor) {
			if (compressor.option("booleans") && compressor.in_boolean_context()) {
				return best_of(compressor, self, make_node(AST_Seq, self, {
					car: self,
					cdr: make_node(AST_True, self)
				}).optimize(compressor));
			}
			return self;
		};
		OPT(AST_Array, literals_in_boolean_context);
		OPT(AST_Object, literals_in_boolean_context);
		OPT(AST_RegExp, literals_in_boolean_context);

		OPT(AST_Return, function(self, compressor){
			if (self.value && is_undefined(self.value, compressor)) {
				self.value = null;
			}
			return self;
		});

		OPT(AST_VarDef, function(self, compressor){
			var defines = compressor.option("global_defs");
			if (defines && HOP(defines, self.name.name)) {
				compressor.warn('global_defs ' + self.name.name + ' redefined [{file}:{line},{col}]', self.start);
			}
			return self;
		});

	})();
	//#endregion
	
	//#region URL: /lib/mozilla-ast
	//"use strict";

	(function(){

		var normalize_directives = function(body) {
			var in_directive = true;

			for (var i = 0; i < body.length; i++) {
				if (in_directive && body[i] instanceof AST_Statement && body[i].body instanceof AST_String) {
					body[i] = new AST_Directive({
						start: body[i].start,
						end: body[i].end,
						value: body[i].body.value
					});
				} else if (in_directive && !(body[i] instanceof AST_Statement && body[i].body instanceof AST_String)) {
					in_directive = false;
				}
			}

			return body;
		};

		var MOZ_TO_ME = {
			Program: function(M) {
				return new AST_Toplevel({
					start: my_start_token(M),
					end: my_end_token(M),
					body: normalize_directives(M.body.map(from_moz))
				});
			},
			FunctionDeclaration: function(M) {
				return new AST_Defun({
					start: my_start_token(M),
					end: my_end_token(M),
					name: from_moz(M.id),
					argnames: M.params.map(from_moz),
					body: normalize_directives(from_moz(M.body).body)
				});
			},
			FunctionExpression: function(M) {
				return new AST_Function({
					start: my_start_token(M),
					end: my_end_token(M),
					name: from_moz(M.id),
					argnames: M.params.map(from_moz),
					body: normalize_directives(from_moz(M.body).body)
				});
			},
			ExpressionStatement: function(M) {
				return new AST_SimpleStatement({
					start: my_start_token(M),
					end: my_end_token(M),
					body: from_moz(M.expression)
				});
			},
			TryStatement: function(M) {
				var handlers = M.handlers || [M.handler];
				if (handlers.length > 1 || M.guardedHandlers && M.guardedHandlers.length) {
					throw new Error("Multiple catch clauses are not supported.");
				}
				return new AST_Try({
					start    : my_start_token(M),
					end      : my_end_token(M),
					body     : from_moz(M.block).body,
					bcatch   : from_moz(handlers[0]),
					bfinally : M.finalizer ? new AST_Finally(from_moz(M.finalizer)) : null
				});
			},
			Property: function(M) {
				var key = M.key;
				var args = {
					start    : my_start_token(key),
					end      : my_end_token(M.value),
					key      : key.type == "Identifier" ? key.name : key.value,
					value    : from_moz(M.value)
				};
				if (M.kind == "init") return new AST_ObjectKeyVal(args);
				args.key = new AST_SymbolAccessor({
					name: args.key
				});
				args.value = new AST_Accessor(args.value);
				if (M.kind == "get") return new AST_ObjectGetter(args);
				if (M.kind == "set") return new AST_ObjectSetter(args);
			},
			ArrayExpression: function(M) {
				return new AST_Array({
					start    : my_start_token(M),
					end      : my_end_token(M),
					elements : M.elements.map(function(elem){
						return elem === null ? new AST_Hole() : from_moz(elem);
					})
				});
			},
			ObjectExpression: function(M) {
				return new AST_Object({
					start      : my_start_token(M),
					end        : my_end_token(M),
					properties : M.properties.map(function(prop){
						prop.type = "Property";
						return from_moz(prop)
					})
				});
			},
			SequenceExpression: function(M) {
				return AST_Seq.from_array(M.expressions.map(from_moz));
			},
			MemberExpression: function(M) {
				return new (M.computed ? AST_Sub : AST_Dot)({
					start      : my_start_token(M),
					end        : my_end_token(M),
					property   : M.computed ? from_moz(M.property) : M.property.name,
					expression : from_moz(M.object)
				});
			},
			SwitchCase: function(M) {
				return new (M.test ? AST_Case : AST_Default)({
					start      : my_start_token(M),
					end        : my_end_token(M),
					expression : from_moz(M.test),
					body       : M.consequent.map(from_moz)
				});
			},
			VariableDeclaration: function(M) {
				return new (M.kind === "const" ? AST_Const : AST_Var)({
					start       : my_start_token(M),
					end         : my_end_token(M),
					definitions : M.declarations.map(from_moz)
				});
			},
			Literal: function(M) {
				var val = M.value, args = {
					start  : my_start_token(M),
					end    : my_end_token(M)
				};
				if (val === null) return new AST_Null(args);
				switch (typeof val) {
				  case "string":
					args.value = val;
					return new AST_String(args);
				  case "number":
					args.value = val;
					return new AST_Number(args);
				  case "boolean":
					return new (val ? AST_True : AST_False)(args);
				  default:
					var rx = M.regex;
					if (rx && rx.pattern) {
						// RegExpLiteral as per ESTree AST spec
						args.value = new RegExp(rx.pattern, rx.flags).toString();
					} else {
						// support legacy RegExp
						args.value = M.regex && M.raw ? M.raw : val;
					}
					return new AST_RegExp(args);
				}
			},
			Identifier: function(M) {
				var p = FROM_MOZ_STACK[FROM_MOZ_STACK.length - 2];
				return new (  p.type == "LabeledStatement" ? AST_Label
							: p.type == "VariableDeclarator" && p.id === M ? (p.kind == "const" ? AST_SymbolConst : AST_SymbolVar)
							: p.type == "FunctionExpression" ? (p.id === M ? AST_SymbolLambda : AST_SymbolFunarg)
							: p.type == "FunctionDeclaration" ? (p.id === M ? AST_SymbolDefun : AST_SymbolFunarg)
							: p.type == "CatchClause" ? AST_SymbolCatch
							: p.type == "BreakStatement" || p.type == "ContinueStatement" ? AST_LabelRef
							: AST_SymbolRef)({
								start : my_start_token(M),
								end   : my_end_token(M),
								name  : M.name
							});
			}
		};

		MOZ_TO_ME.UpdateExpression =
		MOZ_TO_ME.UnaryExpression = function To_Moz_Unary(M) {
			var prefix = "prefix" in M ? M.prefix
				: M.type == "UnaryExpression" ? true : false;
			return new (prefix ? AST_UnaryPrefix : AST_UnaryPostfix)({
				start      : my_start_token(M),
				end        : my_end_token(M),
				operator   : M.operator,
				expression : from_moz(M.argument)
			});
		};

		map("EmptyStatement", AST_EmptyStatement);
		map("BlockStatement", AST_BlockStatement, "body@body");
		map("IfStatement", AST_If, "test>condition, consequent>body, alternate>alternative");
		map("LabeledStatement", AST_LabeledStatement, "label>label, body>body");
		map("BreakStatement", AST_Break, "label>label");
		map("ContinueStatement", AST_Continue, "label>label");
		map("WithStatement", AST_With, "object>expression, body>body");
		map("SwitchStatement", AST_Switch, "discriminant>expression, cases@body");
		map("ReturnStatement", AST_Return, "argument>value");
		map("ThrowStatement", AST_Throw, "argument>value");
		map("WhileStatement", AST_While, "test>condition, body>body");
		map("DoWhileStatement", AST_Do, "test>condition, body>body");
		map("ForStatement", AST_For, "init>init, test>condition, update>step, body>body");
		map("ForInStatement", AST_ForIn, "left>init, right>object, body>body");
		map("DebuggerStatement", AST_Debugger);
		map("VariableDeclarator", AST_VarDef, "id>name, init>value");
		map("CatchClause", AST_Catch, "param>argname, body%body");

		map("ThisExpression", AST_This);
		map("BinaryExpression", AST_Binary, "operator=operator, left>left, right>right");
		map("LogicalExpression", AST_Binary, "operator=operator, left>left, right>right");
		map("AssignmentExpression", AST_Assign, "operator=operator, left>left, right>right");
		map("ConditionalExpression", AST_Conditional, "test>condition, consequent>consequent, alternate>alternative");
		map("NewExpression", AST_New, "callee>expression, arguments@args");
		map("CallExpression", AST_Call, "callee>expression, arguments@args");

		def_to_moz(AST_Toplevel, function To_Moz_Program(M) {
			return to_moz_scope("Program", M);
		});

		def_to_moz(AST_Defun, function To_Moz_FunctionDeclaration(M) {
			return {
				type: "FunctionDeclaration",
				id: to_moz(M.name),
				params: M.argnames.map(to_moz),
				body: to_moz_scope("BlockStatement", M)
			}
		});

		def_to_moz(AST_Function, function To_Moz_FunctionExpression(M) {
			return {
				type: "FunctionExpression",
				id: to_moz(M.name),
				params: M.argnames.map(to_moz),
				body: to_moz_scope("BlockStatement", M)
			}
		});

		def_to_moz(AST_Directive, function To_Moz_Directive(M) {
			return {
				type: "ExpressionStatement",
				expression: {
					type: "Literal",
					value: M.value
				}
			};
		});

		def_to_moz(AST_SimpleStatement, function To_Moz_ExpressionStatement(M) {
			return {
				type: "ExpressionStatement",
				expression: to_moz(M.body)
			};
		});

		def_to_moz(AST_SwitchBranch, function To_Moz_SwitchCase(M) {
			return {
				type: "SwitchCase",
				test: to_moz(M.expression),
				consequent: M.body.map(to_moz)
			};
		});

		def_to_moz(AST_Try, function To_Moz_TryStatement(M) {
			return {
				type: "TryStatement",
				block: to_moz_block(M),
				handler: to_moz(M.bcatch),
				guardedHandlers: [],
				finalizer: to_moz(M.bfinally)
			};
		});

		def_to_moz(AST_Catch, function To_Moz_CatchClause(M) {
			return {
				type: "CatchClause",
				param: to_moz(M.argname),
				guard: null,
				body: to_moz_block(M)
			};
		});

		def_to_moz(AST_Definitions, function To_Moz_VariableDeclaration(M) {
			return {
				type: "VariableDeclaration",
				kind: M instanceof AST_Const ? "const" : "var",
				declarations: M.definitions.map(to_moz)
			};
		});

		def_to_moz(AST_Seq, function To_Moz_SequenceExpression(M) {
			return {
				type: "SequenceExpression",
				expressions: M.to_array().map(to_moz)
			};
		});

		def_to_moz(AST_PropAccess, function To_Moz_MemberExpression(M) {
			var isComputed = M instanceof AST_Sub;
			return {
				type: "MemberExpression",
				object: to_moz(M.expression),
				computed: isComputed,
				property: isComputed ? to_moz(M.property) : {type: "Identifier", name: M.property}
			};
		});

		def_to_moz(AST_Unary, function To_Moz_Unary(M) {
			return {
				type: M.operator == "++" || M.operator == "--" ? "UpdateExpression" : "UnaryExpression",
				operator: M.operator,
				prefix: M instanceof AST_UnaryPrefix,
				argument: to_moz(M.expression)
			};
		});

		def_to_moz(AST_Binary, function To_Moz_BinaryExpression(M) {
			return {
				type: M.operator == "&&" || M.operator == "||" ? "LogicalExpression" : "BinaryExpression",
				left: to_moz(M.left),
				operator: M.operator,
				right: to_moz(M.right)
			};
		});

		def_to_moz(AST_Array, function To_Moz_ArrayExpression(M) {
			return {
				type: "ArrayExpression",
				elements: M.elements.map(to_moz)
			};
		});

		def_to_moz(AST_Object, function To_Moz_ObjectExpression(M) {
			return {
				type: "ObjectExpression",
				properties: M.properties.map(to_moz)
			};
		});

		def_to_moz(AST_ObjectProperty, function To_Moz_Property(M) {
			var key = {
				type: "Literal",
				value: M.key instanceof AST_SymbolAccessor ? M.key.name : M.key
			};
			var kind;
			if (M instanceof AST_ObjectKeyVal) {
				kind = "init";
			} else
			if (M instanceof AST_ObjectGetter) {
				kind = "get";
			} else
			if (M instanceof AST_ObjectSetter) {
				kind = "set";
			}
			return {
				type: "Property",
				kind: kind,
				key: key,
				value: to_moz(M.value)
			};
		});

		def_to_moz(AST_Symbol, function To_Moz_Identifier(M) {
			var def = M.definition();
			return {
				type: "Identifier",
				name: def ? def.mangled_name || def.name : M.name
			};
		});

		def_to_moz(AST_RegExp, function To_Moz_RegExpLiteral(M) {
			var value = M.value;
			return {
				type: "Literal",
				value: value,
				raw: value.toString(),
				regex: {
					pattern: value.source,
					flags: value.toString().match(/[gimuy]*$/)[0]
				}
			};
		});

		def_to_moz(AST_Constant, function To_Moz_Literal(M) {
			var value = M.value;
			if (typeof value === 'number' && (value < 0 || (value === 0 && 1 / value < 0))) {
				return {
					type: "UnaryExpression",
					operator: "-",
					prefix: true,
					argument: {
						type: "Literal",
						value: -value,
						raw: M.start.raw
					}
				};
			}
			return {
				type: "Literal",
				value: value,
				raw: M.start.raw
			};
		});

		def_to_moz(AST_Atom, function To_Moz_Atom(M) {
			return {
				type: "Identifier",
				name: String(M.value)
			};
		});

		AST_Boolean.DEFMETHOD("to_mozilla_ast", AST_Constant.prototype.to_mozilla_ast);
		AST_Null.DEFMETHOD("to_mozilla_ast", AST_Constant.prototype.to_mozilla_ast);
		AST_Hole.DEFMETHOD("to_mozilla_ast", function To_Moz_ArrayHole() { return null });

		AST_Block.DEFMETHOD("to_mozilla_ast", AST_BlockStatement.prototype.to_mozilla_ast);
		AST_Lambda.DEFMETHOD("to_mozilla_ast", AST_Function.prototype.to_mozilla_ast);

		/* -----[ tools ]----- */

		function raw_token(moznode) {
			if (moznode.type == "Literal") {
				return moznode.raw != null ? moznode.raw : moznode.value + "";
			}
		}

		function my_start_token(moznode) {
			var loc = moznode.loc, start = loc && loc.start;
			var range = moznode.range;
			return new AST_Token({
				file    : loc && loc.source,
				line    : start && start.line,
				col     : start && start.column,
				pos     : range ? range[0] : moznode.start,
				endline : start && start.line,
				endcol  : start && start.column,
				endpos  : range ? range[0] : moznode.start,
				raw     : raw_token(moznode)
			});
		};

		function my_end_token(moznode) {
			var loc = moznode.loc, end = loc && loc.end;
			var range = moznode.range;
			return new AST_Token({
				file    : loc && loc.source,
				line    : end && end.line,
				col     : end && end.column,
				pos     : range ? range[1] : moznode.end,
				endline : end && end.line,
				endcol  : end && end.column,
				endpos  : range ? range[1] : moznode.end,
				raw     : raw_token(moznode)
			});
		};

		function map(moztype, mytype, propmap) {
			var moz_to_me = "function From_Moz_" + moztype + "(M){\n";
			moz_to_me += "return new U2." + mytype.name + "({\n" +
				"start: my_start_token(M),\n" +
				"end: my_end_token(M)";

			var me_to_moz = "function To_Moz_" + moztype + "(M){\n";
			me_to_moz += "return {\n" +
				"type: " + JSON.stringify(moztype);

			if (propmap) propmap.split(/\s*,\s*/).forEach(function(prop){
				var m = /([a-z0-9$_]+)(=|@|>|%)([a-z0-9$_]+)/i.exec(prop);
				if (!m) throw new Error("Can't understand property map: " + prop);
				var moz = m[1], how = m[2], my = m[3];
				moz_to_me += ",\n" + my + ": ";
				me_to_moz += ",\n" + moz + ": ";
				switch (how) {
					case "@":
						moz_to_me += "M." + moz + ".map(from_moz)";
						me_to_moz += "M." +  my + ".map(to_moz)";
						break;
					case ">":
						moz_to_me += "from_moz(M." + moz + ")";
						me_to_moz += "to_moz(M." + my + ")";
						break;
					case "=":
						moz_to_me += "M." + moz;
						me_to_moz += "M." + my;
						break;
					case "%":
						moz_to_me += "from_moz(M." + moz + ").body";
						me_to_moz += "to_moz_block(M)";
						break;
					default:
						throw new Error("Can't understand operator in propmap: " + prop);
				}
			});

			moz_to_me += "\n})\n}";
			me_to_moz += "\n}\n}";

			//moz_to_me = parse(moz_to_me).print_to_string({ beautify: true });
			//me_to_moz = parse(me_to_moz).print_to_string({ beautify: true });
			//console.log(moz_to_me);

			moz_to_me = new Function("U2", "my_start_token", "my_end_token", "from_moz", "return(" + moz_to_me + ")")(
				exports, my_start_token, my_end_token, from_moz
			);
			me_to_moz = new Function("to_moz", "to_moz_block", "to_moz_scope", "return(" + me_to_moz + ")")(
				to_moz, to_moz_block, to_moz_scope
			);
			MOZ_TO_ME[moztype] = moz_to_me;
			def_to_moz(mytype, me_to_moz);
		};

		var FROM_MOZ_STACK = null;

		function from_moz(node) {
			FROM_MOZ_STACK.push(node);
			var ret = node != null ? MOZ_TO_ME[node.type](node) : null;
			FROM_MOZ_STACK.pop();
			return ret;
		};

		AST_Node.from_mozilla_ast = function(node){
			var save_stack = FROM_MOZ_STACK;
			FROM_MOZ_STACK = [];
			var ast = from_moz(node);
			FROM_MOZ_STACK = save_stack;
			return ast;
		};

		function set_moz_loc(mynode, moznode, myparent) {
			var start = mynode.start;
			var end = mynode.end;
			if (start.pos != null && end.endpos != null) {
				moznode.range = [start.pos, end.endpos];
			}
			if (start.line) {
				moznode.loc = {
					start: {line: start.line, column: start.col},
					end: end.endline ? {line: end.endline, column: end.endcol} : null
				};
				if (start.file) {
					moznode.loc.source = start.file;
				}
			}
			return moznode;
		};

		function def_to_moz(mytype, handler) {
			mytype.DEFMETHOD("to_mozilla_ast", function() {
				return set_moz_loc(this, handler(this));
			});
		};

		function to_moz(node) {
			return node != null ? node.to_mozilla_ast() : null;
		};

		function to_moz_block(node) {
			return {
				type: "BlockStatement",
				body: node.body.map(to_moz)
			};
		};

		function to_moz_scope(type, node) {
			var body = node.body.map(to_moz);
			if (node.body[0] instanceof AST_SimpleStatement && node.body[0].body instanceof AST_String) {
				body.unshift(to_moz(new AST_EmptyStatement(node.body[0])));
			}
			return {
				type: type,
				body: body
			};
		};
	})();
	//#endregion

	//#region URL: /tools/exports
	exports["Compressor"] = Compressor;
	exports["DefaultsError"] = DefaultsError;
	exports["Dictionary"] = Dictionary;
	exports["JS_Parse_Error"] = JS_Parse_Error;
	exports["MAP"] = MAP;
	exports["OutputStream"] = OutputStream;
//	exports["SourceMap"] = SourceMap;
	exports["TreeTransformer"] = TreeTransformer;
	exports["TreeWalker"] = TreeWalker;
	exports["base54"] = base54;
	exports["defaults"] = defaults;
//	exports["mangle_properties"] = mangle_properties;
	exports["merge"] = merge;
	exports["parse"] = parse;
	exports["push_uniq"] = push_uniq;
	exports["string_template"] = string_template;
	exports["tokenizer"] = tokenizer;
	exports["is_identifier"] = is_identifier;
	exports["SymbolDef"] = SymbolDef;
	//#endregion

	//#region URL: /tools/node
	exports.minify = function(code, options) {
		options = defaults(options, {
			spidermonkey     : false,
			outSourceMap     : null,
			outFileName      : null,
			sourceRoot       : null,
			inSourceMap      : null,
			sourceMapUrl     : null,
			sourceMapInline  : false,
			fromString       : true,
			warnings         : false,
			mangle           : {},
			mangleProperties : false,
			nameCache        : null,
			output           : null,
			compress         : {},
			parse            : {}
		});
		base54.reset();

		// 1. parse
		var toplevel = parse(code, options.parse);

		// 2. compress
		if (options.compress) {
			var compress = { warnings: options.warnings };
			merge(compress, options.compress);
			toplevel.figure_out_scope(options.mangle);
			var sq = Compressor(compress);
			toplevel = sq.compress(toplevel);
		}
		
//		// 3. mangle properties
//		if (options.mangleProperties || options.nameCache) {
//			options.mangleProperties.cache = readNameCache(options.nameCache, "props");
//			toplevel = mangle_properties(toplevel, options.mangleProperties);
//			writeNameCache(options.nameCache, "props", options.mangleProperties.cache);
//		}

		// 4. mangle
		if (options.mangle) {
			toplevel.figure_out_scope(options.mangle);
			toplevel.compute_char_frequency(options.mangle);
			toplevel.mangle_names(options.mangle);
		}
		
		// 5. output
		var stream = OutputStream(options.output);
		toplevel.print(stream);
		return {
			code : stream + ""
		};
	};
	//#endregion
	
	return exports;
 })();