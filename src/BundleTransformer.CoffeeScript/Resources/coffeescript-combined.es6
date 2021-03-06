/*!
 * Object.assign polyfill
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
 */
if (!Object.hasOwnProperty('assign')) {
	Object.assign = function (target) {
		var result,
			argIndex,
			argCount,
			nextSource,
			propName,
			methodName = 'Object.assign'
			;

		if (typeof target === 'undefined' || target === null) {
			throw new TypeError(methodName + ': argument is not an Object.');
		}

		result = Object(target);
		argCount = arguments.length;

		for (argIndex = 1; argIndex < argCount; argIndex++) {
			nextSource = arguments[argIndex];

			if (typeof nextSource !== 'undefined' && nextSource !== null) {
				for (propName in nextSource) {
					if (Object.prototype.hasOwnProperty.call(nextSource, propName)) {
						result[propName] = nextSource[propName];
					}
				}
			}
		}

		return result;
	};
}

/*!
 * CoffeeScript Compiler v2.3.1
 * http://coffeescript.org
 *
 * Copyright 2009-2018 Jeremy Ashkenas
 * Released under the MIT License
 */
var CoffeeScript = (function(){
	var modules = {},
		loadedModules = {},
		require = function(name) {
			var result;

			if (typeof loadedModules[name] !== 'undefined') {
				result = loadedModules[name];
			}
			else {
				if (typeof modules[name] !== 'undefined') {
					result = modules[name].call(this);

					loadedModules[name] = (typeof result !== 'undefined') ? result : null;
					modules[name] = undefined;
				}
				else {
					throw new Error("Can't load '" + name + "' module.");
				}
			}

			return result;
		}
		;

	//#region URL: /helpers
	modules['/helpers'] = function() {
		var exports = {};
		// This file contains the common helper functions that we'd like to share among
		// the **Lexer**, **Rewriter**, and the **Nodes**. Merge objects, flatten
		// arrays, count characters, that sort of thing.

		// Peek at the beginning of a given string to see if it matches a sequence.
		var attachCommentsToNode, buildLocationData, buildLocationHash, buildTokenDataDictionary, extend, flatten, ref, repeat, syntaxErrorToString;

		exports.starts = function(string, literal, start) {
			return literal === string.substr(start, literal.length);
		};

		// Peek at the end of a given string to see if it matches a sequence.
		exports.ends = function(string, literal, back) {
			var len;
			len = literal.length;
			return literal === string.substr(string.length - len - (back || 0), len);
		};

		// Repeat a string `n` times.
		exports.repeat = repeat = function(str, n) {
			var res;
			// Use clever algorithm to have O(log(n)) string concatenation operations.
			res = '';
			while (n > 0) {
				if (n & 1) {
					res += str;
				}
				n >>>= 1;
				str += str;
			}
			return res;
		};

		// Trim out all falsy values from an array.
		exports.compact = function(array) {
			var i, item, len1, results;
			results = [];
			for (i = 0, len1 = array.length; i < len1; i++) {
				item = array[i];
				if (item) {
					results.push(item);
				}
			}
			return results;
		};

		// Count the number of occurrences of a string in a string.
		exports.count = function(string, substr) {
			var num, pos;
			num = pos = 0;
			if (!substr.length) {
				return 1 / 0;
			}
			while (pos = 1 + string.indexOf(substr, pos)) {
				num++;
			}
			return num;
		};

		// Merge objects, returning a fresh copy with attributes from both sides.
		// Used every time `Base#compile` is called, to allow properties in the
		// options hash to propagate down the tree without polluting other branches.
		exports.merge = function(options, overrides) {
			return extend(extend({}, options), overrides);
		};

		// Extend a source object with the properties of another object (shallow copy).
		extend = exports.extend = function(object, properties) {
			var key, val;
			for (key in properties) {
				val = properties[key];
				object[key] = val;
			}
			return object;
		};

		// Return a flattened version of an array.
		// Handy for getting a list of `children` from the nodes.
		exports.flatten = flatten = function(array) {
			var element, flattened, i, len1;
			flattened = [];
			for (i = 0, len1 = array.length; i < len1; i++) {
				element = array[i];
				if ('[object Array]' === Object.prototype.toString.call(element)) {
					flattened = flattened.concat(flatten(element));
				} else {
					flattened.push(element);
				}
			}
			return flattened;
		};

		// Delete a key from an object, returning the value. Useful when a node is
		// looking for a particular method in an options hash.
		exports.del = function(obj, key) {
			var val;
			val = obj[key];
			delete obj[key];
			return val;
		};

		// Typical Array::some
		exports.some = (ref = Array.prototype.some) != null ? ref : function(fn) {
			var e, i, len1, ref1;
			ref1 = this;
			for (i = 0, len1 = ref1.length; i < len1; i++) {
				e = ref1[i];
				if (fn(e)) {
					return true;
				}
			}
			return false;
		};

		// Helper function for extracting code from Literate CoffeeScript by stripping
		// out all non-code blocks, producing a string of CoffeeScript code that can
		// be compiled “normally.”
		exports.invertLiterate = function(code) {
			var blankLine, i, indented, insideComment, len1, line, listItemStart, out, ref1;
			out = [];
			blankLine = /^\s*$/;
			indented = /^[\t ]/;
			listItemStart = /^(?:\t?| {0,3})(?:[\*\-\+]|[0-9]{1,9}\.)[ \t]/; // Up to one tab, or up to three spaces, or neither;
			// followed by `*`, `-` or `+`;
			// or by an integer up to 9 digits long, followed by a period;
			// followed by a space or a tab.
			insideComment = false;
			ref1 = code.split('\n');
			for (i = 0, len1 = ref1.length; i < len1; i++) {
				line = ref1[i];
				if (blankLine.test(line)) {
					insideComment = false;
					out.push(line);
				} else if (insideComment || listItemStart.test(line)) {
					insideComment = true;
					out.push(`# ${line}`);
				} else if (!insideComment && indented.test(line)) {
					out.push(line);
				} else {
					insideComment = true;
					out.push(`# ${line}`);
				}
			}
			return out.join('\n');
		};

		// Merge two jison-style location data objects together.
		// If `last` is not provided, this will simply return `first`.
		buildLocationData = function(first, last) {
			if (!last) {
				return first;
			} else {
				return {
					first_line: first.first_line,
					first_column: first.first_column,
					last_line: last.last_line,
					last_column: last.last_column
				};
			}
		};

		buildLocationHash = function(loc) {
			return `${loc.first_line}x${loc.first_column}-${loc.last_line}x${loc.last_column}`;
		};

		// Build a dictionary of extra token properties organized by tokens’ locations
		// used as lookup hashes.
		buildTokenDataDictionary = function(parserState) {
			var base, i, len1, ref1, token, tokenData, tokenHash;
			tokenData = {};
			ref1 = parserState.parser.tokens;
			for (i = 0, len1 = ref1.length; i < len1; i++) {
				token = ref1[i];
				if (!token.comments) {
					continue;
				}
				tokenHash = buildLocationHash(token[2]);
				// Multiple tokens might have the same location hash, such as the generated
				// `JS` tokens added at the start or end of the token stream to hold
				// comments that start or end a file.
				if (tokenData[tokenHash] == null) {
					tokenData[tokenHash] = {};
				}
				if (token.comments) { // `comments` is always an array.
					// For “overlapping” tokens, that is tokens with the same location data
					// and therefore matching `tokenHash`es, merge the comments from both/all
					// tokens together into one array, even if there are duplicate comments;
					// they will get sorted out later.
					((base = tokenData[tokenHash]).comments != null ? base.comments : base.comments = []).push(...token.comments);
				}
			}
			return tokenData;
		};

		// This returns a function which takes an object as a parameter, and if that
		// object is an AST node, updates that object's locationData.
		// The object is returned either way.
		exports.addDataToNode = function(parserState, first, last) {
			return function(obj) {
				var objHash, ref1;
				// Add location data.
				if (((obj != null ? obj.updateLocationDataIfMissing : void 0) != null) && (first != null)) {
					obj.updateLocationDataIfMissing(buildLocationData(first, last));
				}
				// Add comments, building the dictionary of token data if it hasn’t been
				// built yet.
				if (parserState.tokenData == null) {
					parserState.tokenData = buildTokenDataDictionary(parserState);
				}
				if (obj.locationData != null) {
					objHash = buildLocationHash(obj.locationData);
					if (((ref1 = parserState.tokenData[objHash]) != null ? ref1.comments : void 0) != null) {
						attachCommentsToNode(parserState.tokenData[objHash].comments, obj);
					}
				}
				return obj;
			};
		};

		exports.attachCommentsToNode = attachCommentsToNode = function(comments, node) {
			if ((comments == null) || comments.length === 0) {
				return;
			}
			if (node.comments == null) {
				node.comments = [];
			}
			return node.comments.push(...comments);
		};

		// Convert jison location data to a string.
		// `obj` can be a token, or a locationData.
		exports.locationDataToString = function(obj) {
			var locationData;
			if (("2" in obj) && ("first_line" in obj[2])) {
				locationData = obj[2];
			} else if ("first_line" in obj) {
				locationData = obj;
			}
			if (locationData) {
				return `${locationData.first_line + 1}:${locationData.first_column + 1}-` + `${locationData.last_line + 1}:${locationData.last_column + 1}`;
			} else {
				return "No location data";
			}
		};

		// A `.coffee.md` compatible version of `basename`, that returns the file sans-extension.
		exports.baseFileName = function(file, stripExt = false, useWinPathSep = false) {
			var parts, pathSep;
			pathSep = useWinPathSep ? /\\|\// : /\//;
			parts = file.split(pathSep);
			file = parts[parts.length - 1];
			if (!(stripExt && file.indexOf('.') >= 0)) {
				return file;
			}
			parts = file.split('.');
			parts.pop();
			if (parts[parts.length - 1] === 'coffee' && parts.length > 1) {
				parts.pop();
			}
			return parts.join('.');
		};

		// Determine if a filename represents a CoffeeScript file.
		exports.isCoffee = function(file) {
			return /\.((lit)?coffee|coffee\.md)$/.test(file);
		};

		// Determine if a filename represents a Literate CoffeeScript file.
		exports.isLiterate = function(file) {
			return /\.(litcoffee|coffee\.md)$/.test(file);
		};

		// Throws a SyntaxError from a given location.
		// The error's `toString` will return an error message following the "standard"
		// format `<filename>:<line>:<col>: <message>` plus the line with the error and a
		// marker showing where the error is.
		exports.throwSyntaxError = function(message, location) {
			var error;
			error = new SyntaxError(message);
			error.location = location;
			error.toString = syntaxErrorToString;
			// Instead of showing the compiler's stacktrace, show our custom error message
			// (this is useful when the error bubbles up in Node.js applications that
			// compile CoffeeScript for example).
			error.stack = error.toString();
			throw error;
		};

		// Update a compiler SyntaxError with source code information if it didn't have
		// it already.
		exports.updateSyntaxError = function(error, code, filename) {
			// Avoid screwing up the `stack` property of other errors (i.e. possible bugs).
			if (error.toString === syntaxErrorToString) {
				error.code || (error.code = code);
				error.filename || (error.filename = filename);
				error.stack = error.toString();
			}
			return error;
		};

		syntaxErrorToString = function() {
			var codeLine, colorize, colorsEnabled, end, filename, first_column, first_line, last_column, last_line, marker, ref1, ref2, ref3, start;
			if (!(this.code && this.location)) {
				return Error.prototype.toString.call(this);
			}
			({first_line, first_column, last_line, last_column} = this.location);
			if (last_line == null) {
				last_line = first_line;
			}
			if (last_column == null) {
				last_column = first_column;
			}
			filename = this.filename || '[stdin]';
			codeLine = this.code.split('\n')[first_line];
			start = first_column;
			// Show only the first line on multi-line errors.
			end = first_line === last_line ? last_column + 1 : codeLine.length;
			marker = codeLine.slice(0, start).replace(/[^\s]/g, ' ') + repeat('^', end - start);
			// Check to see if we're running on a color-enabled TTY.
			if (typeof process !== "undefined" && process !== null) {
				colorsEnabled = ((ref1 = process.stdout) != null ? ref1.isTTY : void 0) && !((ref2 = process.env) != null ? ref2.NODE_DISABLE_COLORS : void 0);
			}
			if ((ref3 = this.colorful) != null ? ref3 : colorsEnabled) {
				colorize = function(str) {
					return `\x1B[1;31m${str}\x1B[0m`;
				};
				codeLine = codeLine.slice(0, start) + colorize(codeLine.slice(start, end)) + codeLine.slice(end);
				marker = colorize(marker);
			}
			return `${filename}:${first_line + 1}:${first_column + 1}: error: ${this.message}\n${codeLine}\n${marker}`;
		};

		exports.nameWhitespaceCharacter = function(string) {
			switch (string) {
				case ' ':
					return 'space';
				case '\n':
					return 'newline';
				case '\r':
					return 'carriage return';
				case '\t':
					return 'tab';
				default:
					return string;
			}
		};

		return exports;
	};
	//#endregion

	//#region URL: /rewriter
	modules['/rewriter'] = function() {
		var exports = {};
		// The CoffeeScript language has a good deal of optional syntax, implicit syntax,
		// and shorthand syntax. This can greatly complicate a grammar and bloat
		// the resulting parse table. Instead of making the parser handle it all, we take
		// a series of passes over the token stream, using this **Rewriter** to convert
		// shorthand into the unambiguous long form, add implicit indentation and
		// parentheses, and generally clean things up.
		var BALANCED_PAIRS, CALL_CLOSERS, CONTROL_IN_IMPLICIT, DISCARDED, EXPRESSION_CLOSE, EXPRESSION_END, EXPRESSION_START, IMPLICIT_CALL, IMPLICIT_END, IMPLICIT_FUNC, IMPLICIT_UNSPACED_CALL, INVERSES, LINEBREAKS, Rewriter, SINGLE_CLOSERS, SINGLE_LINERS, generate, k, left, len, moveComments, right, throwSyntaxError,
			indexOf = [].indexOf;

		({throwSyntaxError} = require('/helpers'));

		// Move attached comments from one token to another.
		moveComments = function(fromToken, toToken) {
			var comment, k, len, ref, unshiftedComments;
			if (!fromToken.comments) {
				return;
			}
			if (toToken.comments && toToken.comments.length !== 0) {
				unshiftedComments = [];
				ref = fromToken.comments;
				for (k = 0, len = ref.length; k < len; k++) {
					comment = ref[k];
					if (comment.unshift) {
						unshiftedComments.push(comment);
					} else {
						toToken.comments.push(comment);
					}
				}
				toToken.comments = unshiftedComments.concat(toToken.comments);
			} else {
				toToken.comments = fromToken.comments;
			}
			return delete fromToken.comments;
		};

		// Create a generated token: one that exists due to a use of implicit syntax.
		// Optionally have this new token take the attached comments from another token.
		generate = function(tag, value, origin, commentsToken) {
			var token;
			token = [tag, value];
			token.generated = true;
			if (origin) {
				token.origin = origin;
			}
			if (commentsToken) {
				moveComments(commentsToken, token);
			}
			return token;
		};

		// The **Rewriter** class is used by the [Lexer](lexer.html), directly against
		// its internal array of tokens.
		exports.Rewriter = Rewriter = (function() {
			class Rewriter {
				// Rewrite the token stream in multiple passes, one logical filter at
				// a time. This could certainly be changed into a single pass through the
				// stream, with a big ol’ efficient switch, but it’s much nicer to work with
				// like this. The order of these passes matters—indentation must be
				// corrected before implicit parentheses can be wrapped around blocks of code.
				rewrite(tokens1) {
					var ref, ref1, t;
					this.tokens = tokens1;
					// Set environment variable `DEBUG_TOKEN_STREAM` to `true` to output token
					// debugging info. Also set `DEBUG_REWRITTEN_TOKEN_STREAM` to `true` to
					// output the token stream after it has been rewritten by this file.
					if (typeof process !== "undefined" && process !== null ? (ref = process.env) != null ? ref.DEBUG_TOKEN_STREAM : void 0 : void 0) {
						if (process.env.DEBUG_REWRITTEN_TOKEN_STREAM) {
							console.log('Initial token stream:');
						}
						console.log(((function() {
							var k, len, ref1, results;
							ref1 = this.tokens;
							results = [];
							for (k = 0, len = ref1.length; k < len; k++) {
								t = ref1[k];
								results.push(t[0] + '/' + t[1] + (t.comments ? '*' : ''));
							}
							return results;
						}).call(this)).join(' '));
					}
					this.removeLeadingNewlines();
					this.closeOpenCalls();
					this.closeOpenIndexes();
					this.normalizeLines();
					this.tagPostfixConditionals();
					this.addImplicitBracesAndParens();
					this.addParensToChainedDoIife();
					this.rescueStowawayComments();
					this.addLocationDataToGeneratedTokens();
					this.enforceValidCSXAttributes();
					this.fixOutdentLocationData();
					if (typeof process !== "undefined" && process !== null ? (ref1 = process.env) != null ? ref1.DEBUG_REWRITTEN_TOKEN_STREAM : void 0 : void 0) {
						if (process.env.DEBUG_TOKEN_STREAM) {
							console.log('Rewritten token stream:');
						}
						console.log(((function() {
							var k, len, ref2, results;
							ref2 = this.tokens;
							results = [];
							for (k = 0, len = ref2.length; k < len; k++) {
								t = ref2[k];
								results.push(t[0] + '/' + t[1] + (t.comments ? '*' : ''));
							}
							return results;
						}).call(this)).join(' '));
					}
					return this.tokens;
				}

				// Rewrite the token stream, looking one token ahead and behind.
				// Allow the return value of the block to tell us how many tokens to move
				// forwards (or backwards) in the stream, to make sure we don’t miss anything
				// as tokens are inserted and removed, and the stream changes length under
				// our feet.
				scanTokens(block) {
					var i, token, tokens;
					({tokens} = this);
					i = 0;
					while (token = tokens[i]) {
						i += block.call(this, token, i, tokens);
					}
					return true;
				}

				detectEnd(i, condition, action, opts = {}) {
					var levels, ref, ref1, token, tokens;
					({tokens} = this);
					levels = 0;
					while (token = tokens[i]) {
						if (levels === 0 && condition.call(this, token, i)) {
							return action.call(this, token, i);
						}
						if (ref = token[0], indexOf.call(EXPRESSION_START, ref) >= 0) {
							levels += 1;
						} else if (ref1 = token[0], indexOf.call(EXPRESSION_END, ref1) >= 0) {
							levels -= 1;
						}
						if (levels < 0) {
							if (opts.returnOnNegativeLevel) {
								return;
							}
							return action.call(this, token, i);
						}
						i += 1;
					}
					return i - 1;
				}

				// Leading newlines would introduce an ambiguity in the grammar, so we
				// dispatch them here.
				removeLeadingNewlines() {
					var i, k, l, leadingNewlineToken, len, len1, ref, ref1, tag;
					ref = this.tokens;
					for (i = k = 0, len = ref.length; k < len; i = ++k) {
						[tag] = ref[i];
						if (tag !== 'TERMINATOR') {
							// Find the index of the first non-`TERMINATOR` token.
							break;
						}
					}
					if (i === 0) {
						return;
					}
					ref1 = this.tokens.slice(0, i);
					// If there are any comments attached to the tokens we’re about to discard,
					// shift them forward to what will become the new first token.
					for (l = 0, len1 = ref1.length; l < len1; l++) {
						leadingNewlineToken = ref1[l];
						moveComments(leadingNewlineToken, this.tokens[i]);
					}
					// Discard all the leading newline tokens.
					return this.tokens.splice(0, i);
				}

				// The lexer has tagged the opening parenthesis of a method call. Match it with
				// its paired close.
				closeOpenCalls() {
					var action, condition;
					condition = function(token, i) {
						var ref;
						return (ref = token[0]) === ')' || ref === 'CALL_END';
					};
					action = function(token, i) {
						return token[0] = 'CALL_END';
					};
					return this.scanTokens(function(token, i) {
						if (token[0] === 'CALL_START') {
							this.detectEnd(i + 1, condition, action);
						}
						return 1;
					});
				}

				// The lexer has tagged the opening bracket of an indexing operation call.
				// Match it with its paired close.
				closeOpenIndexes() {
					var action, condition;
					condition = function(token, i) {
						var ref;
						return (ref = token[0]) === ']' || ref === 'INDEX_END';
					};
					action = function(token, i) {
						return token[0] = 'INDEX_END';
					};
					return this.scanTokens(function(token, i) {
						if (token[0] === 'INDEX_START') {
							this.detectEnd(i + 1, condition, action);
						}
						return 1;
					});
				}

				// Match tags in token stream starting at `i` with `pattern`.
				// `pattern` may consist of strings (equality), an array of strings (one of)
				// or null (wildcard). Returns the index of the match or -1 if no match.
				indexOfTag(i, ...pattern) {
					var fuzz, j, k, ref, ref1;
					fuzz = 0;
					for (j = k = 0, ref = pattern.length; (0 <= ref ? k < ref : k > ref); j = 0 <= ref ? ++k : --k) {
						if (pattern[j] == null) {
							continue;
						}
						if (typeof pattern[j] === 'string') {
							pattern[j] = [pattern[j]];
						}
						if (ref1 = this.tag(i + j + fuzz), indexOf.call(pattern[j], ref1) < 0) {
							return -1;
						}
					}
					return i + j + fuzz - 1;
				}

				// Returns `yes` if standing in front of something looking like
				// `@<x>:`, `<x>:` or `<EXPRESSION_START><x>...<EXPRESSION_END>:`.
				looksObjectish(j) {
					var end, index;
					if (this.indexOfTag(j, '@', null, ':') !== -1 || this.indexOfTag(j, null, ':') !== -1) {
						return true;
					}
					index = this.indexOfTag(j, EXPRESSION_START);
					if (index !== -1) {
						end = null;
						this.detectEnd(index + 1, (function(token) {
							var ref;
							return ref = token[0], indexOf.call(EXPRESSION_END, ref) >= 0;
						}), (function(token, i) {
							return end = i;
						}));
						if (this.tag(end + 1) === ':') {
							return true;
						}
					}
					return false;
				}

				// Returns `yes` if current line of tokens contain an element of tags on same
				// expression level. Stop searching at `LINEBREAKS` or explicit start of
				// containing balanced expression.
				findTagsBackwards(i, tags) {
					var backStack, ref, ref1, ref2, ref3, ref4, ref5;
					backStack = [];
					while (i >= 0 && (backStack.length || (ref2 = this.tag(i), indexOf.call(tags, ref2) < 0) && ((ref3 = this.tag(i), indexOf.call(EXPRESSION_START, ref3) < 0) || this.tokens[i].generated) && (ref4 = this.tag(i), indexOf.call(LINEBREAKS, ref4) < 0))) {
						if (ref = this.tag(i), indexOf.call(EXPRESSION_END, ref) >= 0) {
							backStack.push(this.tag(i));
						}
						if ((ref1 = this.tag(i), indexOf.call(EXPRESSION_START, ref1) >= 0) && backStack.length) {
							backStack.pop();
						}
						i -= 1;
					}
					return ref5 = this.tag(i), indexOf.call(tags, ref5) >= 0;
				}

				// Look for signs of implicit calls and objects in the token stream and
				// add them.
				addImplicitBracesAndParens() {
					var stack, start;
					// Track current balancing depth (both implicit and explicit) on stack.
					stack = [];
					start = null;
					return this.scanTokens(function(token, i, tokens) {
						var endImplicitCall, endImplicitObject, forward, implicitObjectContinues, inControlFlow, inImplicit, inImplicitCall, inImplicitControl, inImplicitObject, isImplicit, isImplicitCall, isImplicitObject, k, newLine, nextTag, nextToken, offset, prevTag, prevToken, ref, ref1, ref2, s, sameLine, stackIdx, stackItem, stackTag, stackTop, startIdx, startImplicitCall, startImplicitObject, startsLine, tag;
						[tag] = token;
						[prevTag] = prevToken = i > 0 ? tokens[i - 1] : [];
						[nextTag] = nextToken = i < tokens.length - 1 ? tokens[i + 1] : [];
						stackTop = function() {
							return stack[stack.length - 1];
						};
						startIdx = i;
						// Helper function, used for keeping track of the number of tokens consumed
						// and spliced, when returning for getting a new token.
						forward = function(n) {
							return i - startIdx + n;
						};
						// Helper functions
						isImplicit = function(stackItem) {
							var ref;
							return stackItem != null ? (ref = stackItem[2]) != null ? ref.ours : void 0 : void 0;
						};
						isImplicitObject = function(stackItem) {
							return isImplicit(stackItem) && (stackItem != null ? stackItem[0] : void 0) === '{';
						};
						isImplicitCall = function(stackItem) {
							return isImplicit(stackItem) && (stackItem != null ? stackItem[0] : void 0) === '(';
						};
						inImplicit = function() {
							return isImplicit(stackTop());
						};
						inImplicitCall = function() {
							return isImplicitCall(stackTop());
						};
						inImplicitObject = function() {
							return isImplicitObject(stackTop());
						};
						// Unclosed control statement inside implicit parens (like
						// class declaration or if-conditionals).
						inImplicitControl = function() {
							var ref;
							return inImplicit() && ((ref = stackTop()) != null ? ref[0] : void 0) === 'CONTROL';
						};
						startImplicitCall = function(idx) {
							stack.push([
								'(',
								idx,
								{
									ours: true
								}
							]);
							return tokens.splice(idx, 0, generate('CALL_START', '(', ['', 'implicit function call', token[2]], prevToken));
						};
						endImplicitCall = function() {
							stack.pop();
							tokens.splice(i, 0, generate('CALL_END', ')', ['', 'end of input', token[2]], prevToken));
							return i += 1;
						};
						startImplicitObject = function(idx, startsLine = true) {
							var val;
							stack.push([
								'{',
								idx,
								{
									sameLine: true,
									startsLine: startsLine,
									ours: true
								}
							]);
							val = new String('{');
							val.generated = true;
							return tokens.splice(idx, 0, generate('{', val, token, prevToken));
						};
						endImplicitObject = function(j) {
							j = j != null ? j : i;
							stack.pop();
							tokens.splice(j, 0, generate('}', '}', token, prevToken));
							return i += 1;
						};
						implicitObjectContinues = (j) => {
							var nextTerminatorIdx;
							nextTerminatorIdx = null;
							this.detectEnd(j, function(token) {
								return token[0] === 'TERMINATOR';
							}, function(token, i) {
								return nextTerminatorIdx = i;
							}, {
								returnOnNegativeLevel: true
							});
							if (nextTerminatorIdx == null) {
								return false;
							}
							return this.looksObjectish(nextTerminatorIdx + 1);
						};
						// Don’t end an implicit call/object on next indent if any of these are in an argument/value.
						if ((inImplicitCall() || inImplicitObject()) && indexOf.call(CONTROL_IN_IMPLICIT, tag) >= 0 || inImplicitObject() && prevTag === ':' && tag === 'FOR') {
							stack.push([
								'CONTROL',
								i,
								{
									ours: true
								}
							]);
							return forward(1);
						}
						if (tag === 'INDENT' && inImplicit()) {
							// An `INDENT` closes an implicit call unless

							//  1. We have seen a `CONTROL` argument on the line.
							//  2. The last token before the indent is part of the list below.
							if (prevTag !== '=>' && prevTag !== '->' && prevTag !== '[' && prevTag !== '(' && prevTag !== ',' && prevTag !== '{' && prevTag !== 'ELSE' && prevTag !== '=') {
								while (inImplicitCall() || inImplicitObject() && prevTag !== ':') {
									if (inImplicitCall()) {
										endImplicitCall();
									} else {
										endImplicitObject();
									}
								}
							}
							if (inImplicitControl()) {
								stack.pop();
							}
							stack.push([tag, i]);
							return forward(1);
						}
						// Straightforward start of explicit expression.
						if (indexOf.call(EXPRESSION_START, tag) >= 0) {
							stack.push([tag, i]);
							return forward(1);
						}
						// Close all implicit expressions inside of explicitly closed expressions.
						if (indexOf.call(EXPRESSION_END, tag) >= 0) {
							while (inImplicit()) {
								if (inImplicitCall()) {
									endImplicitCall();
								} else if (inImplicitObject()) {
									endImplicitObject();
								} else {
									stack.pop();
								}
							}
							start = stack.pop();
						}
						inControlFlow = () => {
							var controlFlow, isFunc, seenFor, tagCurrentLine;
							seenFor = this.findTagsBackwards(i, ['FOR']) && this.findTagsBackwards(i, ['FORIN', 'FOROF', 'FORFROM']);
							controlFlow = seenFor || this.findTagsBackwards(i, ['WHILE', 'UNTIL', 'LOOP', 'LEADING_WHEN']);
							if (!controlFlow) {
								return false;
							}
							isFunc = false;
							tagCurrentLine = token[2].first_line;
							this.detectEnd(i, function(token, i) {
								var ref;
								return ref = token[0], indexOf.call(LINEBREAKS, ref) >= 0;
							}, function(token, i) {
								var first_line;
								[prevTag, , {first_line}] = tokens[i - 1] || [];
								return isFunc = tagCurrentLine === first_line && (prevTag === '->' || prevTag === '=>');
							}, {
								returnOnNegativeLevel: true
							});
							return isFunc;
						};
						// Recognize standard implicit calls like
						// f a, f() b, f? c, h[0] d etc.
						// Added support for spread dots on the left side: f ...a
						if ((indexOf.call(IMPLICIT_FUNC, tag) >= 0 && token.spaced || tag === '?' && i > 0 && !tokens[i - 1].spaced) && (indexOf.call(IMPLICIT_CALL, nextTag) >= 0 || (nextTag === '...' && (ref = this.tag(i + 2), indexOf.call(IMPLICIT_CALL, ref) >= 0) && !this.findTagsBackwards(i, ['INDEX_START', '['])) || indexOf.call(IMPLICIT_UNSPACED_CALL, nextTag) >= 0 && !nextToken.spaced && !nextToken.newLine) && !inControlFlow()) {
							if (tag === '?') {
								tag = token[0] = 'FUNC_EXIST';
							}
							startImplicitCall(i + 1);
							return forward(2);
						}
						// Implicit call taking an implicit indented object as first argument.

						//     f
						//       a: b
						//       c: d

						// Don’t accept implicit calls of this type, when on the same line
						// as the control structures below as that may misinterpret constructs like:

						//     if f
						//        a: 1
						// as

						//     if f(a: 1)

						// which is probably always unintended.
						// Furthermore don’t allow this in literal arrays, as
						// that creates grammatical ambiguities.
						if (indexOf.call(IMPLICIT_FUNC, tag) >= 0 && this.indexOfTag(i + 1, 'INDENT') > -1 && this.looksObjectish(i + 2) && !this.findTagsBackwards(i, ['CLASS', 'EXTENDS', 'IF', 'CATCH', 'SWITCH', 'LEADING_WHEN', 'FOR', 'WHILE', 'UNTIL'])) {
							startImplicitCall(i + 1);
							stack.push(['INDENT', i + 2]);
							return forward(3);
						}
						// Implicit objects start here.
						if (tag === ':') {
							// Go back to the (implicit) start of the object.
							s = (function() {
								var ref1;
								switch (false) {
									case ref1 = this.tag(i - 1), indexOf.call(EXPRESSION_END, ref1) < 0:
										return start[1];
									case this.tag(i - 2) !== '@':
										return i - 2;
									default:
										return i - 1;
								}
							}).call(this);
							startsLine = s <= 0 || (ref1 = this.tag(s - 1), indexOf.call(LINEBREAKS, ref1) >= 0) || tokens[s - 1].newLine;
							// Are we just continuing an already declared object?
							if (stackTop()) {
								[stackTag, stackIdx] = stackTop();
								if ((stackTag === '{' || stackTag === 'INDENT' && this.tag(stackIdx - 1) === '{') && (startsLine || this.tag(s - 1) === ',' || this.tag(s - 1) === '{')) {
									return forward(1);
								}
							}
							startImplicitObject(s, !!startsLine);
							return forward(2);
						}
						// End implicit calls when chaining method calls
						// like e.g.:

						//     f ->
						//       a
						//     .g b, ->
						//       c
						//     .h a

						// and also

						//     f a
						//     .g b
						//     .h a

						// Mark all enclosing objects as not sameLine
						if (indexOf.call(LINEBREAKS, tag) >= 0) {
							for (k = stack.length - 1; k >= 0; k += -1) {
								stackItem = stack[k];
								if (!isImplicit(stackItem)) {
									break;
								}
								if (isImplicitObject(stackItem)) {
									stackItem[2].sameLine = false;
								}
							}
						}
						newLine = prevTag === 'OUTDENT' || prevToken.newLine;
						if (indexOf.call(IMPLICIT_END, tag) >= 0 || (indexOf.call(CALL_CLOSERS, tag) >= 0 && newLine) || ((tag === '..' || tag === '...') && this.findTagsBackwards(i, ["INDEX_START"]))) {
							while (inImplicit()) {
								[stackTag, stackIdx, {sameLine, startsLine}] = stackTop();
								// Close implicit calls when reached end of argument list
								if (inImplicitCall() && prevTag !== ',' || (prevTag === ',' && tag === 'TERMINATOR' && (nextTag == null))) {
									endImplicitCall();
								// Close implicit objects such as:
								// return a: 1, b: 2 unless true
								} else if (inImplicitObject() && sameLine && tag !== 'TERMINATOR' && prevTag !== ':' && !((tag === 'POST_IF' || tag === 'FOR' || tag === 'WHILE' || tag === 'UNTIL') && startsLine && implicitObjectContinues(i + 1))) {
									endImplicitObject();
								// Close implicit objects when at end of line, line didn't end with a comma
								// and the implicit object didn't start the line or the next line doesn’t look like
								// the continuation of an object.
								} else if (inImplicitObject() && tag === 'TERMINATOR' && prevTag !== ',' && !(startsLine && this.looksObjectish(i + 1))) {
									endImplicitObject();
								} else if (inImplicitControl() && tokens[stackTop()[1]][0] === 'CLASS' && tag === 'TERMINATOR') {
									stack.pop();
								} else {
									break;
								}
							}
						}
						// Close implicit object if comma is the last character
						// and what comes after doesn’t look like it belongs.
						// This is used for trailing commas and calls, like:

						//     x =
						//         a: b,
						//         c: d,
						//     e = 2

						// and

						//     f a, b: c, d: e, f, g: h: i, j

						if (tag === ',' && !this.looksObjectish(i + 1) && inImplicitObject() && !((ref2 = this.tag(i + 2)) === 'FOROF' || ref2 === 'FORIN') && (nextTag !== 'TERMINATOR' || !this.looksObjectish(i + 2))) {
							// When nextTag is OUTDENT the comma is insignificant and
							// should just be ignored so embed it in the implicit object.

							// When it isn’t the comma go on to play a role in a call or
							// array further up the stack, so give it a chance.
							offset = nextTag === 'OUTDENT' ? 1 : 0;
							while (inImplicitObject()) {
								endImplicitObject(i + offset);
							}
						}
						return forward(1);
					});
				}

				// Make sure only strings and wrapped expressions are used in CSX attributes.
				enforceValidCSXAttributes() {
					return this.scanTokens(function(token, i, tokens) {
						var next, ref;
						if (token.csxColon) {
							next = tokens[i + 1];
							if ((ref = next[0]) !== 'STRING_START' && ref !== 'STRING' && ref !== '(') {
								throwSyntaxError('expected wrapped or quoted JSX attribute', next[2]);
							}
						}
						return 1;
					});
				}

				// Not all tokens survive processing by the parser. To avoid comments getting
				// lost into the ether, find comments attached to doomed tokens and move them
				// to a token that will make it to the other side.
				rescueStowawayComments() {
					var insertPlaceholder, shiftCommentsBackward, shiftCommentsForward;
					insertPlaceholder = function(token, j, tokens, method) {
						if (tokens[j][0] !== 'TERMINATOR') {
							tokens[method](generate('TERMINATOR', '\n', tokens[j]));
						}
						return tokens[method](generate('JS', '', tokens[j], token));
					};
					shiftCommentsForward = function(token, i, tokens) {
						var comment, j, k, len, ref, ref1, ref2;
						// Find the next surviving token and attach this token’s comments to it,
						// with a flag that we know to output such comments *before* that
						// token’s own compilation. (Otherwise comments are output following
						// the token they’re attached to.)
						j = i;
						while (j !== tokens.length && (ref = tokens[j][0], indexOf.call(DISCARDED, ref) >= 0)) {
							j++;
						}
						if (!(j === tokens.length || (ref1 = tokens[j][0], indexOf.call(DISCARDED, ref1) >= 0))) {
							ref2 = token.comments;
							for (k = 0, len = ref2.length; k < len; k++) {
								comment = ref2[k];
								comment.unshift = true;
							}
							moveComments(token, tokens[j]);
							return 1; // All following tokens are doomed!
						} else {
							j = tokens.length - 1;
							insertPlaceholder(token, j, tokens, 'push');
							// The generated tokens were added to the end, not inline, so we don’t skip.
							return 1;
						}
					};
					shiftCommentsBackward = function(token, i, tokens) {
						var j, ref, ref1;
						// Find the last surviving token and attach this token’s comments to it.
						j = i;
						while (j !== -1 && (ref = tokens[j][0], indexOf.call(DISCARDED, ref) >= 0)) {
							j--;
						}
						if (!(j === -1 || (ref1 = tokens[j][0], indexOf.call(DISCARDED, ref1) >= 0))) {
							moveComments(token, tokens[j]);
							return 1; // All previous tokens are doomed!
						} else {
							insertPlaceholder(token, 0, tokens, 'unshift');
							// We added two tokens, so shift forward to account for the insertion.
							return 3;
						}
					};
					return this.scanTokens(function(token, i, tokens) {
						var dummyToken, j, ref, ref1, ret;
						if (!token.comments) {
							return 1;
						}
						ret = 1;
						if (ref = token[0], indexOf.call(DISCARDED, ref) >= 0) {
							// This token won’t survive passage through the parser, so we need to
							// rescue its attached tokens and redistribute them to nearby tokens.
							// Comments that don’t start a new line can shift backwards to the last
							// safe token, while other tokens should shift forward.
							dummyToken = {
								comments: []
							};
							j = token.comments.length - 1;
							while (j !== -1) {
								if (token.comments[j].newLine === false && token.comments[j].here === false) {
									dummyToken.comments.unshift(token.comments[j]);
									token.comments.splice(j, 1);
								}
								j--;
							}
							if (dummyToken.comments.length !== 0) {
								ret = shiftCommentsBackward(dummyToken, i - 1, tokens);
							}
							if (token.comments.length !== 0) {
								shiftCommentsForward(token, i, tokens);
							}
						} else {
							// If any of this token’s comments start a line—there’s only
							// whitespace between the preceding newline and the start of the
							// comment—and this isn’t one of the special `JS` tokens, then
							// shift this comment forward to precede the next valid token.
							// `Block.compileComments` also has logic to make sure that
							// “starting new line” comments follow or precede the nearest
							// newline relative to the token that the comment is attached to,
							// but that newline might be inside a `}` or `)` or other generated
							// token that we really want this comment to output after. Therefore
							// we need to shift the comments here, avoiding such generated and
							// discarded tokens.
							dummyToken = {
								comments: []
							};
							j = token.comments.length - 1;
							while (j !== -1) {
								if (token.comments[j].newLine && !token.comments[j].unshift && !(token[0] === 'JS' && token.generated)) {
									dummyToken.comments.unshift(token.comments[j]);
									token.comments.splice(j, 1);
								}
								j--;
							}
							if (dummyToken.comments.length !== 0) {
								ret = shiftCommentsForward(dummyToken, i + 1, tokens);
							}
						}
						if (((ref1 = token.comments) != null ? ref1.length : void 0) === 0) {
							delete token.comments;
						}
						return ret;
					});
				}

				// Add location data to all tokens generated by the rewriter.
				addLocationDataToGeneratedTokens() {
					return this.scanTokens(function(token, i, tokens) {
						var column, line, nextLocation, prevLocation, ref, ref1;
						if (token[2]) {
							return 1;
						}
						if (!(token.generated || token.explicit)) {
							return 1;
						}
						if (token[0] === '{' && (nextLocation = (ref = tokens[i + 1]) != null ? ref[2] : void 0)) {
							({
								first_line: line,
								first_column: column
							} = nextLocation);
						} else if (prevLocation = (ref1 = tokens[i - 1]) != null ? ref1[2] : void 0) {
							({
								last_line: line,
								last_column: column
							} = prevLocation);
						} else {
							line = column = 0;
						}
						token[2] = {
							first_line: line,
							first_column: column,
							last_line: line,
							last_column: column
						};
						return 1;
					});
				}

				// `OUTDENT` tokens should always be positioned at the last character of the
				// previous token, so that AST nodes ending in an `OUTDENT` token end up with a
				// location corresponding to the last “real” token under the node.
				fixOutdentLocationData() {
					return this.scanTokens(function(token, i, tokens) {
						var prevLocationData;
						if (!(token[0] === 'OUTDENT' || (token.generated && token[0] === 'CALL_END') || (token.generated && token[0] === '}'))) {
							return 1;
						}
						prevLocationData = tokens[i - 1][2];
						token[2] = {
							first_line: prevLocationData.last_line,
							first_column: prevLocationData.last_column,
							last_line: prevLocationData.last_line,
							last_column: prevLocationData.last_column
						};
						return 1;
					});
				}

				// Add parens around a `do` IIFE followed by a chained `.` so that the
				// chaining applies to the executed function rather than the function
				// object (see #3736)
				addParensToChainedDoIife() {
					var action, condition, doIndex;
					condition = function(token, i) {
						return this.tag(i - 1) === 'OUTDENT';
					};
					action = function(token, i) {
						var ref;
						if (ref = token[0], indexOf.call(CALL_CLOSERS, ref) < 0) {
							return;
						}
						this.tokens.splice(doIndex, 0, generate('(', '(', this.tokens[doIndex]));
						return this.tokens.splice(i + 1, 0, generate(')', ')', this.tokens[i]));
					};
					doIndex = null;
					return this.scanTokens(function(token, i, tokens) {
						var glyphIndex, ref;
						if (token[1] !== 'do') {
							return 1;
						}
						doIndex = i;
						glyphIndex = i + 1;
						if (this.tag(i + 1) === 'PARAM_START') {
							glyphIndex = null;
							this.detectEnd(i + 1, function(token, i) {
								return this.tag(i - 1) === 'PARAM_END';
							}, function(token, i) {
								return glyphIndex = i;
							});
						}
						if (!((glyphIndex != null) && ((ref = this.tag(glyphIndex)) === '->' || ref === '=>') && this.tag(glyphIndex + 1) === 'INDENT')) {
							return 1;
						}
						this.detectEnd(glyphIndex + 1, condition, action);
						return 2;
					});
				}

				// Because our grammar is LALR(1), it can’t handle some single-line
				// expressions that lack ending delimiters. The **Rewriter** adds the implicit
				// blocks, so it doesn’t need to. To keep the grammar clean and tidy, trailing
				// newlines within expressions are removed and the indentation tokens of empty
				// blocks are added.
				normalizeLines() {
					var action, closeElseTag, condition, ifThens, indent, leading_if_then, leading_switch_when, outdent, starter;
					starter = indent = outdent = null;
					leading_switch_when = null;
					leading_if_then = null;
					// Count `THEN` tags
					ifThens = [];
					condition = function(token, i) {
						var ref, ref1, ref2, ref3;
						return token[1] !== ';' && (ref = token[0], indexOf.call(SINGLE_CLOSERS, ref) >= 0) && !(token[0] === 'TERMINATOR' && (ref1 = this.tag(i + 1), indexOf.call(EXPRESSION_CLOSE, ref1) >= 0)) && !(token[0] === 'ELSE' && (starter !== 'THEN' || (leading_if_then || leading_switch_when))) && !(((ref2 = token[0]) === 'CATCH' || ref2 === 'FINALLY') && (starter === '->' || starter === '=>')) || (ref3 = token[0], indexOf.call(CALL_CLOSERS, ref3) >= 0) && (this.tokens[i - 1].newLine || this.tokens[i - 1][0] === 'OUTDENT');
					};
					action = function(token, i) {
						if (token[0] === 'ELSE' && starter === 'THEN') {
							ifThens.pop();
						}
						return this.tokens.splice((this.tag(i - 1) === ',' ? i - 1 : i), 0, outdent);
					};
					closeElseTag = (tokens, i) => {
						var lastThen, outdentElse, tlen;
						tlen = ifThens.length;
						if (!(tlen > 0)) {
							return i;
						}
						lastThen = ifThens.pop();
						[, outdentElse] = this.indentation(tokens[lastThen]);
						// Insert `OUTDENT` to close inner `IF`.
						outdentElse[1] = tlen * 2;
						tokens.splice(i, 0, outdentElse);
						// Insert `OUTDENT` to close outer `IF`.
						outdentElse[1] = 2;
						tokens.splice(i + 1, 0, outdentElse);
						// Remove outdents from the end.
						this.detectEnd(i + 2, function(token, i) {
							var ref;
							return (ref = token[0]) === 'OUTDENT' || ref === 'TERMINATOR';
						}, function(token, i) {
							if (this.tag(i) === 'OUTDENT' && this.tag(i + 1) === 'OUTDENT') {
								return tokens.splice(i, 2);
							}
						});
						return i + 2;
					};
					return this.scanTokens(function(token, i, tokens) {
						var conditionTag, j, k, ref, ref1, tag;
						[tag] = token;
						conditionTag = (tag === '->' || tag === '=>') && this.findTagsBackwards(i, ['IF', 'WHILE', 'FOR', 'UNTIL', 'SWITCH', 'WHEN', 'LEADING_WHEN', '[', 'INDEX_START']) && !(this.findTagsBackwards(i, ['THEN', '..', '...']));
						if (tag === 'TERMINATOR') {
							if (this.tag(i + 1) === 'ELSE' && this.tag(i - 1) !== 'OUTDENT') {
								tokens.splice(i, 1, ...this.indentation());
								return 1;
							}
							if (ref = this.tag(i + 1), indexOf.call(EXPRESSION_CLOSE, ref) >= 0) {
								tokens.splice(i, 1);
								return 0;
							}
						}
						if (tag === 'CATCH') {
							for (j = k = 1; k <= 2; j = ++k) {
								if (!((ref1 = this.tag(i + j)) === 'OUTDENT' || ref1 === 'TERMINATOR' || ref1 === 'FINALLY')) {
									continue;
								}
								tokens.splice(i + j, 0, ...this.indentation());
								return 2 + j;
							}
						}
						if ((tag === '->' || tag === '=>') && (this.tag(i + 1) === ',' || this.tag(i + 1) === '.' && token.newLine)) {
							[indent, outdent] = this.indentation(tokens[i]);
							tokens.splice(i + 1, 0, indent, outdent);
							return 1;
						}
						if (indexOf.call(SINGLE_LINERS, tag) >= 0 && this.tag(i + 1) !== 'INDENT' && !(tag === 'ELSE' && this.tag(i + 1) === 'IF') && !conditionTag) {
							starter = tag;
							[indent, outdent] = this.indentation(tokens[i]);
							if (starter === 'THEN') {
								indent.fromThen = true;
							}
							if (tag === 'THEN') {
								leading_switch_when = this.findTagsBackwards(i, ['LEADING_WHEN']) && this.tag(i + 1) === 'IF';
								leading_if_then = this.findTagsBackwards(i, ['IF']) && this.tag(i + 1) === 'IF';
							}
							if (tag === 'THEN' && this.findTagsBackwards(i, ['IF'])) {
								ifThens.push(i);
							}
							// `ELSE` tag is not closed.
							if (tag === 'ELSE' && this.tag(i - 1) !== 'OUTDENT') {
								i = closeElseTag(tokens, i);
							}
							tokens.splice(i + 1, 0, indent);
							this.detectEnd(i + 2, condition, action);
							if (tag === 'THEN') {
								tokens.splice(i, 1);
							}
							return 1;
						}
						return 1;
					});
				}

				// Tag postfix conditionals as such, so that we can parse them with a
				// different precedence.
				tagPostfixConditionals() {
					var action, condition, original;
					original = null;
					condition = function(token, i) {
						var prevTag, tag;
						[tag] = token;
						[prevTag] = this.tokens[i - 1];
						return tag === 'TERMINATOR' || (tag === 'INDENT' && indexOf.call(SINGLE_LINERS, prevTag) < 0);
					};
					action = function(token, i) {
						if (token[0] !== 'INDENT' || (token.generated && !token.fromThen)) {
							return original[0] = 'POST_' + original[0];
						}
					};
					return this.scanTokens(function(token, i) {
						if (token[0] !== 'IF') {
							return 1;
						}
						original = token;
						this.detectEnd(i + 1, condition, action);
						return 1;
					});
				}

				// Generate the indentation tokens, based on another token on the same line.
				indentation(origin) {
					var indent, outdent;
					indent = ['INDENT', 2];
					outdent = ['OUTDENT', 2];
					if (origin) {
						indent.generated = outdent.generated = true;
						indent.origin = outdent.origin = origin;
					} else {
						indent.explicit = outdent.explicit = true;
					}
					return [indent, outdent];
				}

				// Look up a tag by token index.
				tag(i) {
					var ref;
					return (ref = this.tokens[i]) != null ? ref[0] : void 0;
				}

			};

			Rewriter.prototype.generate = generate;

			return Rewriter;

		}).call(this);

		// Constants
		// ---------

		// List of the token pairs that must be balanced.
		BALANCED_PAIRS = [['(', ')'], ['[', ']'], ['{', '}'], ['INDENT', 'OUTDENT'], ['CALL_START', 'CALL_END'], ['PARAM_START', 'PARAM_END'], ['INDEX_START', 'INDEX_END'], ['STRING_START', 'STRING_END'], ['REGEX_START', 'REGEX_END']];

		// The inverse mappings of `BALANCED_PAIRS` we’re trying to fix up, so we can
		// look things up from either end.
		exports.INVERSES = INVERSES = {};

		// The tokens that signal the start/end of a balanced pair.
		EXPRESSION_START = [];

		EXPRESSION_END = [];

		for (k = 0, len = BALANCED_PAIRS.length; k < len; k++) {
			[left, right] = BALANCED_PAIRS[k];
			EXPRESSION_START.push(INVERSES[right] = left);
			EXPRESSION_END.push(INVERSES[left] = right);
		}

		// Tokens that indicate the close of a clause of an expression.
		EXPRESSION_CLOSE = ['CATCH', 'THEN', 'ELSE', 'FINALLY'].concat(EXPRESSION_END);

		// Tokens that, if followed by an `IMPLICIT_CALL`, indicate a function invocation.
		IMPLICIT_FUNC = ['IDENTIFIER', 'PROPERTY', 'SUPER', ')', 'CALL_END', ']', 'INDEX_END', '@', 'THIS'];

		// If preceded by an `IMPLICIT_FUNC`, indicates a function invocation.
		IMPLICIT_CALL = ['IDENTIFIER', 'CSX_TAG', 'PROPERTY', 'NUMBER', 'INFINITY', 'NAN', 'STRING', 'STRING_START', 'REGEX', 'REGEX_START', 'JS', 'NEW', 'PARAM_START', 'CLASS', 'IF', 'TRY', 'SWITCH', 'THIS', 'UNDEFINED', 'NULL', 'BOOL', 'UNARY', 'YIELD', 'AWAIT', 'UNARY_MATH', 'SUPER', 'THROW', '@', '->', '=>', '[', '(', '{', '--', '++'];

		IMPLICIT_UNSPACED_CALL = ['+', '-'];

		// Tokens that always mark the end of an implicit call for single-liners.
		IMPLICIT_END = ['POST_IF', 'FOR', 'WHILE', 'UNTIL', 'WHEN', 'BY', 'LOOP', 'TERMINATOR'];

		// Single-line flavors of block expressions that have unclosed endings.
		// The grammar can’t disambiguate them, so we insert the implicit indentation.
		SINGLE_LINERS = ['ELSE', '->', '=>', 'TRY', 'FINALLY', 'THEN'];

		SINGLE_CLOSERS = ['TERMINATOR', 'CATCH', 'FINALLY', 'ELSE', 'OUTDENT', 'LEADING_WHEN'];

		// Tokens that end a line.
		LINEBREAKS = ['TERMINATOR', 'INDENT', 'OUTDENT'];

		// Tokens that close open calls when they follow a newline.
		CALL_CLOSERS = ['.', '?.', '::', '?::'];

		// Tokens that prevent a subsequent indent from ending implicit calls/objects
		CONTROL_IN_IMPLICIT = ['IF', 'TRY', 'FINALLY', 'CATCH', 'CLASS', 'SWITCH'];

		// Tokens that are swallowed up by the parser, never leading to code generation.
		// You can spot these in `grammar.coffee` because the `o` function second
		// argument doesn’t contain a `new` call for these tokens.
		// `STRING_START` isn’t on this list because its `locationData` matches that of
		// the node that becomes `StringWithInterpolations`, and therefore
		// `addDataToNode` attaches `STRING_START`’s tokens to that node.
		DISCARDED = ['(', ')', '[', ']', '{', '}', '.', '..', '...', ',', '=', '++', '--', '?', 'AS', 'AWAIT', 'CALL_START', 'CALL_END', 'DEFAULT', 'ELSE', 'EXTENDS', 'EXPORT', 'FORIN', 'FOROF', 'FORFROM', 'IMPORT', 'INDENT', 'INDEX_SOAK', 'LEADING_WHEN', 'OUTDENT', 'PARAM_END', 'REGEX_START', 'REGEX_END', 'RETURN', 'STRING_END', 'THROW', 'UNARY', 'YIELD'].concat(IMPLICIT_UNSPACED_CALL.concat(IMPLICIT_END.concat(CALL_CLOSERS.concat(CONTROL_IN_IMPLICIT))));

		return exports;
	};
	//#endregion

	//#region URL: /lexer
	modules['/lexer'] = function () {
		var exports = {};
		// The CoffeeScript Lexer. Uses a series of token-matching regexes to attempt
		// matches against the beginning of the source code. When a match is found,
		// a token is produced, we consume the match, and start again. Tokens are in the
		// form:

		//     [tag, value, locationData]

		// where locationData is {first_line, first_column, last_line, last_column}, which is a
		// format that can be fed directly into [Jison](https://github.com/zaach/jison).  These
		// are read by jison in the `parser.lexer` function defined in coffeescript.coffee.
		var BOM, BOOL, CALLABLE, CODE, COFFEE_ALIASES, COFFEE_ALIAS_MAP, COFFEE_KEYWORDS, COMMENT, COMPARABLE_LEFT_SIDE, COMPARE, COMPOUND_ASSIGN, CSX_ATTRIBUTE, CSX_FRAGMENT_IDENTIFIER, CSX_IDENTIFIER, CSX_INTERPOLATION, HERECOMMENT_ILLEGAL, HEREDOC_DOUBLE, HEREDOC_INDENT, HEREDOC_SINGLE, HEREGEX, HEREGEX_OMIT, HERE_JSTOKEN, IDENTIFIER, INDENTABLE_CLOSERS, INDEXABLE, INSIDE_CSX, INVERSES, JSTOKEN, JS_KEYWORDS, LEADING_BLANK_LINE, LINE_BREAK, LINE_CONTINUER, Lexer, MATH, MULTI_DENT, NOT_REGEX, NUMBER, OPERATOR, POSSIBLY_DIVISION, REGEX, REGEX_FLAGS, REGEX_ILLEGAL, REGEX_INVALID_ESCAPE, RELATION, RESERVED, Rewriter, SHIFT, SIMPLE_STRING_OMIT, STRICT_PROSCRIBED, STRING_DOUBLE, STRING_INVALID_ESCAPE, STRING_OMIT, STRING_SINGLE, STRING_START, TRAILING_BLANK_LINE, TRAILING_SPACES, UNARY, UNARY_MATH, UNFINISHED, UNICODE_CODE_POINT_ESCAPE, VALID_FLAGS, WHITESPACE, attachCommentsToNode, compact, count, invertLiterate, isForFrom, isUnassignable, key, locationDataToString, merge, repeat, starts, throwSyntaxError,
			indexOf = [].indexOf,
			slice = [].slice;

		({Rewriter, INVERSES} = require('/rewriter'));

		// Import the helpers we need.
		({count, starts, compact, repeat, invertLiterate, merge, attachCommentsToNode, locationDataToString, throwSyntaxError} = require('/helpers'));

		// The Lexer Class
		// ---------------

		// The Lexer class reads a stream of CoffeeScript and divvies it up into tagged
		// tokens. Some potential ambiguity in the grammar has been avoided by
		// pushing some extra smarts into the Lexer.
		exports.Lexer = Lexer = class Lexer {
			// **tokenize** is the Lexer's main method. Scan by attempting to match tokens
			// one at a time, using a regular expression anchored at the start of the
			// remaining code, or a custom recursive token-matching method
			// (for interpolations). When the next token has been recorded, we move forward
			// within the code past the token, and begin again.

			// Each tokenizing method is responsible for returning the number of characters
			// it has consumed.

			// Before returning the token stream, run it through the [Rewriter](rewriter.html).
			tokenize(code, opts = {}) {
				var consumed, end, i, ref;
				this.literate = opts.literate; // Are we lexing literate CoffeeScript?
				this.indent = 0; // The current indentation level.
				this.baseIndent = 0; // The overall minimum indentation level.
				this.indebt = 0; // The over-indentation at the current level.
				this.outdebt = 0; // The under-outdentation at the current level.
				this.indents = []; // The stack of all current indentation levels.
				this.indentLiteral = ''; // The indentation.
				this.ends = []; // The stack for pairing up tokens.
				this.tokens = []; // Stream of parsed tokens in the form `['TYPE', value, location data]`.
				this.seenFor = false; // Used to recognize `FORIN`, `FOROF` and `FORFROM` tokens.
				this.seenImport = false; // Used to recognize `IMPORT FROM? AS?` tokens.
				this.seenExport = false; // Used to recognize `EXPORT FROM? AS?` tokens.
				this.importSpecifierList = false; // Used to identify when in an `IMPORT {...} FROM? ...`.
				this.exportSpecifierList = false; // Used to identify when in an `EXPORT {...} FROM? ...`.
				this.csxDepth = 0; // Used to optimize CSX checks, how deep in CSX we are.
				this.csxObjAttribute = {}; // Used to detect if CSX attributes is wrapped in {} (<div {props...} />).
				this.chunkLine = opts.line || 0; // The start line for the current @chunk.
				this.chunkColumn = opts.column || 0; // The start column of the current @chunk.
				code = this.clean(code); // The stripped, cleaned original source code.
				
				// At every position, run through this list of attempted matches,
				// short-circuiting if any of them succeed. Their order determines precedence:
				// `@literalToken` is the fallback catch-all.
				i = 0;
				while (this.chunk = code.slice(i)) {
					consumed = this.identifierToken() || this.commentToken() || this.whitespaceToken() || this.lineToken() || this.stringToken() || this.numberToken() || this.csxToken() || this.regexToken() || this.jsToken() || this.literalToken();
					// Update position.
					[this.chunkLine, this.chunkColumn] = this.getLineAndColumnFromChunk(consumed);
					i += consumed;
					if (opts.untilBalanced && this.ends.length === 0) {
						return {
							tokens: this.tokens,
							index: i
						};
					}
				}
				this.closeIndentation();
				if (end = this.ends.pop()) {
					this.error(`missing ${end.tag}`, ((ref = end.origin) != null ? ref : end)[2]);
				}
				if (opts.rewrite === false) {
					return this.tokens;
				}
				return (new Rewriter).rewrite(this.tokens);
			}

			// Preprocess the code to remove leading and trailing whitespace, carriage
			// returns, etc. If we’re lexing literate CoffeeScript, strip external Markdown
			// by removing all lines that aren’t indented by at least four spaces or a tab.
			clean(code) {
				if (code.charCodeAt(0) === BOM) {
					code = code.slice(1);
				}
				code = code.replace(/\r/g, '').replace(TRAILING_SPACES, '');
				if (WHITESPACE.test(code)) {
					code = `\n${code}`;
					this.chunkLine--;
				}
				if (this.literate) {
					code = invertLiterate(code);
				}
				return code;
			}

			// Tokenizers
			// ----------

			// Matches identifying literals: variables, keywords, method names, etc.
			// Check to ensure that JavaScript reserved words aren’t being used as
			// identifiers. Because CoffeeScript reserves a handful of keywords that are
			// allowed in JavaScript, we’re careful not to tag them as keywords when
			// referenced as property names here, so you can still do `jQuery.is()` even
			// though `is` means `===` otherwise.
			identifierToken() {
				var alias, colon, colonOffset, colonToken, id, idLength, inCSXTag, input, match, poppedToken, prev, prevprev, ref, ref1, ref10, ref2, ref3, ref4, ref5, ref6, ref7, ref8, ref9, regExSuper, regex, sup, tag, tagToken;
				inCSXTag = this.atCSXTag();
				regex = inCSXTag ? CSX_ATTRIBUTE : IDENTIFIER;
				if (!(match = regex.exec(this.chunk))) {
					return 0;
				}
				[input, id, colon] = match;
				// Preserve length of id for location data
				idLength = id.length;
				poppedToken = void 0;
				if (id === 'own' && this.tag() === 'FOR') {
					this.token('OWN', id);
					return id.length;
				}
				if (id === 'from' && this.tag() === 'YIELD') {
					this.token('FROM', id);
					return id.length;
				}
				if (id === 'as' && this.seenImport) {
					if (this.value() === '*') {
						this.tokens[this.tokens.length - 1][0] = 'IMPORT_ALL';
					} else if (ref = this.value(true), indexOf.call(COFFEE_KEYWORDS, ref) >= 0) {
						prev = this.prev();
						[prev[0], prev[1]] = ['IDENTIFIER', this.value(true)];
					}
					if ((ref1 = this.tag()) === 'DEFAULT' || ref1 === 'IMPORT_ALL' || ref1 === 'IDENTIFIER') {
						this.token('AS', id);
						return id.length;
					}
				}
				if (id === 'as' && this.seenExport) {
					if ((ref2 = this.tag()) === 'IDENTIFIER' || ref2 === 'DEFAULT') {
						this.token('AS', id);
						return id.length;
					}
					if (ref3 = this.value(true), indexOf.call(COFFEE_KEYWORDS, ref3) >= 0) {
						prev = this.prev();
						[prev[0], prev[1]] = ['IDENTIFIER', this.value(true)];
						this.token('AS', id);
						return id.length;
					}
				}
				if (id === 'default' && this.seenExport && ((ref4 = this.tag()) === 'EXPORT' || ref4 === 'AS')) {
					this.token('DEFAULT', id);
					return id.length;
				}
				if (id === 'do' && (regExSuper = /^(\s*super)(?!\(\))/.exec(this.chunk.slice(3)))) {
					this.token('SUPER', 'super');
					this.token('CALL_START', '(');
					this.token('CALL_END', ')');
					[input, sup] = regExSuper;
					return sup.length + 3;
				}
				prev = this.prev();
				tag = colon || (prev != null) && (((ref5 = prev[0]) === '.' || ref5 === '?.' || ref5 === '::' || ref5 === '?::') || !prev.spaced && prev[0] === '@') ? 'PROPERTY' : 'IDENTIFIER';
				if (tag === 'IDENTIFIER' && (indexOf.call(JS_KEYWORDS, id) >= 0 || indexOf.call(COFFEE_KEYWORDS, id) >= 0) && !(this.exportSpecifierList && indexOf.call(COFFEE_KEYWORDS, id) >= 0)) {
					tag = id.toUpperCase();
					if (tag === 'WHEN' && (ref6 = this.tag(), indexOf.call(LINE_BREAK, ref6) >= 0)) {
						tag = 'LEADING_WHEN';
					} else if (tag === 'FOR') {
						this.seenFor = true;
					} else if (tag === 'UNLESS') {
						tag = 'IF';
					} else if (tag === 'IMPORT') {
						this.seenImport = true;
					} else if (tag === 'EXPORT') {
						this.seenExport = true;
					} else if (indexOf.call(UNARY, tag) >= 0) {
						tag = 'UNARY';
					} else if (indexOf.call(RELATION, tag) >= 0) {
						if (tag !== 'INSTANCEOF' && this.seenFor) {
							tag = 'FOR' + tag;
							this.seenFor = false;
						} else {
							tag = 'RELATION';
							if (this.value() === '!') {
								poppedToken = this.tokens.pop();
								id = '!' + id;
							}
						}
					}
				} else if (tag === 'IDENTIFIER' && this.seenFor && id === 'from' && isForFrom(prev)) {
					tag = 'FORFROM';
					this.seenFor = false;
				// Throw an error on attempts to use `get` or `set` as keywords, or
				// what CoffeeScript would normally interpret as calls to functions named
				// `get` or `set`, i.e. `get({foo: function () {}})`.
				} else if (tag === 'PROPERTY' && prev) {
					if (prev.spaced && (ref7 = prev[0], indexOf.call(CALLABLE, ref7) >= 0) && /^[gs]et$/.test(prev[1]) && this.tokens.length > 1 && ((ref8 = this.tokens[this.tokens.length - 2][0]) !== '.' && ref8 !== '?.' && ref8 !== '@')) {
						this.error(`'${prev[1]}' cannot be used as a keyword, or as a function call without parentheses`, prev[2]);
					} else if (this.tokens.length > 2) {
						prevprev = this.tokens[this.tokens.length - 2];
						if (((ref9 = prev[0]) === '@' || ref9 === 'THIS') && prevprev && prevprev.spaced && /^[gs]et$/.test(prevprev[1]) && ((ref10 = this.tokens[this.tokens.length - 3][0]) !== '.' && ref10 !== '?.' && ref10 !== '@')) {
							this.error(`'${prevprev[1]}' cannot be used as a keyword, or as a function call without parentheses`, prevprev[2]);
						}
					}
				}
				if (tag === 'IDENTIFIER' && indexOf.call(RESERVED, id) >= 0) {
					this.error(`reserved word '${id}'`, {
						length: id.length
					});
				}
				if (!(tag === 'PROPERTY' || this.exportSpecifierList)) {
					if (indexOf.call(COFFEE_ALIASES, id) >= 0) {
						alias = id;
						id = COFFEE_ALIAS_MAP[id];
					}
					tag = (function() {
						switch (id) {
							case '!':
								return 'UNARY';
							case '==':
							case '!=':
								return 'COMPARE';
							case 'true':
							case 'false':
								return 'BOOL';
							case 'break':
							case 'continue':
							case 'debugger':
								return 'STATEMENT';
							case '&&':
							case '||':
								return id;
							default:
								return tag;
						}
					})();
				}
				tagToken = this.token(tag, id, 0, idLength);
				if (alias) {
					tagToken.origin = [tag, alias, tagToken[2]];
				}
				if (poppedToken) {
					[tagToken[2].first_line, tagToken[2].first_column] = [poppedToken[2].first_line, poppedToken[2].first_column];
				}
				if (colon) {
					colonOffset = input.lastIndexOf(inCSXTag ? '=' : ':');
					colonToken = this.token(':', ':', colonOffset, colon.length);
					if (inCSXTag) { // used by rewriter
						colonToken.csxColon = true;
					}
				}
				if (inCSXTag && tag === 'IDENTIFIER' && prev[0] !== ':') {
					this.token(',', ',', 0, 0, tagToken);
				}
				return input.length;
			}

			// Matches numbers, including decimals, hex, and exponential notation.
			// Be careful not to interfere with ranges in progress.
			numberToken() {
				var base, lexedLength, match, number, numberValue, tag;
				if (!(match = NUMBER.exec(this.chunk))) {
					return 0;
				}
				number = match[0];
				lexedLength = number.length;
				switch (false) {
					case !/^0[BOX]/.test(number):
						this.error(`radix prefix in '${number}' must be lowercase`, {
							offset: 1
						});
						break;
					case !/^(?!0x).*E/.test(number):
						this.error(`exponential notation in '${number}' must be indicated with a lowercase 'e'`, {
							offset: number.indexOf('E')
						});
						break;
					case !/^0\d*[89]/.test(number):
						this.error(`decimal literal '${number}' must not be prefixed with '0'`, {
							length: lexedLength
						});
						break;
					case !/^0\d+/.test(number):
						this.error(`octal literal '${number}' must be prefixed with '0o'`, {
							length: lexedLength
						});
				}
				base = (function() {
					switch (number.charAt(1)) {
						case 'b':
							return 2;
						case 'o':
							return 8;
						case 'x':
							return 16;
						default:
							return null;
					}
				})();
				numberValue = base != null ? parseInt(number.slice(2), base) : parseFloat(number);
				tag = numberValue === 2e308 ? 'INFINITY' : 'NUMBER';
				this.token(tag, number, 0, lexedLength);
				return lexedLength;
			}

			// Matches strings, including multiline strings, as well as heredocs, with or without
			// interpolation.
			stringToken() {
				var $, attempt, delimiter, doc, end, heredoc, i, indent, indentRegex, match, prev, quote, ref, regex, token, tokens;
				[quote] = STRING_START.exec(this.chunk) || [];
				if (!quote) {
					return 0;
				}
				// If the preceding token is `from` and this is an import or export statement,
				// properly tag the `from`.
				prev = this.prev();
				if (prev && this.value() === 'from' && (this.seenImport || this.seenExport)) {
					prev[0] = 'FROM';
				}
				regex = (function() {
					switch (quote) {
						case "'":
							return STRING_SINGLE;
						case '"':
							return STRING_DOUBLE;
						case "'''":
							return HEREDOC_SINGLE;
						case '"""':
							return HEREDOC_DOUBLE;
					}
				})();
				heredoc = quote.length === 3;
				({
					tokens,
					index: end
				} = this.matchWithInterpolations(regex, quote));
				$ = tokens.length - 1;
				delimiter = quote.charAt(0);
				if (heredoc) {
					// Find the smallest indentation. It will be removed from all lines later.
					indent = null;
					doc = ((function() {
						var j, len, results;
						results = [];
						for (i = j = 0, len = tokens.length; j < len; i = ++j) {
							token = tokens[i];
							if (token[0] === 'NEOSTRING') {
								results.push(token[1]);
							}
						}
						return results;
					})()).join('#{}');
					while (match = HEREDOC_INDENT.exec(doc)) {
						attempt = match[1];
						if (indent === null || (0 < (ref = attempt.length) && ref < indent.length)) {
							indent = attempt;
						}
					}
					if (indent) {
						indentRegex = RegExp(`\\n${indent}`, "g");
					}
					this.mergeInterpolationTokens(tokens, {delimiter}, (value, i) => {
						value = this.formatString(value, {
							delimiter: quote
						});
						if (indentRegex) {
							value = value.replace(indentRegex, '\n');
						}
						if (i === 0) {
							value = value.replace(LEADING_BLANK_LINE, '');
						}
						if (i === $) {
							value = value.replace(TRAILING_BLANK_LINE, '');
						}
						return value;
					});
				} else {
					this.mergeInterpolationTokens(tokens, {delimiter}, (value, i) => {
						value = this.formatString(value, {
							delimiter: quote
						});
						// Remove indentation from multiline single-quoted strings.
						value = value.replace(SIMPLE_STRING_OMIT, function(match, offset) {
							if ((i === 0 && offset === 0) || (i === $ && offset + match.length === value.length)) {
								return '';
							} else {
								return ' ';
							}
						});
						return value;
					});
				}
				if (this.atCSXTag()) {
					this.token(',', ',', 0, 0, this.prev);
				}
				return end;
			}

			// Matches and consumes comments. The comments are taken out of the token
			// stream and saved for later, to be reinserted into the output after
			// everything has been parsed and the JavaScript code generated.
			commentToken(chunk = this.chunk) {
				var comment, commentAttachments, content, contents, here, i, match, matchIllegal, newLine, placeholderToken, prev;
				if (!(match = chunk.match(COMMENT))) {
					return 0;
				}
				[comment, here] = match;
				contents = null;
				// Does this comment follow code on the same line?
				newLine = /^\s*\n+\s*#/.test(comment);
				if (here) {
					matchIllegal = HERECOMMENT_ILLEGAL.exec(comment);
					if (matchIllegal) {
						this.error(`block comments cannot contain ${matchIllegal[0]}`, {
							offset: matchIllegal.index,
							length: matchIllegal[0].length
						});
					}
					// Parse indentation or outdentation as if this block comment didn’t exist.
					chunk = chunk.replace(`###${here}###`, '');
					// Remove leading newlines, like `Rewriter::removeLeadingNewlines`, to
					// avoid the creation of unwanted `TERMINATOR` tokens.
					chunk = chunk.replace(/^\n+/, '');
					this.lineToken(chunk);
					// Pull out the ###-style comment’s content, and format it.
					content = here;
					if (indexOf.call(content, '\n') >= 0) {
						content = content.replace(RegExp(`\\n${repeat(' ', this.indent)}`, "g"), '\n');
					}
					contents = [content];
				} else {
					// The `COMMENT` regex captures successive line comments as one token.
					// Remove any leading newlines before the first comment, but preserve
					// blank lines between line comments.
					content = comment.replace(/^(\n*)/, '');
					content = content.replace(/^([ |\t]*)#/gm, '');
					contents = content.split('\n');
				}
				commentAttachments = (function() {
					var j, len, results;
					results = [];
					for (i = j = 0, len = contents.length; j < len; i = ++j) {
						content = contents[i];
						results.push({
							content: content,
							here: here != null,
							newLine: newLine || i !== 0 // Line comments after the first one start new lines, by definition.
						});
					}
					return results;
				})();
				prev = this.prev();
				if (!prev) {
					// If there’s no previous token, create a placeholder token to attach
					// this comment to; and follow with a newline.
					commentAttachments[0].newLine = true;
					this.lineToken(this.chunk.slice(comment.length));
					placeholderToken = this.makeToken('JS', '');
					placeholderToken.generated = true;
					placeholderToken.comments = commentAttachments;
					this.tokens.push(placeholderToken);
					this.newlineToken(0);
				} else {
					attachCommentsToNode(commentAttachments, prev);
				}
				return comment.length;
			}

			// Matches JavaScript interpolated directly into the source via backticks.
			jsToken() {
				var match, script;
				if (!(this.chunk.charAt(0) === '`' && (match = HERE_JSTOKEN.exec(this.chunk) || JSTOKEN.exec(this.chunk)))) {
					return 0;
				}
				// Convert escaped backticks to backticks, and escaped backslashes
				// just before escaped backticks to backslashes
				script = match[1].replace(/\\+(`|$)/g, function(string) {
					// `string` is always a value like '\`', '\\\`', '\\\\\`', etc.
					// By reducing it to its latter half, we turn '\`' to '`', '\\\`' to '\`', etc.
					return string.slice(-Math.ceil(string.length / 2));
				});
				this.token('JS', script, 0, match[0].length);
				return match[0].length;
			}

			// Matches regular expression literals, as well as multiline extended ones.
			// Lexing regular expressions is difficult to distinguish from division, so we
			// borrow some basic heuristics from JavaScript and Ruby.
			regexToken() {
				var body, closed, comment, comments, end, flags, index, j, len, match, origin, prev, ref, ref1, regex, tokens;
				switch (false) {
					case !(match = REGEX_ILLEGAL.exec(this.chunk)):
						this.error(`regular expressions cannot begin with ${match[2]}`, {
							offset: match.index + match[1].length
						});
						break;
					case !(match = this.matchWithInterpolations(HEREGEX, '///')):
						({tokens, index} = match);
						comments = this.chunk.slice(0, index).match(/\s+(#(?!{).*)/g);
						if (comments) {
							for (j = 0, len = comments.length; j < len; j++) {
								comment = comments[j];
								this.commentToken(comment);
							}
						}
						break;
					case !(match = REGEX.exec(this.chunk)):
						[regex, body, closed] = match;
						this.validateEscapes(body, {
							isRegex: true,
							offsetInChunk: 1
						});
						index = regex.length;
						prev = this.prev();
						if (prev) {
							if (prev.spaced && (ref = prev[0], indexOf.call(CALLABLE, ref) >= 0)) {
								if (!closed || POSSIBLY_DIVISION.test(regex)) {
									return 0;
								}
							} else if (ref1 = prev[0], indexOf.call(NOT_REGEX, ref1) >= 0) {
								return 0;
							}
						}
						if (!closed) {
							this.error('missing / (unclosed regex)');
						}
						break;
					default:
						return 0;
				}
				[flags] = REGEX_FLAGS.exec(this.chunk.slice(index));
				end = index + flags.length;
				origin = this.makeToken('REGEX', null, 0, end);
				switch (false) {
					case !!VALID_FLAGS.test(flags):
						this.error(`invalid regular expression flags ${flags}`, {
							offset: index,
							length: flags.length
						});
						break;
					case !(regex || tokens.length === 1):
						if (body) {
							body = this.formatRegex(body, {
								flags,
								delimiter: '/'
							});
						} else {
							body = this.formatHeregex(tokens[0][1], {flags});
						}
						this.token('REGEX', `${this.makeDelimitedLiteral(body, {
							delimiter: '/'
						})}${flags}`, 0, end, origin);
						break;
					default:
						this.token('REGEX_START', '(', 0, 0, origin);
						this.token('IDENTIFIER', 'RegExp', 0, 0);
						this.token('CALL_START', '(', 0, 0);
						this.mergeInterpolationTokens(tokens, {
							delimiter: '"',
							double: true
						}, (str) => {
							return this.formatHeregex(str, {flags});
						});
						if (flags) {
							this.token(',', ',', index - 1, 0);
							this.token('STRING', '"' + flags + '"', index - 1, flags.length);
						}
						this.token(')', ')', end - 1, 0);
						this.token('REGEX_END', ')', end - 1, 0);
				}
				return end;
			}

			// Matches newlines, indents, and outdents, and determines which is which.
			// If we can detect that the current line is continued onto the next line,
			// then the newline is suppressed:

			//     elements
			//       .each( ... )
			//       .map( ... )

			// Keeps track of the level of indentation, because a single outdent token
			// can close multiple indents, so we need to know how far in we happen to be.
			lineToken(chunk = this.chunk) {
				var backslash, diff, indent, match, minLiteralLength, newIndentLiteral, noNewlines, prev, size;
				if (!(match = MULTI_DENT.exec(chunk))) {
					return 0;
				}
				indent = match[0];
				prev = this.prev();
				backslash = (prev != null ? prev[0] : void 0) === '\\';
				if (!(backslash && this.seenFor)) {
					this.seenFor = false;
				}
				if (!((backslash && this.seenImport) || this.importSpecifierList)) {
					this.seenImport = false;
				}
				if (!((backslash && this.seenExport) || this.exportSpecifierList)) {
					this.seenExport = false;
				}
				size = indent.length - 1 - indent.lastIndexOf('\n');
				noNewlines = this.unfinished();
				newIndentLiteral = size > 0 ? indent.slice(-size) : '';
				if (!/^(.?)\1*$/.exec(newIndentLiteral)) {
					this.error('mixed indentation', {
						offset: indent.length
					});
					return indent.length;
				}
				minLiteralLength = Math.min(newIndentLiteral.length, this.indentLiteral.length);
				if (newIndentLiteral.slice(0, minLiteralLength) !== this.indentLiteral.slice(0, minLiteralLength)) {
					this.error('indentation mismatch', {
						offset: indent.length
					});
					return indent.length;
				}
				if (size - this.indebt === this.indent) {
					if (noNewlines) {
						this.suppressNewlines();
					} else {
						this.newlineToken(0);
					}
					return indent.length;
				}
				if (size > this.indent) {
					if (noNewlines) {
						if (!backslash) {
							this.indebt = size - this.indent;
						}
						this.suppressNewlines();
						return indent.length;
					}
					if (!this.tokens.length) {
						this.baseIndent = this.indent = size;
						this.indentLiteral = newIndentLiteral;
						return indent.length;
					}
					diff = size - this.indent + this.outdebt;
					this.token('INDENT', diff, indent.length - size, size);
					this.indents.push(diff);
					this.ends.push({
						tag: 'OUTDENT'
					});
					this.outdebt = this.indebt = 0;
					this.indent = size;
					this.indentLiteral = newIndentLiteral;
				} else if (size < this.baseIndent) {
					this.error('missing indentation', {
						offset: indent.length
					});
				} else {
					this.indebt = 0;
					this.outdentToken(this.indent - size, noNewlines, indent.length);
				}
				return indent.length;
			}

			// Record an outdent token or multiple tokens, if we happen to be moving back
			// inwards past several recorded indents. Sets new @indent value.
			outdentToken(moveOut, noNewlines, outdentLength) {
				var decreasedIndent, dent, lastIndent, ref;
				decreasedIndent = this.indent - moveOut;
				while (moveOut > 0) {
					lastIndent = this.indents[this.indents.length - 1];
					if (!lastIndent) {
						this.outdebt = moveOut = 0;
					} else if (this.outdebt && moveOut <= this.outdebt) {
						this.outdebt -= moveOut;
						moveOut = 0;
					} else {
						dent = this.indents.pop() + this.outdebt;
						if (outdentLength && (ref = this.chunk[outdentLength], indexOf.call(INDENTABLE_CLOSERS, ref) >= 0)) {
							decreasedIndent -= dent - moveOut;
							moveOut = dent;
						}
						this.outdebt = 0;
						// pair might call outdentToken, so preserve decreasedIndent
						this.pair('OUTDENT');
						this.token('OUTDENT', moveOut, 0, outdentLength);
						moveOut -= dent;
					}
				}
				if (dent) {
					this.outdebt -= moveOut;
				}
				this.suppressSemicolons();
				if (!(this.tag() === 'TERMINATOR' || noNewlines)) {
					this.token('TERMINATOR', '\n', outdentLength, 0);
				}
				this.indent = decreasedIndent;
				this.indentLiteral = this.indentLiteral.slice(0, decreasedIndent);
				return this;
			}

			// Matches and consumes non-meaningful whitespace. Tag the previous token
			// as being “spaced”, because there are some cases where it makes a difference.
			whitespaceToken() {
				var match, nline, prev;
				if (!((match = WHITESPACE.exec(this.chunk)) || (nline = this.chunk.charAt(0) === '\n'))) {
					return 0;
				}
				prev = this.prev();
				if (prev) {
					prev[match ? 'spaced' : 'newLine'] = true;
				}
				if (match) {
					return match[0].length;
				} else {
					return 0;
				}
			}

			// Generate a newline token. Consecutive newlines get merged together.
			newlineToken(offset) {
				this.suppressSemicolons();
				if (this.tag() !== 'TERMINATOR') {
					this.token('TERMINATOR', '\n', offset, 0);
				}
				return this;
			}

			// Use a `\` at a line-ending to suppress the newline.
			// The slash is removed here once its job is done.
			suppressNewlines() {
				var prev;
				prev = this.prev();
				if (prev[1] === '\\') {
					if (prev.comments && this.tokens.length > 1) {
						// `@tokens.length` should be at least 2 (some code, then `\`).
						// If something puts a `\` after nothing, they deserve to lose any
						// comments that trail it.
						attachCommentsToNode(prev.comments, this.tokens[this.tokens.length - 2]);
					}
					this.tokens.pop();
				}
				return this;
			}

			// CSX is like JSX but for CoffeeScript.
			csxToken() {
				var afterTag, colon, csxTag, end, firstChar, id, input, match, origin, prev, prevChar, ref, token, tokens;
				firstChar = this.chunk[0];
				// Check the previous token to detect if attribute is spread.
				prevChar = this.tokens.length > 0 ? this.tokens[this.tokens.length - 1][0] : '';
				if (firstChar === '<') {
					match = CSX_IDENTIFIER.exec(this.chunk.slice(1)) || CSX_FRAGMENT_IDENTIFIER.exec(this.chunk.slice(1));
					// Not the right hand side of an unspaced comparison (i.e. `a<b`).
					if (!(match && (this.csxDepth > 0 || !(prev = this.prev()) || prev.spaced || (ref = prev[0], indexOf.call(COMPARABLE_LEFT_SIDE, ref) < 0)))) {
						return 0;
					}
					[input, id, colon] = match;
					origin = this.token('CSX_TAG', id, 1, id.length);
					this.token('CALL_START', '(');
					this.token('[', '[');
					this.ends.push({
						tag: '/>',
						origin: origin,
						name: id
					});
					this.csxDepth++;
					return id.length + 1;
				} else if (csxTag = this.atCSXTag()) {
					if (this.chunk.slice(0, 2) === '/>') {
						this.pair('/>');
						this.token(']', ']', 0, 2);
						this.token('CALL_END', ')', 0, 2);
						this.csxDepth--;
						return 2;
					} else if (firstChar === '{') {
						if (prevChar === ':') {
							token = this.token('(', '(');
							this.csxObjAttribute[this.csxDepth] = false;
						} else {
							token = this.token('{', '{');
							this.csxObjAttribute[this.csxDepth] = true;
						}
						this.ends.push({
							tag: '}',
							origin: token
						});
						return 1;
					} else if (firstChar === '>') {
						// Ignore terminators inside a tag.
						this.pair('/>'); // As if the current tag was self-closing.
						origin = this.token(']', ']');
						this.token(',', ',');
						({
							tokens,
							index: end
						} = this.matchWithInterpolations(INSIDE_CSX, '>', '</', CSX_INTERPOLATION));
						this.mergeInterpolationTokens(tokens, {
							delimiter: '"'
						}, (value, i) => {
							return this.formatString(value, {
								delimiter: '>'
							});
						});
						match = CSX_IDENTIFIER.exec(this.chunk.slice(end)) || CSX_FRAGMENT_IDENTIFIER.exec(this.chunk.slice(end));
						if (!match || match[1] !== csxTag.name) {
							this.error(`expected corresponding CSX closing tag for ${csxTag.name}`, csxTag.origin[2]);
						}
						afterTag = end + csxTag.name.length;
						if (this.chunk[afterTag] !== '>') {
							this.error("missing closing > after tag name", {
								offset: afterTag,
								length: 1
							});
						}
						// +1 for the closing `>`.
						this.token('CALL_END', ')', end, csxTag.name.length + 1);
						this.csxDepth--;
						return afterTag + 1;
					} else {
						return 0;
					}
				} else if (this.atCSXTag(1)) {
					if (firstChar === '}') {
						this.pair(firstChar);
						if (this.csxObjAttribute[this.csxDepth]) {
							this.token('}', '}');
							this.csxObjAttribute[this.csxDepth] = false;
						} else {
							this.token(')', ')');
						}
						this.token(',', ',');
						return 1;
					} else {
						return 0;
					}
				} else {
					return 0;
				}
			}

			atCSXTag(depth = 0) {
				var i, last, ref;
				if (this.csxDepth === 0) {
					return false;
				}
				i = this.ends.length - 1;
				while (((ref = this.ends[i]) != null ? ref.tag : void 0) === 'OUTDENT' || depth-- > 0) { // Ignore indents.
					i--;
				}
				last = this.ends[i];
				return (last != null ? last.tag : void 0) === '/>' && last;
			}

			// We treat all other single characters as a token. E.g.: `( ) , . !`
			// Multi-character operators are also literal tokens, so that Jison can assign
			// the proper order of operations. There are some symbols that we tag specially
			// here. `;` and newlines are both treated as a `TERMINATOR`, we distinguish
			// parentheses that indicate a method call from regular parentheses, and so on.
			literalToken() {
				var match, message, origin, prev, ref, ref1, ref2, ref3, ref4, skipToken, tag, token, value;
				if (match = OPERATOR.exec(this.chunk)) {
					[value] = match;
					if (CODE.test(value)) {
						this.tagParameters();
					}
				} else {
					value = this.chunk.charAt(0);
				}
				tag = value;
				prev = this.prev();
				if (prev && indexOf.call(['=', ...COMPOUND_ASSIGN], value) >= 0) {
					skipToken = false;
					if (value === '=' && ((ref = prev[1]) === '||' || ref === '&&') && !prev.spaced) {
						prev[0] = 'COMPOUND_ASSIGN';
						prev[1] += '=';
						prev = this.tokens[this.tokens.length - 2];
						skipToken = true;
					}
					if (prev && prev[0] !== 'PROPERTY') {
						origin = (ref1 = prev.origin) != null ? ref1 : prev;
						message = isUnassignable(prev[1], origin[1]);
						if (message) {
							this.error(message, origin[2]);
						}
					}
					if (skipToken) {
						return value.length;
					}
				}
				if (value === '{' && this.seenImport) {
					this.importSpecifierList = true;
				} else if (this.importSpecifierList && value === '}') {
					this.importSpecifierList = false;
				} else if (value === '{' && (prev != null ? prev[0] : void 0) === 'EXPORT') {
					this.exportSpecifierList = true;
				} else if (this.exportSpecifierList && value === '}') {
					this.exportSpecifierList = false;
				}
				if (value === ';') {
					if (ref2 = prev != null ? prev[0] : void 0, indexOf.call(['=', ...UNFINISHED], ref2) >= 0) {
						this.error('unexpected ;');
					}
					this.seenFor = this.seenImport = this.seenExport = false;
					tag = 'TERMINATOR';
				} else if (value === '*' && (prev != null ? prev[0] : void 0) === 'EXPORT') {
					tag = 'EXPORT_ALL';
				} else if (indexOf.call(MATH, value) >= 0) {
					tag = 'MATH';
				} else if (indexOf.call(COMPARE, value) >= 0) {
					tag = 'COMPARE';
				} else if (indexOf.call(COMPOUND_ASSIGN, value) >= 0) {
					tag = 'COMPOUND_ASSIGN';
				} else if (indexOf.call(UNARY, value) >= 0) {
					tag = 'UNARY';
				} else if (indexOf.call(UNARY_MATH, value) >= 0) {
					tag = 'UNARY_MATH';
				} else if (indexOf.call(SHIFT, value) >= 0) {
					tag = 'SHIFT';
				} else if (value === '?' && (prev != null ? prev.spaced : void 0)) {
					tag = 'BIN?';
				} else if (prev) {
					if (value === '(' && !prev.spaced && (ref3 = prev[0], indexOf.call(CALLABLE, ref3) >= 0)) {
						if (prev[0] === '?') {
							prev[0] = 'FUNC_EXIST';
						}
						tag = 'CALL_START';
					} else if (value === '[' && (((ref4 = prev[0], indexOf.call(INDEXABLE, ref4) >= 0) && !prev.spaced) || (prev[0] === '::'))) { // `.prototype` can’t be a method you can call.
						tag = 'INDEX_START';
						switch (prev[0]) {
							case '?':
								prev[0] = 'INDEX_SOAK';
						}
					}
				}
				token = this.makeToken(tag, value);
				switch (value) {
					case '(':
					case '{':
					case '[':
						this.ends.push({
							tag: INVERSES[value],
							origin: token
						});
						break;
					case ')':
					case '}':
					case ']':
						this.pair(value);
				}
				this.tokens.push(this.makeToken(tag, value));
				return value.length;
			}

			// Token Manipulators
			// ------------------

			// A source of ambiguity in our grammar used to be parameter lists in function
			// definitions versus argument lists in function calls. Walk backwards, tagging
			// parameters specially in order to make things easier for the parser.
			tagParameters() {
				var i, paramEndToken, stack, tok, tokens;
				if (this.tag() !== ')') {
					return this;
				}
				stack = [];
				({tokens} = this);
				i = tokens.length;
				paramEndToken = tokens[--i];
				paramEndToken[0] = 'PARAM_END';
				while (tok = tokens[--i]) {
					switch (tok[0]) {
						case ')':
							stack.push(tok);
							break;
						case '(':
						case 'CALL_START':
							if (stack.length) {
								stack.pop();
							} else if (tok[0] === '(') {
								tok[0] = 'PARAM_START';
								return this;
							} else {
								paramEndToken[0] = 'CALL_END';
								return this;
							}
					}
				}
				return this;
			}

			// Close up all remaining open blocks at the end of the file.
			closeIndentation() {
				return this.outdentToken(this.indent);
			}

			// Match the contents of a delimited token and expand variables and expressions
			// inside it using Ruby-like notation for substitution of arbitrary
			// expressions.

			//     "Hello #{name.capitalize()}."

			// If it encounters an interpolation, this method will recursively create a new
			// Lexer and tokenize until the `{` of `#{` is balanced with a `}`.

			//  - `regex` matches the contents of a token (but not `delimiter`, and not
			//    `#{` if interpolations are desired).
			//  - `delimiter` is the delimiter of the token. Examples are `'`, `"`, `'''`,
			//    `"""` and `///`.
			//  - `closingDelimiter` is different from `delimiter` only in CSX
			//  - `interpolators` matches the start of an interpolation, for CSX it's both
			//    `{` and `<` (i.e. nested CSX tag)

			// This method allows us to have strings within interpolations within strings,
			// ad infinitum.
			matchWithInterpolations(regex, delimiter, closingDelimiter, interpolators) {
				var braceInterpolator, close, column, firstToken, index, interpolationOffset, interpolator, lastToken, line, match, nested, offsetInChunk, open, ref, ref1, rest, str, strPart, tokens;
				if (closingDelimiter == null) {
					closingDelimiter = delimiter;
				}
				if (interpolators == null) {
					interpolators = /^#\{/;
				}
				tokens = [];
				offsetInChunk = delimiter.length;
				if (this.chunk.slice(0, offsetInChunk) !== delimiter) {
					return null;
				}
				str = this.chunk.slice(offsetInChunk);
				while (true) {
					[strPart] = regex.exec(str);
					this.validateEscapes(strPart, {
						isRegex: delimiter.charAt(0) === '/',
						offsetInChunk
					});
					// Push a fake `'NEOSTRING'` token, which will get turned into a real string later.
					tokens.push(this.makeToken('NEOSTRING', strPart, offsetInChunk));
					str = str.slice(strPart.length);
					offsetInChunk += strPart.length;
					if (!(match = interpolators.exec(str))) {
						break;
					}
					[interpolator] = match;
					// To remove the `#` in `#{`.
					interpolationOffset = interpolator.length - 1;
					[line, column] = this.getLineAndColumnFromChunk(offsetInChunk + interpolationOffset);
					rest = str.slice(interpolationOffset);
					({
						tokens: nested,
						index
					} = new Lexer().tokenize(rest, {
						line: line,
						column: column,
						untilBalanced: true
					}));
					// Account for the `#` in `#{`.
					index += interpolationOffset;
					braceInterpolator = str[index - 1] === '}';
					if (braceInterpolator) {
						// Turn the leading and trailing `{` and `}` into parentheses. Unnecessary
						// parentheses will be removed later.
						[open] = nested, [close] = slice.call(nested, -1);
						open[0] = open[1] = '(';
						close[0] = close[1] = ')';
						close.origin = ['', 'end of interpolation', close[2]];
					}
					if (((ref = nested[1]) != null ? ref[0] : void 0) === 'TERMINATOR') {
						// Remove leading `'TERMINATOR'` (if any).
						nested.splice(1, 1);
					}
					if (((ref1 = nested[nested.length - 3]) != null ? ref1[0] : void 0) === 'INDENT' && nested[nested.length - 2][0] === 'OUTDENT') {
						// Remove trailing `'INDENT'/'OUTDENT'` pair (if any).
						nested.splice(-3, 2);
					}
					if (!braceInterpolator) {
						// We are not using `{` and `}`, so wrap the interpolated tokens instead.
						open = this.makeToken('(', '(', offsetInChunk, 0);
						close = this.makeToken(')', ')', offsetInChunk + index, 0);
						nested = [open, ...nested, close];
					}
					// Push a fake `'TOKENS'` token, which will get turned into real tokens later.
					tokens.push(['TOKENS', nested]);
					str = str.slice(index);
					offsetInChunk += index;
				}
				if (str.slice(0, closingDelimiter.length) !== closingDelimiter) {
					this.error(`missing ${closingDelimiter}`, {
						length: delimiter.length
					});
				}
				[firstToken] = tokens, [lastToken] = slice.call(tokens, -1);
				firstToken[2].first_column -= delimiter.length;
				if (lastToken[1].substr(-1) === '\n') {
					lastToken[2].last_line += 1;
					lastToken[2].last_column = closingDelimiter.length - 1;
				} else {
					lastToken[2].last_column += closingDelimiter.length;
				}
				if (lastToken[1].length === 0) {
					lastToken[2].last_column -= 1;
				}
				return {
					tokens,
					index: offsetInChunk + closingDelimiter.length
				};
			}

			// Merge the array `tokens` of the fake token types `'TOKENS'` and `'NEOSTRING'`
			// (as returned by `matchWithInterpolations`) into the token stream. The value
			// of `'NEOSTRING'`s are converted using `fn` and turned into strings using
			// `options` first.
			mergeInterpolationTokens(tokens, options, fn) {
				var converted, firstEmptyStringIndex, firstIndex, i, j, k, lastToken, len, len1, locationToken, lparen, placeholderToken, plusToken, rparen, tag, token, tokensToPush, val, value;
				if (tokens.length > 1) {
					lparen = this.token('STRING_START', '(', 0, 0);
				}
				firstIndex = this.tokens.length;
				for (i = j = 0, len = tokens.length; j < len; i = ++j) {
					token = tokens[i];
					[tag, value] = token;
					switch (tag) {
						case 'TOKENS':
							if (value.length === 2) {
								if (!(value[0].comments || value[1].comments)) {
									// Optimize out empty interpolations (an empty pair of parentheses).
									continue;
								}
								// There are comments (and nothing else) in this interpolation.
								if (this.csxDepth === 0) {
									// This is an interpolated string, not a CSX tag; and for whatever
									// reason `` `a${/*test*/}b` `` is invalid JS. So compile to
									// `` `a${/*test*/''}b` `` instead.
									placeholderToken = this.makeToken('STRING', "''");
								} else {
									placeholderToken = this.makeToken('JS', '');
								}
								// Use the same location data as the first parenthesis.
								placeholderToken[2] = value[0][2];
								for (k = 0, len1 = value.length; k < len1; k++) {
									val = value[k];
									if (!val.comments) {
										continue;
									}
									if (placeholderToken.comments == null) {
										placeholderToken.comments = [];
									}
									placeholderToken.comments.push(...val.comments);
								}
								value.splice(1, 0, placeholderToken);
							}
							// Push all the tokens in the fake `'TOKENS'` token. These already have
							// sane location data.
							locationToken = value[0];
							tokensToPush = value;
							break;
						case 'NEOSTRING':
							// Convert `'NEOSTRING'` into `'STRING'`.
							converted = fn.call(this, token[1], i);
							// Optimize out empty strings. We ensure that the tokens stream always
							// starts with a string token, though, to make sure that the result
							// really is a string.
							if (converted.length === 0) {
								if (i === 0) {
									firstEmptyStringIndex = this.tokens.length;
								} else {
									continue;
								}
							}
							// However, there is one case where we can optimize away a starting
							// empty string.
							if (i === 2 && (firstEmptyStringIndex != null)) {
								this.tokens.splice(firstEmptyStringIndex, 2); // Remove empty string and the plus.
							}
							token[0] = 'STRING';
							token[1] = this.makeDelimitedLiteral(converted, options);
							locationToken = token;
							tokensToPush = [token];
					}
					if (this.tokens.length > firstIndex) {
						// Create a 0-length `+` token.
						plusToken = this.token('+', '+');
						plusToken[2] = {
							first_line: locationToken[2].first_line,
							first_column: locationToken[2].first_column,
							last_line: locationToken[2].first_line,
							last_column: locationToken[2].first_column
						};
					}
					this.tokens.push(...tokensToPush);
				}
				if (lparen) {
					[lastToken] = slice.call(tokens, -1);
					lparen.origin = [
						'STRING',
						null,
						{
							first_line: lparen[2].first_line,
							first_column: lparen[2].first_column,
							last_line: lastToken[2].last_line,
							last_column: lastToken[2].last_column
						}
					];
					lparen[2] = lparen.origin[2];
					rparen = this.token('STRING_END', ')');
					return rparen[2] = {
						first_line: lastToken[2].last_line,
						first_column: lastToken[2].last_column,
						last_line: lastToken[2].last_line,
						last_column: lastToken[2].last_column
					};
				}
			}

			// Pairs up a closing token, ensuring that all listed pairs of tokens are
			// correctly balanced throughout the course of the token stream.
			pair(tag) {
				var lastIndent, prev, ref, ref1, wanted;
				ref = this.ends, [prev] = slice.call(ref, -1);
				if (tag !== (wanted = prev != null ? prev.tag : void 0)) {
					if ('OUTDENT' !== wanted) {
						this.error(`unmatched ${tag}`);
					}
					// Auto-close `INDENT` to support syntax like this:

					//     el.click((event) ->
					//       el.hide())

					ref1 = this.indents, [lastIndent] = slice.call(ref1, -1);
					this.outdentToken(lastIndent, true);
					return this.pair(tag);
				}
				return this.ends.pop();
			}

			// Helpers
			// -------

			// Returns the line and column number from an offset into the current chunk.

			// `offset` is a number of characters into `@chunk`.
			getLineAndColumnFromChunk(offset) {
				var column, lastLine, lineCount, ref, string;
				if (offset === 0) {
					return [this.chunkLine, this.chunkColumn];
				}
				if (offset >= this.chunk.length) {
					string = this.chunk;
				} else {
					string = this.chunk.slice(0, +(offset - 1) + 1 || 9e9);
				}
				lineCount = count(string, '\n');
				column = this.chunkColumn;
				if (lineCount > 0) {
					ref = string.split('\n'), [lastLine] = slice.call(ref, -1);
					column = lastLine.length;
				} else {
					column += string.length;
				}
				return [this.chunkLine + lineCount, column];
			}

			// Same as `token`, except this just returns the token without adding it
			// to the results.
			makeToken(tag, value, offsetInChunk = 0, length = value.length, origin) {
				var lastCharacter, locationData, token;
				locationData = {};
				[locationData.first_line, locationData.first_column] = this.getLineAndColumnFromChunk(offsetInChunk);
				// Use length - 1 for the final offset - we’re supplying the last_line and the last_column,
				// so if last_column == first_column, then we’re looking at a character of length 1.
				lastCharacter = length > 0 ? length - 1 : 0;
				[locationData.last_line, locationData.last_column] = this.getLineAndColumnFromChunk(offsetInChunk + lastCharacter);
				token = [tag, value, locationData];
				if (origin) {
					token.origin = origin;
				}
				return token;
			}

			// Add a token to the results.
			// `offset` is the offset into the current `@chunk` where the token starts.
			// `length` is the length of the token in the `@chunk`, after the offset.  If
			// not specified, the length of `value` will be used.

			// Returns the new token.
			token(tag, value, offsetInChunk, length, origin) {
				var token;
				token = this.makeToken(tag, value, offsetInChunk, length, origin);
				this.tokens.push(token);
				return token;
			}

			// Peek at the last tag in the token stream.
			tag() {
				var ref, token;
				ref = this.tokens, [token] = slice.call(ref, -1);
				return token != null ? token[0] : void 0;
			}

			// Peek at the last value in the token stream.
			value(useOrigin = false) {
				var ref, ref1, token;
				ref = this.tokens, [token] = slice.call(ref, -1);
				if (useOrigin && ((token != null ? token.origin : void 0) != null)) {
					return (ref1 = token.origin) != null ? ref1[1] : void 0;
				} else {
					return token != null ? token[1] : void 0;
				}
			}

			// Get the previous token in the token stream.
			prev() {
				return this.tokens[this.tokens.length - 1];
			}

			// Are we in the midst of an unfinished expression?
			unfinished() {
				var ref;
				return LINE_CONTINUER.test(this.chunk) || (ref = this.tag(), indexOf.call(UNFINISHED, ref) >= 0);
			}

			formatString(str, options) {
				return this.replaceUnicodeCodePointEscapes(str.replace(STRING_OMIT, '$1'), options);
			}

			formatHeregex(str, options) {
				return this.formatRegex(str.replace(HEREGEX_OMIT, '$1$2'), merge(options, {
					delimiter: '///'
				}));
			}

			formatRegex(str, options) {
				return this.replaceUnicodeCodePointEscapes(str, options);
			}

			unicodeCodePointToUnicodeEscapes(codePoint) {
				var high, low, toUnicodeEscape;
				toUnicodeEscape = function(val) {
					var str;
					str = val.toString(16);
					return `\\u${repeat('0', 4 - str.length)}${str}`;
				};
				if (codePoint < 0x10000) {
					return toUnicodeEscape(codePoint);
				}
				// surrogate pair
				high = Math.floor((codePoint - 0x10000) / 0x400) + 0xD800;
				low = (codePoint - 0x10000) % 0x400 + 0xDC00;
				return `${toUnicodeEscape(high)}${toUnicodeEscape(low)}`;
			}

			// Replace `\u{...}` with `\uxxxx[\uxxxx]` in regexes without `u` flag
			replaceUnicodeCodePointEscapes(str, options) {
				var shouldReplace;
				shouldReplace = (options.flags != null) && indexOf.call(options.flags, 'u') < 0;
				return str.replace(UNICODE_CODE_POINT_ESCAPE, (match, escapedBackslash, codePointHex, offset) => {
					var codePointDecimal;
					if (escapedBackslash) {
						return escapedBackslash;
					}
					codePointDecimal = parseInt(codePointHex, 16);
					if (codePointDecimal > 0x10ffff) {
						this.error("unicode code point escapes greater than \\u{10ffff} are not allowed", {
							offset: offset + options.delimiter.length,
							length: codePointHex.length + 4
						});
					}
					if (!shouldReplace) {
						return match;
					}
					return this.unicodeCodePointToUnicodeEscapes(codePointDecimal);
				});
			}

			// Validates escapes in strings and regexes.
			validateEscapes(str, options = {}) {
				var before, hex, invalidEscape, invalidEscapeRegex, match, message, octal, ref, unicode, unicodeCodePoint;
				invalidEscapeRegex = options.isRegex ? REGEX_INVALID_ESCAPE : STRING_INVALID_ESCAPE;
				match = invalidEscapeRegex.exec(str);
				if (!match) {
					return;
				}
				match[0], before = match[1], octal = match[2], hex = match[3], unicodeCodePoint = match[4], unicode = match[5];
				message = octal ? "octal escape sequences are not allowed" : "invalid escape sequence";
				invalidEscape = `\\${octal || hex || unicodeCodePoint || unicode}`;
				return this.error(`${message} ${invalidEscape}`, {
					offset: ((ref = options.offsetInChunk) != null ? ref : 0) + match.index + before.length,
					length: invalidEscape.length
				});
			}

			// Constructs a string or regex by escaping certain characters.
			makeDelimitedLiteral(body, options = {}) {
				var regex;
				if (body === '' && options.delimiter === '/') {
					body = '(?:)';
				}
				regex = RegExp(`(\\\\\\\\)|(\\\\0(?=[1-7]))|\\\\?(${options.delimiter // Escaped backslash.
				// Null character mistaken as octal escape.
				// (Possibly escaped) delimiter.
				// (Possibly escaped) newlines.
				// Other escapes.
	})|\\\\?(?:(\\n)|(\\r)|(\\u2028)|(\\u2029))|(\\\\.)`, "g");
				body = body.replace(regex, function(match, backslash, nul, delimiter, lf, cr, ls, ps, other) {
					switch (false) {
						// Ignore escaped backslashes.
						case !backslash:
							if (options.double) {
								return backslash + backslash;
							} else {
								return backslash;
							}
						case !nul:
							return '\\x00';
						case !delimiter:
							return `\\${delimiter}`;
						case !lf:
							return '\\n';
						case !cr:
							return '\\r';
						case !ls:
							return '\\u2028';
						case !ps:
							return '\\u2029';
						case !other:
							if (options.double) {
								return `\\${other}`;
							} else {
								return other;
							}
					}
				});
				return `${options.delimiter}${body}${options.delimiter}`;
			}

			suppressSemicolons() {
				var ref, ref1, results;
				results = [];
				while (this.value() === ';') {
					this.tokens.pop();
					if (ref = (ref1 = this.prev()) != null ? ref1[0] : void 0, indexOf.call(['=', ...UNFINISHED], ref) >= 0) {
						results.push(this.error('unexpected ;'));
					} else {
						results.push(void 0);
					}
				}
				return results;
			}

			// Throws an error at either a given offset from the current chunk or at the
			// location of a token (`token[2]`).
			error(message, options = {}) {
				var first_column, first_line, location, ref, ref1;
				location = 'first_line' in options ? options : ([first_line, first_column] = this.getLineAndColumnFromChunk((ref = options.offset) != null ? ref : 0), {
					first_line,
					first_column,
					last_column: first_column + ((ref1 = options.length) != null ? ref1 : 1) - 1
				});
				return throwSyntaxError(message, location);
			}

		};

		// Helper functions
		// ----------------
		isUnassignable = function(name, displayName = name) {
			switch (false) {
				case indexOf.call([...JS_KEYWORDS, ...COFFEE_KEYWORDS], name) < 0:
					return `keyword '${displayName}' can't be assigned`;
				case indexOf.call(STRICT_PROSCRIBED, name) < 0:
					return `'${displayName}' can't be assigned`;
				case indexOf.call(RESERVED, name) < 0:
					return `reserved word '${displayName}' can't be assigned`;
				default:
					return false;
			}
		};

		exports.isUnassignable = isUnassignable;

		// `from` isn’t a CoffeeScript keyword, but it behaves like one in `import` and
		// `export` statements (handled above) and in the declaration line of a `for`
		// loop. Try to detect when `from` is a variable identifier and when it is this
		// “sometimes” keyword.
		isForFrom = function(prev) {
			var ref;
			if (prev[0] === 'IDENTIFIER') {
				// `for i from from`, `for from from iterable`
				if (prev[1] === 'from') {
					prev[1][0] = 'IDENTIFIER';
					true;
				}
				// `for i from iterable`
				return true;
			// `for from…`
			} else if (prev[0] === 'FOR') {
				return false;
			// `for {from}…`, `for [from]…`, `for {a, from}…`, `for {a: from}…`
			} else if ((ref = prev[1]) === '{' || ref === '[' || ref === ',' || ref === ':') {
				return false;
			} else {
				return true;
			}
		};

		// Constants
		// ---------

		// Keywords that CoffeeScript shares in common with JavaScript.
		JS_KEYWORDS = ['true', 'false', 'null', 'this', 'new', 'delete', 'typeof', 'in', 'instanceof', 'return', 'throw', 'break', 'continue', 'debugger', 'yield', 'await', 'if', 'else', 'switch', 'for', 'while', 'do', 'try', 'catch', 'finally', 'class', 'extends', 'super', 'import', 'export', 'default'];

		// CoffeeScript-only keywords.
		COFFEE_KEYWORDS = ['undefined', 'Infinity', 'NaN', 'then', 'unless', 'until', 'loop', 'of', 'by', 'when'];

		COFFEE_ALIAS_MAP = {
			and: '&&',
			or: '||',
			is: '==',
			isnt: '!=',
			not: '!',
			yes: 'true',
			no: 'false',
			on: 'true',
			off: 'false'
		};

		COFFEE_ALIASES = (function() {
			var results;
			results = [];
			for (key in COFFEE_ALIAS_MAP) {
				results.push(key);
			}
			return results;
		})();

		COFFEE_KEYWORDS = COFFEE_KEYWORDS.concat(COFFEE_ALIASES);

		// The list of keywords that are reserved by JavaScript, but not used, or are
		// used by CoffeeScript internally. We throw an error when these are encountered,
		// to avoid having a JavaScript error at runtime.
		RESERVED = ['case', 'function', 'var', 'void', 'with', 'const', 'let', 'enum', 'native', 'implements', 'interface', 'package', 'private', 'protected', 'public', 'static'];

		STRICT_PROSCRIBED = ['arguments', 'eval'];

		// The superset of both JavaScript keywords and reserved words, none of which may
		// be used as identifiers or properties.
		exports.JS_FORBIDDEN = JS_KEYWORDS.concat(RESERVED).concat(STRICT_PROSCRIBED);

		// The character code of the nasty Microsoft madness otherwise known as the BOM.
		BOM = 65279;

		// Token matching regexes.
		IDENTIFIER = /^(?!\d)((?:(?!\s)[$\w\x7f-\uffff])+)([^\n\S]*:(?!:))?/; // Is this a property name?

		CSX_IDENTIFIER = /^(?![\d<])((?:(?!\s)[\.\-$\w\x7f-\uffff])+)/; // Must not start with `<`.
		// Like `IDENTIFIER`, but includes `-`s and `.`s.

		// Fragment: <></>
		CSX_FRAGMENT_IDENTIFIER = /^()>/; // Ends immediately with `>`.

		CSX_ATTRIBUTE = /^(?!\d)((?:(?!\s)[\-$\w\x7f-\uffff])+)([^\S]*=(?!=))?/; // Like `IDENTIFIER`, but includes `-`s.
		// Is this an attribute with a value?

		NUMBER = /^0b[01]+|^0o[0-7]+|^0x[\da-f]+|^\d*\.?\d+(?:e[+-]?\d+)?/i; // binary
		// octal
		// hex
		// decimal

		OPERATOR = /^(?:[-=]>|[-+*\/%<>&|^!?=]=|>>>=?|([-+:])\1|([&|<>*\/%])\2=?|\?(\.|::)|\.{2,3})/; // function
		// compound assign / compare
		// zero-fill right shift
		// doubles
		// logic / shift / power / floor division / modulo
		// soak access
		// range or splat

		WHITESPACE = /^[^\n\S]+/;

		COMMENT = /^\s*###([^#][\s\S]*?)(?:###[^\n\S]*|###$)|^(?:\s*#(?!##[^#]).*)+/;

		CODE = /^[-=]>/;

		MULTI_DENT = /^(?:\n[^\n\S]*)+/;

		JSTOKEN = /^`(?!``)((?:[^`\\]|\\[\s\S])*)`/;

		HERE_JSTOKEN = /^```((?:[^`\\]|\\[\s\S]|`(?!``))*)```/;

		// String-matching-regexes.
		STRING_START = /^(?:'''|"""|'|")/;

		STRING_SINGLE = /^(?:[^\\']|\\[\s\S])*/;

		STRING_DOUBLE = /^(?:[^\\"#]|\\[\s\S]|\#(?!\{))*/;

		HEREDOC_SINGLE = /^(?:[^\\']|\\[\s\S]|'(?!''))*/;

		HEREDOC_DOUBLE = /^(?:[^\\"#]|\\[\s\S]|"(?!"")|\#(?!\{))*/;

		INSIDE_CSX = /^(?:[^\{<])*/; // Start of CoffeeScript interpolation. // Similar to `HEREDOC_DOUBLE` but there is no escaping.
		// Maybe CSX tag (`<` not allowed even if bare).

		CSX_INTERPOLATION = /^(?:\{|<(?!\/))/; // CoffeeScript interpolation.
		// CSX opening tag.

		STRING_OMIT = /((?:\\\\)+)|\\[^\S\n]*\n\s*/g; // Consume (and preserve) an even number of backslashes.
		// Remove escaped newlines.

		SIMPLE_STRING_OMIT = /\s*\n\s*/g;

		HEREDOC_INDENT = /\n+([^\n\S]*)(?=\S)/g;

		// Regex-matching-regexes.
		REGEX = /^\/(?!\/)((?:[^[\/\n\\]|\\[^\n]|\[(?:\\[^\n]|[^\]\n\\])*\])*)(\/)?/; // Every other thing.
		// Anything but newlines escaped.
		// Character class.

		REGEX_FLAGS = /^\w*/;

		VALID_FLAGS = /^(?!.*(.).*\1)[gimsuy]*$/;

		// Match any character, except those that need special handling below.
		// Match `\` followed by any character.
		// Match any `/` except `///`.
		// Match `#` which is not part of interpolation, e.g. `#{}`.
		// Comments consume everything until the end of the line, including `///`.
		HEREGEX = /^(?:[^\\\/#\s]|\\[\s\S]|\/(?!\/\/)|\#(?!\{)|\s+(?:#(?!\{).*)?)*/;

		HEREGEX_OMIT = /((?:\\\\)+)|\\(\s)|\s+(?:#.*)?/g; // Consume (and preserve) an even number of backslashes.
		// Preserve escaped whitespace.
		// Remove whitespace and comments.

		REGEX_ILLEGAL = /^(\/|\/{3}\s*)(\*)/;

		POSSIBLY_DIVISION = /^\/=?\s/;

		// Other regexes.
		HERECOMMENT_ILLEGAL = /\*\//;

		LINE_CONTINUER = /^\s*(?:,|\??\.(?![.\d])|\??::)/;

		STRING_INVALID_ESCAPE = /((?:^|[^\\])(?:\\\\)*)\\(?:(0[0-7]|[1-7])|(x(?![\da-fA-F]{2}).{0,2})|(u\{(?![\da-fA-F]{1,}\})[^}]*\}?)|(u(?!\{|[\da-fA-F]{4}).{0,4}))/; // Make sure the escape isn’t escaped.
		// octal escape
		// hex escape
		// unicode code point escape
		// unicode escape

		REGEX_INVALID_ESCAPE = /((?:^|[^\\])(?:\\\\)*)\\(?:(0[0-7])|(x(?![\da-fA-F]{2}).{0,2})|(u\{(?![\da-fA-F]{1,}\})[^}]*\}?)|(u(?!\{|[\da-fA-F]{4}).{0,4}))/; // Make sure the escape isn’t escaped.
		// octal escape
		// hex escape
		// unicode code point escape
		// unicode escape

		UNICODE_CODE_POINT_ESCAPE = /(\\\\)|\\u\{([\da-fA-F]+)\}/g; // Make sure the escape isn’t escaped.

		LEADING_BLANK_LINE = /^[^\n\S]*\n/;

		TRAILING_BLANK_LINE = /\n[^\n\S]*$/;

		TRAILING_SPACES = /\s+$/;

		// Compound assignment tokens.
		COMPOUND_ASSIGN = ['-=', '+=', '/=', '*=', '%=', '||=', '&&=', '?=', '<<=', '>>=', '>>>=', '&=', '^=', '|=', '**=', '//=', '%%='];

		// Unary tokens.
		UNARY = ['NEW', 'TYPEOF', 'DELETE', 'DO'];

		UNARY_MATH = ['!', '~'];

		// Bit-shifting tokens.
		SHIFT = ['<<', '>>', '>>>'];

		// Comparison tokens.
		COMPARE = ['==', '!=', '<', '>', '<=', '>='];

		// Mathematical tokens.
		MATH = ['*', '/', '%', '//', '%%'];

		// Relational tokens that are negatable with `not` prefix.
		RELATION = ['IN', 'OF', 'INSTANCEOF'];

		// Boolean tokens.
		BOOL = ['TRUE', 'FALSE'];

		// Tokens which could legitimately be invoked or indexed. An opening
		// parentheses or bracket following these tokens will be recorded as the start
		// of a function invocation or indexing operation.
		CALLABLE = ['IDENTIFIER', 'PROPERTY', ')', ']', '?', '@', 'THIS', 'SUPER'];

		INDEXABLE = CALLABLE.concat(['NUMBER', 'INFINITY', 'NAN', 'STRING', 'STRING_END', 'REGEX', 'REGEX_END', 'BOOL', 'NULL', 'UNDEFINED', '}', '::']);

		// Tokens which can be the left-hand side of a less-than comparison, i.e. `a<b`.
		COMPARABLE_LEFT_SIDE = ['IDENTIFIER', ')', ']', 'NUMBER'];

		// Tokens which a regular expression will never immediately follow (except spaced
		// CALLABLEs in some cases), but which a division operator can.

		// See: http://www-archive.mozilla.org/js/language/js20-2002-04/rationale/syntax.html#regular-expressions
		NOT_REGEX = INDEXABLE.concat(['++', '--']);

		// Tokens that, when immediately preceding a `WHEN`, indicate that the `WHEN`
		// occurs at the start of a line. We disambiguate these from trailing whens to
		// avoid an ambiguity in the grammar.
		LINE_BREAK = ['INDENT', 'OUTDENT', 'TERMINATOR'];

		// Additional indent in front of these is ignored.
		INDENTABLE_CLOSERS = [')', '}', ']'];

		// Tokens that, when appearing at the end of a line, suppress a following TERMINATOR/INDENT token
		UNFINISHED = ['\\', '.', '?.', '?::', 'UNARY', 'MATH', 'UNARY_MATH', '+', '-', '**', 'SHIFT', 'RELATION', 'COMPARE', '&', '^', '|', '&&', '||', 'BIN?', 'EXTENDS'];

		return exports;
	};
	//#endregion

	//#region URL: /parser
	modules['/parser'] = function(){
		/* parser generated by jison 0.4.18 */
		/*
			Returns a Parser object of the following structure:

			Parser: {
				yy: {}
			}

			Parser.prototype: {
				yy: {},
				trace: function(),
				symbols_: {associative list: name ==> number},
				terminals_: {associative list: number ==> name},
				productions_: [...],
				performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$),
				table: [...],
				defaultActions: {...},
				parseError: function(str, hash),
				parse: function(input),

				lexer: {
						EOF: 1,
						parseError: function(str, hash),
						setInput: function(input),
						input: function(),
						unput: function(str),
						more: function(),
						less: function(n),
						pastInput: function(),
						upcomingInput: function(),
						showPosition: function(),
						test_match: function(regex_match_array, rule_index),
						next: function(),
						lex: function(),
						begin: function(condition),
						popState: function(),
						_currentRules: function(),
						topState: function(),
						pushState: function(condition),

						options: {
								ranges: boolean           (optional: true ==> token location info will include a .range[] member)
								flex: boolean             (optional: true ==> flex-like lexing behaviour where the rules are tested exhaustively to find the longest match)
								backtrack_lexer: boolean  (optional: true ==> lexer regexes are tested in order and for each matching regex the action code is invoked; the lexer terminates the scan when a token is returned by the action code)
						},

						performAction: function(yy, yy_, $avoiding_name_collisions, YY_START),
						rules: [...],
						conditions: {associative list: name ==> set},
				}
			}


			token location info (@$, _$, etc.): {
				first_line: n,
				last_line: n,
				first_column: n,
				last_column: n,
				range: [start_number, end_number]       (where the numbers are indexes into the input string, regular zero-based)
			}


			the parseError function receives a 'hash' object with these members for lexer and parser errors: {
				text:        (matched text)
				token:       (the produced terminal token, if any)
				line:        (yylineno)
			}
			while parser (grammar) errors will also provide these members, i.e. parser errors deliver a superset of attributes: {
				loc:         (yylloc)
				expected:    (string describing the set of expected tokens)
				recoverable: (boolean: TRUE when the parser has a error recovery rule available for this particular error)
			}
		*/
		var exports = {};
		var parser = (function(){
		var o=function(k,v,o,l){for(o=o||{},l=k.length;l--;o[k[l]]=v);return o},$V0=[1,24],$V1=[1,56],$V2=[1,91],$V3=[1,92],$V4=[1,87],$V5=[1,93],$V6=[1,94],$V7=[1,89],$V8=[1,90],$V9=[1,64],$Va=[1,66],$Vb=[1,67],$Vc=[1,68],$Vd=[1,69],$Ve=[1,70],$Vf=[1,72],$Vg=[1,73],$Vh=[1,58],$Vi=[1,42],$Vj=[1,36],$Vk=[1,76],$Vl=[1,77],$Vm=[1,86],$Vn=[1,54],$Vo=[1,59],$Vp=[1,60],$Vq=[1,74],$Vr=[1,75],$Vs=[1,47],$Vt=[1,55],$Vu=[1,71],$Vv=[1,81],$Vw=[1,82],$Vx=[1,83],$Vy=[1,84],$Vz=[1,53],$VA=[1,80],$VB=[1,38],$VC=[1,39],$VD=[1,40],$VE=[1,41],$VF=[1,43],$VG=[1,44],$VH=[1,95],$VI=[1,6,36,47,146],$VJ=[1,6,35,36,47,69,70,93,127,135,146,149,157],$VK=[1,113],$VL=[1,114],$VM=[1,115],$VN=[1,110],$VO=[1,98],$VP=[1,97],$VQ=[1,96],$VR=[1,99],$VS=[1,100],$VT=[1,101],$VU=[1,102],$VV=[1,103],$VW=[1,104],$VX=[1,105],$VY=[1,106],$VZ=[1,107],$V_=[1,108],$V$=[1,109],$V01=[1,117],$V11=[1,6,35,36,47,69,70,83,88,93,109,127,135,146,148,149,150,156,157,174,178,179,182,183,184,185,186,187,188,189,190,191,192,193],$V21=[2,197],$V31=[1,123],$V41=[1,128],$V51=[1,124],$V61=[1,125],$V71=[1,126],$V81=[1,129],$V91=[1,122],$Va1=[1,6,35,36,47,69,70,93,127,135,146,148,149,150,156,157,174],$Vb1=[1,6,35,36,45,46,47,69,70,80,81,83,88,93,101,102,103,105,109,125,126,127,135,146,148,149,150,156,157,174,178,179,182,183,184,185,186,187,188,189,190,191,192,193],$Vc1=[2,122],$Vd1=[2,126],$Ve1=[6,35,88,93],$Vf1=[2,99],$Vg1=[1,141],$Vh1=[1,135],$Vi1=[1,140],$Vj1=[1,144],$Vk1=[1,149],$Vl1=[1,147],$Vm1=[1,151],$Vn1=[1,155],$Vo1=[1,153],$Vp1=[1,6,35,36,45,46,47,61,69,70,80,81,83,88,93,101,102,103,105,109,125,126,127,135,146,148,149,150,156,157,174,178,179,182,183,184,185,186,187,188,189,190,191,192,193],$Vq1=[2,119],$Vr1=[1,6,36,47,69,70,83,88,93,109,127,135,146,148,149,150,156,157,174,178,179,182,183,184,185,186,187,188,189,190,191,192,193],$Vs1=[2,31],$Vt1=[1,183],$Vu1=[2,86],$Vv1=[1,187],$Vw1=[1,193],$Vx1=[1,208],$Vy1=[1,203],$Vz1=[1,212],$VA1=[1,209],$VB1=[1,214],$VC1=[1,215],$VD1=[1,217],$VE1=[14,32,35,38,39,43,45,46,49,50,54,55,56,57,58,59,68,77,84,85,86,90,91,107,110,112,120,129,130,140,144,145,148,150,153,156,167,173,176,177,178,179,180,181],$VF1=[1,6,35,36,45,46,47,61,69,70,80,81,83,88,93,101,102,103,105,109,111,125,126,127,135,146,148,149,150,156,157,174,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194],$VG1=[1,228],$VH1=[1,229],$VI1=[2,143],$VJ1=[1,245],$VK1=[1,247],$VL1=[1,257],$VM1=[1,6,35,36,45,46,47,65,69,70,80,81,83,88,93,101,102,103,105,109,125,126,127,135,146,148,149,150,156,157,174,178,179,182,183,184,185,186,187,188,189,190,191,192,193],$VN1=[1,6,33,35,36,45,46,47,61,65,69,70,80,81,83,88,93,101,102,103,105,109,111,117,125,126,127,135,146,148,149,150,156,157,164,165,166,174,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194],$VO1=[1,6,35,36,45,46,47,52,65,69,70,80,81,83,88,93,101,102,103,105,109,125,126,127,135,146,148,149,150,156,157,174,178,179,182,183,184,185,186,187,188,189,190,191,192,193],$VP1=[1,287],$VQ1=[45,46,126],$VR1=[1,298],$VS1=[1,297],$VT1=[6,35],$VU1=[2,97],$VV1=[1,304],$VW1=[6,35,36,88,93],$VX1=[6,35,36,61,70,88,93],$VY1=[1,6,35,36,47,69,70,80,81,83,88,93,101,102,103,105,109,127,135,146,148,149,150,156,157,174,178,179,182,183,184,185,186,187,188,189,190,191,192,193],$VZ1=[1,6,35,36,47,69,70,83,88,93,109,127,135,146,148,149,150,156,157,174,178,179,183,184,185,186,187,188,189,190,191,192,193],$V_1=[2,349],$V$1=[1,6,35,36,47,69,70,83,88,93,109,127,135,146,148,149,150,156,157,174,178,179,183,185,186,187,188,189,190,191,192,193],$V02=[45,46,80,81,101,102,103,105,125,126],$V12=[1,331],$V22=[1,6,35,36,47,69,70,83,88,93,109,127,135,146,148,149,150,156,157,174],$V32=[2,84],$V42=[1,347],$V52=[1,349],$V62=[1,354],$V72=[1,356],$V82=[6,35,69,93],$V92=[2,222],$Va2=[2,223],$Vb2=[1,6,35,36,45,46,47,61,69,70,80,81,83,88,93,101,102,103,105,109,125,126,127,135,146,148,149,150,156,157,164,165,166,174,178,179,182,183,184,185,186,187,188,189,190,191,192,193],$Vc2=[1,370],$Vd2=[6,14,32,35,36,38,39,43,45,46,49,50,54,55,56,57,58,59,68,69,70,77,84,85,86,90,91,93,107,110,112,120,129,130,140,144,145,148,150,153,156,167,173,176,177,178,179,180,181],$Ve2=[6,35,36,69,93],$Vf2=[6,35,36,69,93,127],$Vg2=[1,6,35,36,45,46,47,61,65,69,70,80,81,83,88,93,101,102,103,105,109,111,125,126,127,135,146,148,149,150,156,157,164,165,166,174,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194],$Vh2=[1,6,35,36,47,69,70,83,88,93,109,127,135,146,157,174],$Vi2=[1,6,35,36,47,69,70,83,88,93,109,127,135,146,149,157,174],$Vj2=[2,274],$Vk2=[164,165,166],$Vl2=[93,164,165,166],$Vm2=[6,35,109],$Vn2=[1,395],$Vo2=[6,35,36,93,109],$Vp2=[6,35,36,65,93,109],$Vq2=[1,401],$Vr2=[1,402],$Vs2=[6,35,36,61,65,70,80,81,93,109,126],$Vt2=[6,35,36,70,80,81,93,109,126],$Vu2=[1,6,35,36,47,69,70,83,88,93,109,127,135,146,148,149,150,156,157,174,178,179,185,186,187,188,189,190,191,192,193],$Vv2=[2,341],$Vw2=[2,340],$Vx2=[1,6,35,36,45,46,47,52,69,70,80,81,83,88,93,101,102,103,105,109,125,126,127,135,146,148,149,150,156,157,174,178,179,182,183,184,185,186,187,188,189,190,191,192,193],$Vy2=[1,424],$Vz2=[14,32,38,39,43,45,46,49,50,54,55,56,57,58,59,68,77,83,84,85,86,90,91,107,110,112,120,129,130,140,144,145,148,150,153,156,167,173,176,177,178,179,180,181],$VA2=[2,208],$VB2=[6,35,36],$VC2=[2,98],$VD2=[1,433],$VE2=[1,434],$VF2=[1,6,35,36,47,69,70,80,81,83,88,93,101,102,103,105,109,127,135,142,143,146,148,149,150,156,157,169,171,174,178,179,182,183,184,185,186,187,188,189,190,191,192,193],$VG2=[1,313],$VH2=[36,169,171],$VI2=[1,6,36,47,69,70,83,88,93,109,127,135,146,149,157,174],$VJ2=[1,469],$VK2=[1,475],$VL2=[1,6,35,36,47,69,70,93,127,135,146,149,157,174],$VM2=[2,113],$VN2=[1,488],$VO2=[1,489],$VP2=[6,35,36,69],$VQ2=[1,6,35,36,47,69,70,83,88,93,109,127,135,146,148,149,150,156,157,169,174,178,179,182,183,184,185,186,187,188,189,190,191,192,193],$VR2=[1,6,35,36,47,69,70,93,127,135,146,149,157,169],$VS2=[2,288],$VT2=[2,289],$VU2=[2,304],$VV2=[1,512],$VW2=[1,513],$VX2=[6,35,36,109],$VY2=[1,6,35,36,47,69,70,83,88,93,109,127,135,146,148,150,156,157,174],$VZ2=[1,534],$V_2=[6,35,36,93,127],$V$2=[6,35,36,93],$V03=[1,6,35,36,47,69,70,83,88,93,109,127,135,142,146,148,149,150,156,157,174,178,179,182,183,184,185,186,187,188,189,190,191,192,193],$V13=[35,93],$V23=[1,562],$V33=[1,563],$V43=[1,569],$V53=[1,570],$V63=[2,259],$V73=[2,262],$V83=[2,275],$V93=[1,619],$Va3=[1,620],$Vb3=[2,290],$Vc3=[2,294],$Vd3=[2,291],$Ve3=[2,295],$Vf3=[2,292],$Vg3=[2,293],$Vh3=[2,305],$Vi3=[2,306],$Vj3=[1,6,35,36,47,69,70,83,88,93,109,127,135,146,148,149,150,156,174],$Vk3=[2,296],$Vl3=[2,298],$Vm3=[2,300],$Vn3=[2,302],$Vo3=[2,297],$Vp3=[2,299],$Vq3=[2,301],$Vr3=[2,303];
		var parser = {trace: function trace () { },
		yy: {},
		symbols_: {"error":2,"Root":3,"Body":4,"Line":5,"TERMINATOR":6,"Expression":7,"ExpressionLine":8,"Statement":9,"FuncDirective":10,"YieldReturn":11,"AwaitReturn":12,"Return":13,"STATEMENT":14,"Import":15,"Export":16,"Value":17,"Code":18,"Operation":19,"Assign":20,"If":21,"Try":22,"While":23,"For":24,"Switch":25,"Class":26,"Throw":27,"Yield":28,"CodeLine":29,"IfLine":30,"OperationLine":31,"YIELD":32,"FROM":33,"Block":34,"INDENT":35,"OUTDENT":36,"Identifier":37,"IDENTIFIER":38,"CSX_TAG":39,"Property":40,"PROPERTY":41,"AlphaNumeric":42,"NUMBER":43,"String":44,"STRING":45,"STRING_START":46,"STRING_END":47,"Regex":48,"REGEX":49,"REGEX_START":50,"Invocation":51,"REGEX_END":52,"Literal":53,"JS":54,"UNDEFINED":55,"NULL":56,"BOOL":57,"INFINITY":58,"NAN":59,"Assignable":60,"=":61,"AssignObj":62,"ObjAssignable":63,"ObjRestValue":64,":":65,"SimpleObjAssignable":66,"ThisProperty":67,"[":68,"]":69,"...":70,"ObjSpreadExpr":71,"ObjSpreadIdentifier":72,"Object":73,"Parenthetical":74,"Super":75,"This":76,"SUPER":77,"Arguments":78,"ObjSpreadAccessor":79,".":80,"INDEX_START":81,"IndexValue":82,"INDEX_END":83,"RETURN":84,"AWAIT":85,"PARAM_START":86,"ParamList":87,"PARAM_END":88,"FuncGlyph":89,"->":90,"=>":91,"OptComma":92,",":93,"Param":94,"ParamVar":95,"Array":96,"Splat":97,"SimpleAssignable":98,"Accessor":99,"Range":100,"?.":101,"::":102,"?::":103,"Index":104,"INDEX_SOAK":105,"Slice":106,"{":107,"AssignList":108,"}":109,"CLASS":110,"EXTENDS":111,"IMPORT":112,"ImportDefaultSpecifier":113,"ImportNamespaceSpecifier":114,"ImportSpecifierList":115,"ImportSpecifier":116,"AS":117,"DEFAULT":118,"IMPORT_ALL":119,"EXPORT":120,"ExportSpecifierList":121,"EXPORT_ALL":122,"ExportSpecifier":123,"OptFuncExist":124,"FUNC_EXIST":125,"CALL_START":126,"CALL_END":127,"ArgList":128,"THIS":129,"@":130,"Elisions":131,"ArgElisionList":132,"OptElisions":133,"RangeDots":134,"..":135,"Arg":136,"ArgElision":137,"Elision":138,"SimpleArgs":139,"TRY":140,"Catch":141,"FINALLY":142,"CATCH":143,"THROW":144,"(":145,")":146,"WhileLineSource":147,"WHILE":148,"WHEN":149,"UNTIL":150,"WhileSource":151,"Loop":152,"LOOP":153,"ForBody":154,"ForLineBody":155,"FOR":156,"BY":157,"ForStart":158,"ForSource":159,"ForLineSource":160,"ForVariables":161,"OWN":162,"ForValue":163,"FORIN":164,"FOROF":165,"FORFROM":166,"SWITCH":167,"Whens":168,"ELSE":169,"When":170,"LEADING_WHEN":171,"IfBlock":172,"IF":173,"POST_IF":174,"IfBlockLine":175,"UNARY":176,"UNARY_MATH":177,"-":178,"+":179,"--":180,"++":181,"?":182,"MATH":183,"**":184,"SHIFT":185,"COMPARE":186,"&":187,"^":188,"|":189,"&&":190,"||":191,"BIN?":192,"RELATION":193,"COMPOUND_ASSIGN":194,"$accept":0,"$end":1},
		terminals_: {2:"error",6:"TERMINATOR",14:"STATEMENT",32:"YIELD",33:"FROM",35:"INDENT",36:"OUTDENT",38:"IDENTIFIER",39:"CSX_TAG",41:"PROPERTY",43:"NUMBER",45:"STRING",46:"STRING_START",47:"STRING_END",49:"REGEX",50:"REGEX_START",52:"REGEX_END",54:"JS",55:"UNDEFINED",56:"NULL",57:"BOOL",58:"INFINITY",59:"NAN",61:"=",65:":",68:"[",69:"]",70:"...",77:"SUPER",80:".",81:"INDEX_START",83:"INDEX_END",84:"RETURN",85:"AWAIT",86:"PARAM_START",88:"PARAM_END",90:"->",91:"=>",93:",",101:"?.",102:"::",103:"?::",105:"INDEX_SOAK",107:"{",109:"}",110:"CLASS",111:"EXTENDS",112:"IMPORT",117:"AS",118:"DEFAULT",119:"IMPORT_ALL",120:"EXPORT",122:"EXPORT_ALL",125:"FUNC_EXIST",126:"CALL_START",127:"CALL_END",129:"THIS",130:"@",135:"..",140:"TRY",142:"FINALLY",143:"CATCH",144:"THROW",145:"(",146:")",148:"WHILE",149:"WHEN",150:"UNTIL",153:"LOOP",156:"FOR",157:"BY",162:"OWN",164:"FORIN",165:"FOROF",166:"FORFROM",167:"SWITCH",169:"ELSE",171:"LEADING_WHEN",173:"IF",174:"POST_IF",176:"UNARY",177:"UNARY_MATH",178:"-",179:"+",180:"--",181:"++",182:"?",183:"MATH",184:"**",185:"SHIFT",186:"COMPARE",187:"&",188:"^",189:"|",190:"&&",191:"||",192:"BIN?",193:"RELATION",194:"COMPOUND_ASSIGN"},
		productions_: [0,[3,0],[3,1],[4,1],[4,3],[4,2],[5,1],[5,1],[5,1],[5,1],[10,1],[10,1],[9,1],[9,1],[9,1],[9,1],[7,1],[7,1],[7,1],[7,1],[7,1],[7,1],[7,1],[7,1],[7,1],[7,1],[7,1],[7,1],[8,1],[8,1],[8,1],[28,1],[28,2],[28,3],[34,2],[34,3],[37,1],[37,1],[40,1],[42,1],[42,1],[44,1],[44,3],[48,1],[48,3],[53,1],[53,1],[53,1],[53,1],[53,1],[53,1],[53,1],[53,1],[20,3],[20,4],[20,5],[62,1],[62,1],[62,3],[62,5],[62,3],[62,5],[66,1],[66,1],[66,1],[63,1],[63,3],[63,1],[64,2],[64,2],[64,2],[64,2],[71,1],[71,1],[71,1],[71,1],[71,1],[71,2],[71,2],[71,2],[72,2],[72,2],[79,2],[79,3],[13,2],[13,4],[13,1],[11,3],[11,2],[12,3],[12,2],[18,5],[18,2],[29,5],[29,2],[89,1],[89,1],[92,0],[92,1],[87,0],[87,1],[87,3],[87,4],[87,6],[94,1],[94,2],[94,2],[94,3],[94,1],[95,1],[95,1],[95,1],[95,1],[97,2],[97,2],[98,1],[98,2],[98,2],[98,1],[60,1],[60,1],[60,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[17,1],[75,3],[75,4],[99,2],[99,2],[99,2],[99,2],[99,1],[99,1],[99,1],[104,3],[104,2],[82,1],[82,1],[73,4],[108,0],[108,1],[108,3],[108,4],[108,6],[26,1],[26,2],[26,3],[26,4],[26,2],[26,3],[26,4],[26,5],[15,2],[15,4],[15,4],[15,5],[15,7],[15,6],[15,9],[115,1],[115,3],[115,4],[115,4],[115,6],[116,1],[116,3],[116,1],[116,3],[113,1],[114,3],[16,3],[16,5],[16,2],[16,4],[16,5],[16,6],[16,3],[16,5],[16,4],[16,7],[121,1],[121,3],[121,4],[121,4],[121,6],[123,1],[123,3],[123,3],[123,1],[123,3],[51,3],[51,3],[51,3],[124,0],[124,1],[78,2],[78,4],[76,1],[76,1],[67,2],[96,2],[96,3],[96,4],[134,1],[134,1],[100,5],[100,5],[106,3],[106,2],[106,3],[106,2],[106,2],[106,1],[128,1],[128,3],[128,4],[128,4],[128,6],[136,1],[136,1],[136,1],[136,1],[132,1],[132,3],[132,4],[132,4],[132,6],[137,1],[137,2],[133,1],[133,2],[131,1],[131,2],[138,1],[139,1],[139,1],[139,3],[139,3],[22,2],[22,3],[22,4],[22,5],[141,3],[141,3],[141,2],[27,2],[27,4],[74,3],[74,5],[147,2],[147,4],[147,2],[147,4],[151,2],[151,4],[151,4],[151,2],[151,4],[151,4],[23,2],[23,2],[23,2],[23,2],[23,1],[152,2],[152,2],[24,2],[24,2],[24,2],[24,2],[154,2],[154,4],[154,2],[155,4],[155,2],[158,2],[158,3],[158,3],[163,1],[163,1],[163,1],[163,1],[161,1],[161,3],[159,2],[159,2],[159,4],[159,4],[159,4],[159,4],[159,4],[159,4],[159,6],[159,6],[159,6],[159,6],[159,6],[159,6],[159,6],[159,6],[159,2],[159,4],[159,4],[160,2],[160,2],[160,4],[160,4],[160,4],[160,4],[160,4],[160,4],[160,6],[160,6],[160,6],[160,6],[160,6],[160,6],[160,6],[160,6],[160,2],[160,4],[160,4],[25,5],[25,5],[25,7],[25,7],[25,4],[25,6],[168,1],[168,2],[170,3],[170,4],[172,3],[172,5],[21,1],[21,3],[21,3],[21,3],[175,3],[175,5],[30,1],[30,3],[30,3],[30,3],[31,2],[19,2],[19,2],[19,2],[19,2],[19,2],[19,2],[19,2],[19,2],[19,2],[19,2],[19,3],[19,3],[19,3],[19,3],[19,3],[19,3],[19,3],[19,3],[19,3],[19,3],[19,3],[19,3],[19,3],[19,3],[19,5],[19,4]],
		performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate /* action[1] */, $$ /* vstack */, _$ /* lstack */) {
		/* this == yyval */

		var $0 = $$.length - 1;
		switch (yystate) {
		case 1:
		return this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])(new yy.Block);
		break;
		case 2:
		return this.$ = $$[$0];
		break;
		case 3:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])(yy.Block.wrap([$$[$0]]));
		break;
		case 4:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])($$[$0-2].push($$[$0]));
		break;
		case 5:
		this.$ = $$[$0-1];
		break;
		case 6: case 7: case 8: case 9: case 10: case 11: case 12: case 14: case 15: case 16: case 17: case 18: case 19: case 20: case 21: case 22: case 23: case 24: case 25: case 26: case 27: case 28: case 29: case 30: case 40: case 45: case 47: case 57: case 62: case 63: case 64: case 65: case 67: case 72: case 73: case 74: case 75: case 76: case 97: case 98: case 109: case 110: case 111: case 112: case 118: case 119: case 122: case 127: case 137: case 222: case 223: case 224: case 226: case 238: case 239: case 282: case 283: case 332: case 338: case 344:
		this.$ = $$[$0];
		break;
		case 13:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])(new yy.StatementLiteral($$[$0]));
		break;
		case 31:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])(new yy.Op($$[$0],
					new yy.Value(new yy.Literal(''))));
		break;
		case 32: case 348: case 349: case 350: case 353:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.Op($$[$0-1],
					$$[$0]));
		break;
		case 33:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])(new yy.Op($$[$0-2].concat($$[$0-1]),
					$$[$0]));
		break;
		case 34:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.Block);
		break;
		case 35: case 83: case 138:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])($$[$0-1]);
		break;
		case 36:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])(new yy.IdentifierLiteral($$[$0]));
		break;
		case 37:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])(new yy.CSXTag($$[$0]));
		break;
		case 38:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])(new yy.PropertyName($$[$0]));
		break;
		case 39:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])(new yy.NumberLiteral($$[$0]));
		break;
		case 41:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])(new yy.StringLiteral($$[$0]));
		break;
		case 42:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])(new yy.StringWithInterpolations($$[$0-1]));
		break;
		case 43:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])(new yy.RegexLiteral($$[$0]));
		break;
		case 44:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])(new yy.RegexWithInterpolations($$[$0-1].args));
		break;
		case 46:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])(new yy.PassthroughLiteral($$[$0]));
		break;
		case 48:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])(new yy.UndefinedLiteral($$[$0]));
		break;
		case 49:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])(new yy.NullLiteral($$[$0]));
		break;
		case 50:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])(new yy.BooleanLiteral($$[$0]));
		break;
		case 51:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])(new yy.InfinityLiteral($$[$0]));
		break;
		case 52:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])(new yy.NaNLiteral($$[$0]));
		break;
		case 53:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])(new yy.Assign($$[$0-2],
					$$[$0]));
		break;
		case 54:
		this.$ = yy.addDataToNode(yy, _$[$0-3], _$[$0])(new yy.Assign($$[$0-3],
					$$[$0]));
		break;
		case 55:
		this.$ = yy.addDataToNode(yy, _$[$0-4], _$[$0])(new yy.Assign($$[$0-4],
					$$[$0-1]));
		break;
		case 56: case 115: case 120: case 121: case 123: case 124: case 125: case 126: case 128: case 284: case 285:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])(new yy.Value($$[$0]));
		break;
		case 58:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])(new yy.Assign(yy.addDataToNode(yy, _$[$0-2])(new yy.Value($$[$0-2])),
					$$[$0],
					'object',
					{
							operatorToken: yy.addDataToNode(yy, _$[$0-1])(new yy.Literal($$[$0-1]))
						}));
		break;
		case 59:
		this.$ = yy.addDataToNode(yy, _$[$0-4], _$[$0])(new yy.Assign(yy.addDataToNode(yy, _$[$0-4])(new yy.Value($$[$0-4])),
					$$[$0-1],
					'object',
					{
							operatorToken: yy.addDataToNode(yy, _$[$0-3])(new yy.Literal($$[$0-3]))
						}));
		break;
		case 60:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])(new yy.Assign(yy.addDataToNode(yy, _$[$0-2])(new yy.Value($$[$0-2])),
					$$[$0],
					null,
					{
							operatorToken: yy.addDataToNode(yy, _$[$0-1])(new yy.Literal($$[$0-1]))
						}));
		break;
		case 61:
		this.$ = yy.addDataToNode(yy, _$[$0-4], _$[$0])(new yy.Assign(yy.addDataToNode(yy, _$[$0-4])(new yy.Value($$[$0-4])),
					$$[$0-1],
					null,
					{
							operatorToken: yy.addDataToNode(yy, _$[$0-3])(new yy.Literal($$[$0-3]))
						}));
		break;
		case 66:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])(new yy.Value(new yy.ComputedPropertyName($$[$0-1])));
		break;
		case 68:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.Splat(new yy.Value($$[$0-1])));
		break;
		case 69:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.Splat(new yy.Value($$[$0])));
		break;
		case 70: case 113:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.Splat($$[$0-1]));
		break;
		case 71: case 114:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.Splat($$[$0]));
		break;
		case 77:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.SuperCall(yy.addDataToNode(yy, _$[$0-1])(new yy.Super),
					$$[$0],
					false,
					$$[$0-1]));
		break;
		case 78:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.Call(new yy.Value($$[$0-1]),
					$$[$0]));
		break;
		case 79:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.Call($$[$0-1],
					$$[$0]));
		break;
		case 80: case 81:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])((new yy.Value($$[$0-1])).add($$[$0]));
		break;
		case 82: case 131:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.Access($$[$0]));
		break;
		case 84:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.Return($$[$0]));
		break;
		case 85:
		this.$ = yy.addDataToNode(yy, _$[$0-3], _$[$0])(new yy.Return(new yy.Value($$[$0-1])));
		break;
		case 86:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])(new yy.Return);
		break;
		case 87:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])(new yy.YieldReturn($$[$0]));
		break;
		case 88:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.YieldReturn);
		break;
		case 89:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])(new yy.AwaitReturn($$[$0]));
		break;
		case 90:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.AwaitReturn);
		break;
		case 91:
		this.$ = yy.addDataToNode(yy, _$[$0-4], _$[$0])(new yy.Code($$[$0-3],
					$$[$0],
					$$[$0-1],
					yy.addDataToNode(yy, _$[$0-4])(new yy.Literal($$[$0-4]))));
		break;
		case 92:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.Code([],
					$$[$0],
					$$[$0-1]));
		break;
		case 93:
		this.$ = yy.addDataToNode(yy, _$[$0-4], _$[$0])(new yy.Code($$[$0-3],
					yy.addDataToNode(yy, _$[$0])(yy.Block.wrap([$$[$0]])),
					$$[$0-1],
					yy.addDataToNode(yy, _$[$0-4])(new yy.Literal($$[$0-4]))));
		break;
		case 94:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.Code([],
					yy.addDataToNode(yy, _$[$0])(yy.Block.wrap([$$[$0]])),
					$$[$0-1]));
		break;
		case 95: case 96:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])(new yy.FuncGlyph($$[$0]));
		break;
		case 99: case 143: case 233:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])([]);
		break;
		case 100: case 144: case 163: case 184: case 217: case 231: case 235: case 286:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])([$$[$0]]);
		break;
		case 101: case 145: case 164: case 185: case 218: case 227:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])($$[$0-2].concat($$[$0]));
		break;
		case 102: case 146: case 165: case 186: case 219:
		this.$ = yy.addDataToNode(yy, _$[$0-3], _$[$0])($$[$0-3].concat($$[$0]));
		break;
		case 103: case 147: case 167: case 188: case 221:
		this.$ = yy.addDataToNode(yy, _$[$0-5], _$[$0])($$[$0-5].concat($$[$0-2]));
		break;
		case 104:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])(new yy.Param($$[$0]));
		break;
		case 105:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.Param($$[$0-1],
					null,
					true));
		break;
		case 106:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.Param($$[$0],
					null,
					true));
		break;
		case 107:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])(new yy.Param($$[$0-2],
					$$[$0]));
		break;
		case 108: case 225:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])(new yy.Expansion);
		break;
		case 116:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])($$[$0-1].add($$[$0]));
		break;
		case 117:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.Value($$[$0-1]).add($$[$0]));
		break;
		case 129:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])(new yy.Super(yy.addDataToNode(yy, _$[$0])(new yy.Access($$[$0])),
					[],
					false,
					$$[$0-2]));
		break;
		case 130:
		this.$ = yy.addDataToNode(yy, _$[$0-3], _$[$0])(new yy.Super(yy.addDataToNode(yy, _$[$0-1])(new yy.Index($$[$0-1])),
					[],
					false,
					$$[$0-3]));
		break;
		case 132:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.Access($$[$0],
					'soak'));
		break;
		case 133:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])([yy.addDataToNode(yy, _$[$0-1])(new yy.Access(new yy.PropertyName('prototype'))),
					yy.addDataToNode(yy, _$[$0])(new yy.Access($$[$0]))]);
		break;
		case 134:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])([yy.addDataToNode(yy, _$[$0-1])(new yy.Access(new yy.PropertyName('prototype'),
					'soak')),
					yy.addDataToNode(yy, _$[$0])(new yy.Access($$[$0]))]);
		break;
		case 135:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])(new yy.Access(new yy.PropertyName('prototype')));
		break;
		case 136:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])(new yy.Access(new yy.PropertyName('prototype'),
					'soak'));
		break;
		case 139:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(yy.extend($$[$0],
					{
							soak: true
						}));
		break;
		case 140:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])(new yy.Index($$[$0]));
		break;
		case 141:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])(new yy.Slice($$[$0]));
		break;
		case 142:
		this.$ = yy.addDataToNode(yy, _$[$0-3], _$[$0])(new yy.Obj($$[$0-2],
					$$[$0-3].generated));
		break;
		case 148:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])(new yy.Class);
		break;
		case 149:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.Class(null,
					null,
					$$[$0]));
		break;
		case 150:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])(new yy.Class(null,
					$$[$0]));
		break;
		case 151:
		this.$ = yy.addDataToNode(yy, _$[$0-3], _$[$0])(new yy.Class(null,
					$$[$0-1],
					$$[$0]));
		break;
		case 152:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.Class($$[$0]));
		break;
		case 153:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])(new yy.Class($$[$0-1],
					null,
					$$[$0]));
		break;
		case 154:
		this.$ = yy.addDataToNode(yy, _$[$0-3], _$[$0])(new yy.Class($$[$0-2],
					$$[$0]));
		break;
		case 155:
		this.$ = yy.addDataToNode(yy, _$[$0-4], _$[$0])(new yy.Class($$[$0-3],
					$$[$0-1],
					$$[$0]));
		break;
		case 156:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.ImportDeclaration(null,
					$$[$0]));
		break;
		case 157:
		this.$ = yy.addDataToNode(yy, _$[$0-3], _$[$0])(new yy.ImportDeclaration(new yy.ImportClause($$[$0-2],
					null),
					$$[$0]));
		break;
		case 158:
		this.$ = yy.addDataToNode(yy, _$[$0-3], _$[$0])(new yy.ImportDeclaration(new yy.ImportClause(null,
					$$[$0-2]),
					$$[$0]));
		break;
		case 159:
		this.$ = yy.addDataToNode(yy, _$[$0-4], _$[$0])(new yy.ImportDeclaration(new yy.ImportClause(null,
					new yy.ImportSpecifierList([])),
					$$[$0]));
		break;
		case 160:
		this.$ = yy.addDataToNode(yy, _$[$0-6], _$[$0])(new yy.ImportDeclaration(new yy.ImportClause(null,
					new yy.ImportSpecifierList($$[$0-4])),
					$$[$0]));
		break;
		case 161:
		this.$ = yy.addDataToNode(yy, _$[$0-5], _$[$0])(new yy.ImportDeclaration(new yy.ImportClause($$[$0-4],
					$$[$0-2]),
					$$[$0]));
		break;
		case 162:
		this.$ = yy.addDataToNode(yy, _$[$0-8], _$[$0])(new yy.ImportDeclaration(new yy.ImportClause($$[$0-7],
					new yy.ImportSpecifierList($$[$0-4])),
					$$[$0]));
		break;
		case 166: case 187: case 200: case 220:
		this.$ = yy.addDataToNode(yy, _$[$0-3], _$[$0])($$[$0-2]);
		break;
		case 168:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])(new yy.ImportSpecifier($$[$0]));
		break;
		case 169:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])(new yy.ImportSpecifier($$[$0-2],
					$$[$0]));
		break;
		case 170:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])(new yy.ImportSpecifier(new yy.Literal($$[$0])));
		break;
		case 171:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])(new yy.ImportSpecifier(new yy.Literal($$[$0-2]),
					$$[$0]));
		break;
		case 172:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])(new yy.ImportDefaultSpecifier($$[$0]));
		break;
		case 173:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])(new yy.ImportNamespaceSpecifier(new yy.Literal($$[$0-2]),
					$$[$0]));
		break;
		case 174:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])(new yy.ExportNamedDeclaration(new yy.ExportSpecifierList([])));
		break;
		case 175:
		this.$ = yy.addDataToNode(yy, _$[$0-4], _$[$0])(new yy.ExportNamedDeclaration(new yy.ExportSpecifierList($$[$0-2])));
		break;
		case 176:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.ExportNamedDeclaration($$[$0]));
		break;
		case 177:
		this.$ = yy.addDataToNode(yy, _$[$0-3], _$[$0])(new yy.ExportNamedDeclaration(new yy.Assign($$[$0-2],
					$$[$0],
					null,
					{
							moduleDeclaration: 'export'
						})));
		break;
		case 178:
		this.$ = yy.addDataToNode(yy, _$[$0-4], _$[$0])(new yy.ExportNamedDeclaration(new yy.Assign($$[$0-3],
					$$[$0],
					null,
					{
							moduleDeclaration: 'export'
						})));
		break;
		case 179:
		this.$ = yy.addDataToNode(yy, _$[$0-5], _$[$0])(new yy.ExportNamedDeclaration(new yy.Assign($$[$0-4],
					$$[$0-1],
					null,
					{
							moduleDeclaration: 'export'
						})));
		break;
		case 180:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])(new yy.ExportDefaultDeclaration($$[$0]));
		break;
		case 181:
		this.$ = yy.addDataToNode(yy, _$[$0-4], _$[$0])(new yy.ExportDefaultDeclaration(new yy.Value($$[$0-1])));
		break;
		case 182:
		this.$ = yy.addDataToNode(yy, _$[$0-3], _$[$0])(new yy.ExportAllDeclaration(new yy.Literal($$[$0-2]),
					$$[$0]));
		break;
		case 183:
		this.$ = yy.addDataToNode(yy, _$[$0-6], _$[$0])(new yy.ExportNamedDeclaration(new yy.ExportSpecifierList($$[$0-4]),
					$$[$0]));
		break;
		case 189:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])(new yy.ExportSpecifier($$[$0]));
		break;
		case 190:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])(new yy.ExportSpecifier($$[$0-2],
					$$[$0]));
		break;
		case 191:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])(new yy.ExportSpecifier($$[$0-2],
					new yy.Literal($$[$0])));
		break;
		case 192:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])(new yy.ExportSpecifier(new yy.Literal($$[$0])));
		break;
		case 193:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])(new yy.ExportSpecifier(new yy.Literal($$[$0-2]),
					$$[$0]));
		break;
		case 194:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])(new yy.TaggedTemplateCall($$[$0-2],
					$$[$0],
					$$[$0-1]));
		break;
		case 195:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])(new yy.Call($$[$0-2],
					$$[$0],
					$$[$0-1]));
		break;
		case 196:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])(new yy.SuperCall(yy.addDataToNode(yy, _$[$0-2])(new yy.Super),
					$$[$0],
					$$[$0-1],
					$$[$0-2]));
		break;
		case 197:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])(false);
		break;
		case 198:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])(true);
		break;
		case 199:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])([]);
		break;
		case 201: case 202:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])(new yy.Value(new yy.ThisLiteral($$[$0])));
		break;
		case 203:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.Value(yy.addDataToNode(yy, _$[$0-1])(new yy.ThisLiteral($$[$0-1])),
					[yy.addDataToNode(yy, _$[$0])(new yy.Access($$[$0]))],
					'this'));
		break;
		case 204:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.Arr([]));
		break;
		case 205:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])(new yy.Arr($$[$0-1]));
		break;
		case 206:
		this.$ = yy.addDataToNode(yy, _$[$0-3], _$[$0])(new yy.Arr([].concat($$[$0-2],
					$$[$0-1])));
		break;
		case 207:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])('inclusive');
		break;
		case 208:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])('exclusive');
		break;
		case 209: case 210:
		this.$ = yy.addDataToNode(yy, _$[$0-4], _$[$0])(new yy.Range($$[$0-3],
					$$[$0-1],
					$$[$0-2]));
		break;
		case 211: case 213:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])(new yy.Range($$[$0-2],
					$$[$0],
					$$[$0-1]));
		break;
		case 212: case 214:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.Range($$[$0-1],
					null,
					$$[$0]));
		break;
		case 215:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.Range(null,
					$$[$0],
					$$[$0-1]));
		break;
		case 216:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])(new yy.Range(null,
					null,
					$$[$0]));
		break;
		case 228:
		this.$ = yy.addDataToNode(yy, _$[$0-3], _$[$0])($$[$0-3].concat($$[$0-2],
					$$[$0]));
		break;
		case 229:
		this.$ = yy.addDataToNode(yy, _$[$0-3], _$[$0])($$[$0-2].concat($$[$0-1]));
		break;
		case 230:
		this.$ = yy.addDataToNode(yy, _$[$0-5], _$[$0])($$[$0-5].concat($$[$0-4],
					$$[$0-2],
					$$[$0-1]));
		break;
		case 232: case 236: case 333:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])($$[$0-1].concat($$[$0]));
		break;
		case 234:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])([].concat($$[$0]));
		break;
		case 237:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])(new yy.Elision);
		break;
		case 240: case 241:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])([].concat($$[$0-2],
					$$[$0]));
		break;
		case 242:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.Try($$[$0]));
		break;
		case 243:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])(new yy.Try($$[$0-1],
					$$[$0][0],
					$$[$0][1]));
		break;
		case 244:
		this.$ = yy.addDataToNode(yy, _$[$0-3], _$[$0])(new yy.Try($$[$0-2],
					null,
					null,
					$$[$0]));
		break;
		case 245:
		this.$ = yy.addDataToNode(yy, _$[$0-4], _$[$0])(new yy.Try($$[$0-3],
					$$[$0-2][0],
					$$[$0-2][1],
					$$[$0]));
		break;
		case 246:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])([$$[$0-1],
					$$[$0]]);
		break;
		case 247:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])([yy.addDataToNode(yy, _$[$0-1])(new yy.Value($$[$0-1])),
					$$[$0]]);
		break;
		case 248:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])([null,
					$$[$0]]);
		break;
		case 249:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.Throw($$[$0]));
		break;
		case 250:
		this.$ = yy.addDataToNode(yy, _$[$0-3], _$[$0])(new yy.Throw(new yy.Value($$[$0-1])));
		break;
		case 251:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])(new yy.Parens($$[$0-1]));
		break;
		case 252:
		this.$ = yy.addDataToNode(yy, _$[$0-4], _$[$0])(new yy.Parens($$[$0-2]));
		break;
		case 253: case 257:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.While($$[$0]));
		break;
		case 254: case 258: case 259:
		this.$ = yy.addDataToNode(yy, _$[$0-3], _$[$0])(new yy.While($$[$0-2],
					{
							guard: $$[$0]
						}));
		break;
		case 255: case 260:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.While($$[$0],
					{
							invert: true
						}));
		break;
		case 256: case 261: case 262:
		this.$ = yy.addDataToNode(yy, _$[$0-3], _$[$0])(new yy.While($$[$0-2],
					{
							invert: true,
							guard: $$[$0]
						}));
		break;
		case 263: case 264: case 272: case 273:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])($$[$0-1].addBody($$[$0]));
		break;
		case 265: case 266:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])($$[$0].addBody(yy.addDataToNode(yy, _$[$0-1])(yy.Block.wrap([$$[$0-1]]))));
		break;
		case 267:
		this.$ = yy.addDataToNode(yy, _$[$0], _$[$0])($$[$0]);
		break;
		case 268:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.While(yy.addDataToNode(yy, _$[$0-1])(new yy.BooleanLiteral('true'))).addBody($$[$0]));
		break;
		case 269:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.While(yy.addDataToNode(yy, _$[$0-1])(new yy.BooleanLiteral('true'))).addBody(yy.addDataToNode(yy, _$[$0])(yy.Block.wrap([$$[$0]]))));
		break;
		case 270: case 271:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])($$[$0].addBody($$[$0-1]));
		break;
		case 274:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.For([],
					{
							source: yy.addDataToNode(yy, _$[$0])(new yy.Value($$[$0]))
						}));
		break;
		case 275: case 277:
		this.$ = yy.addDataToNode(yy, _$[$0-3], _$[$0])(new yy.For([],
					{
							source: yy.addDataToNode(yy, _$[$0-2])(new yy.Value($$[$0-2])),
							step: $$[$0]
						}));
		break;
		case 276: case 278:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])($$[$0-1].addSource($$[$0]));
		break;
		case 279:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.For([],
					{
							name: $$[$0][0],
							index: $$[$0][1]
						}));
		break;
		case 280:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])((function() {
						var index,
					name;
						[name,
					index] = $$[$0];
						return new yy.For([],
					{
							name,
							index,
							await: true,
							awaitTag: yy.addDataToNode(yy, _$[$0-1])(new yy.Literal($$[$0-1]))
						});
					}()));
		break;
		case 281:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])((function() {
						var index,
					name;
						[name,
					index] = $$[$0];
						return new yy.For([],
					{
							name,
							index,
							own: true,
							ownTag: yy.addDataToNode(yy, _$[$0-1])(new yy.Literal($$[$0-1]))
						});
					}()));
		break;
		case 287:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])([$$[$0-2],
					$$[$0]]);
		break;
		case 288: case 307:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])({
							source: $$[$0]
						});
		break;
		case 289: case 308:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])({
							source: $$[$0],
							object: true
						});
		break;
		case 290: case 291: case 309: case 310:
		this.$ = yy.addDataToNode(yy, _$[$0-3], _$[$0])({
							source: $$[$0-2],
							guard: $$[$0]
						});
		break;
		case 292: case 293: case 311: case 312:
		this.$ = yy.addDataToNode(yy, _$[$0-3], _$[$0])({
							source: $$[$0-2],
							guard: $$[$0],
							object: true
						});
		break;
		case 294: case 295: case 313: case 314:
		this.$ = yy.addDataToNode(yy, _$[$0-3], _$[$0])({
							source: $$[$0-2],
							step: $$[$0]
						});
		break;
		case 296: case 297: case 298: case 299: case 315: case 316: case 317: case 318:
		this.$ = yy.addDataToNode(yy, _$[$0-5], _$[$0])({
							source: $$[$0-4],
							guard: $$[$0-2],
							step: $$[$0]
						});
		break;
		case 300: case 301: case 302: case 303: case 319: case 320: case 321: case 322:
		this.$ = yy.addDataToNode(yy, _$[$0-5], _$[$0])({
							source: $$[$0-4],
							step: $$[$0-2],
							guard: $$[$0]
						});
		break;
		case 304: case 323:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])({
							source: $$[$0],
							from: true
						});
		break;
		case 305: case 306: case 324: case 325:
		this.$ = yy.addDataToNode(yy, _$[$0-3], _$[$0])({
							source: $$[$0-2],
							guard: $$[$0],
							from: true
						});
		break;
		case 326: case 327:
		this.$ = yy.addDataToNode(yy, _$[$0-4], _$[$0])(new yy.Switch($$[$0-3],
					$$[$0-1]));
		break;
		case 328: case 329:
		this.$ = yy.addDataToNode(yy, _$[$0-6], _$[$0])(new yy.Switch($$[$0-5],
					$$[$0-3],
					$$[$0-1]));
		break;
		case 330:
		this.$ = yy.addDataToNode(yy, _$[$0-3], _$[$0])(new yy.Switch(null,
					$$[$0-1]));
		break;
		case 331:
		this.$ = yy.addDataToNode(yy, _$[$0-5], _$[$0])(new yy.Switch(null,
					$$[$0-3],
					$$[$0-1]));
		break;
		case 334:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])([[$$[$0-1],
					$$[$0]]]);
		break;
		case 335:
		this.$ = yy.addDataToNode(yy, _$[$0-3], _$[$0])([[$$[$0-2],
					$$[$0-1]]]);
		break;
		case 336: case 342:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])(new yy.If($$[$0-1],
					$$[$0],
					{
							type: $$[$0-2]
						}));
		break;
		case 337: case 343:
		this.$ = yy.addDataToNode(yy, _$[$0-4], _$[$0])($$[$0-4].addElse(yy.addDataToNode(yy, _$[$0-2], _$[$0])(new yy.If($$[$0-1],
					$$[$0],
					{
							type: $$[$0-2]
						}))));
		break;
		case 339: case 345:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])($$[$0-2].addElse($$[$0]));
		break;
		case 340: case 341: case 346: case 347:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])(new yy.If($$[$0],
					yy.addDataToNode(yy, _$[$0-2])(yy.Block.wrap([$$[$0-2]])),
					{
							type: $$[$0-1],
							statement: true
						}));
		break;
		case 351:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.Op('-',
					$$[$0]));
		break;
		case 352:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.Op('+',
					$$[$0]));
		break;
		case 354:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.Op('--',
					$$[$0]));
		break;
		case 355:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.Op('++',
					$$[$0]));
		break;
		case 356:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.Op('--',
					$$[$0-1],
					null,
					true));
		break;
		case 357:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.Op('++',
					$$[$0-1],
					null,
					true));
		break;
		case 358:
		this.$ = yy.addDataToNode(yy, _$[$0-1], _$[$0])(new yy.Existence($$[$0-1]));
		break;
		case 359:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])(new yy.Op('+',
					$$[$0-2],
					$$[$0]));
		break;
		case 360:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])(new yy.Op('-',
					$$[$0-2],
					$$[$0]));
		break;
		case 361: case 362: case 363: case 364: case 365: case 366: case 367: case 368: case 369: case 370:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])(new yy.Op($$[$0-1],
					$$[$0-2],
					$$[$0]));
		break;
		case 371:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])((function() {
						if ($$[$0-1].charAt(0) === '!') {
							return new yy.Op($$[$0-1].slice(1),
					$$[$0-2],
					$$[$0]).invert();
						} else {
							return new yy.Op($$[$0-1],
					$$[$0-2],
					$$[$0]);
						}
					}()));
		break;
		case 372:
		this.$ = yy.addDataToNode(yy, _$[$0-2], _$[$0])(new yy.Assign($$[$0-2],
					$$[$0],
					$$[$0-1]));
		break;
		case 373:
		this.$ = yy.addDataToNode(yy, _$[$0-4], _$[$0])(new yy.Assign($$[$0-4],
					$$[$0-1],
					$$[$0-3]));
		break;
		case 374:
		this.$ = yy.addDataToNode(yy, _$[$0-3], _$[$0])(new yy.Assign($$[$0-3],
					$$[$0],
					$$[$0-2]));
		break;
		}
		},
		table: [{1:[2,1],3:1,4:2,5:3,7:4,8:5,9:6,10:7,11:27,12:28,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$V1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vi,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{1:[3]},{1:[2,2],6:$VH},o($VI,[2,3]),o($VJ,[2,6],{151:111,154:112,158:116,148:$VK,150:$VL,156:$VM,174:$VN,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),o($VJ,[2,7]),o($VJ,[2,8],{158:116,151:118,154:119,148:$VK,150:$VL,156:$VM,174:$V01}),o($VJ,[2,9]),o($V11,[2,16],{124:120,99:121,104:127,45:$V21,46:$V21,126:$V21,80:$V31,81:$V41,101:$V51,102:$V61,103:$V71,105:$V81,125:$V91}),o($V11,[2,17],{104:127,99:130,80:$V31,81:$V41,101:$V51,102:$V61,103:$V71,105:$V81}),o($V11,[2,18]),o($V11,[2,19]),o($V11,[2,20]),o($V11,[2,21]),o($V11,[2,22]),o($V11,[2,23]),o($V11,[2,24]),o($V11,[2,25]),o($V11,[2,26]),o($V11,[2,27]),o($VJ,[2,28]),o($VJ,[2,29]),o($VJ,[2,30]),o($Va1,[2,12]),o($Va1,[2,13]),o($Va1,[2,14]),o($Va1,[2,15]),o($VJ,[2,10]),o($VJ,[2,11]),o($Vb1,$Vc1,{61:[1,131]}),o($Vb1,[2,123]),o($Vb1,[2,124]),o($Vb1,[2,125]),o($Vb1,$Vd1),o($Vb1,[2,127]),o($Vb1,[2,128]),o($Ve1,$Vf1,{87:132,94:133,95:134,37:136,67:137,96:138,73:139,38:$V2,39:$V3,68:$Vg1,70:$Vh1,107:$Vm,130:$Vi1}),{5:143,7:4,8:5,9:6,10:7,11:27,12:28,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$V1,34:142,35:$Vj1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vi,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:145,8:146,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:150,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:156,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:157,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:158,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:[1,159],85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{17:161,18:162,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:163,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:160,100:32,107:$Vm,129:$Vq,130:$Vr,145:$Vu},{17:161,18:162,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:163,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:164,100:32,107:$Vm,129:$Vq,130:$Vr,145:$Vu},o($Vp1,$Vq1,{180:[1,165],181:[1,166],194:[1,167]}),o($V11,[2,338],{169:[1,168]}),{34:169,35:$Vj1},{34:170,35:$Vj1},{34:171,35:$Vj1},o($V11,[2,267]),{34:172,35:$Vj1},{34:173,35:$Vj1},{7:174,8:175,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,35:[1,176],37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o($Vr1,[2,148],{53:30,74:31,100:32,51:33,76:34,75:35,96:61,73:62,42:63,48:65,37:78,67:79,44:88,89:152,17:161,18:162,60:163,34:177,98:179,35:$Vj1,38:$V2,39:$V3,43:$V4,45:$V5,46:$V6,49:$V7,50:$V8,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,68:$Vf,77:$Vg,86:$Vm1,90:$Vk,91:$Vl,107:$Vm,111:[1,178],129:$Vq,130:$Vr,145:$Vu}),{7:180,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,35:[1,181],37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o([1,6,35,36,47,69,70,93,127,135,146,148,149,150,156,157,174,182,183,184,185,186,187,188,189,190,191,192,193],$Vs1,{17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,13:23,15:25,16:26,60:29,53:30,74:31,100:32,51:33,76:34,75:35,98:45,172:46,151:48,147:49,152:50,154:51,155:52,96:61,73:62,42:63,48:65,37:78,67:79,158:85,44:88,89:152,9:154,7:182,14:$V0,32:$Vk1,33:$Vt1,38:$V2,39:$V3,43:$V4,45:$V5,46:$V6,49:$V7,50:$V8,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,68:$Vf,77:$Vg,84:[1,184],85:$Vl1,86:$Vm1,90:$Vk,91:$Vl,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,153:$Vx,167:$Vz,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG}),o($VJ,[2,344],{169:[1,185]}),o([1,6,36,47,69,70,93,127,135,146,148,149,150,156,157,174],$Vu1,{17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,13:23,15:25,16:26,60:29,53:30,74:31,100:32,51:33,76:34,75:35,98:45,172:46,151:48,147:49,152:50,154:51,155:52,96:61,73:62,42:63,48:65,37:78,67:79,158:85,44:88,89:152,9:154,7:186,14:$V0,32:$Vk1,35:$Vv1,38:$V2,39:$V3,43:$V4,45:$V5,46:$V6,49:$V7,50:$V8,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,68:$Vf,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,90:$Vk,91:$Vl,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,153:$Vx,167:$Vz,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG}),{37:192,38:$V2,39:$V3,44:188,45:$V5,46:$V6,107:[1,191],113:189,114:190,119:$Vw1},{26:195,37:196,38:$V2,39:$V3,107:[1,194],110:$Vn,118:[1,197],122:[1,198]},o($Vp1,[2,120]),o($Vp1,[2,121]),o($Vb1,[2,45]),o($Vb1,[2,46]),o($Vb1,[2,47]),o($Vb1,[2,48]),o($Vb1,[2,49]),o($Vb1,[2,50]),o($Vb1,[2,51]),o($Vb1,[2,52]),{4:199,5:3,7:4,8:5,9:6,10:7,11:27,12:28,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$V1,35:[1,200],37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vi,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:201,8:202,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,35:$Vx1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,69:$Vy1,70:$Vz1,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,93:$VA1,96:61,97:211,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,131:204,132:205,136:210,137:207,138:206,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{80:$VB1,81:$VC1,124:213,125:$V91,126:$V21},o($Vb1,[2,201]),o($Vb1,[2,202],{40:216,41:$VD1}),o($VE1,[2,95]),o($VE1,[2,96]),o($VF1,[2,115]),o($VF1,[2,118]),{7:218,8:219,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:220,8:221,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:222,8:223,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:225,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,34:224,35:$Vj1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{37:231,38:$V2,39:$V3,67:232,68:$Vf,73:234,85:$VG1,96:233,100:226,107:$Vm,130:$Vi1,161:227,162:$VH1,163:230},{159:235,160:236,164:[1,237],165:[1,238],166:[1,239]},o([6,35,93,109],$VI1,{44:88,108:240,62:241,63:242,64:243,66:244,42:246,71:248,37:249,40:250,67:251,72:252,73:253,74:254,75:255,76:256,38:$V2,39:$V3,41:$VD1,43:$V4,45:$V5,46:$V6,68:$VJ1,70:$VK1,77:$VL1,107:$Vm,129:$Vq,130:$Vr,145:$Vu}),o($VM1,[2,39]),o($VM1,[2,40]),o($Vb1,[2,43]),{17:161,18:162,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:258,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:163,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:259,100:32,107:$Vm,129:$Vq,130:$Vr,145:$Vu},o($VN1,[2,36]),o($VN1,[2,37]),o($VO1,[2,41]),{4:260,5:3,7:4,8:5,9:6,10:7,11:27,12:28,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$V1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vi,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o($VI,[2,5],{7:4,8:5,9:6,10:7,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,13:23,15:25,16:26,11:27,12:28,60:29,53:30,74:31,100:32,51:33,76:34,75:35,89:37,98:45,172:46,151:48,147:49,152:50,154:51,155:52,175:57,96:61,73:62,42:63,48:65,37:78,67:79,158:85,44:88,5:261,14:$V0,32:$V1,38:$V2,39:$V3,43:$V4,45:$V5,46:$V6,49:$V7,50:$V8,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,68:$Vf,77:$Vg,84:$Vh,85:$Vi,86:$Vj,90:$Vk,91:$Vl,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,148:$Vv,150:$Vw,153:$Vx,156:$Vy,167:$Vz,173:$VA,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG}),o($V11,[2,358]),{7:262,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:263,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:264,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:265,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:266,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:267,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:268,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:269,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:270,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:271,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:272,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:273,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:274,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:275,8:276,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o($V11,[2,266]),o($V11,[2,271]),{7:220,8:277,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:222,8:278,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{37:231,38:$V2,39:$V3,67:232,68:$Vf,73:234,85:$VG1,96:233,100:279,107:$Vm,130:$Vi1,161:227,162:$VH1,163:230},{159:235,164:[1,280],165:[1,281],166:[1,282]},{7:283,8:284,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o($V11,[2,265]),o($V11,[2,270]),{44:285,45:$V5,46:$V6,78:286,126:$VP1},o($VF1,[2,116]),o($VQ1,[2,198]),{40:288,41:$VD1},{40:289,41:$VD1},o($VF1,[2,135],{40:290,41:$VD1}),o($VF1,[2,136],{40:291,41:$VD1}),o($VF1,[2,137]),{7:293,8:295,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,70:$VR1,73:62,74:31,75:35,76:34,77:$Vg,82:292,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,106:294,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,134:296,135:$VS1,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{81:$V41,104:299,105:$V81},o($VF1,[2,117]),{6:[1,301],7:300,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,35:[1,302],37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o($VT1,$VU1,{92:305,88:[1,303],93:$VV1}),o($VW1,[2,100]),o($VW1,[2,104],{61:[1,307],70:[1,306]}),o($VW1,[2,108],{37:136,67:137,96:138,73:139,95:308,38:$V2,39:$V3,68:$Vg1,107:$Vm,130:$Vi1}),o($VX1,[2,109]),o($VX1,[2,110]),o($VX1,[2,111]),o($VX1,[2,112]),{40:216,41:$VD1},{7:309,8:310,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,35:$Vx1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,69:$Vy1,70:$Vz1,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,93:$VA1,96:61,97:211,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,131:204,132:205,136:210,137:207,138:206,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o($VY1,[2,92]),o($VJ,[2,94]),{4:312,5:3,7:4,8:5,9:6,10:7,11:27,12:28,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$V1,36:[1,311],37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vi,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o($VZ1,$V_1,{151:111,154:112,158:116,182:$VQ}),o($VJ,[2,348]),{7:158,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{148:$VK,150:$VL,151:118,154:119,156:$VM,158:116,174:$V01},o([1,6,35,36,47,69,70,83,88,93,109,127,135,146,148,149,150,156,157,174,182,183,184,185,186,187,188,189,190,191,192,193],$Vs1,{17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,13:23,15:25,16:26,60:29,53:30,74:31,100:32,51:33,76:34,75:35,98:45,172:46,151:48,147:49,152:50,154:51,155:52,96:61,73:62,42:63,48:65,37:78,67:79,158:85,44:88,89:152,9:154,7:182,14:$V0,32:$Vk1,33:$Vt1,38:$V2,39:$V3,43:$V4,45:$V5,46:$V6,49:$V7,50:$V8,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,68:$Vf,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,90:$Vk,91:$Vl,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,153:$Vx,167:$Vz,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG}),o($V$1,[2,350],{151:111,154:112,158:116,182:$VQ,184:$VS}),o($Ve1,$Vf1,{94:133,95:134,37:136,67:137,96:138,73:139,87:314,38:$V2,39:$V3,68:$Vg1,70:$Vh1,107:$Vm,130:$Vi1}),{34:142,35:$Vj1},{7:315,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{148:$VK,150:$VL,151:118,154:119,156:$VM,158:116,174:[1,316]},{7:317,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o($V$1,[2,351],{151:111,154:112,158:116,182:$VQ,184:$VS}),o($V$1,[2,352],{151:111,154:112,158:116,182:$VQ,184:$VS}),o($VZ1,[2,353],{151:111,154:112,158:116,182:$VQ}),o($VJ,[2,90],{17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,13:23,15:25,16:26,60:29,53:30,74:31,100:32,51:33,76:34,75:35,98:45,172:46,151:48,147:49,152:50,154:51,155:52,96:61,73:62,42:63,48:65,37:78,67:79,158:85,44:88,89:152,9:154,7:318,14:$V0,32:$Vk1,38:$V2,39:$V3,43:$V4,45:$V5,46:$V6,49:$V7,50:$V8,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,68:$Vf,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,90:$Vk,91:$Vl,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,148:$Vu1,150:$Vu1,156:$Vu1,174:$Vu1,153:$Vx,167:$Vz,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG}),o($V11,[2,354],{45:$Vq1,46:$Vq1,80:$Vq1,81:$Vq1,101:$Vq1,102:$Vq1,103:$Vq1,105:$Vq1,125:$Vq1,126:$Vq1}),o($VQ1,$V21,{124:120,99:121,104:127,80:$V31,81:$V41,101:$V51,102:$V61,103:$V71,105:$V81,125:$V91}),{80:$V31,81:$V41,99:130,101:$V51,102:$V61,103:$V71,104:127,105:$V81},o($V02,$Vc1),o($V11,[2,355],{45:$Vq1,46:$Vq1,80:$Vq1,81:$Vq1,101:$Vq1,102:$Vq1,103:$Vq1,105:$Vq1,125:$Vq1,126:$Vq1}),o($V11,[2,356]),o($V11,[2,357]),{6:[1,321],7:319,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,35:[1,320],37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{34:322,35:$Vj1,173:[1,323]},o($V11,[2,242],{141:324,142:[1,325],143:[1,326]}),o($V11,[2,263]),o($V11,[2,264]),o($V11,[2,272]),o($V11,[2,273]),{35:[1,327],148:$VK,150:$VL,151:111,154:112,156:$VM,158:116,174:$VN,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},{35:[1,328]},{168:329,170:330,171:$V12},o($V11,[2,149]),{7:332,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o($Vr1,[2,152],{34:333,35:$Vj1,45:$Vq1,46:$Vq1,80:$Vq1,81:$Vq1,101:$Vq1,102:$Vq1,103:$Vq1,105:$Vq1,125:$Vq1,126:$Vq1,111:[1,334]}),o($V22,[2,249],{151:111,154:112,158:116,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),{73:335,107:$Vm},o($V22,[2,32],{151:111,154:112,158:116,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),{7:336,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o([1,6,36,47,69,70,93,127,135,146,149,157],[2,88],{17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,13:23,15:25,16:26,60:29,53:30,74:31,100:32,51:33,76:34,75:35,98:45,172:46,151:48,147:49,152:50,154:51,155:52,96:61,73:62,42:63,48:65,37:78,67:79,158:85,44:88,89:152,9:154,7:337,14:$V0,32:$Vk1,35:$Vv1,38:$V2,39:$V3,43:$V4,45:$V5,46:$V6,49:$V7,50:$V8,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,68:$Vf,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,90:$Vk,91:$Vl,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,148:$Vu1,150:$Vu1,156:$Vu1,174:$Vu1,153:$Vx,167:$Vz,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG}),{34:338,35:$Vj1,173:[1,339]},o($Va1,$V32,{151:111,154:112,158:116,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),{73:340,107:$Vm},o($Va1,[2,156]),{33:[1,341],93:[1,342]},{33:[1,343]},{35:$V42,37:348,38:$V2,39:$V3,109:[1,344],115:345,116:346,118:$V52},o([33,93],[2,172]),{117:[1,350]},{35:$V62,37:355,38:$V2,39:$V3,109:[1,351],118:$V72,121:352,123:353},o($Va1,[2,176]),{61:[1,357]},{7:358,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,35:[1,359],37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{33:[1,360]},{6:$VH,146:[1,361]},{4:362,5:3,7:4,8:5,9:6,10:7,11:27,12:28,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$V1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vi,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o($V82,$V92,{151:111,154:112,158:116,134:363,70:[1,364],135:$VS1,148:$VK,150:$VL,156:$VM,174:$VN,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),o($V82,$Va2,{134:365,70:$VR1,135:$VS1}),o($Vb2,[2,204]),{7:309,8:310,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,69:[1,366],70:$Vz1,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,93:$VA1,96:61,97:211,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,136:368,138:367,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o([6,35,69],$VU1,{133:369,92:371,93:$Vc2}),o($Vd2,[2,235]),o($Ve2,[2,226]),{7:309,8:310,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,35:$Vx1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,70:$Vz1,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,93:$VA1,96:61,97:211,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,131:373,132:372,136:210,137:207,138:206,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o($Vd2,[2,237]),o($Ve2,[2,231]),o($Vf2,[2,224]),o($Vf2,[2,225],{17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,13:23,15:25,16:26,60:29,53:30,74:31,100:32,51:33,76:34,75:35,98:45,172:46,151:48,147:49,152:50,154:51,155:52,96:61,73:62,42:63,48:65,37:78,67:79,158:85,44:88,89:152,9:154,7:374,14:$V0,32:$Vk1,38:$V2,39:$V3,43:$V4,45:$V5,46:$V6,49:$V7,50:$V8,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,68:$Vf,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,90:$Vk,91:$Vl,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,148:$Vv,150:$Vw,153:$Vx,156:$Vy,167:$Vz,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG}),{78:375,126:$VP1},{40:376,41:$VD1},{7:377,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o($Vg2,[2,203]),o($Vg2,[2,38]),{34:378,35:$Vj1,148:$VK,150:$VL,151:111,154:112,156:$VM,158:116,174:$VN,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},{34:379,35:$Vj1},o($Vh2,[2,257],{151:111,154:112,158:116,148:$VK,149:[1,380],150:$VL,156:$VM,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),{35:[2,253],149:[1,381]},o($Vh2,[2,260],{151:111,154:112,158:116,148:$VK,149:[1,382],150:$VL,156:$VM,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),{35:[2,255],149:[1,383]},o($V11,[2,268]),o($Vi2,[2,269],{151:111,154:112,158:116,148:$VK,150:$VL,156:$VM,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),{35:$Vj2,157:[1,384]},o($Vk2,[2,279]),{37:231,38:$V2,39:$V3,67:232,68:$Vg1,73:234,96:233,107:$Vm,130:$Vi1,161:385,163:230},{37:231,38:$V2,39:$V3,67:232,68:$Vg1,73:234,96:233,107:$Vm,130:$Vi1,161:386,163:230},o($Vk2,[2,286],{93:[1,387]}),o($Vl2,[2,282]),o($Vl2,[2,283]),o($Vl2,[2,284]),o($Vl2,[2,285]),o($V11,[2,276]),{35:[2,278]},{7:388,8:389,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:390,8:391,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:392,8:393,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o($Vm2,$VU1,{92:394,93:$Vn2}),o($Vo2,[2,144]),o($Vo2,[2,56],{65:[1,396]}),o($Vo2,[2,57]),o($Vp2,[2,65],{78:399,79:400,61:[1,397],70:[1,398],80:$Vq2,81:$Vr2,126:$VP1}),{7:403,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o($Vp2,[2,67]),{37:249,38:$V2,39:$V3,40:250,41:$VD1,66:404,67:251,71:405,72:252,73:253,74:254,75:255,76:256,77:$VL1,107:$Vm,129:$Vq,130:$Vr,145:$Vu},{70:[1,406],78:407,79:408,80:$Vq2,81:$Vr2,126:$VP1},o($Vs2,[2,62]),o($Vs2,[2,63]),o($Vs2,[2,64]),o($Vt2,[2,72]),o($Vt2,[2,73]),o($Vt2,[2,74]),o($Vt2,[2,75]),o($Vt2,[2,76]),{78:409,80:$VB1,81:$VC1,126:$VP1},o($V02,$Vd1,{52:[1,410]}),o($V02,$Vq1),{6:$VH,47:[1,411]},o($VI,[2,4]),o($Vu2,[2,359],{151:111,154:112,158:116,182:$VQ,183:$VR,184:$VS}),o($Vu2,[2,360],{151:111,154:112,158:116,182:$VQ,183:$VR,184:$VS}),o($V$1,[2,361],{151:111,154:112,158:116,182:$VQ,184:$VS}),o($V$1,[2,362],{151:111,154:112,158:116,182:$VQ,184:$VS}),o([1,6,35,36,47,69,70,83,88,93,109,127,135,146,148,149,150,156,157,174,185,186,187,188,189,190,191,192,193],[2,363],{151:111,154:112,158:116,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS}),o([1,6,35,36,47,69,70,83,88,93,109,127,135,146,148,149,150,156,157,174,186,187,188,189,190,191,192],[2,364],{151:111,154:112,158:116,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,193:$V$}),o([1,6,35,36,47,69,70,83,88,93,109,127,135,146,148,149,150,156,157,174,187,188,189,190,191,192],[2,365],{151:111,154:112,158:116,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,193:$V$}),o([1,6,35,36,47,69,70,83,88,93,109,127,135,146,148,149,150,156,157,174,188,189,190,191,192],[2,366],{151:111,154:112,158:116,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,193:$V$}),o([1,6,35,36,47,69,70,83,88,93,109,127,135,146,148,149,150,156,157,174,189,190,191,192],[2,367],{151:111,154:112,158:116,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,193:$V$}),o([1,6,35,36,47,69,70,83,88,93,109,127,135,146,148,149,150,156,157,174,190,191,192],[2,368],{151:111,154:112,158:116,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,193:$V$}),o([1,6,35,36,47,69,70,83,88,93,109,127,135,146,148,149,150,156,157,174,191,192],[2,369],{151:111,154:112,158:116,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,193:$V$}),o([1,6,35,36,47,69,70,83,88,93,109,127,135,146,148,149,150,156,157,174,192],[2,370],{151:111,154:112,158:116,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,193:$V$}),o([1,6,35,36,47,69,70,83,88,93,109,127,135,146,148,149,150,156,157,174,186,187,188,189,190,191,192,193],[2,371],{151:111,154:112,158:116,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT}),o($Vi2,$Vv2,{151:111,154:112,158:116,148:$VK,150:$VL,156:$VM,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),o($VJ,[2,347]),{149:[1,412]},{149:[1,413]},o([1,6,35,36,47,69,70,83,88,93,109,127,135,146,148,149,150,156,174,178,179,182,183,184,185,186,187,188,189,190,191,192,193],$Vj2,{157:[1,414]}),{7:415,8:416,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:417,8:418,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:419,8:420,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o($Vi2,$Vw2,{151:111,154:112,158:116,148:$VK,150:$VL,156:$VM,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),o($VJ,[2,346]),o($Vx2,[2,194]),o($Vx2,[2,195]),{7:309,8:310,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,35:$Vy2,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,70:$Vz1,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,97:211,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,127:[1,421],128:422,129:$Vq,130:$Vr,136:423,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o($VF1,[2,131]),o($VF1,[2,132]),o($VF1,[2,133]),o($VF1,[2,134]),{83:[1,425]},{70:$VR1,83:[2,140],134:426,135:$VS1,148:$VK,150:$VL,151:111,154:112,156:$VM,158:116,174:$VN,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},{83:[2,141]},{70:$VR1,134:427,135:$VS1},{7:428,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,83:[2,216],84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o($Vz2,[2,207]),o($Vz2,$VA2),o($VF1,[2,139]),o($V22,[2,53],{151:111,154:112,158:116,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),{7:429,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:430,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{89:431,90:$Vk,91:$Vl},o($VB2,$VC2,{95:134,37:136,67:137,96:138,73:139,94:432,38:$V2,39:$V3,68:$Vg1,70:$Vh1,107:$Vm,130:$Vi1}),{6:$VD2,35:$VE2},o($VW1,[2,105]),{7:435,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o($VW1,[2,106]),o($Vf2,$V92,{151:111,154:112,158:116,70:[1,436],148:$VK,150:$VL,156:$VM,174:$VN,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),o($Vf2,$Va2),o($VF2,[2,34]),{6:$VH,36:[1,437]},{7:438,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o($VT1,$VU1,{92:305,88:[1,439],93:$VV1}),o($VZ1,$V_1,{151:111,154:112,158:116,182:$VQ}),{7:440,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{34:378,35:$Vj1,148:$VK,150:$VL,151:111,154:112,156:$VM,158:116,174:$VG2,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},o($VJ,[2,89],{151:111,154:112,158:116,148:$V32,150:$V32,156:$V32,174:$V32,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),o($V22,[2,372],{151:111,154:112,158:116,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),{7:441,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:442,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o($V11,[2,339]),{7:443,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o($V11,[2,243],{142:[1,444]}),{34:445,35:$Vj1},{34:448,35:$Vj1,37:446,38:$V2,39:$V3,73:447,107:$Vm},{168:449,170:330,171:$V12},{168:450,170:330,171:$V12},{36:[1,451],169:[1,452],170:453,171:$V12},o($VH2,[2,332]),{7:455,8:456,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,139:454,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o($VI2,[2,150],{151:111,154:112,158:116,34:457,35:$Vj1,148:$VK,150:$VL,156:$VM,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),o($V11,[2,153]),{7:458,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{36:[1,459]},o($V22,[2,33],{151:111,154:112,158:116,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),o($VJ,[2,87],{151:111,154:112,158:116,148:$V32,150:$V32,156:$V32,174:$V32,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),o($VJ,[2,345]),{7:461,8:460,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{36:[1,462]},{44:463,45:$V5,46:$V6},{107:[1,465],114:464,119:$Vw1},{44:466,45:$V5,46:$V6},{33:[1,467]},o($Vm2,$VU1,{92:468,93:$VJ2}),o($Vo2,[2,163]),{35:$V42,37:348,38:$V2,39:$V3,115:470,116:346,118:$V52},o($Vo2,[2,168],{117:[1,471]}),o($Vo2,[2,170],{117:[1,472]}),{37:473,38:$V2,39:$V3},o($Va1,[2,174]),o($Vm2,$VU1,{92:474,93:$VK2}),o($Vo2,[2,184]),{35:$V62,37:355,38:$V2,39:$V3,118:$V72,121:476,123:353},o($Vo2,[2,189],{117:[1,477]}),o($Vo2,[2,192],{117:[1,478]}),{6:[1,480],7:479,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,35:[1,481],37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o($VL2,[2,180],{151:111,154:112,158:116,148:$VK,150:$VL,156:$VM,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),{73:482,107:$Vm},{44:483,45:$V5,46:$V6},o($Vb1,[2,251]),{6:$VH,36:[1,484]},{7:485,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o([14,32,38,39,43,45,46,49,50,54,55,56,57,58,59,68,77,84,85,86,90,91,107,110,112,120,129,130,140,144,145,148,150,153,156,167,173,176,177,178,179,180,181],$VA2,{6:$VM2,35:$VM2,69:$VM2,93:$VM2}),{7:486,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o($Vb2,[2,205]),o($Vd2,[2,236]),o($Ve2,[2,232]),{6:$VN2,35:$VO2,69:[1,487]},o($VP2,$VC2,{17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,13:23,15:25,16:26,60:29,53:30,74:31,100:32,51:33,76:34,75:35,89:37,98:45,172:46,151:48,147:49,152:50,154:51,155:52,175:57,96:61,73:62,42:63,48:65,37:78,67:79,158:85,44:88,9:148,138:206,136:210,97:211,7:309,8:310,137:490,131:491,14:$V0,32:$Vk1,38:$V2,39:$V3,43:$V4,45:$V5,46:$V6,49:$V7,50:$V8,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,68:$Vf,70:$Vz1,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,90:$Vk,91:$Vl,93:$VA1,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,148:$Vv,150:$Vw,153:$Vx,156:$Vy,167:$Vz,173:$VA,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG}),o($VP2,[2,233]),o($VB2,$VU1,{92:371,133:492,93:$Vc2}),{7:309,8:310,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,70:$Vz1,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,93:$VA1,96:61,97:211,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,136:368,138:367,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o($Vf2,[2,114],{151:111,154:112,158:116,148:$VK,150:$VL,156:$VM,174:$VG2,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),o($Vx2,[2,196]),o($Vb1,[2,129]),{83:[1,493],148:$VK,150:$VL,151:111,154:112,156:$VM,158:116,174:$VG2,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},o($VQ2,[2,336]),o($VR2,[2,342]),{7:494,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:495,8:496,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:497,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:498,8:499,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:500,8:501,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o($Vk2,[2,280]),o($Vk2,[2,281]),{37:231,38:$V2,39:$V3,67:232,68:$Vg1,73:234,96:233,107:$Vm,130:$Vi1,163:502},{35:$VS2,148:$VK,149:[1,503],150:$VL,151:111,154:112,156:$VM,157:[1,504],158:116,174:$VN,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},{35:[2,307],149:[1,505],157:[1,506]},{35:$VT2,148:$VK,149:[1,507],150:$VL,151:111,154:112,156:$VM,158:116,174:$VN,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},{35:[2,308],149:[1,508]},{35:$VU2,148:$VK,149:[1,509],150:$VL,151:111,154:112,156:$VM,158:116,174:$VN,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},{35:[2,323],149:[1,510]},{6:$VV2,35:$VW2,109:[1,511]},o($VX2,$VC2,{44:88,63:242,64:243,66:244,42:246,71:248,37:249,40:250,67:251,72:252,73:253,74:254,75:255,76:256,62:514,38:$V2,39:$V3,41:$VD1,43:$V4,45:$V5,46:$V6,68:$VJ1,70:$VK1,77:$VL1,107:$Vm,129:$Vq,130:$Vr,145:$Vu}),{7:515,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,35:[1,516],37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:517,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,35:[1,518],37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o($Vo2,[2,68]),o($Vt2,[2,78]),o($Vt2,[2,80]),{40:519,41:$VD1},{7:293,8:295,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,70:$VR1,73:62,74:31,75:35,76:34,77:$Vg,82:520,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,106:294,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,134:296,135:$VS1,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{69:[1,521],148:$VK,150:$VL,151:111,154:112,156:$VM,158:116,174:$VG2,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},o($Vo2,[2,69],{78:399,79:400,80:$Vq2,81:$Vr2,126:$VP1}),o($Vo2,[2,71],{78:407,79:408,80:$Vq2,81:$Vr2,126:$VP1}),o($Vo2,[2,70]),o($Vt2,[2,79]),o($Vt2,[2,81]),o($Vt2,[2,77]),o($Vb1,[2,44]),o($VO1,[2,42]),{7:522,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:523,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:524,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o([1,6,35,36,47,69,70,83,88,93,109,127,135,146,148,150,156,174],$VS2,{151:111,154:112,158:116,149:[1,525],157:[1,526],178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),{149:[1,527],157:[1,528]},o($VY2,$VT2,{151:111,154:112,158:116,149:[1,529],178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),{149:[1,530]},o($VY2,$VU2,{151:111,154:112,158:116,149:[1,531],178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),{149:[1,532]},o($Vx2,[2,199]),o([6,35,127],$VU1,{92:533,93:$VZ2}),o($V_2,[2,217]),{7:309,8:310,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,35:$Vy2,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,70:$Vz1,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,97:211,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,128:535,129:$Vq,130:$Vr,136:423,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o($VF1,[2,138]),{7:536,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,83:[2,212],84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:537,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,83:[2,214],84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{83:[2,215],148:$VK,150:$VL,151:111,154:112,156:$VM,158:116,174:$VG2,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},o($V22,[2,54],{151:111,154:112,158:116,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),{36:[1,538],148:$VK,150:$VL,151:111,154:112,156:$VM,158:116,174:$VG2,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},{5:540,7:4,8:5,9:6,10:7,11:27,12:28,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$V1,34:539,35:$Vj1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vi,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o($VW1,[2,101]),{37:136,38:$V2,39:$V3,67:137,68:$Vg1,70:$Vh1,73:139,94:541,95:134,96:138,107:$Vm,130:$Vi1},o($V$2,$Vf1,{94:133,95:134,37:136,67:137,96:138,73:139,87:542,38:$V2,39:$V3,68:$Vg1,70:$Vh1,107:$Vm,130:$Vi1}),o($VW1,[2,107],{151:111,154:112,158:116,148:$VK,150:$VL,156:$VM,174:$VG2,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),o($Vf2,$VM2),o($VF2,[2,35]),o($Vi2,$Vv2,{151:111,154:112,158:116,148:$VK,150:$VL,156:$VM,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),{89:543,90:$Vk,91:$Vl},o($Vi2,$Vw2,{151:111,154:112,158:116,148:$VK,150:$VL,156:$VM,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),{36:[1,544],148:$VK,150:$VL,151:111,154:112,156:$VM,158:116,174:$VG2,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},o($V22,[2,374],{151:111,154:112,158:116,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),{34:545,35:$Vj1,148:$VK,150:$VL,151:111,154:112,156:$VM,158:116,174:$VG2,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},{34:546,35:$Vj1},o($V11,[2,244]),{34:547,35:$Vj1},{34:548,35:$Vj1},o($V03,[2,248]),{36:[1,549],169:[1,550],170:453,171:$V12},{36:[1,551],169:[1,552],170:453,171:$V12},o($V11,[2,330]),{34:553,35:$Vj1},o($VH2,[2,333]),{34:554,35:$Vj1,93:[1,555]},o($V13,[2,238],{151:111,154:112,158:116,148:$VK,150:$VL,156:$VM,174:$VN,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),o($V13,[2,239]),o($V11,[2,151]),o($VI2,[2,154],{151:111,154:112,158:116,34:556,35:$Vj1,148:$VK,150:$VL,156:$VM,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),o($V11,[2,250]),{34:557,35:$Vj1},{148:$VK,150:$VL,151:111,154:112,156:$VM,158:116,174:$VN,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},o($Va1,[2,85]),o($Va1,[2,157]),{33:[1,558]},{35:$V42,37:348,38:$V2,39:$V3,115:559,116:346,118:$V52},o($Va1,[2,158]),{44:560,45:$V5,46:$V6},{6:$V23,35:$V33,109:[1,561]},o($VX2,$VC2,{37:348,116:564,38:$V2,39:$V3,118:$V52}),o($VB2,$VU1,{92:565,93:$VJ2}),{37:566,38:$V2,39:$V3},{37:567,38:$V2,39:$V3},{33:[2,173]},{6:$V43,35:$V53,109:[1,568]},o($VX2,$VC2,{37:355,123:571,38:$V2,39:$V3,118:$V72}),o($VB2,$VU1,{92:572,93:$VK2}),{37:573,38:$V2,39:$V3,118:[1,574]},{37:575,38:$V2,39:$V3},o($VL2,[2,177],{151:111,154:112,158:116,148:$VK,150:$VL,156:$VM,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),{7:576,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:577,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{36:[1,578]},o($Va1,[2,182]),{146:[1,579]},{69:[1,580],148:$VK,150:$VL,151:111,154:112,156:$VM,158:116,174:$VG2,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},{69:[1,581],148:$VK,150:$VL,151:111,154:112,156:$VM,158:116,174:$VG2,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},o($Vb2,[2,206]),{7:309,8:310,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,70:$Vz1,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,93:$VA1,96:61,97:211,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,131:373,136:210,137:582,138:206,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:309,8:310,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,35:$Vx1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,70:$Vz1,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,93:$VA1,96:61,97:211,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,131:373,132:583,136:210,137:207,138:206,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o($Ve2,[2,227]),o($VP2,[2,234],{17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,13:23,15:25,16:26,60:29,53:30,74:31,100:32,51:33,76:34,75:35,89:37,98:45,172:46,151:48,147:49,152:50,154:51,155:52,175:57,96:61,73:62,42:63,48:65,37:78,67:79,158:85,44:88,9:148,97:211,7:309,8:310,138:367,136:368,14:$V0,32:$Vk1,38:$V2,39:$V3,43:$V4,45:$V5,46:$V6,49:$V7,50:$V8,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,68:$Vf,70:$Vz1,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,90:$Vk,91:$Vl,93:$VA1,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,148:$Vv,150:$Vw,153:$Vx,156:$Vy,167:$Vz,173:$VA,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG}),{6:$VN2,35:$VO2,36:[1,584]},o($Vb1,[2,130]),o($Vi2,[2,258],{151:111,154:112,158:116,148:$VK,150:$VL,156:$VM,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),{35:$V63,148:$VK,150:$VL,151:111,154:112,156:$VM,158:116,174:$VN,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},{35:[2,254]},o($Vi2,[2,261],{151:111,154:112,158:116,148:$VK,150:$VL,156:$VM,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),{35:$V73,148:$VK,150:$VL,151:111,154:112,156:$VM,158:116,174:$VN,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},{35:[2,256]},{35:$V83,148:$VK,150:$VL,151:111,154:112,156:$VM,158:116,174:$VN,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},{35:[2,277]},o($Vk2,[2,287]),{7:585,8:586,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:587,8:588,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:589,8:590,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:591,8:592,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:593,8:594,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:595,8:596,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:597,8:598,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:599,8:600,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o($Vb2,[2,142]),{37:249,38:$V2,39:$V3,40:250,41:$VD1,42:246,43:$V4,44:88,45:$V5,46:$V6,62:601,63:242,64:243,66:244,67:251,68:$VJ1,70:$VK1,71:248,72:252,73:253,74:254,75:255,76:256,77:$VL1,107:$Vm,129:$Vq,130:$Vr,145:$Vu},o($V$2,$VI1,{44:88,62:241,63:242,64:243,66:244,42:246,71:248,37:249,40:250,67:251,72:252,73:253,74:254,75:255,76:256,108:602,38:$V2,39:$V3,41:$VD1,43:$V4,45:$V5,46:$V6,68:$VJ1,70:$VK1,77:$VL1,107:$Vm,129:$Vq,130:$Vr,145:$Vu}),o($Vo2,[2,145]),o($Vo2,[2,58],{151:111,154:112,158:116,148:$VK,150:$VL,156:$VM,174:$VG2,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),{7:603,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o($Vo2,[2,60],{151:111,154:112,158:116,148:$VK,150:$VL,156:$VM,174:$VG2,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),{7:604,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o($Vt2,[2,82]),{83:[1,605]},o($Vp2,[2,66]),o($Vi2,$V63,{151:111,154:112,158:116,148:$VK,150:$VL,156:$VM,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),o($Vi2,$V73,{151:111,154:112,158:116,148:$VK,150:$VL,156:$VM,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),o($Vi2,$V83,{151:111,154:112,158:116,148:$VK,150:$VL,156:$VM,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),{7:606,8:607,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:608,8:609,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:610,8:611,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:612,8:613,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:614,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:615,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:616,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:617,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{6:$V93,35:$Va3,127:[1,618]},o([6,35,36,127],$VC2,{17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,13:23,15:25,16:26,60:29,53:30,74:31,100:32,51:33,76:34,75:35,89:37,98:45,172:46,151:48,147:49,152:50,154:51,155:52,175:57,96:61,73:62,42:63,48:65,37:78,67:79,158:85,44:88,9:148,97:211,7:309,8:310,136:621,14:$V0,32:$Vk1,38:$V2,39:$V3,43:$V4,45:$V5,46:$V6,49:$V7,50:$V8,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,68:$Vf,70:$Vz1,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,90:$Vk,91:$Vl,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,148:$Vv,150:$Vw,153:$Vx,156:$Vy,167:$Vz,173:$VA,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG}),o($VB2,$VU1,{92:622,93:$VZ2}),{83:[2,211],148:$VK,150:$VL,151:111,154:112,156:$VM,158:116,174:$VG2,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},{83:[2,213],148:$VK,150:$VL,151:111,154:112,156:$VM,158:116,174:$VG2,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},o($V11,[2,55]),o($VY1,[2,91]),o($VJ,[2,93]),o($VW1,[2,102]),o($VB2,$VU1,{92:623,93:$VV1}),{34:539,35:$Vj1},o($V11,[2,373]),o($VQ2,[2,337]),o($V11,[2,245]),o($V03,[2,246]),o($V03,[2,247]),o($V11,[2,326]),{34:624,35:$Vj1},o($V11,[2,327]),{34:625,35:$Vj1},{36:[1,626]},o($VH2,[2,334],{6:[1,627]}),{7:628,8:629,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o($V11,[2,155]),o($VR2,[2,343]),{44:630,45:$V5,46:$V6},o($Vm2,$VU1,{92:631,93:$VJ2}),o($Va1,[2,159]),{33:[1,632]},{37:348,38:$V2,39:$V3,116:633,118:$V52},{35:$V42,37:348,38:$V2,39:$V3,115:634,116:346,118:$V52},o($Vo2,[2,164]),{6:$V23,35:$V33,36:[1,635]},o($Vo2,[2,169]),o($Vo2,[2,171]),o($Va1,[2,175],{33:[1,636]}),{37:355,38:$V2,39:$V3,118:$V72,123:637},{35:$V62,37:355,38:$V2,39:$V3,118:$V72,121:638,123:353},o($Vo2,[2,185]),{6:$V43,35:$V53,36:[1,639]},o($Vo2,[2,190]),o($Vo2,[2,191]),o($Vo2,[2,193]),o($VL2,[2,178],{151:111,154:112,158:116,148:$VK,150:$VL,156:$VM,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),{36:[1,640],148:$VK,150:$VL,151:111,154:112,156:$VM,158:116,174:$VG2,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},o($Va1,[2,181]),o($Vb1,[2,252]),o($Vb1,[2,209]),o($Vb1,[2,210]),o($Ve2,[2,228]),o($VB2,$VU1,{92:371,133:641,93:$Vc2}),o($Ve2,[2,229]),{35:$Vb3,148:$VK,150:$VL,151:111,154:112,156:$VM,157:[1,642],158:116,174:$VN,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},{35:[2,309],157:[1,643]},{35:$Vc3,148:$VK,149:[1,644],150:$VL,151:111,154:112,156:$VM,158:116,174:$VN,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},{35:[2,313],149:[1,645]},{35:$Vd3,148:$VK,150:$VL,151:111,154:112,156:$VM,157:[1,646],158:116,174:$VN,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},{35:[2,310],157:[1,647]},{35:$Ve3,148:$VK,149:[1,648],150:$VL,151:111,154:112,156:$VM,158:116,174:$VN,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},{35:[2,314],149:[1,649]},{35:$Vf3,148:$VK,150:$VL,151:111,154:112,156:$VM,158:116,174:$VN,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},{35:[2,311]},{35:$Vg3,148:$VK,150:$VL,151:111,154:112,156:$VM,158:116,174:$VN,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},{35:[2,312]},{35:$Vh3,148:$VK,150:$VL,151:111,154:112,156:$VM,158:116,174:$VN,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},{35:[2,324]},{35:$Vi3,148:$VK,150:$VL,151:111,154:112,156:$VM,158:116,174:$VN,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},{35:[2,325]},o($Vo2,[2,146]),o($VB2,$VU1,{92:650,93:$Vn2}),{36:[1,651],148:$VK,150:$VL,151:111,154:112,156:$VM,158:116,174:$VG2,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},{36:[1,652],148:$VK,150:$VL,151:111,154:112,156:$VM,158:116,174:$VG2,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},o($Vt2,[2,83]),o($Vj3,$Vb3,{151:111,154:112,158:116,157:[1,653],178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),{157:[1,654]},o($VY2,$Vc3,{151:111,154:112,158:116,149:[1,655],178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),{149:[1,656]},o($Vj3,$Vd3,{151:111,154:112,158:116,157:[1,657],178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),{157:[1,658]},o($VY2,$Ve3,{151:111,154:112,158:116,149:[1,659],178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),{149:[1,660]},o($V22,$Vf3,{151:111,154:112,158:116,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),o($V22,$Vg3,{151:111,154:112,158:116,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),o($V22,$Vh3,{151:111,154:112,158:116,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),o($V22,$Vi3,{151:111,154:112,158:116,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),o($Vx2,[2,200]),{7:309,8:310,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,70:$Vz1,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,97:211,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,136:661,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:309,8:310,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,35:$Vy2,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,70:$Vz1,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,97:211,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,128:662,129:$Vq,130:$Vr,136:423,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o($V_2,[2,218]),{6:$V93,35:$Va3,36:[1,663]},{6:$VD2,35:$VE2,36:[1,664]},{36:[1,665]},{36:[1,666]},o($V11,[2,331]),o($VH2,[2,335]),o($V13,[2,240],{151:111,154:112,158:116,148:$VK,150:$VL,156:$VM,174:$VN,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),o($V13,[2,241]),o($Va1,[2,161]),{6:$V23,35:$V33,109:[1,667]},{44:668,45:$V5,46:$V6},o($Vo2,[2,165]),o($VB2,$VU1,{92:669,93:$VJ2}),o($Vo2,[2,166]),{44:670,45:$V5,46:$V6},o($Vo2,[2,186]),o($VB2,$VU1,{92:671,93:$VK2}),o($Vo2,[2,187]),o($Va1,[2,179]),{6:$VN2,35:$VO2,36:[1,672]},{7:673,8:674,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:675,8:676,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:677,8:678,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:679,8:680,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:681,8:682,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:683,8:684,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:685,8:686,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:687,8:688,9:148,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,29:20,30:21,31:22,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vj,89:37,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$VA,175:57,176:$VB,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{6:$VV2,35:$VW2,36:[1,689]},o($Vo2,[2,59]),o($Vo2,[2,61]),{7:690,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:691,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:692,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:693,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:694,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:695,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:696,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},{7:697,9:154,13:23,14:$V0,15:25,16:26,17:8,18:9,19:10,20:11,21:12,22:13,23:14,24:15,25:16,26:17,27:18,28:19,32:$Vk1,37:78,38:$V2,39:$V3,42:63,43:$V4,44:88,45:$V5,46:$V6,48:65,49:$V7,50:$V8,51:33,53:30,54:$V9,55:$Va,56:$Vb,57:$Vc,58:$Vd,59:$Ve,60:29,67:79,68:$Vf,73:62,74:31,75:35,76:34,77:$Vg,84:$Vh,85:$Vl1,86:$Vm1,89:152,90:$Vk,91:$Vl,96:61,98:45,100:32,107:$Vm,110:$Vn,112:$Vo,120:$Vp,129:$Vq,130:$Vr,140:$Vs,144:$Vt,145:$Vu,147:49,148:$Vv,150:$Vw,151:48,152:50,153:$Vx,154:51,155:52,156:$Vy,158:85,167:$Vz,172:46,173:$Vn1,176:$Vo1,177:$VC,178:$VD,179:$VE,180:$VF,181:$VG},o($V_2,[2,219]),o($VB2,$VU1,{92:698,93:$VZ2}),o($V_2,[2,220]),o($VW1,[2,103]),o($V11,[2,328]),o($V11,[2,329]),{33:[1,699]},o($Va1,[2,160]),{6:$V23,35:$V33,36:[1,700]},o($Va1,[2,183]),{6:$V43,35:$V53,36:[1,701]},o($Ve2,[2,230]),{35:$Vk3,148:$VK,150:$VL,151:111,154:112,156:$VM,158:116,174:$VN,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},{35:[2,315]},{35:$Vl3,148:$VK,150:$VL,151:111,154:112,156:$VM,158:116,174:$VN,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},{35:[2,317]},{35:$Vm3,148:$VK,150:$VL,151:111,154:112,156:$VM,158:116,174:$VN,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},{35:[2,319]},{35:$Vn3,148:$VK,150:$VL,151:111,154:112,156:$VM,158:116,174:$VN,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},{35:[2,321]},{35:$Vo3,148:$VK,150:$VL,151:111,154:112,156:$VM,158:116,174:$VN,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},{35:[2,316]},{35:$Vp3,148:$VK,150:$VL,151:111,154:112,156:$VM,158:116,174:$VN,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},{35:[2,318]},{35:$Vq3,148:$VK,150:$VL,151:111,154:112,156:$VM,158:116,174:$VN,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},{35:[2,320]},{35:$Vr3,148:$VK,150:$VL,151:111,154:112,156:$VM,158:116,174:$VN,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$},{35:[2,322]},o($Vo2,[2,147]),o($V22,$Vk3,{151:111,154:112,158:116,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),o($V22,$Vl3,{151:111,154:112,158:116,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),o($V22,$Vm3,{151:111,154:112,158:116,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),o($V22,$Vn3,{151:111,154:112,158:116,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),o($V22,$Vo3,{151:111,154:112,158:116,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),o($V22,$Vp3,{151:111,154:112,158:116,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),o($V22,$Vq3,{151:111,154:112,158:116,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),o($V22,$Vr3,{151:111,154:112,158:116,178:$VO,179:$VP,182:$VQ,183:$VR,184:$VS,185:$VT,186:$VU,187:$VV,188:$VW,189:$VX,190:$VY,191:$VZ,192:$V_,193:$V$}),{6:$V93,35:$Va3,36:[1,702]},{44:703,45:$V5,46:$V6},o($Vo2,[2,167]),o($Vo2,[2,188]),o($V_2,[2,221]),o($Va1,[2,162])],
		defaultActions: {236:[2,278],294:[2,141],473:[2,173],496:[2,254],499:[2,256],501:[2,277],594:[2,311],596:[2,312],598:[2,324],600:[2,325],674:[2,315],676:[2,317],678:[2,319],680:[2,321],682:[2,316],684:[2,318],686:[2,320],688:[2,322]},
		parseError: function parseError (str, hash) {
			if (hash.recoverable) {
				this.trace(str);
			} else {
				var error = new Error(str);
				error.hash = hash;
				throw error;
			}
		},
		parse: function parse(input) {
			var self = this, stack = [0], tstack = [], vstack = [null], lstack = [], table = this.table, yytext = '', yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
			var args = lstack.slice.call(arguments, 1);
			var lexer = Object.create(this.lexer);
			var sharedState = { yy: {} };
			for (var k in this.yy) {
				if (Object.prototype.hasOwnProperty.call(this.yy, k)) {
					sharedState.yy[k] = this.yy[k];
				}
			}
			lexer.setInput(input, sharedState.yy);
			sharedState.yy.lexer = lexer;
			sharedState.yy.parser = this;
			if (typeof lexer.yylloc == 'undefined') {
				lexer.yylloc = {};
			}
			var yyloc = lexer.yylloc;
			lstack.push(yyloc);
			var ranges = lexer.options && lexer.options.ranges;
			if (typeof sharedState.yy.parseError === 'function') {
				this.parseError = sharedState.yy.parseError;
			} else {
				this.parseError = Object.getPrototypeOf(this).parseError;
			}
			function popStack(n) {
				stack.length = stack.length - 2 * n;
				vstack.length = vstack.length - n;
				lstack.length = lstack.length - n;
			}
			_token_stack:
				var lex = function () {
					var token;
					token = lexer.lex() || EOF;
					if (typeof token !== 'number') {
						token = self.symbols_[token] || token;
					}
					return token;
				};
			var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
			while (true) {
				state = stack[stack.length - 1];
				if (this.defaultActions[state]) {
					action = this.defaultActions[state];
				} else {
					if (symbol === null || typeof symbol == 'undefined') {
						symbol = lex();
					}
					action = table[state] && table[state][symbol];
				}
							if (typeof action === 'undefined' || !action.length || !action[0]) {
						var errStr = '';
						expected = [];
						for (p in table[state]) {
							if (this.terminals_[p] && p > TERROR) {
								expected.push('\'' + this.terminals_[p] + '\'');
							}
						}
						if (lexer.showPosition) {
							errStr = 'Parse error on line ' + (yylineno + 1) + ':\n' + lexer.showPosition() + '\nExpecting ' + expected.join(', ') + ', got \'' + (this.terminals_[symbol] || symbol) + '\'';
						} else {
							errStr = 'Parse error on line ' + (yylineno + 1) + ': Unexpected ' + (symbol == EOF ? 'end of input' : '\'' + (this.terminals_[symbol] || symbol) + '\'');
						}
						this.parseError(errStr, {
							text: lexer.match,
							token: this.terminals_[symbol] || symbol,
							line: lexer.yylineno,
							loc: yyloc,
							expected: expected
						});
					}
				if (action[0] instanceof Array && action.length > 1) {
					throw new Error('Parse Error: multiple actions possible at state: ' + state + ', token: ' + symbol);
				}
				switch (action[0]) {
				case 1:
					stack.push(symbol);
					vstack.push(lexer.yytext);
					lstack.push(lexer.yylloc);
					stack.push(action[1]);
					symbol = null;
					if (!preErrorSymbol) {
						yyleng = lexer.yyleng;
						yytext = lexer.yytext;
						yylineno = lexer.yylineno;
						yyloc = lexer.yylloc;
						if (recovering > 0) {
							recovering--;
						}
					} else {
						symbol = preErrorSymbol;
						preErrorSymbol = null;
					}
					break;
				case 2:
					len = this.productions_[action[1]][1];
					yyval.$ = vstack[vstack.length - len];
					yyval._$ = {
						first_line: lstack[lstack.length - (len || 1)].first_line,
						last_line: lstack[lstack.length - 1].last_line,
						first_column: lstack[lstack.length - (len || 1)].first_column,
						last_column: lstack[lstack.length - 1].last_column
					};
					if (ranges) {
						yyval._$.range = [
							lstack[lstack.length - (len || 1)].range[0],
							lstack[lstack.length - 1].range[1]
						];
					}
					r = this.performAction.apply(yyval, [
						yytext,
						yyleng,
						yylineno,
						sharedState.yy,
						action[1],
						vstack,
						lstack
					].concat(args));
					if (typeof r !== 'undefined') {
						return r;
					}
					if (len) {
						stack = stack.slice(0, -1 * len * 2);
						vstack = vstack.slice(0, -1 * len);
						lstack = lstack.slice(0, -1 * len);
					}
					stack.push(this.productions_[action[1]][0]);
					vstack.push(yyval.$);
					lstack.push(yyval._$);
					newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
					stack.push(newState);
					break;
				case 3:
					return true;
				}
			}
			return true;
		}};

		function Parser () {
			this.yy = {};
		}
		Parser.prototype = parser;parser.Parser = Parser;
		return new Parser;
		})();

		/*BT-
		if (typeof require !== 'undefined' && typeof exports !== 'undefined') {
		*/
		exports.parser = parser;
		exports.Parser = parser.Parser;
		exports.parse = function () { return parser.parse.apply(parser, arguments); };
		/*BT-
		exports.main = function() {};
		if (typeof module !== 'undefined' && require.main === module) {
			exports.main(process.argv.slice(1));
		}
		}
		*/

		return exports;
	};
	//#endregion

	//#region URL: /scope
	modules['/scope'] = function() {
		var exports = {};
		// The **Scope** class regulates lexical scoping within CoffeeScript. As you
		// generate code, you create a tree of scopes in the same shape as the nested
		// function bodies. Each scope knows about the variables declared within it,
		// and has a reference to its parent enclosing scope. In this way, we know which
		// variables are new and need to be declared with `var`, and which are shared
		// with external scopes.
		var Scope,
			indexOf = [].indexOf;

		exports.Scope = Scope = class Scope {
			// Initialize a scope with its parent, for lookups up the chain,
			// as well as a reference to the **Block** node it belongs to, which is
			// where it should declare its variables, a reference to the function that
			// it belongs to, and a list of variables referenced in the source code
			// and therefore should be avoided when generating variables. Also track comments
			// that should be output as part of variable declarations.
			constructor(parent, expressions, method, referencedVars) {
				var ref, ref1;
				this.parent = parent;
				this.expressions = expressions;
				this.method = method;
				this.referencedVars = referencedVars;
				this.variables = [
					{
						name: 'arguments',
						type: 'arguments'
					}
				];
				this.comments = {};
				this.positions = {};
				if (!this.parent) {
					this.utilities = {};
				}
				// The `@root` is the top-level **Scope** object for a given file.
				this.root = (ref = (ref1 = this.parent) != null ? ref1.root : void 0) != null ? ref : this;
			}

			// Adds a new variable or overrides an existing one.
			add(name, type, immediate) {
				if (this.shared && !immediate) {
					return this.parent.add(name, type, immediate);
				}
				if (Object.prototype.hasOwnProperty.call(this.positions, name)) {
					return this.variables[this.positions[name]].type = type;
				} else {
					return this.positions[name] = this.variables.push({name, type}) - 1;
				}
			}

			// When `super` is called, we need to find the name of the current method we're
			// in, so that we know how to invoke the same method of the parent class. This
			// can get complicated if super is being called from an inner function.
			// `namedMethod` will walk up the scope tree until it either finds the first
			// function object that has a name filled in, or bottoms out.
			namedMethod() {
				var ref;
				if (((ref = this.method) != null ? ref.name : void 0) || !this.parent) {
					return this.method;
				}
				return this.parent.namedMethod();
			}

			// Look up a variable name in lexical scope, and declare it if it does not
			// already exist.
			find(name, type = 'var') {
				if (this.check(name)) {
					return true;
				}
				this.add(name, type);
				return false;
			}

			// Reserve a variable name as originating from a function parameter for this
			// scope. No `var` required for internal references.
			parameter(name) {
				if (this.shared && this.parent.check(name, true)) {
					return;
				}
				return this.add(name, 'param');
			}

			// Just check to see if a variable has already been declared, without reserving,
			// walks up to the root scope.
			check(name) {
				var ref;
				return !!(this.type(name) || ((ref = this.parent) != null ? ref.check(name) : void 0));
			}

			// Generate a temporary variable name at the given index.
			temporary(name, index, single = false) {
				var diff, endCode, letter, newCode, num, startCode;
				if (single) {
					startCode = name.charCodeAt(0);
					endCode = 'z'.charCodeAt(0);
					diff = endCode - startCode;
					newCode = startCode + index % (diff + 1);
					letter = String.fromCharCode(newCode);
					num = Math.floor(index / (diff + 1));
					return `${letter}${num || ''}`;
				} else {
					return `${name}${index || ''}`;
				}
			}

			// Gets the type of a variable.
			type(name) {
				var i, len, ref, v;
				ref = this.variables;
				for (i = 0, len = ref.length; i < len; i++) {
					v = ref[i];
					if (v.name === name) {
						return v.type;
					}
				}
				return null;
			}

			// If we need to store an intermediate result, find an available name for a
			// compiler-generated variable. `_var`, `_var2`, and so on...
			freeVariable(name, options = {}) {
				var index, ref, temp;
				index = 0;
				while (true) {
					temp = this.temporary(name, index, options.single);
					if (!(this.check(temp) || indexOf.call(this.root.referencedVars, temp) >= 0)) {
						break;
					}
					index++;
				}
				if ((ref = options.reserve) != null ? ref : true) {
					this.add(temp, 'var', true);
				}
				return temp;
			}

			// Ensure that an assignment is made at the top of this scope
			// (or at the top-level scope, if requested).
			assign(name, value) {
				this.add(name, {
					value,
					assigned: true
				}, true);
				return this.hasAssignments = true;
			}

			// Does this scope have any declared variables?
			hasDeclarations() {
				return !!this.declaredVariables().length;
			}

			// Return the list of variables first declared in this scope.
			declaredVariables() {
				var v;
				return ((function() {
					var i, len, ref, results;
					ref = this.variables;
					results = [];
					for (i = 0, len = ref.length; i < len; i++) {
						v = ref[i];
						if (v.type === 'var') {
							results.push(v.name);
						}
					}
					return results;
				}).call(this)).sort();
			}

			// Return the list of assignments that are supposed to be made at the top
			// of this scope.
			assignedVariables() {
				var i, len, ref, results, v;
				ref = this.variables;
				results = [];
				for (i = 0, len = ref.length; i < len; i++) {
					v = ref[i];
					if (v.type.assigned) {
						results.push(`${v.name} = ${v.type.value}`);
					}
				}
				return results;
			}

		};

		return exports;
	};
	//#endregion

	//#region URL: /nodes
	modules['/nodes'] = function() {
		var exports = {};
		// `nodes.coffee` contains all of the node classes for the syntax tree. Most
		// nodes are created as the result of actions in the [grammar](grammar.html),
		// but some are created by other nodes as a method of code generation. To convert
		// the syntax tree into a string of JavaScript code, call `compile()` on the root.
		var Access, Arr, Assign, AwaitReturn, Base, Block, BooleanLiteral, CSXTag, Call, Class, Code, CodeFragment, ComputedPropertyName, Elision, ExecutableClassBody, Existence, Expansion, ExportAllDeclaration, ExportDeclaration, ExportDefaultDeclaration, ExportNamedDeclaration, ExportSpecifier, ExportSpecifierList, Extends, For, FuncGlyph, HereComment, HoistTarget, IdentifierLiteral, If, ImportClause, ImportDeclaration, ImportDefaultSpecifier, ImportNamespaceSpecifier, ImportSpecifier, ImportSpecifierList, In, Index, InfinityLiteral, JS_FORBIDDEN, LEVEL_ACCESS, LEVEL_COND, LEVEL_LIST, LEVEL_OP, LEVEL_PAREN, LEVEL_TOP, LineComment, Literal, ModuleDeclaration, ModuleSpecifier, ModuleSpecifierList, NEGATE, NO, NaNLiteral, NullLiteral, NumberLiteral, Obj, Op, Param, Parens, PassthroughLiteral, PropertyName, Range, RegexLiteral, RegexWithInterpolations, Return, SIMPLENUM, Scope, Slice, Splat, StatementLiteral, StringLiteral, StringWithInterpolations, Super, SuperCall, Switch, TAB, THIS, TaggedTemplateCall, ThisLiteral, Throw, Try, UTILITIES, UndefinedLiteral, Value, While, YES, YieldReturn, addDataToNode, attachCommentsToNode, compact, del, ends, extend, flatten, fragmentsToText, hasLineComments, indentInitial, isLiteralArguments, isLiteralThis, isUnassignable, locationDataToString, merge, moveComments, multident, shouldCacheOrIsAssignable, some, starts, throwSyntaxError, unfoldSoak, unshiftAfterComments, utility,
			indexOf = [].indexOf,
			splice = [].splice,
			slice1 = [].slice;

		Error.stackTraceLimit = 2e308;

		({Scope} = require('/scope'));

		({isUnassignable, JS_FORBIDDEN} = require('/lexer'));

		// Import the helpers we plan to use.
		({compact, flatten, extend, merge, del, starts, ends, some, addDataToNode, attachCommentsToNode, locationDataToString, throwSyntaxError} = require('/helpers'));

		// Functions required by parser.
		exports.extend = extend;

		exports.addDataToNode = addDataToNode;

		// Constant functions for nodes that don’t need customization.
		YES = function() {
			return true;
		};

		NO = function() {
			return false;
		};

		THIS = function() {
			return this;
		};

		NEGATE = function() {
			this.negated = !this.negated;
			return this;
		};

		//### CodeFragment

		// The various nodes defined below all compile to a collection of **CodeFragment** objects.
		// A CodeFragments is a block of generated code, and the location in the source file where the code
		// came from. CodeFragments can be assembled together into working code just by catting together
		// all the CodeFragments' `code` snippets, in order.
		exports.CodeFragment = CodeFragment = class CodeFragment {
			constructor(parent, code) {
				var ref1;
				this.code = `${code}`;
				this.type = (parent != null ? (ref1 = parent.constructor) != null ? ref1.name : void 0 : void 0) || 'unknown';
				this.locationData = parent != null ? parent.locationData : void 0;
				this.comments = parent != null ? parent.comments : void 0;
			}

			toString() {
				// This is only intended for debugging.
				return `${this.code}${(this.locationData ? ": " + locationDataToString(this.locationData) : '')}`;
			}

		};

		// Convert an array of CodeFragments into a string.
		fragmentsToText = function(fragments) {
			var fragment;
			return ((function() {
				var j, len1, results;
				results = [];
				for (j = 0, len1 = fragments.length; j < len1; j++) {
					fragment = fragments[j];
					results.push(fragment.code);
				}
				return results;
			})()).join('');
		};

		//### Base

		// The **Base** is the abstract base class for all nodes in the syntax tree.
		// Each subclass implements the `compileNode` method, which performs the
		// code generation for that node. To compile a node to JavaScript,
		// call `compile` on it, which wraps `compileNode` in some generic extra smarts,
		// to know when the generated code needs to be wrapped up in a closure.
		// An options hash is passed and cloned throughout, containing information about
		// the environment from higher in the tree (such as if a returned value is
		// being requested by the surrounding function), information about the current
		// scope, and indentation level.
		exports.Base = Base = (function() {
			class Base {
				compile(o, lvl) {
					return fragmentsToText(this.compileToFragments(o, lvl));
				}

				// Occasionally a node is compiled multiple times, for example to get the name
				// of a variable to add to scope tracking. When we know that a “premature”
				// compilation won’t result in comments being output, set those comments aside
				// so that they’re preserved for a later `compile` call that will result in
				// the comments being included in the output.
				compileWithoutComments(o, lvl, method = 'compile') {
					var fragments, unwrapped;
					if (this.comments) {
						this.ignoreTheseCommentsTemporarily = this.comments;
						delete this.comments;
					}
					unwrapped = this.unwrapAll();
					if (unwrapped.comments) {
						unwrapped.ignoreTheseCommentsTemporarily = unwrapped.comments;
						delete unwrapped.comments;
					}
					fragments = this[method](o, lvl);
					if (this.ignoreTheseCommentsTemporarily) {
						this.comments = this.ignoreTheseCommentsTemporarily;
						delete this.ignoreTheseCommentsTemporarily;
					}
					if (unwrapped.ignoreTheseCommentsTemporarily) {
						unwrapped.comments = unwrapped.ignoreTheseCommentsTemporarily;
						delete unwrapped.ignoreTheseCommentsTemporarily;
					}
					return fragments;
				}

				compileNodeWithoutComments(o, lvl) {
					return this.compileWithoutComments(o, lvl, 'compileNode');
				}

				// Common logic for determining whether to wrap this node in a closure before
				// compiling it, or to compile directly. We need to wrap if this node is a
				// *statement*, and it's not a *pureStatement*, and we're not at
				// the top level of a block (which would be unnecessary), and we haven't
				// already been asked to return the result (because statements know how to
				// return results).
				compileToFragments(o, lvl) {
					var fragments, node;
					o = extend({}, o);
					if (lvl) {
						o.level = lvl;
					}
					node = this.unfoldSoak(o) || this;
					node.tab = o.indent;
					fragments = o.level === LEVEL_TOP || !node.isStatement(o) ? node.compileNode(o) : node.compileClosure(o);
					this.compileCommentFragments(o, node, fragments);
					return fragments;
				}

				compileToFragmentsWithoutComments(o, lvl) {
					return this.compileWithoutComments(o, lvl, 'compileToFragments');
				}

				// Statements converted into expressions via closure-wrapping share a scope
				// object with their parent closure, to preserve the expected lexical scope.
				compileClosure(o) {
					var args, argumentsNode, func, jumpNode, meth, parts, ref1, ref2;
					if (jumpNode = this.jumps()) {
						jumpNode.error('cannot use a pure statement in an expression');
					}
					o.sharedScope = true;
					func = new Code([], Block.wrap([this]));
					args = [];
					if (this.contains((function(node) {
						return node instanceof SuperCall;
					}))) {
						func.bound = true;
					} else if ((argumentsNode = this.contains(isLiteralArguments)) || this.contains(isLiteralThis)) {
						args = [new ThisLiteral];
						if (argumentsNode) {
							meth = 'apply';
							args.push(new IdentifierLiteral('arguments'));
						} else {
							meth = 'call';
						}
						func = new Value(func, [new Access(new PropertyName(meth))]);
					}
					parts = (new Call(func, args)).compileNode(o);
					switch (false) {
						case !(func.isGenerator || ((ref1 = func.base) != null ? ref1.isGenerator : void 0)):
							parts.unshift(this.makeCode("(yield* "));
							parts.push(this.makeCode(")"));
							break;
						case !(func.isAsync || ((ref2 = func.base) != null ? ref2.isAsync : void 0)):
							parts.unshift(this.makeCode("(await "));
							parts.push(this.makeCode(")"));
					}
					return parts;
				}

				compileCommentFragments(o, node, fragments) {
					var base1, base2, comment, commentFragment, j, len1, ref1, unshiftCommentFragment;
					if (!node.comments) {
						return fragments;
					}
					// This is where comments, that are attached to nodes as a `comments`
					// property, become `CodeFragment`s. “Inline block comments,” e.g.
					// `/* */`-delimited comments that are interspersed within code on a line,
					// are added to the current `fragments` stream. All other fragments are
					// attached as properties to the nearest preceding or following fragment,
					// to remain stowaways until they get properly output in `compileComments`
					// later on.
					unshiftCommentFragment = function(commentFragment) {
						var precedingFragment;
						if (commentFragment.unshift) {
							// Find the first non-comment fragment and insert `commentFragment`
							// before it.
							return unshiftAfterComments(fragments, commentFragment);
						} else {
							if (fragments.length !== 0) {
								precedingFragment = fragments[fragments.length - 1];
								if (commentFragment.newLine && precedingFragment.code !== '' && !/\n\s*$/.test(precedingFragment.code)) {
									commentFragment.code = `\n${commentFragment.code}`;
								}
							}
							return fragments.push(commentFragment);
						}
					};
					ref1 = node.comments;
					for (j = 0, len1 = ref1.length; j < len1; j++) {
						comment = ref1[j];
						if (!(indexOf.call(this.compiledComments, comment) < 0)) {
							continue;
						}
						this.compiledComments.push(comment); // Don’t output this comment twice.
						// For block/here comments, denoted by `###`, that are inline comments
						// like `1 + ### comment ### 2`, create fragments and insert them into
						// the fragments array.
						// Otherwise attach comment fragments to their closest fragment for now,
						// so they can be inserted into the output later after all the newlines
						// have been added.
						if (comment.here) { // Block comment, delimited by `###`.
							commentFragment = new HereComment(comment).compileNode(o); // Line comment, delimited by `#`.
						} else {
							commentFragment = new LineComment(comment).compileNode(o);
						}
						if ((commentFragment.isHereComment && !commentFragment.newLine) || node.includeCommentFragments()) {
							// Inline block comments, like `1 + /* comment */ 2`, or a node whose
							// `compileToFragments` method has logic for outputting comments.
							unshiftCommentFragment(commentFragment);
						} else {
							if (fragments.length === 0) {
								fragments.push(this.makeCode(''));
							}
							if (commentFragment.unshift) {
								if ((base1 = fragments[0]).precedingComments == null) {
									base1.precedingComments = [];
								}
								fragments[0].precedingComments.push(commentFragment);
							} else {
								if ((base2 = fragments[fragments.length - 1]).followingComments == null) {
									base2.followingComments = [];
								}
								fragments[fragments.length - 1].followingComments.push(commentFragment);
							}
						}
					}
					return fragments;
				}

				// If the code generation wishes to use the result of a complex expression
				// in multiple places, ensure that the expression is only ever evaluated once,
				// by assigning it to a temporary variable. Pass a level to precompile.

				// If `level` is passed, then returns `[val, ref]`, where `val` is the compiled value, and `ref`
				// is the compiled reference. If `level` is not passed, this returns `[val, ref]` where
				// the two values are raw nodes which have not been compiled.
				cache(o, level, shouldCache) {
					var complex, ref, sub;
					complex = shouldCache != null ? shouldCache(this) : this.shouldCache();
					if (complex) {
						ref = new IdentifierLiteral(o.scope.freeVariable('ref'));
						sub = new Assign(ref, this);
						if (level) {
							return [sub.compileToFragments(o, level), [this.makeCode(ref.value)]];
						} else {
							return [sub, ref];
						}
					} else {
						ref = level ? this.compileToFragments(o, level) : this;
						return [ref, ref];
					}
				}

				// Occasionally it may be useful to make an expression behave as if it was 'hoisted', whereby the
				// result of the expression is available before its location in the source, but the expression's
				// variable scope corresponds the source position. This is used extensively to deal with executable
				// class bodies in classes.

				// Calling this method mutates the node, proxying the `compileNode` and `compileToFragments`
				// methods to store their result for later replacing the `target` node, which is returned by the
				// call.
				hoist() {
					var compileNode, compileToFragments, target;
					this.hoisted = true;
					target = new HoistTarget(this);
					compileNode = this.compileNode;
					compileToFragments = this.compileToFragments;
					this.compileNode = function(o) {
						return target.update(compileNode, o);
					};
					this.compileToFragments = function(o) {
						return target.update(compileToFragments, o);
					};
					return target;
				}

				cacheToCodeFragments(cacheValues) {
					return [fragmentsToText(cacheValues[0]), fragmentsToText(cacheValues[1])];
				}

				// Construct a node that returns the current node's result.
				// Note that this is overridden for smarter behavior for
				// many statement nodes (e.g. If, For)...
				makeReturn(res) {
					var me;
					me = this.unwrapAll();
					if (res) {
						return new Call(new Literal(`${res}.push`), [me]);
					} else {
						return new Return(me);
					}
				}

				// Does this node, or any of its children, contain a node of a certain kind?
				// Recursively traverses down the *children* nodes and returns the first one
				// that verifies `pred`. Otherwise return undefined. `contains` does not cross
				// scope boundaries.
				contains(pred) {
					var node;
					node = void 0;
					this.traverseChildren(false, function(n) {
						if (pred(n)) {
							node = n;
							return false;
						}
					});
					return node;
				}

				// Pull out the last node of a node list.
				lastNode(list) {
					if (list.length === 0) {
						return null;
					} else {
						return list[list.length - 1];
					}
				}

				// `toString` representation of the node, for inspecting the parse tree.
				// This is what `coffee --nodes` prints out.
				toString(idt = '', name = this.constructor.name) {
					var tree;
					tree = '\n' + idt + name;
					if (this.soak) {
						tree += '?';
					}
					this.eachChild(function(node) {
						return tree += node.toString(idt + TAB);
					});
					return tree;
				}

				// Passes each child to a function, breaking when the function returns `false`.
				eachChild(func) {
					var attr, child, j, k, len1, len2, ref1, ref2;
					if (!this.children) {
						return this;
					}
					ref1 = this.children;
					for (j = 0, len1 = ref1.length; j < len1; j++) {
						attr = ref1[j];
						if (this[attr]) {
							ref2 = flatten([this[attr]]);
							for (k = 0, len2 = ref2.length; k < len2; k++) {
								child = ref2[k];
								if (func(child) === false) {
									return this;
								}
							}
						}
					}
					return this;
				}

				traverseChildren(crossScope, func) {
					return this.eachChild(function(child) {
						var recur;
						recur = func(child);
						if (recur !== false) {
							return child.traverseChildren(crossScope, func);
						}
					});
				}

				// `replaceInContext` will traverse children looking for a node for which `match` returns
				// true. Once found, the matching node will be replaced by the result of calling `replacement`.
				replaceInContext(match, replacement) {
					var attr, child, children, i, j, k, len1, len2, ref1, ref2;
					if (!this.children) {
						return false;
					}
					ref1 = this.children;
					for (j = 0, len1 = ref1.length; j < len1; j++) {
						attr = ref1[j];
						if (children = this[attr]) {
							if (Array.isArray(children)) {
								for (i = k = 0, len2 = children.length; k < len2; i = ++k) {
									child = children[i];
									if (match(child)) {
										splice.apply(children, [i, i - i + 1].concat(ref2 = replacement(child, this))), ref2;
										return true;
									} else {
										if (child.replaceInContext(match, replacement)) {
											return true;
										}
									}
								}
							} else if (match(children)) {
								this[attr] = replacement(children, this);
								return true;
							} else {
								if (children.replaceInContext(match, replacement)) {
									return true;
								}
							}
						}
					}
				}

				invert() {
					return new Op('!', this);
				}

				unwrapAll() {
					var node;
					node = this;
					while (node !== (node = node.unwrap())) {
						continue;
					}
					return node;
				}

				// For this node and all descendents, set the location data to `locationData`
				// if the location data is not already set.
				updateLocationDataIfMissing(locationData) {
					if (this.locationData && !this.forceUpdateLocation) {
						return this;
					}
					delete this.forceUpdateLocation;
					this.locationData = locationData;
					return this.eachChild(function(child) {
						return child.updateLocationDataIfMissing(locationData);
					});
				}

				// Throw a SyntaxError associated with this node’s location.
				error(message) {
					return throwSyntaxError(message, this.locationData);
				}

				makeCode(code) {
					return new CodeFragment(this, code);
				}

				wrapInParentheses(fragments) {
					return [this.makeCode('('), ...fragments, this.makeCode(')')];
				}

				wrapInBraces(fragments) {
					return [this.makeCode('{'), ...fragments, this.makeCode('}')];
				}

				// `fragmentsList` is an array of arrays of fragments. Each array in fragmentsList will be
				// concatenated together, with `joinStr` added in between each, to produce a final flat array
				// of fragments.
				joinFragmentArrays(fragmentsList, joinStr) {
					var answer, fragments, i, j, len1;
					answer = [];
					for (i = j = 0, len1 = fragmentsList.length; j < len1; i = ++j) {
						fragments = fragmentsList[i];
						if (i) {
							answer.push(this.makeCode(joinStr));
						}
						answer = answer.concat(fragments);
					}
					return answer;
				}

			};

			// Default implementations of the common node properties and methods. Nodes
			// will override these with custom logic, if needed.

			// `children` are the properties to recurse into when tree walking. The
			// `children` list *is* the structure of the AST. The `parent` pointer, and
			// the pointer to the `children` are how you can traverse the tree.
			Base.prototype.children = [];

			// `isStatement` has to do with “everything is an expression”. A few things
			// can’t be expressions, such as `break`. Things that `isStatement` returns
			// `true` for are things that can’t be used as expressions. There are some
			// error messages that come from `nodes.coffee` due to statements ending up
			// in expression position.
			Base.prototype.isStatement = NO;

			// Track comments that have been compiled into fragments, to avoid outputting
			// them twice.
			Base.prototype.compiledComments = [];

			// `includeCommentFragments` lets `compileCommentFragments` know whether this node
			// has special awareness of how to handle comments within its output.
			Base.prototype.includeCommentFragments = NO;

			// `jumps` tells you if an expression, or an internal part of an expression
			// has a flow control construct (like `break`, or `continue`, or `return`,
			// or `throw`) that jumps out of the normal flow of control and can’t be
			// used as a value. This is important because things like this make no sense;
			// we have to disallow them.
			Base.prototype.jumps = NO;

			// If `node.shouldCache() is false`, it is safe to use `node` more than once.
			// Otherwise you need to store the value of `node` in a variable and output
			// that variable several times instead. Kind of like this: `5` need not be
			// cached. `returnFive()`, however, could have side effects as a result of
			// evaluating it more than once, and therefore we need to cache it. The
			// parameter is named `shouldCache` rather than `mustCache` because there are
			// also cases where we might not need to cache but where we want to, for
			// example a long expression that may well be idempotent but we want to cache
			// for brevity.
			Base.prototype.shouldCache = YES;

			Base.prototype.isChainable = NO;

			Base.prototype.isAssignable = NO;

			Base.prototype.isNumber = NO;

			Base.prototype.unwrap = THIS;

			Base.prototype.unfoldSoak = NO;

			// Is this node used to assign a certain variable?
			Base.prototype.assigns = NO;

			return Base;

		}).call(this);

		//### HoistTarget

		// A **HoistTargetNode** represents the output location in the node tree for a hoisted node.
		// See Base#hoist.
		exports.HoistTarget = HoistTarget = class HoistTarget extends Base {
			// Expands hoisted fragments in the given array
			static expand(fragments) {
				var fragment, i, j, ref1;
				for (i = j = fragments.length - 1; j >= 0; i = j += -1) {
					fragment = fragments[i];
					if (fragment.fragments) {
						splice.apply(fragments, [i, i - i + 1].concat(ref1 = this.expand(fragment.fragments))), ref1;
					}
				}
				return fragments;
			}

			constructor(source1) {
				super();
				this.source = source1;
				// Holds presentational options to apply when the source node is compiled.
				this.options = {};
				// Placeholder fragments to be replaced by the source node’s compilation.
				this.targetFragments = {
					fragments: []
				};
			}

			isStatement(o) {
				return this.source.isStatement(o);
			}

			// Update the target fragments with the result of compiling the source.
			// Calls the given compile function with the node and options (overriden with the target
			// presentational options).
			update(compile, o) {
				return this.targetFragments.fragments = compile.call(this.source, merge(o, this.options));
			}

			// Copies the target indent and level, and returns the placeholder fragments
			compileToFragments(o, level) {
				this.options.indent = o.indent;
				this.options.level = level != null ? level : o.level;
				return [this.targetFragments];
			}

			compileNode(o) {
				return this.compileToFragments(o);
			}

			compileClosure(o) {
				return this.compileToFragments(o);
			}

		};

		//### Block

		// The block is the list of expressions that forms the body of an
		// indented block of code -- the implementation of a function, a clause in an
		// `if`, `switch`, or `try`, and so on...
		exports.Block = Block = (function() {
			class Block extends Base {
				constructor(nodes) {
					super();
					this.expressions = compact(flatten(nodes || []));
				}

				// Tack an expression on to the end of this expression list.
				push(node) {
					this.expressions.push(node);
					return this;
				}

				// Remove and return the last expression of this expression list.
				pop() {
					return this.expressions.pop();
				}

				// Add an expression at the beginning of this expression list.
				unshift(node) {
					this.expressions.unshift(node);
					return this;
				}

				// If this Block consists of just a single node, unwrap it by pulling
				// it back out.
				unwrap() {
					if (this.expressions.length === 1) {
						return this.expressions[0];
					} else {
						return this;
					}
				}

				// Is this an empty block of code?
				isEmpty() {
					return !this.expressions.length;
				}

				isStatement(o) {
					var exp, j, len1, ref1;
					ref1 = this.expressions;
					for (j = 0, len1 = ref1.length; j < len1; j++) {
						exp = ref1[j];
						if (exp.isStatement(o)) {
							return true;
						}
					}
					return false;
				}

				jumps(o) {
					var exp, j, jumpNode, len1, ref1;
					ref1 = this.expressions;
					for (j = 0, len1 = ref1.length; j < len1; j++) {
						exp = ref1[j];
						if (jumpNode = exp.jumps(o)) {
							return jumpNode;
						}
					}
				}

				// A Block node does not return its entire body, rather it
				// ensures that the final expression is returned.
				makeReturn(res) {
					var expr, expressions, last, lastExp, len, penult, ref1;
					len = this.expressions.length;
					ref1 = this.expressions, [lastExp] = slice1.call(ref1, -1);
					lastExp = (lastExp != null ? lastExp.unwrap() : void 0) || false;
					// We also need to check that we’re not returning a CSX tag if there’s an
					// adjacent one at the same level; JSX doesn’t allow that.
					if (lastExp && lastExp instanceof Parens && lastExp.body.expressions.length > 1) {
						({
							body: {expressions}
						} = lastExp);
						[penult, last] = slice1.call(expressions, -2);
						penult = penult.unwrap();
						last = last.unwrap();
						if (penult instanceof Call && penult.csx && last instanceof Call && last.csx) {
							expressions[expressions.length - 1].error('Adjacent JSX elements must be wrapped in an enclosing tag');
						}
					}
					while (len--) {
						expr = this.expressions[len];
						this.expressions[len] = expr.makeReturn(res);
						if (expr instanceof Return && !expr.expression) {
							this.expressions.splice(len, 1);
						}
						break;
					}
					return this;
				}

				// A **Block** is the only node that can serve as the root.
				compileToFragments(o = {}, level) {
					if (o.scope) {
						return super.compileToFragments(o, level);
					} else {
						return this.compileRoot(o);
					}
				}

				// Compile all expressions within the **Block** body. If we need to return
				// the result, and it’s an expression, simply return it. If it’s a statement,
				// ask the statement to do so.
				compileNode(o) {
					var answer, compiledNodes, fragments, index, j, lastFragment, len1, node, ref1, top;
					this.tab = o.indent;
					top = o.level === LEVEL_TOP;
					compiledNodes = [];
					ref1 = this.expressions;
					for (index = j = 0, len1 = ref1.length; j < len1; index = ++j) {
						node = ref1[index];
						if (node.hoisted) {
							// This is a hoisted expression.
							// We want to compile this and ignore the result.
							node.compileToFragments(o);
							continue;
						}
						node = node.unfoldSoak(o) || node;
						if (node instanceof Block) {
							// This is a nested block. We don’t do anything special here like
							// enclose it in a new scope; we just compile the statements in this
							// block along with our own.
							compiledNodes.push(node.compileNode(o));
						} else if (top) {
							node.front = true;
							fragments = node.compileToFragments(o);
							if (!node.isStatement(o)) {
								fragments = indentInitial(fragments, this);
								[lastFragment] = slice1.call(fragments, -1);
								if (!(lastFragment.code === '' || lastFragment.isComment)) {
									fragments.push(this.makeCode(';'));
								}
							}
							compiledNodes.push(fragments);
						} else {
							compiledNodes.push(node.compileToFragments(o, LEVEL_LIST));
						}
					}
					if (top) {
						if (this.spaced) {
							return [].concat(this.joinFragmentArrays(compiledNodes, '\n\n'), this.makeCode('\n'));
						} else {
							return this.joinFragmentArrays(compiledNodes, '\n');
						}
					}
					if (compiledNodes.length) {
						answer = this.joinFragmentArrays(compiledNodes, ', ');
					} else {
						answer = [this.makeCode('void 0')];
					}
					if (compiledNodes.length > 1 && o.level >= LEVEL_LIST) {
						return this.wrapInParentheses(answer);
					} else {
						return answer;
					}
				}

				// If we happen to be the top-level **Block**, wrap everything in a safety
				// closure, unless requested not to. It would be better not to generate them
				// in the first place, but for now, clean up obvious double-parentheses.
				compileRoot(o) {
					var fragments, j, len1, name, ref1, ref2;
					o.indent = o.bare ? '' : TAB;
					o.level = LEVEL_TOP;
					this.spaced = true;
					o.scope = new Scope(null, this, null, (ref1 = o.referencedVars) != null ? ref1 : []);
					ref2 = o.locals || [];
					for (j = 0, len1 = ref2.length; j < len1; j++) {
						name = ref2[j];
						// Mark given local variables in the root scope as parameters so they don’t
						// end up being declared on this block.
						o.scope.parameter(name);
					}
					fragments = this.compileWithDeclarations(o);
					HoistTarget.expand(fragments);
					fragments = this.compileComments(fragments);
					if (o.bare) {
						return fragments;
					}
					return [].concat(this.makeCode("(function() {\n"), fragments, this.makeCode("\n}).call(this);\n"));
				}

				// Compile the expressions body for the contents of a function, with
				// declarations of all inner variables pushed up to the top.
				compileWithDeclarations(o) {
					var assigns, declaredVariable, declaredVariables, declaredVariablesIndex, declars, exp, fragments, i, j, k, len1, len2, post, ref1, rest, scope, spaced;
					fragments = [];
					post = [];
					ref1 = this.expressions;
					for (i = j = 0, len1 = ref1.length; j < len1; i = ++j) {
						exp = ref1[i];
						exp = exp.unwrap();
						if (!(exp instanceof Literal)) {
							break;
						}
					}
					o = merge(o, {
						level: LEVEL_TOP
					});
					if (i) {
						rest = this.expressions.splice(i, 9e9);
						[spaced, this.spaced] = [this.spaced, false];
						[fragments, this.spaced] = [this.compileNode(o), spaced];
						this.expressions = rest;
					}
					post = this.compileNode(o);
					({scope} = o);
					if (scope.expressions === this) {
						declars = o.scope.hasDeclarations();
						assigns = scope.hasAssignments;
						if (declars || assigns) {
							if (i) {
								fragments.push(this.makeCode('\n'));
							}
							fragments.push(this.makeCode(`${this.tab}var `));
							if (declars) {
								declaredVariables = scope.declaredVariables();
								for (declaredVariablesIndex = k = 0, len2 = declaredVariables.length; k < len2; declaredVariablesIndex = ++k) {
									declaredVariable = declaredVariables[declaredVariablesIndex];
									fragments.push(this.makeCode(declaredVariable));
									if (Object.prototype.hasOwnProperty.call(o.scope.comments, declaredVariable)) {
										fragments.push(...o.scope.comments[declaredVariable]);
									}
									if (declaredVariablesIndex !== declaredVariables.length - 1) {
										fragments.push(this.makeCode(', '));
									}
								}
							}
							if (assigns) {
								if (declars) {
									fragments.push(this.makeCode(`,\n${this.tab + TAB}`));
								}
								fragments.push(this.makeCode(scope.assignedVariables().join(`,\n${this.tab + TAB}`)));
							}
							fragments.push(this.makeCode(`;\n${(this.spaced ? '\n' : '')}`));
						} else if (fragments.length && post.length) {
							fragments.push(this.makeCode("\n"));
						}
					}
					return fragments.concat(post);
				}

				compileComments(fragments) {
					var code, commentFragment, fragment, fragmentIndent, fragmentIndex, indent, j, k, l, len1, len2, len3, newLineIndex, onNextLine, p, pastFragment, pastFragmentIndex, q, ref1, ref2, ref3, ref4, trail, upcomingFragment, upcomingFragmentIndex;
					for (fragmentIndex = j = 0, len1 = fragments.length; j < len1; fragmentIndex = ++j) {
						fragment = fragments[fragmentIndex];
						// Insert comments into the output at the next or previous newline.
						// If there are no newlines at which to place comments, create them.
						if (fragment.precedingComments) {
							// Determine the indentation level of the fragment that we are about
							// to insert comments before, and use that indentation level for our
							// inserted comments. At this point, the fragments’ `code` property
							// is the generated output JavaScript, and CoffeeScript always
							// generates output indented by two spaces; so all we need to do is
							// search for a `code` property that begins with at least two spaces.
							fragmentIndent = '';
							ref1 = fragments.slice(0, (fragmentIndex + 1));
							for (k = ref1.length - 1; k >= 0; k += -1) {
								pastFragment = ref1[k];
								indent = /^ {2,}/m.exec(pastFragment.code);
								if (indent) {
									fragmentIndent = indent[0];
									break;
								} else if (indexOf.call(pastFragment.code, '\n') >= 0) {
									break;
								}
							}
							code = `\n${fragmentIndent}` + ((function() {
								var l, len2, ref2, results;
								ref2 = fragment.precedingComments;
								results = [];
								for (l = 0, len2 = ref2.length; l < len2; l++) {
									commentFragment = ref2[l];
									if (commentFragment.isHereComment && commentFragment.multiline) {
										results.push(multident(commentFragment.code, fragmentIndent, false));
									} else {
										results.push(commentFragment.code);
									}
								}
								return results;
							})()).join(`\n${fragmentIndent}`).replace(/^(\s*)$/gm, '');
							ref2 = fragments.slice(0, (fragmentIndex + 1));
							for (pastFragmentIndex = l = ref2.length - 1; l >= 0; pastFragmentIndex = l += -1) {
								pastFragment = ref2[pastFragmentIndex];
								newLineIndex = pastFragment.code.lastIndexOf('\n');
								if (newLineIndex === -1) {
									// Keep searching previous fragments until we can’t go back any
									// further, either because there are no fragments left or we’ve
									// discovered that we’re in a code block that is interpolated
									// inside a string.
									if (pastFragmentIndex === 0) {
										pastFragment.code = '\n' + pastFragment.code;
										newLineIndex = 0;
									} else if (pastFragment.isStringWithInterpolations && pastFragment.code === '{') {
										code = code.slice(1) + '\n'; // Move newline to end.
										newLineIndex = 1;
									} else {
										continue;
									}
								}
								delete fragment.precedingComments;
								pastFragment.code = pastFragment.code.slice(0, newLineIndex) + code + pastFragment.code.slice(newLineIndex);
								break;
							}
						}
						// Yes, this is awfully similar to the previous `if` block, but if you
						// look closely you’ll find lots of tiny differences that make this
						// confusing if it were abstracted into a function that both blocks share.
						if (fragment.followingComments) {
							// Does the first trailing comment follow at the end of a line of code,
							// like `; // Comment`, or does it start a new line after a line of code?
							trail = fragment.followingComments[0].trail;
							fragmentIndent = '';
							// Find the indent of the next line of code, if we have any non-trailing
							// comments to output. We need to first find the next newline, as these
							// comments will be output after that; and then the indent of the line
							// that follows the next newline.
							if (!(trail && fragment.followingComments.length === 1)) {
								onNextLine = false;
								ref3 = fragments.slice(fragmentIndex);
								for (p = 0, len2 = ref3.length; p < len2; p++) {
									upcomingFragment = ref3[p];
									if (!onNextLine) {
										if (indexOf.call(upcomingFragment.code, '\n') >= 0) {
											onNextLine = true;
										} else {
											continue;
										}
									} else {
										indent = /^ {2,}/m.exec(upcomingFragment.code);
										if (indent) {
											fragmentIndent = indent[0];
											break;
										} else if (indexOf.call(upcomingFragment.code, '\n') >= 0) {
											break;
										}
									}
								}
							}
							// Is this comment following the indent inserted by bare mode?
							// If so, there’s no need to indent this further.
							code = fragmentIndex === 1 && /^\s+$/.test(fragments[0].code) ? '' : trail ? ' ' : `\n${fragmentIndent}`;
							// Assemble properly indented comments.
							code += ((function() {
								var len3, q, ref4, results;
								ref4 = fragment.followingComments;
								results = [];
								for (q = 0, len3 = ref4.length; q < len3; q++) {
									commentFragment = ref4[q];
									if (commentFragment.isHereComment && commentFragment.multiline) {
										results.push(multident(commentFragment.code, fragmentIndent, false));
									} else {
										results.push(commentFragment.code);
									}
								}
								return results;
							})()).join(`\n${fragmentIndent}`).replace(/^(\s*)$/gm, '');
							ref4 = fragments.slice(fragmentIndex);
							for (upcomingFragmentIndex = q = 0, len3 = ref4.length; q < len3; upcomingFragmentIndex = ++q) {
								upcomingFragment = ref4[upcomingFragmentIndex];
								newLineIndex = upcomingFragment.code.indexOf('\n');
								if (newLineIndex === -1) {
									// Keep searching upcoming fragments until we can’t go any
									// further, either because there are no fragments left or we’ve
									// discovered that we’re in a code block that is interpolated
									// inside a string.
									if (upcomingFragmentIndex === fragments.length - 1) {
										upcomingFragment.code = upcomingFragment.code + '\n';
										newLineIndex = upcomingFragment.code.length;
									} else if (upcomingFragment.isStringWithInterpolations && upcomingFragment.code === '}') {
										code = `${code}\n`;
										newLineIndex = 0;
									} else {
										continue;
									}
								}
								delete fragment.followingComments;
								if (upcomingFragment.code === '\n') {
									// Avoid inserting extra blank lines.
									code = code.replace(/^\n/, '');
								}
								upcomingFragment.code = upcomingFragment.code.slice(0, newLineIndex) + code + upcomingFragment.code.slice(newLineIndex);
								break;
							}
						}
					}
					return fragments;
				}

				// Wrap up the given nodes as a **Block**, unless it already happens
				// to be one.
				static wrap(nodes) {
					if (nodes.length === 1 && nodes[0] instanceof Block) {
						return nodes[0];
					}
					return new Block(nodes);
				}

			};

			Block.prototype.children = ['expressions'];

			return Block;

		}).call(this);

		//### Literal

		// `Literal` is a base class for static values that can be passed through
		// directly into JavaScript without translation, such as: strings, numbers,
		// `true`, `false`, `null`...
		exports.Literal = Literal = (function() {
			class Literal extends Base {
				constructor(value1) {
					super();
					this.value = value1;
				}

				assigns(name) {
					return name === this.value;
				}

				compileNode(o) {
					return [this.makeCode(this.value)];
				}

				toString() {
					// This is only intended for debugging.
					return ` ${(this.isStatement() ? super.toString() : this.constructor.name)}: ${this.value}`;
				}

			};

			Literal.prototype.shouldCache = NO;

			return Literal;

		}).call(this);

		exports.NumberLiteral = NumberLiteral = class NumberLiteral extends Literal {};

		exports.InfinityLiteral = InfinityLiteral = class InfinityLiteral extends NumberLiteral {
			compileNode() {
				return [this.makeCode('2e308')];
			}

		};

		exports.NaNLiteral = NaNLiteral = class NaNLiteral extends NumberLiteral {
			constructor() {
				super('NaN');
			}

			compileNode(o) {
				var code;
				code = [this.makeCode('0/0')];
				if (o.level >= LEVEL_OP) {
					return this.wrapInParentheses(code);
				} else {
					return code;
				}
			}

		};

		exports.StringLiteral = StringLiteral = class StringLiteral extends Literal {
			compileNode(o) {
				var res;
				return res = this.csx ? [this.makeCode(this.unquote(true, true))] : super.compileNode();
			}

			unquote(doubleQuote = false, newLine = false) {
				var unquoted;
				unquoted = this.value.slice(1, -1);
				if (doubleQuote) {
					unquoted = unquoted.replace(/\\"/g, '"');
				}
				if (newLine) {
					unquoted = unquoted.replace(/\\n/g, '\n');
				}
				return unquoted;
			}

		};

		exports.RegexLiteral = RegexLiteral = class RegexLiteral extends Literal {};

		exports.PassthroughLiteral = PassthroughLiteral = class PassthroughLiteral extends Literal {};

		exports.IdentifierLiteral = IdentifierLiteral = (function() {
			class IdentifierLiteral extends Literal {
				eachName(iterator) {
					return iterator(this);
				}

			};

			IdentifierLiteral.prototype.isAssignable = YES;

			return IdentifierLiteral;

		}).call(this);

		exports.CSXTag = CSXTag = class CSXTag extends IdentifierLiteral {};

		exports.PropertyName = PropertyName = (function() {
			class PropertyName extends Literal {};

			PropertyName.prototype.isAssignable = YES;

			return PropertyName;

		}).call(this);

		exports.ComputedPropertyName = ComputedPropertyName = class ComputedPropertyName extends PropertyName {
			compileNode(o) {
				return [this.makeCode('['), ...this.value.compileToFragments(o, LEVEL_LIST), this.makeCode(']')];
			}

		};

		exports.StatementLiteral = StatementLiteral = (function() {
			class StatementLiteral extends Literal {
				jumps(o) {
					if (this.value === 'break' && !((o != null ? o.loop : void 0) || (o != null ? o.block : void 0))) {
						return this;
					}
					if (this.value === 'continue' && !(o != null ? o.loop : void 0)) {
						return this;
					}
				}

				compileNode(o) {
					return [this.makeCode(`${this.tab}${this.value};`)];
				}

			};

			StatementLiteral.prototype.isStatement = YES;

			StatementLiteral.prototype.makeReturn = THIS;

			return StatementLiteral;

		}).call(this);

		exports.ThisLiteral = ThisLiteral = class ThisLiteral extends Literal {
			constructor() {
				super('this');
			}

			compileNode(o) {
				var code, ref1;
				code = ((ref1 = o.scope.method) != null ? ref1.bound : void 0) ? o.scope.method.context : this.value;
				return [this.makeCode(code)];
			}

		};

		exports.UndefinedLiteral = UndefinedLiteral = class UndefinedLiteral extends Literal {
			constructor() {
				super('undefined');
			}

			compileNode(o) {
				return [this.makeCode(o.level >= LEVEL_ACCESS ? '(void 0)' : 'void 0')];
			}

		};

		exports.NullLiteral = NullLiteral = class NullLiteral extends Literal {
			constructor() {
				super('null');
			}

		};

		exports.BooleanLiteral = BooleanLiteral = class BooleanLiteral extends Literal {};

		//### Return

		// A `return` is a *pureStatement*—wrapping it in a closure wouldn’t make sense.
		exports.Return = Return = (function() {
			class Return extends Base {
				constructor(expression1) {
					super();
					this.expression = expression1;
				}

				compileToFragments(o, level) {
					var expr, ref1;
					expr = (ref1 = this.expression) != null ? ref1.makeReturn() : void 0;
					if (expr && !(expr instanceof Return)) {
						return expr.compileToFragments(o, level);
					} else {
						return super.compileToFragments(o, level);
					}
				}

				compileNode(o) {
					var answer, fragment, j, len1;
					answer = [];
					// TODO: If we call `expression.compile()` here twice, we’ll sometimes
					// get back different results!
					if (this.expression) {
						answer = this.expression.compileToFragments(o, LEVEL_PAREN);
						unshiftAfterComments(answer, this.makeCode(`${this.tab}return `));
						// Since the `return` got indented by `@tab`, preceding comments that are
						// multiline need to be indented.
						for (j = 0, len1 = answer.length; j < len1; j++) {
							fragment = answer[j];
							if (fragment.isHereComment && indexOf.call(fragment.code, '\n') >= 0) {
								fragment.code = multident(fragment.code, this.tab);
							} else if (fragment.isLineComment) {
								fragment.code = `${this.tab}${fragment.code}`;
							} else {
								break;
							}
						}
					} else {
						answer.push(this.makeCode(`${this.tab}return`));
					}
					answer.push(this.makeCode(';'));
					return answer;
				}

			};

			Return.prototype.children = ['expression'];

			Return.prototype.isStatement = YES;

			Return.prototype.makeReturn = THIS;

			Return.prototype.jumps = THIS;

			return Return;

		}).call(this);

		// `yield return` works exactly like `return`, except that it turns the function
		// into a generator.
		exports.YieldReturn = YieldReturn = class YieldReturn extends Return {
			compileNode(o) {
				if (o.scope.parent == null) {
					this.error('yield can only occur inside functions');
				}
				return super.compileNode(o);
			}

		};

		exports.AwaitReturn = AwaitReturn = class AwaitReturn extends Return {
			compileNode(o) {
				if (o.scope.parent == null) {
					this.error('await can only occur inside functions');
				}
				return super.compileNode(o);
			}

		};

		//### Value

		// A value, variable or literal or parenthesized, indexed or dotted into,
		// or vanilla.
		exports.Value = Value = (function() {
			class Value extends Base {
				constructor(base, props, tag, isDefaultValue = false) {
					var ref1, ref2;
					super();
					if (!props && base instanceof Value) {
						return base;
					}
					this.base = base;
					this.properties = props || [];
					if (tag) {
						this[tag] = true;
					}
					this.isDefaultValue = isDefaultValue;
					// If this is a `@foo =` assignment, if there are comments on `@` move them
					// to be on `foo`.
					if (((ref1 = this.base) != null ? ref1.comments : void 0) && this.base instanceof ThisLiteral && (((ref2 = this.properties[0]) != null ? ref2.name : void 0) != null)) {
						moveComments(this.base, this.properties[0].name);
					}
				}

				// Add a property (or *properties* ) `Access` to the list.
				add(props) {
					this.properties = this.properties.concat(props);
					this.forceUpdateLocation = true;
					return this;
				}

				hasProperties() {
					return this.properties.length !== 0;
				}

				bareLiteral(type) {
					return !this.properties.length && this.base instanceof type;
				}

				// Some boolean checks for the benefit of other nodes.
				isArray() {
					return this.bareLiteral(Arr);
				}

				isRange() {
					return this.bareLiteral(Range);
				}

				shouldCache() {
					return this.hasProperties() || this.base.shouldCache();
				}

				isAssignable() {
					return this.hasProperties() || this.base.isAssignable();
				}

				isNumber() {
					return this.bareLiteral(NumberLiteral);
				}

				isString() {
					return this.bareLiteral(StringLiteral);
				}

				isRegex() {
					return this.bareLiteral(RegexLiteral);
				}

				isUndefined() {
					return this.bareLiteral(UndefinedLiteral);
				}

				isNull() {
					return this.bareLiteral(NullLiteral);
				}

				isBoolean() {
					return this.bareLiteral(BooleanLiteral);
				}

				isAtomic() {
					var j, len1, node, ref1;
					ref1 = this.properties.concat(this.base);
					for (j = 0, len1 = ref1.length; j < len1; j++) {
						node = ref1[j];
						if (node.soak || node instanceof Call) {
							return false;
						}
					}
					return true;
				}

				isNotCallable() {
					return this.isNumber() || this.isString() || this.isRegex() || this.isArray() || this.isRange() || this.isSplice() || this.isObject() || this.isUndefined() || this.isNull() || this.isBoolean();
				}

				isStatement(o) {
					return !this.properties.length && this.base.isStatement(o);
				}

				assigns(name) {
					return !this.properties.length && this.base.assigns(name);
				}

				jumps(o) {
					return !this.properties.length && this.base.jumps(o);
				}

				isObject(onlyGenerated) {
					if (this.properties.length) {
						return false;
					}
					return (this.base instanceof Obj) && (!onlyGenerated || this.base.generated);
				}

				isElision() {
					if (!(this.base instanceof Arr)) {
						return false;
					}
					return this.base.hasElision();
				}

				isSplice() {
					var lastProp, ref1;
					ref1 = this.properties, [lastProp] = slice1.call(ref1, -1);
					return lastProp instanceof Slice;
				}

				looksStatic(className) {
					var ref1;
					return (this.this || this.base instanceof ThisLiteral || this.base.value === className) && this.properties.length === 1 && ((ref1 = this.properties[0].name) != null ? ref1.value : void 0) !== 'prototype';
				}

				// The value can be unwrapped as its inner node, if there are no attached
				// properties.
				unwrap() {
					if (this.properties.length) {
						return this;
					} else {
						return this.base;
					}
				}

				// A reference has base part (`this` value) and name part.
				// We cache them separately for compiling complex expressions.
				// `a()[b()] ?= c` -> `(_base = a())[_name = b()] ? _base[_name] = c`
				cacheReference(o) {
					var base, bref, name, nref, ref1;
					ref1 = this.properties, [name] = slice1.call(ref1, -1);
					if (this.properties.length < 2 && !this.base.shouldCache() && !(name != null ? name.shouldCache() : void 0)) {
						return [this, this]; // `a` `a.b`
					}
					base = new Value(this.base, this.properties.slice(0, -1));
					if (base.shouldCache()) { // `a().b`
						bref = new IdentifierLiteral(o.scope.freeVariable('base'));
						base = new Value(new Parens(new Assign(bref, base)));
					}
					if (!name) { // `a()`
						return [base, bref];
					}
					if (name.shouldCache()) { // `a[b()]`
						nref = new IdentifierLiteral(o.scope.freeVariable('name'));
						name = new Index(new Assign(nref, name.index));
						nref = new Index(nref);
					}
					return [base.add(name), new Value(bref || base.base, [nref || name])];
				}

				// We compile a value to JavaScript by compiling and joining each property.
				// Things get much more interesting if the chain of properties has *soak*
				// operators `?.` interspersed. Then we have to take care not to accidentally
				// evaluate anything twice when building the soak chain.
				compileNode(o) {
					var fragments, j, len1, prop, props;
					this.base.front = this.front;
					props = this.properties;
					if (props.length && (this.base.cached != null)) {
						// Cached fragments enable correct order of the compilation,
						// and reuse of variables in the scope.
						// Example:
						// `a(x = 5).b(-> x = 6)` should compile in the same order as
						// `a(x = 5); b(-> x = 6)`
						// (see issue #4437, https://github.com/jashkenas/coffeescript/issues/4437)
						fragments = this.base.cached;
					} else {
						fragments = this.base.compileToFragments(o, (props.length ? LEVEL_ACCESS : null));
					}
					if (props.length && SIMPLENUM.test(fragmentsToText(fragments))) {
						fragments.push(this.makeCode('.'));
					}
					for (j = 0, len1 = props.length; j < len1; j++) {
						prop = props[j];
						fragments.push(...(prop.compileToFragments(o)));
					}
					return fragments;
				}

				// Unfold a soak into an `If`: `a?.b` -> `a.b if a?`
				unfoldSoak(o) {
					return this.unfoldedSoak != null ? this.unfoldedSoak : this.unfoldedSoak = (() => {
						var fst, i, ifn, j, len1, prop, ref, ref1, snd;
						ifn = this.base.unfoldSoak(o);
						if (ifn) {
							ifn.body.properties.push(...this.properties);
							return ifn;
						}
						ref1 = this.properties;
						for (i = j = 0, len1 = ref1.length; j < len1; i = ++j) {
							prop = ref1[i];
							if (!prop.soak) {
								continue;
							}
							prop.soak = false;
							fst = new Value(this.base, this.properties.slice(0, i));
							snd = new Value(this.base, this.properties.slice(i));
							if (fst.shouldCache()) {
								ref = new IdentifierLiteral(o.scope.freeVariable('ref'));
								fst = new Parens(new Assign(ref, fst));
								snd.base = ref;
							}
							return new If(new Existence(fst), snd, {
								soak: true
							});
						}
						return false;
					})();
				}

				eachName(iterator) {
					if (this.hasProperties()) {
						return iterator(this);
					} else if (this.base.isAssignable()) {
						return this.base.eachName(iterator);
					} else {
						return this.error('tried to assign to unassignable value');
					}
				}

			};

			Value.prototype.children = ['base', 'properties'];

			return Value;

		}).call(this);

		//### HereComment

		// Comment delimited by `###` (becoming `/* */`).
		exports.HereComment = HereComment = class HereComment extends Base {
			constructor({
					content: content1,
					newLine: newLine1,
					unshift
				}) {
				super();
				this.content = content1;
				this.newLine = newLine1;
				this.unshift = unshift;
			}

			compileNode(o) {
				var fragment, hasLeadingMarks, j, largestIndent, leadingWhitespace, len1, line, multiline, ref1;
				multiline = indexOf.call(this.content, '\n') >= 0;
				hasLeadingMarks = /\n\s*[#|\*]/.test(this.content);
				if (hasLeadingMarks) {
					this.content = this.content.replace(/^([ \t]*)#(?=\s)/gm, ' *');
				}
				// Unindent multiline comments. They will be reindented later.
				if (multiline) {
					largestIndent = '';
					ref1 = this.content.split('\n');
					for (j = 0, len1 = ref1.length; j < len1; j++) {
						line = ref1[j];
						leadingWhitespace = /^\s*/.exec(line)[0];
						if (leadingWhitespace.length > largestIndent.length) {
							largestIndent = leadingWhitespace;
						}
					}
					this.content = this.content.replace(RegExp(`^(${leadingWhitespace})`, "gm"), '');
				}
				this.content = `/*${this.content}${(hasLeadingMarks ? ' ' : '')}*/`;
				fragment = this.makeCode(this.content);
				fragment.newLine = this.newLine;
				fragment.unshift = this.unshift;
				fragment.multiline = multiline;
				// Don’t rely on `fragment.type`, which can break when the compiler is minified.
				fragment.isComment = fragment.isHereComment = true;
				return fragment;
			}

		};

		//### LineComment

		// Comment running from `#` to the end of a line (becoming `//`).
		exports.LineComment = LineComment = class LineComment extends Base {
			constructor({
					content: content1,
					newLine: newLine1,
					unshift
				}) {
				super();
				this.content = content1;
				this.newLine = newLine1;
				this.unshift = unshift;
			}

			compileNode(o) {
				var fragment;
				fragment = this.makeCode(/^\s*$/.test(this.content) ? '' : `//${this.content}`);
				fragment.newLine = this.newLine;
				fragment.unshift = this.unshift;
				fragment.trail = !this.newLine && !this.unshift;
				// Don’t rely on `fragment.type`, which can break when the compiler is minified.
				fragment.isComment = fragment.isLineComment = true;
				return fragment;
			}

		};

		//### Call

		// Node for a function invocation.
		exports.Call = Call = (function() {
			class Call extends Base {
				constructor(variable1, args1 = [], soak1, token1) {
					var ref1;
					super();
					this.variable = variable1;
					this.args = args1;
					this.soak = soak1;
					this.token = token1;
					this.isNew = false;
					if (this.variable instanceof Value && this.variable.isNotCallable()) {
						this.variable.error("literal is not a function");
					}
					this.csx = this.variable.base instanceof CSXTag;
					// `@variable` never gets output as a result of this node getting created as
					// part of `RegexWithInterpolations`, so for that case move any comments to
					// the `args` property that gets passed into `RegexWithInterpolations` via
					// the grammar.
					if (((ref1 = this.variable.base) != null ? ref1.value : void 0) === 'RegExp' && this.args.length !== 0) {
						moveComments(this.variable, this.args[0]);
					}
				}

				// When setting the location, we sometimes need to update the start location to
				// account for a newly-discovered `new` operator to the left of us. This
				// expands the range on the left, but not the right.
				updateLocationDataIfMissing(locationData) {
					var base, ref1;
					if (this.locationData && this.needsUpdatedStartLocation) {
						this.locationData.first_line = locationData.first_line;
						this.locationData.first_column = locationData.first_column;
						base = ((ref1 = this.variable) != null ? ref1.base : void 0) || this.variable;
						if (base.needsUpdatedStartLocation) {
							this.variable.locationData.first_line = locationData.first_line;
							this.variable.locationData.first_column = locationData.first_column;
							base.updateLocationDataIfMissing(locationData);
						}
						delete this.needsUpdatedStartLocation;
					}
					return super.updateLocationDataIfMissing(locationData);
				}

				// Tag this invocation as creating a new instance.
				newInstance() {
					var base, ref1;
					base = ((ref1 = this.variable) != null ? ref1.base : void 0) || this.variable;
					if (base instanceof Call && !base.isNew) {
						base.newInstance();
					} else {
						this.isNew = true;
					}
					this.needsUpdatedStartLocation = true;
					return this;
				}

				// Soaked chained invocations unfold into if/else ternary structures.
				unfoldSoak(o) {
					var call, ifn, j, left, len1, list, ref1, rite;
					if (this.soak) {
						if (this.variable instanceof Super) {
							left = new Literal(this.variable.compile(o));
							rite = new Value(left);
							if (this.variable.accessor == null) {
								this.variable.error("Unsupported reference to 'super'");
							}
						} else {
							if (ifn = unfoldSoak(o, this, 'variable')) {
								return ifn;
							}
							[left, rite] = new Value(this.variable).cacheReference(o);
						}
						rite = new Call(rite, this.args);
						rite.isNew = this.isNew;
						left = new Literal(`typeof ${left.compile(o)} === "function"`);
						return new If(left, new Value(rite), {
							soak: true
						});
					}
					call = this;
					list = [];
					while (true) {
						if (call.variable instanceof Call) {
							list.push(call);
							call = call.variable;
							continue;
						}
						if (!(call.variable instanceof Value)) {
							break;
						}
						list.push(call);
						if (!((call = call.variable.base) instanceof Call)) {
							break;
						}
					}
					ref1 = list.reverse();
					for (j = 0, len1 = ref1.length; j < len1; j++) {
						call = ref1[j];
						if (ifn) {
							if (call.variable instanceof Call) {
								call.variable = ifn;
							} else {
								call.variable.base = ifn;
							}
						}
						ifn = unfoldSoak(o, call, 'variable');
					}
					return ifn;
				}

				// Compile a vanilla function call.
				compileNode(o) {
					var arg, argCode, argIndex, cache, compiledArgs, fragments, j, len1, ref1, ref2, ref3, ref4, varAccess;
					if (this.csx) {
						return this.compileCSX(o);
					}
					if ((ref1 = this.variable) != null) {
						ref1.front = this.front;
					}
					compiledArgs = [];
					// If variable is `Accessor` fragments are cached and used later
					// in `Value::compileNode` to ensure correct order of the compilation,
					// and reuse of variables in the scope.
					// Example:
					// `a(x = 5).b(-> x = 6)` should compile in the same order as
					// `a(x = 5); b(-> x = 6)`
					// (see issue #4437, https://github.com/jashkenas/coffeescript/issues/4437)
					varAccess = ((ref2 = this.variable) != null ? (ref3 = ref2.properties) != null ? ref3[0] : void 0 : void 0) instanceof Access;
					argCode = (function() {
						var j, len1, ref4, results;
						ref4 = this.args || [];
						results = [];
						for (j = 0, len1 = ref4.length; j < len1; j++) {
							arg = ref4[j];
							if (arg instanceof Code) {
								results.push(arg);
							}
						}
						return results;
					}).call(this);
					if (argCode.length > 0 && varAccess && !this.variable.base.cached) {
						[cache] = this.variable.base.cache(o, LEVEL_ACCESS, function() {
							return false;
						});
						this.variable.base.cached = cache;
					}
					ref4 = this.args;
					for (argIndex = j = 0, len1 = ref4.length; j < len1; argIndex = ++j) {
						arg = ref4[argIndex];
						if (argIndex) {
							compiledArgs.push(this.makeCode(", "));
						}
						compiledArgs.push(...(arg.compileToFragments(o, LEVEL_LIST)));
					}
					fragments = [];
					if (this.isNew) {
						if (this.variable instanceof Super) {
							this.variable.error("Unsupported reference to 'super'");
						}
						fragments.push(this.makeCode('new '));
					}
					fragments.push(...this.variable.compileToFragments(o, LEVEL_ACCESS));
					fragments.push(this.makeCode('('), ...compiledArgs, this.makeCode(')'));
					return fragments;
				}

				compileCSX(o) {
					var attr, attrProps, attributes, content, fragments, j, len1, obj, ref1, tag;
					[attributes, content] = this.args;
					attributes.base.csx = true;
					if (content != null) {
						content.base.csx = true;
					}
					fragments = [this.makeCode('<')];
					fragments.push(...(tag = this.variable.compileToFragments(o, LEVEL_ACCESS)));
					if (attributes.base instanceof Arr) {
						ref1 = attributes.base.objects;
						for (j = 0, len1 = ref1.length; j < len1; j++) {
							obj = ref1[j];
							attr = obj.base;
							attrProps = (attr != null ? attr.properties : void 0) || [];
							// Catch invalid CSX attributes: <div {a:"b", props} {props} "value" />
							if (!(attr instanceof Obj || attr instanceof IdentifierLiteral) || (attr instanceof Obj && !attr.generated && (attrProps.length > 1 || !(attrProps[0] instanceof Splat)))) {
								obj.error("Unexpected token. Allowed CSX attributes are: id=\"val\", src={source}, {props...} or attribute.");
							}
							if (obj.base instanceof Obj) {
								obj.base.csx = true;
							}
							fragments.push(this.makeCode(' '));
							fragments.push(...obj.compileToFragments(o, LEVEL_PAREN));
						}
					}
					if (content) {
						fragments.push(this.makeCode('>'));
						fragments.push(...content.compileNode(o, LEVEL_LIST));
						fragments.push(...[this.makeCode('</'), ...tag, this.makeCode('>')]);
					} else {
						fragments.push(this.makeCode(' />'));
					}
					return fragments;
				}

			};

			Call.prototype.children = ['variable', 'args'];

			return Call;

		}).call(this);

		//### Super

		// Takes care of converting `super()` calls into calls against the prototype's
		// function of the same name.
		// When `expressions` are set the call will be compiled in such a way that the
		// expressions are evaluated without altering the return value of the `SuperCall`
		// expression.
		exports.SuperCall = SuperCall = (function() {
			class SuperCall extends Call {
				isStatement(o) {
					var ref1;
					return ((ref1 = this.expressions) != null ? ref1.length : void 0) && o.level === LEVEL_TOP;
				}

				compileNode(o) {
					var ref, ref1, replacement, superCall;
					if (!((ref1 = this.expressions) != null ? ref1.length : void 0)) {
						return super.compileNode(o);
					}
					superCall = new Literal(fragmentsToText(super.compileNode(o)));
					replacement = new Block(this.expressions.slice());
					if (o.level > LEVEL_TOP) {
						// If we might be in an expression we need to cache and return the result
						[superCall, ref] = superCall.cache(o, null, YES);
						replacement.push(ref);
					}
					replacement.unshift(superCall);
					return replacement.compileToFragments(o, o.level === LEVEL_TOP ? o.level : LEVEL_LIST);
				}

			};

			SuperCall.prototype.children = Call.prototype.children.concat(['expressions']);

			return SuperCall;

		}).call(this);

		exports.Super = Super = (function() {
			class Super extends Base {
				constructor(accessor) {
					super();
					this.accessor = accessor;
				}

				compileNode(o) {
					var fragments, method, name, nref, ref1, ref2, salvagedComments, variable;
					method = o.scope.namedMethod();
					if (!(method != null ? method.isMethod : void 0)) {
						this.error('cannot use super outside of an instance method');
					}
					if (!((method.ctor != null) || (this.accessor != null))) {
						({name, variable} = method);
						if (name.shouldCache() || (name instanceof Index && name.index.isAssignable())) {
							nref = new IdentifierLiteral(o.scope.parent.freeVariable('name'));
							name.index = new Assign(nref, name.index);
						}
						this.accessor = nref != null ? new Index(nref) : name;
					}
					if ((ref1 = this.accessor) != null ? (ref2 = ref1.name) != null ? ref2.comments : void 0 : void 0) {
						// A `super()` call gets compiled to e.g. `super.method()`, which means
						// the `method` property name gets compiled for the first time here, and
						// again when the `method:` property of the class gets compiled. Since
						// this compilation happens first, comments attached to `method:` would
						// get incorrectly output near `super.method()`, when we want them to
						// get output on the second pass when `method:` is output. So set them
						// aside during this compilation pass, and put them back on the object so
						// that they’re there for the later compilation.
						salvagedComments = this.accessor.name.comments;
						delete this.accessor.name.comments;
					}
					fragments = (new Value(new Literal('super'), this.accessor ? [this.accessor] : [])).compileToFragments(o);
					if (salvagedComments) {
						attachCommentsToNode(salvagedComments, this.accessor.name);
					}
					return fragments;
				}

			};

			Super.prototype.children = ['accessor'];

			return Super;

		}).call(this);

		//### RegexWithInterpolations

		// Regexes with interpolations are in fact just a variation of a `Call` (a
		// `RegExp()` call to be precise) with a `StringWithInterpolations` inside.
		exports.RegexWithInterpolations = RegexWithInterpolations = class RegexWithInterpolations extends Call {
			constructor(args = []) {
				super(new Value(new IdentifierLiteral('RegExp')), args, false);
			}

		};

		//### TaggedTemplateCall
		exports.TaggedTemplateCall = TaggedTemplateCall = class TaggedTemplateCall extends Call {
			constructor(variable, arg, soak) {
				if (arg instanceof StringLiteral) {
					arg = new StringWithInterpolations(Block.wrap([new Value(arg)]));
				}
				super(variable, [arg], soak);
			}

			compileNode(o) {
				return this.variable.compileToFragments(o, LEVEL_ACCESS).concat(this.args[0].compileToFragments(o, LEVEL_LIST));
			}

		};

		//### Extends

		// Node to extend an object's prototype with an ancestor object.
		// After `goog.inherits` from the
		// [Closure Library](https://github.com/google/closure-library/blob/master/closure/goog/base.js).
		exports.Extends = Extends = (function() {
			class Extends extends Base {
				constructor(child1, parent1) {
					super();
					this.child = child1;
					this.parent = parent1;
				}

				// Hooks one constructor into another's prototype chain.
				compileToFragments(o) {
					return new Call(new Value(new Literal(utility('extend', o))), [this.child, this.parent]).compileToFragments(o);
				}

			};

			Extends.prototype.children = ['child', 'parent'];

			return Extends;

		}).call(this);

		//### Access

		// A `.` access into a property of a value, or the `::` shorthand for
		// an access into the object's prototype.
		exports.Access = Access = (function() {
			class Access extends Base {
				constructor(name1, tag) {
					super();
					this.name = name1;
					this.soak = tag === 'soak';
				}

				compileToFragments(o) {
					var name, node;
					name = this.name.compileToFragments(o);
					node = this.name.unwrap();
					if (node instanceof PropertyName) {
						return [this.makeCode('.'), ...name];
					} else {
						return [this.makeCode('['), ...name, this.makeCode(']')];
					}
				}

			};

			Access.prototype.children = ['name'];

			Access.prototype.shouldCache = NO;

			return Access;

		}).call(this);

		//### Index

		// A `[ ... ]` indexed access into an array or object.
		exports.Index = Index = (function() {
			class Index extends Base {
				constructor(index1) {
					super();
					this.index = index1;
				}

				compileToFragments(o) {
					return [].concat(this.makeCode("["), this.index.compileToFragments(o, LEVEL_PAREN), this.makeCode("]"));
				}

				shouldCache() {
					return this.index.shouldCache();
				}

			};

			Index.prototype.children = ['index'];

			return Index;

		}).call(this);

		//### Range

		// A range literal. Ranges can be used to extract portions (slices) of arrays,
		// to specify a range for comprehensions, or as a value, to be expanded into the
		// corresponding array of integers at runtime.
		exports.Range = Range = (function() {
			class Range extends Base {
				constructor(from1, to1, tag) {
					super();
					this.from = from1;
					this.to = to1;
					this.exclusive = tag === 'exclusive';
					this.equals = this.exclusive ? '' : '=';
				}

				// Compiles the range's source variables -- where it starts and where it ends.
				// But only if they need to be cached to avoid double evaluation.
				compileVariables(o) {
					var shouldCache, step;
					o = merge(o, {
						top: true
					});
					shouldCache = del(o, 'shouldCache');
					[this.fromC, this.fromVar] = this.cacheToCodeFragments(this.from.cache(o, LEVEL_LIST, shouldCache));
					[this.toC, this.toVar] = this.cacheToCodeFragments(this.to.cache(o, LEVEL_LIST, shouldCache));
					if (step = del(o, 'step')) {
						[this.step, this.stepVar] = this.cacheToCodeFragments(step.cache(o, LEVEL_LIST, shouldCache));
					}
					this.fromNum = this.from.isNumber() ? Number(this.fromVar) : null;
					this.toNum = this.to.isNumber() ? Number(this.toVar) : null;
					return this.stepNum = (step != null ? step.isNumber() : void 0) ? Number(this.stepVar) : null;
				}

				// When compiled normally, the range returns the contents of the *for loop*
				// needed to iterate over the values in the range. Used by comprehensions.
				compileNode(o) {
					var cond, condPart, from, gt, idx, idxName, known, lowerBound, lt, namedIndex, ref1, ref2, stepCond, stepNotZero, stepPart, to, upperBound, varPart;
					if (!this.fromVar) {
						this.compileVariables(o);
					}
					if (!o.index) {
						return this.compileArray(o);
					}
					// Set up endpoints.
					known = (this.fromNum != null) && (this.toNum != null);
					idx = del(o, 'index');
					idxName = del(o, 'name');
					namedIndex = idxName && idxName !== idx;
					varPart = known && !namedIndex ? `var ${idx} = ${this.fromC}` : `${idx} = ${this.fromC}`;
					if (this.toC !== this.toVar) {
						varPart += `, ${this.toC}`;
					}
					if (this.step !== this.stepVar) {
						varPart += `, ${this.step}`;
					}
					[lt, gt] = [`${idx} <${this.equals}`, `${idx} >${this.equals}`];
					// Generate the condition.
					[from, to] = [this.fromNum, this.toNum];
					// Always check if the `step` isn't zero to avoid the infinite loop.
					stepNotZero = `${(ref1 = this.stepNum) != null ? ref1 : this.stepVar} !== 0`;
					stepCond = `${(ref2 = this.stepNum) != null ? ref2 : this.stepVar} > 0`;
					lowerBound = `${lt} ${(known ? to : this.toVar)}`;
					upperBound = `${gt} ${(known ? to : this.toVar)}`;
					condPart = this.step != null ? (this.stepNum != null) && this.stepNum !== 0 ? this.stepNum > 0 ? `${lowerBound}` : `${upperBound}` : `${stepNotZero} && (${stepCond} ? ${lowerBound} : ${upperBound})` : known ? `${(from <= to ? lt : gt)} ${to}` : `(${this.fromVar} <= ${this.toVar} ? ${lowerBound} : ${upperBound})`;
					cond = this.stepVar ? `${this.stepVar} > 0` : `${this.fromVar} <= ${this.toVar}`;
					// Generate the step.
					stepPart = this.stepVar ? `${idx} += ${this.stepVar}` : known ? namedIndex ? from <= to ? `++${idx}` : `--${idx}` : from <= to ? `${idx}++` : `${idx}--` : namedIndex ? `${cond} ? ++${idx} : --${idx}` : `${cond} ? ${idx}++ : ${idx}--`;
					if (namedIndex) {
						varPart = `${idxName} = ${varPart}`;
					}
					if (namedIndex) {
						stepPart = `${idxName} = ${stepPart}`;
					}
					// The final loop body.
					return [this.makeCode(`${varPart}; ${condPart}; ${stepPart}`)];
				}

				// When used as a value, expand the range into the equivalent array.
				compileArray(o) {
					var args, body, cond, hasArgs, i, idt, known, post, pre, range, ref1, ref2, result, vars;
					known = (this.fromNum != null) && (this.toNum != null);
					if (known && Math.abs(this.fromNum - this.toNum) <= 20) {
						range = (function() {
							var results = [];
							for (var j = ref1 = this.fromNum, ref2 = this.toNum; ref1 <= ref2 ? j <= ref2 : j >= ref2; ref1 <= ref2 ? j++ : j--){ results.push(j); }
							return results;
						}).apply(this);
						if (this.exclusive) {
							range.pop();
						}
						return [this.makeCode(`[${range.join(', ')}]`)];
					}
					idt = this.tab + TAB;
					i = o.scope.freeVariable('i', {
						single: true,
						reserve: false
					});
					result = o.scope.freeVariable('results', {
						reserve: false
					});
					pre = `\n${idt}var ${result} = [];`;
					if (known) {
						o.index = i;
						body = fragmentsToText(this.compileNode(o));
					} else {
						vars = `${i} = ${this.fromC}` + (this.toC !== this.toVar ? `, ${this.toC}` : '');
						cond = `${this.fromVar} <= ${this.toVar}`;
						body = `var ${vars}; ${cond} ? ${i} <${this.equals} ${this.toVar} : ${i} >${this.equals} ${this.toVar}; ${cond} ? ${i}++ : ${i}--`;
					}
					post = `{ ${result}.push(${i}); }\n${idt}return ${result};\n${o.indent}`;
					hasArgs = function(node) {
						return node != null ? node.contains(isLiteralArguments) : void 0;
					};
					if (hasArgs(this.from) || hasArgs(this.to)) {
						args = ', arguments';
					}
					return [this.makeCode(`(function() {${pre}\n${idt}for (${body})${post}}).apply(this${args != null ? args : ''})`)];
				}

			};

			Range.prototype.children = ['from', 'to'];

			return Range;

		}).call(this);

		//### Slice

		// An array slice literal. Unlike JavaScript's `Array#slice`, the second parameter
		// specifies the index of the end of the slice, just as the first parameter
		// is the index of the beginning.
		exports.Slice = Slice = (function() {
			class Slice extends Base {
				constructor(range1) {
					super();
					this.range = range1;
				}

				// We have to be careful when trying to slice through the end of the array,
				// `9e9` is used because not all implementations respect `undefined` or `1/0`.
				// `9e9` should be safe because `9e9` > `2**32`, the max array length.
				compileNode(o) {
					var compiled, compiledText, from, fromCompiled, to, toStr;
					({to, from} = this.range);
					// Handle an expression in the property access, e.g. `a[!b in c..]`.
					if (from != null ? from.shouldCache() : void 0) {
						from = new Value(new Parens(from));
					}
					if (to != null ? to.shouldCache() : void 0) {
						to = new Value(new Parens(to));
					}
					fromCompiled = (from != null ? from.compileToFragments(o, LEVEL_PAREN) : void 0) || [this.makeCode('0')];
					if (to) {
						compiled = to.compileToFragments(o, LEVEL_PAREN);
						compiledText = fragmentsToText(compiled);
						if (!(!this.range.exclusive && +compiledText === -1)) {
							toStr = ', ' + (this.range.exclusive ? compiledText : to.isNumber() ? `${+compiledText + 1}` : (compiled = to.compileToFragments(o, LEVEL_ACCESS), `+${fragmentsToText(compiled)} + 1 || 9e9`));
						}
					}
					return [this.makeCode(`.slice(${fragmentsToText(fromCompiled)}${toStr || ''})`)];
				}

			};

			Slice.prototype.children = ['range'];

			return Slice;

		}).call(this);

		//### Obj

		// An object literal, nothing fancy.
		exports.Obj = Obj = (function() {
			class Obj extends Base {
				constructor(props, generated = false, lhs1 = false) {
					super();
					this.generated = generated;
					this.lhs = lhs1;
					this.objects = this.properties = props || [];
				}

				isAssignable() {
					var j, len1, message, prop, ref1, ref2;
					ref1 = this.properties;
					for (j = 0, len1 = ref1.length; j < len1; j++) {
						prop = ref1[j];
						// Check for reserved words.
						message = isUnassignable(prop.unwrapAll().value);
						if (message) {
							prop.error(message);
						}
						if (prop instanceof Assign && prop.context === 'object' && !(((ref2 = prop.value) != null ? ref2.base : void 0) instanceof Arr)) {
							prop = prop.value;
						}
						if (!prop.isAssignable()) {
							return false;
						}
					}
					return true;
				}

				shouldCache() {
					return !this.isAssignable();
				}

				// Check if object contains splat.
				hasSplat() {
					var j, len1, prop, ref1;
					ref1 = this.properties;
					for (j = 0, len1 = ref1.length; j < len1; j++) {
						prop = ref1[j];
						if (prop instanceof Splat) {
							return true;
						}
					}
					return false;
				}

				// Move rest property to the end of the list.
				// `{a, rest..., b} = obj` -> `{a, b, rest...} = obj`
				// `foo = ({a, rest..., b}) ->` -> `foo = {a, b, rest...}) ->`
				reorderProperties() {
					var i, prop, props, splatProp, splatProps;
					props = this.properties;
					splatProps = (function() {
						var j, len1, results;
						results = [];
						for (i = j = 0, len1 = props.length; j < len1; i = ++j) {
							prop = props[i];
							if (prop instanceof Splat) {
								results.push(i);
							}
						}
						return results;
					})();
					if ((splatProps != null ? splatProps.length : void 0) > 1) {
						props[splatProps[1]].error("multiple spread elements are disallowed");
					}
					splatProp = props.splice(splatProps[0], 1);
					return this.objects = this.properties = [].concat(props, splatProp);
				}

				compileNode(o) {
					var answer, i, idt, indent, isCompact, j, join, k, key, l, lastNode, len1, len2, len3, len4, node, p, prop, props, ref1, unwrappedVal, value;
					if (this.hasSplat() && this.lhs) {
						this.reorderProperties();
					}
					props = this.properties;
					if (this.generated) {
						for (j = 0, len1 = props.length; j < len1; j++) {
							node = props[j];
							if (node instanceof Value) {
								node.error('cannot have an implicit value in an implicit object');
							}
						}
					}
					idt = o.indent += TAB;
					lastNode = this.lastNode(this.properties);
					if (this.csx) {
						// CSX attributes <div id="val" attr={aaa} {props...} />
						return this.compileCSXAttributes(o);
					}
					// If this object is the left-hand side of an assignment, all its children
					// are too.
					if (this.lhs) {
						for (k = 0, len2 = props.length; k < len2; k++) {
							prop = props[k];
							if (!(prop instanceof Assign)) {
								continue;
							}
							({value} = prop);
							unwrappedVal = value.unwrapAll();
							if (unwrappedVal instanceof Arr || unwrappedVal instanceof Obj) {
								unwrappedVal.lhs = true;
							} else if (unwrappedVal instanceof Assign) {
								unwrappedVal.nestedLhs = true;
							}
						}
					}
					isCompact = true;
					ref1 = this.properties;
					for (l = 0, len3 = ref1.length; l < len3; l++) {
						prop = ref1[l];
						if (prop instanceof Assign && prop.context === 'object') {
							isCompact = false;
						}
					}
					answer = [];
					answer.push(this.makeCode(isCompact ? '' : '\n'));
					for (i = p = 0, len4 = props.length; p < len4; i = ++p) {
						prop = props[i];
						join = i === props.length - 1 ? '' : isCompact ? ', ' : prop === lastNode ? '\n' : ',\n';
						indent = isCompact ? '' : idt;
						key = prop instanceof Assign && prop.context === 'object' ? prop.variable : prop instanceof Assign ? (!this.lhs ? prop.operatorToken.error(`unexpected ${prop.operatorToken.value}`) : void 0, prop.variable) : prop;
						if (key instanceof Value && key.hasProperties()) {
							if (prop.context === 'object' || !key.this) {
								key.error('invalid object key');
							}
							key = key.properties[0].name;
							prop = new Assign(key, prop, 'object');
						}
						if (key === prop) {
							if (prop.shouldCache()) {
								[key, value] = prop.base.cache(o);
								if (key instanceof IdentifierLiteral) {
									key = new PropertyName(key.value);
								}
								prop = new Assign(key, value, 'object');
							} else if (key instanceof Value && key.base instanceof ComputedPropertyName) {
								// `{ [foo()] }` output as `{ [ref = foo()]: ref }`.
								if (prop.base.value.shouldCache()) {
									[key, value] = prop.base.value.cache(o);
									if (key instanceof IdentifierLiteral) {
										key = new ComputedPropertyName(key.value);
									}
									prop = new Assign(key, value, 'object');
								} else {
									// `{ [expression] }` output as `{ [expression]: expression }`.
									prop = new Assign(key, prop.base.value, 'object');
								}
							} else if (!(typeof prop.bareLiteral === "function" ? prop.bareLiteral(IdentifierLiteral) : void 0) && !(prop instanceof Splat)) {
								prop = new Assign(prop, prop, 'object');
							}
						}
						if (indent) {
							answer.push(this.makeCode(indent));
						}
						answer.push(...prop.compileToFragments(o, LEVEL_TOP));
						if (join) {
							answer.push(this.makeCode(join));
						}
					}
					answer.push(this.makeCode(isCompact ? '' : `\n${this.tab}`));
					answer = this.wrapInBraces(answer);
					if (this.front) {
						return this.wrapInParentheses(answer);
					} else {
						return answer;
					}
				}

				assigns(name) {
					var j, len1, prop, ref1;
					ref1 = this.properties;
					for (j = 0, len1 = ref1.length; j < len1; j++) {
						prop = ref1[j];
						if (prop.assigns(name)) {
							return true;
						}
					}
					return false;
				}

				eachName(iterator) {
					var j, len1, prop, ref1, results;
					ref1 = this.properties;
					results = [];
					for (j = 0, len1 = ref1.length; j < len1; j++) {
						prop = ref1[j];
						if (prop instanceof Assign && prop.context === 'object') {
							prop = prop.value;
						}
						prop = prop.unwrapAll();
						if (prop.eachName != null) {
							results.push(prop.eachName(iterator));
						} else {
							results.push(void 0);
						}
					}
					return results;
				}

				compileCSXAttributes(o) {
					var answer, i, j, join, len1, prop, props;
					props = this.properties;
					answer = [];
					for (i = j = 0, len1 = props.length; j < len1; i = ++j) {
						prop = props[i];
						prop.csx = true;
						join = i === props.length - 1 ? '' : ' ';
						if (prop instanceof Splat) {
							prop = new Literal(`{${prop.compile(o)}}`);
						}
						answer.push(...prop.compileToFragments(o, LEVEL_TOP));
						answer.push(this.makeCode(join));
					}
					if (this.front) {
						return this.wrapInParentheses(answer);
					} else {
						return answer;
					}
				}

			};

			Obj.prototype.children = ['properties'];

			return Obj;

		}).call(this);

		//### Arr

		// An array literal.
		exports.Arr = Arr = (function() {
			class Arr extends Base {
				constructor(objs, lhs1 = false) {
					super();
					this.lhs = lhs1;
					this.objects = objs || [];
				}

				hasElision() {
					var j, len1, obj, ref1;
					ref1 = this.objects;
					for (j = 0, len1 = ref1.length; j < len1; j++) {
						obj = ref1[j];
						if (obj instanceof Elision) {
							return true;
						}
					}
					return false;
				}

				isAssignable() {
					var i, j, len1, obj, ref1;
					if (!this.objects.length) {
						return false;
					}
					ref1 = this.objects;
					for (i = j = 0, len1 = ref1.length; j < len1; i = ++j) {
						obj = ref1[i];
						if (obj instanceof Splat && i + 1 !== this.objects.length) {
							return false;
						}
						if (!(obj.isAssignable() && (!obj.isAtomic || obj.isAtomic()))) {
							return false;
						}
					}
					return true;
				}

				shouldCache() {
					return !this.isAssignable();
				}

				compileNode(o) {
					var answer, compiledObjs, fragment, fragmentIndex, fragmentIsElision, fragments, includesLineCommentsOnNonFirstElement, index, j, k, l, len1, len2, len3, len4, len5, obj, objIndex, olen, p, passedElision, q, ref1, unwrappedObj;
					if (!this.objects.length) {
						return [this.makeCode('[]')];
					}
					o.indent += TAB;
					fragmentIsElision = function(fragment) {
						return fragmentsToText(fragment).trim() === ',';
					};
					// Detect if `Elisions` at the beginning of the array are processed (e.g. [, , , a]).
					passedElision = false;
					answer = [];
					ref1 = this.objects;
					for (objIndex = j = 0, len1 = ref1.length; j < len1; objIndex = ++j) {
						obj = ref1[objIndex];
						unwrappedObj = obj.unwrapAll();
						// Let `compileCommentFragments` know to intersperse block comments
						// into the fragments created when compiling this array.
						if (unwrappedObj.comments && unwrappedObj.comments.filter(function(comment) {
							return !comment.here;
						}).length === 0) {
							unwrappedObj.includeCommentFragments = YES;
						}
						// If this array is the left-hand side of an assignment, all its children
						// are too.
						if (this.lhs) {
							if (unwrappedObj instanceof Arr || unwrappedObj instanceof Obj) {
								unwrappedObj.lhs = true;
							}
						}
					}
					compiledObjs = (function() {
						var k, len2, ref2, results;
						ref2 = this.objects;
						results = [];
						for (k = 0, len2 = ref2.length; k < len2; k++) {
							obj = ref2[k];
							results.push(obj.compileToFragments(o, LEVEL_LIST));
						}
						return results;
					}).call(this);
					olen = compiledObjs.length;
					// If `compiledObjs` includes newlines, we will output this as a multiline
					// array (i.e. with a newline and indentation after the `[`). If an element
					// contains line comments, that should also trigger multiline output since
					// by definition line comments will introduce newlines into our output.
					// The exception is if only the first element has line comments; in that
					// case, output as the compact form if we otherwise would have, so that the
					// first element’s line comments get output before or after the array.
					includesLineCommentsOnNonFirstElement = false;
					for (index = k = 0, len2 = compiledObjs.length; k < len2; index = ++k) {
						fragments = compiledObjs[index];
						for (l = 0, len3 = fragments.length; l < len3; l++) {
							fragment = fragments[l];
							if (fragment.isHereComment) {
								fragment.code = fragment.code.trim();
							} else if (index !== 0 && includesLineCommentsOnNonFirstElement === false && hasLineComments(fragment)) {
								includesLineCommentsOnNonFirstElement = true;
							}
						}
						// Add ', ' if all `Elisions` from the beginning of the array are processed (e.g. [, , , a]) and
						// element isn't `Elision` or last element is `Elision` (e.g. [a,,b,,])
						if (index !== 0 && passedElision && (!fragmentIsElision(fragments) || index === olen - 1)) {
							answer.push(this.makeCode(', '));
						}
						passedElision = passedElision || !fragmentIsElision(fragments);
						answer.push(...fragments);
					}
					if (includesLineCommentsOnNonFirstElement || indexOf.call(fragmentsToText(answer), '\n') >= 0) {
						for (fragmentIndex = p = 0, len4 = answer.length; p < len4; fragmentIndex = ++p) {
							fragment = answer[fragmentIndex];
							if (fragment.isHereComment) {
								fragment.code = `${multident(fragment.code, o.indent, false)}\n${o.indent}`;
							} else if (fragment.code === ', ' && !(fragment != null ? fragment.isElision : void 0)) {
								fragment.code = `,\n${o.indent}`;
							}
						}
						answer.unshift(this.makeCode(`[\n${o.indent}`));
						answer.push(this.makeCode(`\n${this.tab}]`));
					} else {
						for (q = 0, len5 = answer.length; q < len5; q++) {
							fragment = answer[q];
							if (fragment.isHereComment) {
								fragment.code = `${fragment.code} `;
							}
						}
						answer.unshift(this.makeCode('['));
						answer.push(this.makeCode(']'));
					}
					return answer;
				}

				assigns(name) {
					var j, len1, obj, ref1;
					ref1 = this.objects;
					for (j = 0, len1 = ref1.length; j < len1; j++) {
						obj = ref1[j];
						if (obj.assigns(name)) {
							return true;
						}
					}
					return false;
				}

				eachName(iterator) {
					var j, len1, obj, ref1, results;
					ref1 = this.objects;
					results = [];
					for (j = 0, len1 = ref1.length; j < len1; j++) {
						obj = ref1[j];
						obj = obj.unwrapAll();
						results.push(obj.eachName(iterator));
					}
					return results;
				}

			};

			Arr.prototype.children = ['objects'];

			return Arr;

		}).call(this);

		//### Class

		// The CoffeeScript class definition.
		// Initialize a **Class** with its name, an optional superclass, and a body.
		exports.Class = Class = (function() {
			class Class extends Base {
				constructor(variable1, parent1, body1 = new Block) {
					super();
					this.variable = variable1;
					this.parent = parent1;
					this.body = body1;
				}

				compileNode(o) {
					var executableBody, node, parentName;
					this.name = this.determineName();
					executableBody = this.walkBody();
					if (this.parent instanceof Value && !this.parent.hasProperties()) {
						// Special handling to allow `class expr.A extends A` declarations
						parentName = this.parent.base.value;
					}
					this.hasNameClash = (this.name != null) && this.name === parentName;
					node = this;
					if (executableBody || this.hasNameClash) {
						node = new ExecutableClassBody(node, executableBody);
					} else if ((this.name == null) && o.level === LEVEL_TOP) {
						// Anonymous classes are only valid in expressions
						node = new Parens(node);
					}
					if (this.boundMethods.length && this.parent) {
						if (this.variable == null) {
							this.variable = new IdentifierLiteral(o.scope.freeVariable('_class'));
						}
						if (this.variableRef == null) {
							[this.variable, this.variableRef] = this.variable.cache(o);
						}
					}
					if (this.variable) {
						node = new Assign(this.variable, node, null, {moduleDeclaration: this.moduleDeclaration});
					}
					this.compileNode = this.compileClassDeclaration;
					try {
						return node.compileToFragments(o);
					} finally {
						delete this.compileNode;
					}
				}

				compileClassDeclaration(o) {
					var ref1, ref2, result;
					if (this.externalCtor || this.boundMethods.length) {
						if (this.ctor == null) {
							this.ctor = this.makeDefaultConstructor();
						}
					}
					if ((ref1 = this.ctor) != null) {
						ref1.noReturn = true;
					}
					if (this.boundMethods.length) {
						this.proxyBoundMethods();
					}
					o.indent += TAB;
					result = [];
					result.push(this.makeCode("class "));
					if (this.name) {
						result.push(this.makeCode(this.name));
					}
					if (((ref2 = this.variable) != null ? ref2.comments : void 0) != null) {
						this.compileCommentFragments(o, this.variable, result);
					}
					if (this.name) {
						result.push(this.makeCode(' '));
					}
					if (this.parent) {
						result.push(this.makeCode('extends '), ...this.parent.compileToFragments(o), this.makeCode(' '));
					}
					result.push(this.makeCode('{'));
					if (!this.body.isEmpty()) {
						this.body.spaced = true;
						result.push(this.makeCode('\n'));
						result.push(...this.body.compileToFragments(o, LEVEL_TOP));
						result.push(this.makeCode(`\n${this.tab}`));
					}
					result.push(this.makeCode('}'));
					return result;
				}

				// Figure out the appropriate name for this class
				determineName() {
					var message, name, node, ref1, tail;
					if (!this.variable) {
						return null;
					}
					ref1 = this.variable.properties, [tail] = slice1.call(ref1, -1);
					node = tail ? tail instanceof Access && tail.name : this.variable.base;
					if (!(node instanceof IdentifierLiteral || node instanceof PropertyName)) {
						return null;
					}
					name = node.value;
					if (!tail) {
						message = isUnassignable(name);
						if (message) {
							this.variable.error(message);
						}
					}
					if (indexOf.call(JS_FORBIDDEN, name) >= 0) {
						return `_${name}`;
					} else {
						return name;
					}
				}

				walkBody() {
					var assign, end, executableBody, expression, expressions, exprs, i, initializer, initializerExpression, j, k, len1, len2, method, properties, pushSlice, ref1, start;
					this.ctor = null;
					this.boundMethods = [];
					executableBody = null;
					initializer = [];
					({expressions} = this.body);
					i = 0;
					ref1 = expressions.slice();
					for (j = 0, len1 = ref1.length; j < len1; j++) {
						expression = ref1[j];
						if (expression instanceof Value && expression.isObject(true)) {
							({properties} = expression.base);
							exprs = [];
							end = 0;
							start = 0;
							pushSlice = function() {
								if (end > start) {
									return exprs.push(new Value(new Obj(properties.slice(start, end), true)));
								}
							};
							while (assign = properties[end]) {
								if (initializerExpression = this.addInitializerExpression(assign)) {
									pushSlice();
									exprs.push(initializerExpression);
									initializer.push(initializerExpression);
									start = end + 1;
								}
								end++;
							}
							pushSlice();
							splice.apply(expressions, [i, i - i + 1].concat(exprs)), exprs;
							i += exprs.length;
						} else {
							if (initializerExpression = this.addInitializerExpression(expression)) {
								initializer.push(initializerExpression);
								expressions[i] = initializerExpression;
							}
							i += 1;
						}
					}
					for (k = 0, len2 = initializer.length; k < len2; k++) {
						method = initializer[k];
						if (method instanceof Code) {
							if (method.ctor) {
								if (this.ctor) {
									method.error('Cannot define more than one constructor in a class');
								}
								this.ctor = method;
							} else if (method.isStatic && method.bound) {
								method.context = this.name;
							} else if (method.bound) {
								this.boundMethods.push(method);
							}
						}
					}
					if (initializer.length !== expressions.length) {
						this.body.expressions = (function() {
							var l, len3, results;
							results = [];
							for (l = 0, len3 = initializer.length; l < len3; l++) {
								expression = initializer[l];
								results.push(expression.hoist());
							}
							return results;
						})();
						return new Block(expressions);
					}
				}

				// Add an expression to the class initializer

				// This is the key method for determining whether an expression in a class
				// body should appear in the initializer or the executable body. If the given
				// `node` is valid in a class body the method will return a (new, modified,
				// or identical) node for inclusion in the class initializer, otherwise
				// nothing will be returned and the node will appear in the executable body.

				// At time of writing, only methods (instance and static) are valid in ES
				// class initializers. As new ES class features (such as class fields) reach
				// Stage 4, this method will need to be updated to support them. We
				// additionally allow `PassthroughLiteral`s (backticked expressions) in the
				// initializer as an escape hatch for ES features that are not implemented
				// (e.g. getters and setters defined via the `get` and `set` keywords as
				// opposed to the `Object.defineProperty` method).
				addInitializerExpression(node) {
					if (node.unwrapAll() instanceof PassthroughLiteral) {
						return node;
					} else if (this.validInitializerMethod(node)) {
						return this.addInitializerMethod(node);
					} else {
						return null;
					}
				}

				// Checks if the given node is a valid ES class initializer method.
				validInitializerMethod(node) {
					if (!(node instanceof Assign && node.value instanceof Code)) {
						return false;
					}
					if (node.context === 'object' && !node.variable.hasProperties()) {
						return true;
					}
					return node.variable.looksStatic(this.name) && (this.name || !node.value.bound);
				}

				// Returns a configured class initializer method
				addInitializerMethod(assign) {
					var method, methodName, variable;
					({
						variable,
						value: method
					} = assign);
					method.isMethod = true;
					method.isStatic = variable.looksStatic(this.name);
					if (method.isStatic) {
						method.name = variable.properties[0];
					} else {
						methodName = variable.base;
						method.name = new (methodName.shouldCache() ? Index : Access)(methodName);
						method.name.updateLocationDataIfMissing(methodName.locationData);
						if (methodName.value === 'constructor') {
							method.ctor = (this.parent ? 'derived' : 'base');
						}
						if (method.bound && method.ctor) {
							method.error('Cannot define a constructor as a bound (fat arrow) function');
						}
					}
					return method;
				}

				makeDefaultConstructor() {
					var applyArgs, applyCtor, ctor;
					ctor = this.addInitializerMethod(new Assign(new Value(new PropertyName('constructor')), new Code));
					this.body.unshift(ctor);
					if (this.parent) {
						ctor.body.push(new SuperCall(new Super, [new Splat(new IdentifierLiteral('arguments'))]));
					}
					if (this.externalCtor) {
						applyCtor = new Value(this.externalCtor, [new Access(new PropertyName('apply'))]);
						applyArgs = [new ThisLiteral, new IdentifierLiteral('arguments')];
						ctor.body.push(new Call(applyCtor, applyArgs));
						ctor.body.makeReturn();
					}
					return ctor;
				}

				proxyBoundMethods() {
					var method, name;
					this.ctor.thisAssignments = (function() {
						var j, len1, ref1, results;
						ref1 = this.boundMethods;
						results = [];
						for (j = 0, len1 = ref1.length; j < len1; j++) {
							method = ref1[j];
							if (this.parent) {
								method.classVariable = this.variableRef;
							}
							name = new Value(new ThisLiteral, [method.name]);
							results.push(new Assign(name, new Call(new Value(name, [new Access(new PropertyName('bind'))]), [new ThisLiteral])));
						}
						return results;
					}).call(this);
					return null;
				}

			};

			Class.prototype.children = ['variable', 'parent', 'body'];

			return Class;

		}).call(this);

		exports.ExecutableClassBody = ExecutableClassBody = (function() {
			class ExecutableClassBody extends Base {
				constructor(_class, body1 = new Block) {
					super();
					this.class = _class;
					this.body = body1;
				}

				compileNode(o) {
					var args, argumentsNode, directives, externalCtor, ident, jumpNode, klass, params, parent, ref1, wrapper;
					if (jumpNode = this.body.jumps()) {
						jumpNode.error('Class bodies cannot contain pure statements');
					}
					if (argumentsNode = this.body.contains(isLiteralArguments)) {
						argumentsNode.error("Class bodies shouldn't reference arguments");
					}
					params = [];
					args = [new ThisLiteral];
					wrapper = new Code(params, this.body);
					klass = new Parens(new Call(new Value(wrapper, [new Access(new PropertyName('call'))]), args));
					this.body.spaced = true;
					o.classScope = wrapper.makeScope(o.scope);
					this.name = (ref1 = this.class.name) != null ? ref1 : o.classScope.freeVariable(this.defaultClassVariableName);
					ident = new IdentifierLiteral(this.name);
					directives = this.walkBody();
					this.setContext();
					if (this.class.hasNameClash) {
						parent = new IdentifierLiteral(o.classScope.freeVariable('superClass'));
						wrapper.params.push(new Param(parent));
						args.push(this.class.parent);
						this.class.parent = parent;
					}
					if (this.externalCtor) {
						externalCtor = new IdentifierLiteral(o.classScope.freeVariable('ctor', {
							reserve: false
						}));
						this.class.externalCtor = externalCtor;
						this.externalCtor.variable.base = externalCtor;
					}
					if (this.name !== this.class.name) {
						this.body.expressions.unshift(new Assign(new IdentifierLiteral(this.name), this.class));
					} else {
						this.body.expressions.unshift(this.class);
					}
					this.body.expressions.unshift(...directives);
					this.body.push(ident);
					return klass.compileToFragments(o);
				}

				// Traverse the class's children and:
				// - Hoist valid ES properties into `@properties`
				// - Hoist static assignments into `@properties`
				// - Convert invalid ES properties into class or prototype assignments
				walkBody() {
					var directives, expr, index;
					directives = [];
					index = 0;
					while (expr = this.body.expressions[index]) {
						if (!(expr instanceof Value && expr.isString())) {
							break;
						}
						if (expr.hoisted) {
							index++;
						} else {
							directives.push(...this.body.expressions.splice(index, 1));
						}
					}
					this.traverseChildren(false, (child) => {
						var cont, i, j, len1, node, ref1;
						if (child instanceof Class || child instanceof HoistTarget) {
							return false;
						}
						cont = true;
						if (child instanceof Block) {
							ref1 = child.expressions;
							for (i = j = 0, len1 = ref1.length; j < len1; i = ++j) {
								node = ref1[i];
								if (node instanceof Value && node.isObject(true)) {
									cont = false;
									child.expressions[i] = this.addProperties(node.base.properties);
								} else if (node instanceof Assign && node.variable.looksStatic(this.name)) {
									node.value.isStatic = true;
								}
							}
							child.expressions = flatten(child.expressions);
						}
						return cont;
					});
					return directives;
				}

				setContext() {
					return this.body.traverseChildren(false, (node) => {
						if (node instanceof ThisLiteral) {
							return node.value = this.name;
						} else if (node instanceof Code && node.bound && node.isStatic) {
							return node.context = this.name;
						}
					});
				}

				// Make class/prototype assignments for invalid ES properties
				addProperties(assigns) {
					var assign, base, name, prototype, result, value, variable;
					result = (function() {
						var j, len1, results;
						results = [];
						for (j = 0, len1 = assigns.length; j < len1; j++) {
							assign = assigns[j];
							variable = assign.variable;
							base = variable != null ? variable.base : void 0;
							value = assign.value;
							delete assign.context;
							if (base.value === 'constructor') {
								if (value instanceof Code) {
									base.error('constructors must be defined at the top level of a class body');
								}
								// The class scope is not available yet, so return the assignment to update later
								assign = this.externalCtor = new Assign(new Value, value);
							} else if (!assign.variable.this) {
								name = new (base.shouldCache() ? Index : Access)(base);
								prototype = new Access(new PropertyName('prototype'));
								variable = new Value(new ThisLiteral(), [prototype, name]);
								assign.variable = variable;
							} else if (assign.value instanceof Code) {
								assign.value.isStatic = true;
							}
							results.push(assign);
						}
						return results;
					}).call(this);
					return compact(result);
				}

			};

			ExecutableClassBody.prototype.children = ['class', 'body'];

			ExecutableClassBody.prototype.defaultClassVariableName = '_Class';

			return ExecutableClassBody;

		}).call(this);

		//### Import and Export
		exports.ModuleDeclaration = ModuleDeclaration = (function() {
			class ModuleDeclaration extends Base {
				constructor(clause, source1) {
					super();
					this.clause = clause;
					this.source = source1;
					this.checkSource();
				}

				checkSource() {
					if ((this.source != null) && this.source instanceof StringWithInterpolations) {
						return this.source.error('the name of the module to be imported from must be an uninterpolated string');
					}
				}

				checkScope(o, moduleDeclarationType) {
					if (o.indent.length !== 0) {
						return this.error(`${moduleDeclarationType} statements must be at top-level scope`);
					}
				}

			};

			ModuleDeclaration.prototype.children = ['clause', 'source'];

			ModuleDeclaration.prototype.isStatement = YES;

			ModuleDeclaration.prototype.jumps = THIS;

			ModuleDeclaration.prototype.makeReturn = THIS;

			return ModuleDeclaration;

		}).call(this);

		exports.ImportDeclaration = ImportDeclaration = class ImportDeclaration extends ModuleDeclaration {
			compileNode(o) {
				var code, ref1;
				this.checkScope(o, 'import');
				o.importedSymbols = [];
				code = [];
				code.push(this.makeCode(`${this.tab}import `));
				if (this.clause != null) {
					code.push(...this.clause.compileNode(o));
				}
				if (((ref1 = this.source) != null ? ref1.value : void 0) != null) {
					if (this.clause !== null) {
						code.push(this.makeCode(' from '));
					}
					code.push(this.makeCode(this.source.value));
				}
				code.push(this.makeCode(';'));
				return code;
			}

		};

		exports.ImportClause = ImportClause = (function() {
			class ImportClause extends Base {
				constructor(defaultBinding, namedImports) {
					super();
					this.defaultBinding = defaultBinding;
					this.namedImports = namedImports;
				}

				compileNode(o) {
					var code;
					code = [];
					if (this.defaultBinding != null) {
						code.push(...this.defaultBinding.compileNode(o));
						if (this.namedImports != null) {
							code.push(this.makeCode(', '));
						}
					}
					if (this.namedImports != null) {
						code.push(...this.namedImports.compileNode(o));
					}
					return code;
				}

			};

			ImportClause.prototype.children = ['defaultBinding', 'namedImports'];

			return ImportClause;

		}).call(this);

		exports.ExportDeclaration = ExportDeclaration = class ExportDeclaration extends ModuleDeclaration {
			compileNode(o) {
				var code, ref1;
				this.checkScope(o, 'export');
				code = [];
				code.push(this.makeCode(`${this.tab}export `));
				if (this instanceof ExportDefaultDeclaration) {
					code.push(this.makeCode('default '));
				}
				if (!(this instanceof ExportDefaultDeclaration) && (this.clause instanceof Assign || this.clause instanceof Class)) {
					// Prevent exporting an anonymous class; all exported members must be named
					if (this.clause instanceof Class && !this.clause.variable) {
						this.clause.error('anonymous classes cannot be exported');
					}
					code.push(this.makeCode('var '));
					this.clause.moduleDeclaration = 'export';
				}
				if ((this.clause.body != null) && this.clause.body instanceof Block) {
					code = code.concat(this.clause.compileToFragments(o, LEVEL_TOP));
				} else {
					code = code.concat(this.clause.compileNode(o));
				}
				if (((ref1 = this.source) != null ? ref1.value : void 0) != null) {
					code.push(this.makeCode(` from ${this.source.value}`));
				}
				code.push(this.makeCode(';'));
				return code;
			}

		};

		exports.ExportNamedDeclaration = ExportNamedDeclaration = class ExportNamedDeclaration extends ExportDeclaration {};

		exports.ExportDefaultDeclaration = ExportDefaultDeclaration = class ExportDefaultDeclaration extends ExportDeclaration {};

		exports.ExportAllDeclaration = ExportAllDeclaration = class ExportAllDeclaration extends ExportDeclaration {};

		exports.ModuleSpecifierList = ModuleSpecifierList = (function() {
			class ModuleSpecifierList extends Base {
				constructor(specifiers) {
					super();
					this.specifiers = specifiers;
				}

				compileNode(o) {
					var code, compiledList, fragments, index, j, len1, specifier;
					code = [];
					o.indent += TAB;
					compiledList = (function() {
						var j, len1, ref1, results;
						ref1 = this.specifiers;
						results = [];
						for (j = 0, len1 = ref1.length; j < len1; j++) {
							specifier = ref1[j];
							results.push(specifier.compileToFragments(o, LEVEL_LIST));
						}
						return results;
					}).call(this);
					if (this.specifiers.length !== 0) {
						code.push(this.makeCode(`{\n${o.indent}`));
						for (index = j = 0, len1 = compiledList.length; j < len1; index = ++j) {
							fragments = compiledList[index];
							if (index) {
								code.push(this.makeCode(`,\n${o.indent}`));
							}
							code.push(...fragments);
						}
						code.push(this.makeCode("\n}"));
					} else {
						code.push(this.makeCode('{}'));
					}
					return code;
				}

			};

			ModuleSpecifierList.prototype.children = ['specifiers'];

			return ModuleSpecifierList;

		}).call(this);

		exports.ImportSpecifierList = ImportSpecifierList = class ImportSpecifierList extends ModuleSpecifierList {};

		exports.ExportSpecifierList = ExportSpecifierList = class ExportSpecifierList extends ModuleSpecifierList {};

		exports.ModuleSpecifier = ModuleSpecifier = (function() {
			class ModuleSpecifier extends Base {
				constructor(original, alias, moduleDeclarationType1) {
					var ref1, ref2;
					super();
					this.original = original;
					this.alias = alias;
					this.moduleDeclarationType = moduleDeclarationType1;
					if (this.original.comments || ((ref1 = this.alias) != null ? ref1.comments : void 0)) {
						this.comments = [];
						if (this.original.comments) {
							this.comments.push(...this.original.comments);
						}
						if ((ref2 = this.alias) != null ? ref2.comments : void 0) {
							this.comments.push(...this.alias.comments);
						}
					}
					// The name of the variable entering the local scope
					this.identifier = this.alias != null ? this.alias.value : this.original.value;
				}

				compileNode(o) {
					var code;
					o.scope.find(this.identifier, this.moduleDeclarationType);
					code = [];
					code.push(this.makeCode(this.original.value));
					if (this.alias != null) {
						code.push(this.makeCode(` as ${this.alias.value}`));
					}
					return code;
				}

			};

			ModuleSpecifier.prototype.children = ['original', 'alias'];

			return ModuleSpecifier;

		}).call(this);

		exports.ImportSpecifier = ImportSpecifier = class ImportSpecifier extends ModuleSpecifier {
			constructor(imported, local) {
				super(imported, local, 'import');
			}

			compileNode(o) {
				var ref1;
				// Per the spec, symbols can’t be imported multiple times
				// (e.g. `import { foo, foo } from 'lib'` is invalid)
				if ((ref1 = this.identifier, indexOf.call(o.importedSymbols, ref1) >= 0) || o.scope.check(this.identifier)) {
					this.error(`'${this.identifier}' has already been declared`);
				} else {
					o.importedSymbols.push(this.identifier);
				}
				return super.compileNode(o);
			}

		};

		exports.ImportDefaultSpecifier = ImportDefaultSpecifier = class ImportDefaultSpecifier extends ImportSpecifier {};

		exports.ImportNamespaceSpecifier = ImportNamespaceSpecifier = class ImportNamespaceSpecifier extends ImportSpecifier {};

		exports.ExportSpecifier = ExportSpecifier = class ExportSpecifier extends ModuleSpecifier {
			constructor(local, exported) {
				super(local, exported, 'export');
			}

		};

		//### Assign

		// The **Assign** is used to assign a local variable to value, or to set the
		// property of an object -- including within object literals.
		exports.Assign = Assign = (function() {
			class Assign extends Base {
				constructor(variable1, value1, context1, options = {}) {
					super();
					this.variable = variable1;
					this.value = value1;
					this.context = context1;
					({param: this.param, subpattern: this.subpattern, operatorToken: this.operatorToken, moduleDeclaration: this.moduleDeclaration} = options);
				}

				isStatement(o) {
					return (o != null ? o.level : void 0) === LEVEL_TOP && (this.context != null) && (this.moduleDeclaration || indexOf.call(this.context, "?") >= 0);
				}

				checkAssignability(o, varBase) {
					if (Object.prototype.hasOwnProperty.call(o.scope.positions, varBase.value) && o.scope.variables[o.scope.positions[varBase.value]].type === 'import') {
						return varBase.error(`'${varBase.value}' is read-only`);
					}
				}

				assigns(name) {
					return this[this.context === 'object' ? 'value' : 'variable'].assigns(name);
				}

				unfoldSoak(o) {
					return unfoldSoak(o, this, 'variable');
				}

				// Compile an assignment, delegating to `compileDestructuring` or
				// `compileSplice` if appropriate. Keep track of the name of the base object
				// we've been assigned to, for correct internal references. If the variable
				// has not been seen yet within the current scope, declare it.
				compileNode(o) {
					var answer, compiledName, isValue, name, properties, prototype, ref1, ref2, ref3, ref4, ref5, val, varBase;
					isValue = this.variable instanceof Value;
					if (isValue) {
						// When compiling `@variable`, remember if it is part of a function parameter.
						this.variable.param = this.param;
						// If `@variable` is an array or an object, we’re destructuring;
						// if it’s also `isAssignable()`, the destructuring syntax is supported
						// in ES and we can output it as is; otherwise we `@compileDestructuring`
						// and convert this ES-unsupported destructuring into acceptable output.
						if (this.variable.isArray() || this.variable.isObject()) {
							// This is the left-hand side of an assignment; let `Arr` and `Obj`
							// know that, so that those nodes know that they’re assignable as
							// destructured variables.
							this.variable.base.lhs = true;
							if (!this.variable.isAssignable()) {
								if (this.variable.isObject() && this.variable.base.hasSplat()) {
									return this.compileObjectDestruct(o);
								} else {
									return this.compileDestructuring(o);
								}
							}
						}
						if (this.variable.isSplice()) {
							return this.compileSplice(o);
						}
						if ((ref1 = this.context) === '||=' || ref1 === '&&=' || ref1 === '?=') {
							return this.compileConditional(o);
						}
						if ((ref2 = this.context) === '//=' || ref2 === '%%=') {
							return this.compileSpecialMath(o);
						}
					}
					if (!this.context || this.context === '**=') {
						varBase = this.variable.unwrapAll();
						if (!varBase.isAssignable()) {
							this.variable.error(`'${this.variable.compile(o)}' can't be assigned`);
						}
						varBase.eachName((name) => {
							var commentFragments, commentsNode, message;
							if (typeof name.hasProperties === "function" ? name.hasProperties() : void 0) {
								return;
							}
							message = isUnassignable(name.value);
							if (message) {
								name.error(message);
							}
							// `moduleDeclaration` can be `'import'` or `'export'`.
							this.checkAssignability(o, name);
							if (this.moduleDeclaration) {
								return o.scope.add(name.value, this.moduleDeclaration);
							} else if (this.param) {
								return o.scope.add(name.value, this.param === 'alwaysDeclare' ? 'var' : 'param');
							} else {
								o.scope.find(name.value);
								// If this assignment identifier has one or more herecomments
								// attached, output them as part of the declarations line (unless
								// other herecomments are already staged there) for compatibility
								// with Flow typing. Don’t do this if this assignment is for a
								// class, e.g. `ClassName = class ClassName {`, as Flow requires
								// the comment to be between the class name and the `{`.
								if (name.comments && !o.scope.comments[name.value] && !(this.value instanceof Class) && name.comments.every(function(comment) {
									return comment.here && !comment.multiline;
								})) {
									commentsNode = new IdentifierLiteral(name.value);
									commentsNode.comments = name.comments;
									commentFragments = [];
									this.compileCommentFragments(o, commentsNode, commentFragments);
									return o.scope.comments[name.value] = commentFragments;
								}
							}
						});
					}
					if (this.value instanceof Code) {
						if (this.value.isStatic) {
							this.value.name = this.variable.properties[0];
						} else if (((ref3 = this.variable.properties) != null ? ref3.length : void 0) >= 2) {
							ref4 = this.variable.properties, [...properties] = ref4, [prototype, name] = splice.call(properties, -2);
							if (((ref5 = prototype.name) != null ? ref5.value : void 0) === 'prototype') {
								this.value.name = name;
							}
						}
					}
					if (this.csx) {
						this.value.base.csxAttribute = true;
					}
					val = this.value.compileToFragments(o, LEVEL_LIST);
					compiledName = this.variable.compileToFragments(o, LEVEL_LIST);
					if (this.context === 'object') {
						if (this.variable.shouldCache()) {
							compiledName.unshift(this.makeCode('['));
							compiledName.push(this.makeCode(']'));
						}
						return compiledName.concat(this.makeCode(this.csx ? '=' : ': '), val);
					}
					answer = compiledName.concat(this.makeCode(` ${this.context || '='} `), val);
					// Per https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment#Assignment_without_declaration,
					// if we’re destructuring without declaring, the destructuring assignment must be wrapped in parentheses.
					// The assignment is wrapped in parentheses if 'o.level' has lower precedence than LEVEL_LIST (3)
					// (i.e. LEVEL_COND (4), LEVEL_OP (5) or LEVEL_ACCESS (6)), or if we're destructuring object, e.g. {a,b} = obj.
					if (o.level > LEVEL_LIST || isValue && this.variable.base instanceof Obj && !this.nestedLhs && !(this.param === true)) {
						return this.wrapInParentheses(answer);
					} else {
						return answer;
					}
				}

				// Object rest property is not assignable: `{{a}...}`
				compileObjectDestruct(o) {
					var assigns, props, refVal, splat, splatProp;
					this.variable.base.reorderProperties();
					({
						properties: props
					} = this.variable.base);
					[splat] = slice1.call(props, -1);
					splatProp = splat.name;
					assigns = [];
					refVal = new Value(new IdentifierLiteral(o.scope.freeVariable('ref')));
					props.splice(-1, 1, new Splat(refVal));
					assigns.push(new Assign(new Value(new Obj(props)), this.value).compileToFragments(o, LEVEL_LIST));
					assigns.push(new Assign(new Value(splatProp), refVal).compileToFragments(o, LEVEL_LIST));
					return this.joinFragmentArrays(assigns, ', ');
				}

				// Brief implementation of recursive pattern matching, when assigning array or
				// object literals to a value. Peeks at their properties to assign inner names.
				compileDestructuring(o) {
					var assignObjects, assigns, code, compSlice, compSplice, complexObjects, expIdx, expans, fragments, hasObjAssigns, i, isExpans, isSplat, leftObjs, loopObjects, obj, objIsUnassignable, objects, olen, processObjects, pushAssign, ref, refExp, restVar, rightObjs, slicer, splatVar, splatVarAssign, splatVarRef, splats, splatsAndExpans, top, value, vvar, vvarText;
					top = o.level === LEVEL_TOP;
					({value} = this);
					({objects} = this.variable.base);
					olen = objects.length;
					// Special-case for `{} = a` and `[] = a` (empty patterns).
					// Compile to simply `a`.
					if (olen === 0) {
						code = value.compileToFragments(o);
						if (o.level >= LEVEL_OP) {
							return this.wrapInParentheses(code);
						} else {
							return code;
						}
					}
					[obj] = objects;
					// Disallow `[...] = a` for some reason. (Could be equivalent to `[] = a`?)
					if (olen === 1 && obj instanceof Expansion) {
						obj.error('Destructuring assignment has no target');
					}
					// Count all `Splats`: [a, b, c..., d, e]
					splats = (function() {
						var j, len1, results;
						results = [];
						for (i = j = 0, len1 = objects.length; j < len1; i = ++j) {
							obj = objects[i];
							if (obj instanceof Splat) {
								results.push(i);
							}
						}
						return results;
					})();
					// Count all `Expansions`: [a, b, ..., c, d]
					expans = (function() {
						var j, len1, results;
						results = [];
						for (i = j = 0, len1 = objects.length; j < len1; i = ++j) {
							obj = objects[i];
							if (obj instanceof Expansion) {
								results.push(i);
							}
						}
						return results;
					})();
					// Combine splats and expansions.
					splatsAndExpans = [...splats, ...expans];
					// Show error if there is more than one `Splat`, or `Expansion`.
					// Examples: [a, b, c..., d, e, f...], [a, b, ..., c, d, ...], [a, b, ..., c, d, e...]
					if (splatsAndExpans.length > 1) {
						// Sort 'splatsAndExpans' so we can show error at first disallowed token.
						objects[splatsAndExpans.sort()[1]].error("multiple splats/expansions are disallowed in an assignment");
					}
					isSplat = (splats != null ? splats.length : void 0) > 0;
					isExpans = (expans != null ? expans.length : void 0) > 0;
					vvar = value.compileToFragments(o, LEVEL_LIST);
					vvarText = fragmentsToText(vvar);
					assigns = [];
					pushAssign = (variable, val) => {
						return assigns.push(new Assign(variable, val, null, {
							param: this.param,
							subpattern: true
						}).compileToFragments(o, LEVEL_LIST));
					};
					if (isSplat) {
						splatVar = objects[splats[0]].name.unwrap();
						if (splatVar instanceof Arr || splatVar instanceof Obj) {
							splatVarRef = new IdentifierLiteral(o.scope.freeVariable('ref'));
							objects[splats[0]].name = splatVarRef;
							splatVarAssign = function() {
								return pushAssign(new Value(splatVar), splatVarRef);
							};
						}
					}
					// At this point, there are several things to destructure. So the `fn()` in
					// `{a, b} = fn()` must be cached, for example. Make vvar into a simple
					// variable if it isn’t already.
					if (!(value.unwrap() instanceof IdentifierLiteral) || this.variable.assigns(vvarText)) {
						ref = o.scope.freeVariable('ref');
						assigns.push([this.makeCode(ref + ' = '), ...vvar]);
						vvar = [this.makeCode(ref)];
						vvarText = ref;
					}
					slicer = function(type) {
						return function(vvar, start, end = false) {
							var args, slice;
							if (!(vvar instanceof Value)) {
								vvar = new IdentifierLiteral(vvar);
							}
							args = [vvar, new NumberLiteral(start)];
							if (end) {
								args.push(new NumberLiteral(end));
							}
							slice = new Value(new IdentifierLiteral(utility(type, o)), [new Access(new PropertyName('call'))]);
							return new Value(new Call(slice, args));
						};
					};
					// Helper which outputs `[].slice` code.
					compSlice = slicer("slice");
					// Helper which outputs `[].splice` code.
					compSplice = slicer("splice");
					// Check if `objects` array contains any instance of `Assign`, e.g. {a:1}.
					hasObjAssigns = function(objs) {
						var j, len1, results;
						results = [];
						for (i = j = 0, len1 = objs.length; j < len1; i = ++j) {
							obj = objs[i];
							if (obj instanceof Assign && obj.context === 'object') {
								results.push(i);
							}
						}
						return results;
					};
					// Check if `objects` array contains any unassignable object.
					objIsUnassignable = function(objs) {
						var j, len1;
						for (j = 0, len1 = objs.length; j < len1; j++) {
							obj = objs[j];
							if (!obj.isAssignable()) {
								return true;
							}
						}
						return false;
					};
					// `objects` are complex when there is object assign ({a:1}),
					// unassignable object, or just a single node.
					complexObjects = function(objs) {
						return hasObjAssigns(objs).length || objIsUnassignable(objs) || olen === 1;
					};
					// "Complex" `objects` are processed in a loop.
					// Examples: [a, b, {c, r...}, d], [a, ..., {b, r...}, c, d]
					loopObjects = (objs, vvar, vvarTxt) => {
						var acc, idx, j, len1, message, results, vval;
						results = [];
						for (i = j = 0, len1 = objs.length; j < len1; i = ++j) {
							obj = objs[i];
							if (obj instanceof Elision) {
								// `Elision` can be skipped.
								continue;
							}
							// If `obj` is {a: 1}
							if (obj instanceof Assign && obj.context === 'object') {
								({
									variable: {
										base: idx
									},
									value: vvar
								} = obj);
								if (vvar instanceof Assign) {
									({
										variable: vvar
									} = vvar);
								}
								idx = vvar.this ? vvar.properties[0].name : new PropertyName(vvar.unwrap().value);
								acc = idx.unwrap() instanceof PropertyName;
								vval = new Value(value, [new (acc ? Access : Index)(idx)]);
							} else {
								// `obj` is [a...], {a...} or a
								vvar = (function() {
									switch (false) {
										case !(obj instanceof Splat):
											return new Value(obj.name);
										default:
											return obj;
									}
								})();
								vval = (function() {
									switch (false) {
										case !(obj instanceof Splat):
											return compSlice(vvarTxt, i);
										default:
											return new Value(new Literal(vvarTxt), [new Index(new NumberLiteral(i))]);
									}
								})();
							}
							message = isUnassignable(vvar.unwrap().value);
							if (message) {
								vvar.error(message);
							}
							results.push(pushAssign(vvar, vval));
						}
						return results;
					};
					// "Simple" `objects` can be split and compiled to arrays, [a, b, c] = arr, [a, b, c...] = arr
					assignObjects = (objs, vvar, vvarTxt) => {
						var vval;
						vvar = new Value(new Arr(objs, true));
						vval = vvarTxt instanceof Value ? vvarTxt : new Value(new Literal(vvarTxt));
						return pushAssign(vvar, vval);
					};
					processObjects = function(objs, vvar, vvarTxt) {
						if (complexObjects(objs)) {
							return loopObjects(objs, vvar, vvarTxt);
						} else {
							return assignObjects(objs, vvar, vvarTxt);
						}
					};
					// In case there is `Splat` or `Expansion` in `objects`,
					// we can split array in two simple subarrays.
					// `Splat` [a, b, c..., d, e] can be split into  [a, b, c...] and [d, e].
					// `Expansion` [a, b, ..., c, d] can be split into [a, b] and [c, d].
					// Examples:
					// a) `Splat`
					//   CS: [a, b, c..., d, e] = arr
					//   JS: [a, b, ...c] = arr, [d, e] = splice.call(c, -2)
					// b) `Expansion`
					//   CS: [a, b, ..., d, e] = arr
					//   JS: [a, b] = arr, [d, e] = slice.call(arr, -2)
					if (splatsAndExpans.length) {
						expIdx = splatsAndExpans[0];
						leftObjs = objects.slice(0, expIdx + (isSplat ? 1 : 0));
						rightObjs = objects.slice(expIdx + 1);
						if (leftObjs.length !== 0) {
							processObjects(leftObjs, vvar, vvarText);
						}
						if (rightObjs.length !== 0) {
							// Slice or splice `objects`.
							refExp = (function() {
								switch (false) {
									case !isSplat:
										return compSplice(new Value(objects[expIdx].name), rightObjs.length * -1);
									case !isExpans:
										return compSlice(vvarText, rightObjs.length * -1);
								}
							})();
							if (complexObjects(rightObjs)) {
								restVar = refExp;
								refExp = o.scope.freeVariable('ref');
								assigns.push([this.makeCode(refExp + ' = '), ...restVar.compileToFragments(o, LEVEL_LIST)]);
							}
							processObjects(rightObjs, vvar, refExp);
						}
					} else {
						// There is no `Splat` or `Expansion` in `objects`.
						processObjects(objects, vvar, vvarText);
					}
					if (typeof splatVarAssign === "function") {
						splatVarAssign();
					}
					if (!(top || this.subpattern)) {
						assigns.push(vvar);
					}
					fragments = this.joinFragmentArrays(assigns, ', ');
					if (o.level < LEVEL_LIST) {
						return fragments;
					} else {
						return this.wrapInParentheses(fragments);
					}
				}

				// When compiling a conditional assignment, take care to ensure that the
				// operands are only evaluated once, even though we have to reference them
				// more than once.
				compileConditional(o) {
					var fragments, left, right;
					[left, right] = this.variable.cacheReference(o);
					// Disallow conditional assignment of undefined variables.
					if (!left.properties.length && left.base instanceof Literal && !(left.base instanceof ThisLiteral) && !o.scope.check(left.base.value)) {
						this.variable.error(`the variable "${left.base.value}" can't be assigned with ${this.context} because it has not been declared before`);
					}
					if (indexOf.call(this.context, "?") >= 0) {
						o.isExistentialEquals = true;
						return new If(new Existence(left), right, {
							type: 'if'
						}).addElse(new Assign(right, this.value, '=')).compileToFragments(o);
					} else {
						fragments = new Op(this.context.slice(0, -1), left, new Assign(right, this.value, '=')).compileToFragments(o);
						if (o.level <= LEVEL_LIST) {
							return fragments;
						} else {
							return this.wrapInParentheses(fragments);
						}
					}
				}

				// Convert special math assignment operators like `a //= b` to the equivalent
				// extended form `a = a ** b` and then compiles that.
				compileSpecialMath(o) {
					var left, right;
					[left, right] = this.variable.cacheReference(o);
					return new Assign(left, new Op(this.context.slice(0, -1), right, this.value)).compileToFragments(o);
				}

				// Compile the assignment from an array splice literal, using JavaScript's
				// `Array#splice` method.
				compileSplice(o) {
					var answer, exclusive, from, fromDecl, fromRef, name, to, unwrappedVar, valDef, valRef;
					({
						range: {from, to, exclusive}
					} = this.variable.properties.pop());
					unwrappedVar = this.variable.unwrapAll();
					if (unwrappedVar.comments) {
						moveComments(unwrappedVar, this);
						delete this.variable.comments;
					}
					name = this.variable.compile(o);
					if (from) {
						[fromDecl, fromRef] = this.cacheToCodeFragments(from.cache(o, LEVEL_OP));
					} else {
						fromDecl = fromRef = '0';
					}
					if (to) {
						if ((from != null ? from.isNumber() : void 0) && to.isNumber()) {
							to = to.compile(o) - fromRef;
							if (!exclusive) {
								to += 1;
							}
						} else {
							to = to.compile(o, LEVEL_ACCESS) + ' - ' + fromRef;
							if (!exclusive) {
								to += ' + 1';
							}
						}
					} else {
						to = "9e9";
					}
					[valDef, valRef] = this.value.cache(o, LEVEL_LIST);
					answer = [].concat(this.makeCode(`${utility('splice', o)}.apply(${name}, [${fromDecl}, ${to}].concat(`), valDef, this.makeCode(")), "), valRef);
					if (o.level > LEVEL_TOP) {
						return this.wrapInParentheses(answer);
					} else {
						return answer;
					}
				}

				eachName(iterator) {
					return this.variable.unwrapAll().eachName(iterator);
				}

			};

			Assign.prototype.children = ['variable', 'value'];

			Assign.prototype.isAssignable = YES;

			return Assign;

		}).call(this);

		//### FuncGlyph
		exports.FuncGlyph = FuncGlyph = class FuncGlyph extends Base {
			constructor(glyph) {
				super();
				this.glyph = glyph;
			}

		};

		//### Code

		// A function definition. This is the only node that creates a new Scope.
		// When for the purposes of walking the contents of a function body, the Code
		// has no *children* -- they're within the inner scope.
		exports.Code = Code = (function() {
			class Code extends Base {
				constructor(params, body, funcGlyph, paramStart) {
					var ref1;
					super();
					this.funcGlyph = funcGlyph;
					this.paramStart = paramStart;
					this.params = params || [];
					this.body = body || new Block;
					this.bound = ((ref1 = this.funcGlyph) != null ? ref1.glyph : void 0) === '=>';
					this.isGenerator = false;
					this.isAsync = false;
					this.isMethod = false;
					this.body.traverseChildren(false, (node) => {
						if ((node instanceof Op && node.isYield()) || node instanceof YieldReturn) {
							this.isGenerator = true;
						}
						if ((node instanceof Op && node.isAwait()) || node instanceof AwaitReturn) {
							this.isAsync = true;
						}
						if (node instanceof For && node.isAwait()) {
							return this.isAsync = true;
						}
					});
				}

				isStatement() {
					return this.isMethod;
				}

				makeScope(parentScope) {
					return new Scope(parentScope, this.body, this);
				}

				// Compilation creates a new scope unless explicitly asked to share with the
				// outer scope. Handles splat parameters in the parameter list by setting
				// such parameters to be the final parameter in the function definition, as
				// required per the ES2015 spec. If the CoffeeScript function definition had
				// parameters after the splat, they are declared via expressions in the
				// function body.
				compileNode(o) {
					var answer, body, boundMethodCheck, comment, condition, exprs, generatedVariables, haveBodyParam, haveSplatParam, i, ifTrue, j, k, l, len1, len2, len3, m, methodScope, modifiers, name, param, paramNames, paramToAddToScope, params, paramsAfterSplat, ref, ref1, ref2, ref3, ref4, ref5, ref6, ref7, ref8, scopeVariablesCount, signature, splatParamName, thisAssignments, wasEmpty, yieldNode;
					if (this.ctor) {
						if (this.isAsync) {
							this.name.error('Class constructor may not be async');
						}
						if (this.isGenerator) {
							this.name.error('Class constructor may not be a generator');
						}
					}
					if (this.bound) {
						if ((ref1 = o.scope.method) != null ? ref1.bound : void 0) {
							this.context = o.scope.method.context;
						}
						if (!this.context) {
							this.context = 'this';
						}
					}
					o.scope = del(o, 'classScope') || this.makeScope(o.scope);
					o.scope.shared = del(o, 'sharedScope');
					o.indent += TAB;
					delete o.bare;
					delete o.isExistentialEquals;
					params = [];
					exprs = [];
					thisAssignments = (ref2 = (ref3 = this.thisAssignments) != null ? ref3.slice() : void 0) != null ? ref2 : [];
					paramsAfterSplat = [];
					haveSplatParam = false;
					haveBodyParam = false;
					// Check for duplicate parameters and separate `this` assignments.
					paramNames = [];
					this.eachParamName(function(name, node, param, obj) {
						var replacement, target;
						if (indexOf.call(paramNames, name) >= 0) {
							node.error(`multiple parameters named '${name}'`);
						}
						paramNames.push(name);
						if (node.this) {
							name = node.properties[0].name.value;
							if (indexOf.call(JS_FORBIDDEN, name) >= 0) {
								name = `_${name}`;
							}
							target = new IdentifierLiteral(o.scope.freeVariable(name, {
								reserve: false
							}));
							// `Param` is object destructuring with a default value: ({@prop = 1}) ->
							// In a case when the variable name is already reserved, we have to assign
							// a new variable name to the destructured variable: ({prop:prop1 = 1}) ->
							replacement = param.name instanceof Obj && obj instanceof Assign && obj.operatorToken.value === '=' ? new Assign(new IdentifierLiteral(name), target, 'object') : target; //, operatorToken: new Literal ':'
							param.renameParam(node, replacement);
							return thisAssignments.push(new Assign(node, target));
						}
					});
					ref4 = this.params;
					// Parse the parameters, adding them to the list of parameters to put in the
					// function definition; and dealing with splats or expansions, including
					// adding expressions to the function body to declare all parameter
					// variables that would have been after the splat/expansion parameter.
					// If we encounter a parameter that needs to be declared in the function
					// body for any reason, for example it’s destructured with `this`, also
					// declare and assign all subsequent parameters in the function body so that
					// any non-idempotent parameters are evaluated in the correct order.
					for (i = j = 0, len1 = ref4.length; j < len1; i = ++j) {
						param = ref4[i];
						// Was `...` used with this parameter? (Only one such parameter is allowed
						// per function.) Splat/expansion parameters cannot have default values,
						// so we need not worry about that.
						if (param.splat || param instanceof Expansion) {
							if (haveSplatParam) {
								param.error('only one splat or expansion parameter is allowed per function definition');
							} else if (param instanceof Expansion && this.params.length === 1) {
								param.error('an expansion parameter cannot be the only parameter in a function definition');
							}
							haveSplatParam = true;
							if (param.splat) {
								if (param.name instanceof Arr || param.name instanceof Obj) {
									// Splat arrays are treated oddly by ES; deal with them the legacy
									// way in the function body. TODO: Should this be handled in the
									// function parameter list, and if so, how?
									splatParamName = o.scope.freeVariable('arg');
									params.push(ref = new Value(new IdentifierLiteral(splatParamName)));
									exprs.push(new Assign(new Value(param.name), ref));
								} else {
									params.push(ref = param.asReference(o));
									splatParamName = fragmentsToText(ref.compileNodeWithoutComments(o));
								}
								if (param.shouldCache()) {
									exprs.push(new Assign(new Value(param.name), ref)); // `param` is an Expansion
								}
							} else {
								splatParamName = o.scope.freeVariable('args');
								params.push(new Value(new IdentifierLiteral(splatParamName)));
							}
							o.scope.parameter(splatParamName);
						} else {
							// Parse all other parameters; if a splat paramater has not yet been
							// encountered, add these other parameters to the list to be output in
							// the function definition.
							if (param.shouldCache() || haveBodyParam) {
								param.assignedInBody = true;
								haveBodyParam = true;
								// This parameter cannot be declared or assigned in the parameter
								// list. So put a reference in the parameter list and add a statement
								// to the function body assigning it, e.g.
								// `(arg) => { var a = arg.a; }`, with a default value if it has one.
								if (param.value != null) {
									condition = new Op('===', param, new UndefinedLiteral);
									ifTrue = new Assign(new Value(param.name), param.value);
									exprs.push(new If(condition, ifTrue));
								} else {
									exprs.push(new Assign(new Value(param.name), param.asReference(o), null, {
										param: 'alwaysDeclare'
									}));
								}
							}
							// If this parameter comes before the splat or expansion, it will go
							// in the function definition parameter list.
							if (!haveSplatParam) {
								// If this parameter has a default value, and it hasn’t already been
								// set by the `shouldCache()` block above, define it as a statement in
								// the function body. This parameter comes after the splat parameter,
								// so we can’t define its default value in the parameter list.
								if (param.shouldCache()) {
									ref = param.asReference(o);
								} else {
									if ((param.value != null) && !param.assignedInBody) {
										ref = new Assign(new Value(param.name), param.value, null, {
											param: true
										});
									} else {
										ref = param;
									}
								}
								// Add this parameter’s reference(s) to the function scope.
								if (param.name instanceof Arr || param.name instanceof Obj) {
									// This parameter is destructured.
									param.name.lhs = true;
									if (!param.shouldCache()) {
										param.name.eachName(function(prop) {
											return o.scope.parameter(prop.value);
										});
									}
								} else {
									// This compilation of the parameter is only to get its name to add
									// to the scope name tracking; since the compilation output here
									// isn’t kept for eventual output, don’t include comments in this
									// compilation, so that they get output the “real” time this param
									// is compiled.
									paramToAddToScope = param.value != null ? param : ref;
									o.scope.parameter(fragmentsToText(paramToAddToScope.compileToFragmentsWithoutComments(o)));
								}
								params.push(ref);
							} else {
								paramsAfterSplat.push(param);
								// If this parameter had a default value, since it’s no longer in the
								// function parameter list we need to assign its default value
								// (if necessary) as an expression in the body.
								if ((param.value != null) && !param.shouldCache()) {
									condition = new Op('===', param, new UndefinedLiteral);
									ifTrue = new Assign(new Value(param.name), param.value);
									exprs.push(new If(condition, ifTrue));
								}
								if (((ref5 = param.name) != null ? ref5.value : void 0) != null) {
									// Add this parameter to the scope, since it wouldn’t have been added
									// yet since it was skipped earlier.
									o.scope.add(param.name.value, 'var', true);
								}
							}
						}
					}
					// If there were parameters after the splat or expansion parameter, those
					// parameters need to be assigned in the body of the function.
					if (paramsAfterSplat.length !== 0) {
						// Create a destructured assignment, e.g. `[a, b, c] = [args..., b, c]`
						exprs.unshift(new Assign(new Value(new Arr([
							new Splat(new IdentifierLiteral(splatParamName)),
							...((function() {
								var k,
							len2,
							results;
								results = [];
								for (k = 0, len2 = paramsAfterSplat.length; k < len2; k++) {
									param = paramsAfterSplat[k];
									results.push(param.asReference(o));
								}
								return results;
							})())
						])), new Value(new IdentifierLiteral(splatParamName))));
					}
					// Add new expressions to the function body
					wasEmpty = this.body.isEmpty();
					if (!this.expandCtorSuper(thisAssignments)) {
						this.body.expressions.unshift(...thisAssignments);
					}
					this.body.expressions.unshift(...exprs);
					if (this.isMethod && this.bound && !this.isStatic && this.classVariable) {
						boundMethodCheck = new Value(new Literal(utility('boundMethodCheck', o)));
						this.body.expressions.unshift(new Call(boundMethodCheck, [new Value(new ThisLiteral), this.classVariable]));
					}
					if (!(wasEmpty || this.noReturn)) {
						this.body.makeReturn();
					}
					// JavaScript doesn’t allow bound (`=>`) functions to also be generators.
					// This is usually caught via `Op::compileContinuation`, but double-check:
					if (this.bound && this.isGenerator) {
						yieldNode = this.body.contains(function(node) {
							return node instanceof Op && node.operator === 'yield';
						});
						(yieldNode || this).error('yield cannot occur inside bound (fat arrow) functions');
					}
					// Assemble the output
					modifiers = [];
					if (this.isMethod && this.isStatic) {
						modifiers.push('static');
					}
					if (this.isAsync) {
						modifiers.push('async');
					}
					if (!(this.isMethod || this.bound)) {
						modifiers.push(`function${(this.isGenerator ? '*' : '')}`);
					} else if (this.isGenerator) {
						modifiers.push('*');
					}
					signature = [this.makeCode('(')];
					// Block comments between a function name and `(` get output between
					// `function` and `(`.
					if (((ref6 = this.paramStart) != null ? ref6.comments : void 0) != null) {
						this.compileCommentFragments(o, this.paramStart, signature);
					}
					for (i = k = 0, len2 = params.length; k < len2; i = ++k) {
						param = params[i];
						if (i !== 0) {
							signature.push(this.makeCode(', '));
						}
						if (haveSplatParam && i === params.length - 1) {
							signature.push(this.makeCode('...'));
						}
						// Compile this parameter, but if any generated variables get created
						// (e.g. `ref`), shift those into the parent scope since we can’t put a
						// `var` line inside a function parameter list.
						scopeVariablesCount = o.scope.variables.length;
						signature.push(...param.compileToFragments(o));
						if (scopeVariablesCount !== o.scope.variables.length) {
							generatedVariables = o.scope.variables.splice(scopeVariablesCount);
							o.scope.parent.variables.push(...generatedVariables);
						}
					}
					signature.push(this.makeCode(')'));
					// Block comments between `)` and `->`/`=>` get output between `)` and `{`.
					if (((ref7 = this.funcGlyph) != null ? ref7.comments : void 0) != null) {
						ref8 = this.funcGlyph.comments;
						for (l = 0, len3 = ref8.length; l < len3; l++) {
							comment = ref8[l];
							comment.unshift = false;
						}
						this.compileCommentFragments(o, this.funcGlyph, signature);
					}
					if (!this.body.isEmpty()) {
						body = this.body.compileWithDeclarations(o);
					}
					// We need to compile the body before method names to ensure `super`
					// references are handled.
					if (this.isMethod) {
						[methodScope, o.scope] = [o.scope, o.scope.parent];
						name = this.name.compileToFragments(o);
						if (name[0].code === '.') {
							name.shift();
						}
						o.scope = methodScope;
					}
					answer = this.joinFragmentArrays((function() {
						var len4, p, results;
						results = [];
						for (p = 0, len4 = modifiers.length; p < len4; p++) {
							m = modifiers[p];
							results.push(this.makeCode(m));
						}
						return results;
					}).call(this), ' ');
					if (modifiers.length && name) {
						answer.push(this.makeCode(' '));
					}
					if (name) {
						answer.push(...name);
					}
					answer.push(...signature);
					if (this.bound && !this.isMethod) {
						answer.push(this.makeCode(' =>'));
					}
					answer.push(this.makeCode(' {'));
					if (body != null ? body.length : void 0) {
						answer.push(this.makeCode('\n'), ...body, this.makeCode(`\n${this.tab}`));
					}
					answer.push(this.makeCode('}'));
					if (this.isMethod) {
						return indentInitial(answer, this);
					}
					if (this.front || (o.level >= LEVEL_ACCESS)) {
						return this.wrapInParentheses(answer);
					} else {
						return answer;
					}
				}

				eachParamName(iterator) {
					var j, len1, param, ref1, results;
					ref1 = this.params;
					results = [];
					for (j = 0, len1 = ref1.length; j < len1; j++) {
						param = ref1[j];
						results.push(param.eachName(iterator));
					}
					return results;
				}

				// Short-circuit `traverseChildren` method to prevent it from crossing scope
				// boundaries unless `crossScope` is `true`.
				traverseChildren(crossScope, func) {
					if (crossScope) {
						return super.traverseChildren(crossScope, func);
					}
				}

				// Short-circuit `replaceInContext` method to prevent it from crossing context boundaries. Bound
				// functions have the same context.
				replaceInContext(child, replacement) {
					if (this.bound) {
						return super.replaceInContext(child, replacement);
					} else {
						return false;
					}
				}

				expandCtorSuper(thisAssignments) {
					var haveThisParam, param, ref1, seenSuper;
					if (!this.ctor) {
						return false;
					}
					this.eachSuperCall(Block.wrap(this.params), function(superCall) {
						return superCall.error("'super' is not allowed in constructor parameter defaults");
					});
					seenSuper = this.eachSuperCall(this.body, (superCall) => {
						if (this.ctor === 'base') {
							superCall.error("'super' is only allowed in derived class constructors");
						}
						return superCall.expressions = thisAssignments;
					});
					haveThisParam = thisAssignments.length && thisAssignments.length !== ((ref1 = this.thisAssignments) != null ? ref1.length : void 0);
					if (this.ctor === 'derived' && !seenSuper && haveThisParam) {
						param = thisAssignments[0].variable;
						param.error("Can't use @params in derived class constructors without calling super");
					}
					return seenSuper;
				}

				// Find all super calls in the given context node;
				// returns `true` if `iterator` is called.
				eachSuperCall(context, iterator) {
					var seenSuper;
					seenSuper = false;
					context.traverseChildren(true, (child) => {
						var childArgs;
						if (child instanceof SuperCall) {
							// `super` in a constructor (the only `super` without an accessor)
							// cannot be given an argument with a reference to `this`, as that would
							// be referencing `this` before calling `super`.
							if (!child.variable.accessor) {
								childArgs = child.args.filter(function(arg) {
									return !(arg instanceof Class) && (!(arg instanceof Code) || arg.bound);
								});
								Block.wrap(childArgs).traverseChildren(true, (node) => {
									if (node.this) {
										return node.error("Can't call super with @params in derived class constructors");
									}
								});
							}
							seenSuper = true;
							iterator(child);
						} else if (child instanceof ThisLiteral && this.ctor === 'derived' && !seenSuper) {
							child.error("Can't reference 'this' before calling super in derived class constructors");
						}
						// `super` has the same target in bound (arrow) functions, so check them too
						return !(child instanceof SuperCall) && (!(child instanceof Code) || child.bound);
					});
					return seenSuper;
				}

			};

			Code.prototype.children = ['params', 'body'];

			Code.prototype.jumps = NO;

			return Code;

		}).call(this);

		//### Param

		// A parameter in a function definition. Beyond a typical JavaScript parameter,
		// these parameters can also attach themselves to the context of the function,
		// as well as be a splat, gathering up a group of parameters into an array.
		exports.Param = Param = (function() {
			class Param extends Base {
				constructor(name1, value1, splat1) {
					var message, token;
					super();
					this.name = name1;
					this.value = value1;
					this.splat = splat1;
					message = isUnassignable(this.name.unwrapAll().value);
					if (message) {
						this.name.error(message);
					}
					if (this.name instanceof Obj && this.name.generated) {
						token = this.name.objects[0].operatorToken;
						token.error(`unexpected ${token.value}`);
					}
				}

				compileToFragments(o) {
					return this.name.compileToFragments(o, LEVEL_LIST);
				}

				compileToFragmentsWithoutComments(o) {
					return this.name.compileToFragmentsWithoutComments(o, LEVEL_LIST);
				}

				asReference(o) {
					var name, node;
					if (this.reference) {
						return this.reference;
					}
					node = this.name;
					if (node.this) {
						name = node.properties[0].name.value;
						if (indexOf.call(JS_FORBIDDEN, name) >= 0) {
							name = `_${name}`;
						}
						node = new IdentifierLiteral(o.scope.freeVariable(name));
					} else if (node.shouldCache()) {
						node = new IdentifierLiteral(o.scope.freeVariable('arg'));
					}
					node = new Value(node);
					node.updateLocationDataIfMissing(this.locationData);
					return this.reference = node;
				}

				shouldCache() {
					return this.name.shouldCache();
				}

				// Iterates the name or names of a `Param`.
				// In a sense, a destructured parameter represents multiple JS parameters. This
				// method allows to iterate them all.
				// The `iterator` function will be called as `iterator(name, node)` where
				// `name` is the name of the parameter and `node` is the AST node corresponding
				// to that name.
				eachName(iterator, name = this.name) {
					var atParam, j, len1, nObj, node, obj, ref1, ref2;
					atParam = (obj, originalObj = null) => {
						return iterator(`@${obj.properties[0].name.value}`, obj, this, originalObj);
					};
					if (name instanceof Literal) {
						// * simple literals `foo`
						return iterator(name.value, name, this);
					}
					if (name instanceof Value) {
						// * at-params `@foo`
						return atParam(name);
					}
					ref2 = (ref1 = name.objects) != null ? ref1 : [];
					for (j = 0, len1 = ref2.length; j < len1; j++) {
						obj = ref2[j];
						// Save original obj.
						nObj = obj;
						// * destructured parameter with default value
						if (obj instanceof Assign && (obj.context == null)) {
							obj = obj.variable;
						}
						// * assignments within destructured parameters `{foo:bar}`
						if (obj instanceof Assign) {
							// ... possibly with a default value
							if (obj.value instanceof Assign) {
								obj = obj.value.variable;
							} else {
								obj = obj.value;
							}
							this.eachName(iterator, obj.unwrap());
						// * splats within destructured parameters `[xs...]`
						} else if (obj instanceof Splat) {
							node = obj.name.unwrap();
							iterator(node.value, node, this);
						} else if (obj instanceof Value) {
							// * destructured parameters within destructured parameters `[{a}]`
							if (obj.isArray() || obj.isObject()) {
								this.eachName(iterator, obj.base);
							// * at-params within destructured parameters `{@foo}`
							} else if (obj.this) {
								atParam(obj, nObj);
							} else {
								// * simple destructured parameters {foo}
								iterator(obj.base.value, obj.base, this);
							}
						} else if (obj instanceof Elision) {
							obj;
						} else if (!(obj instanceof Expansion)) {
							obj.error(`illegal parameter ${obj.compile()}`);
						}
					}
				}

				// Rename a param by replacing the given AST node for a name with a new node.
				// This needs to ensure that the the source for object destructuring does not change.
				renameParam(node, newNode) {
					var isNode, replacement;
					isNode = function(candidate) {
						return candidate === node;
					};
					replacement = (node, parent) => {
						var key;
						if (parent instanceof Obj) {
							key = node;
							if (node.this) {
								key = node.properties[0].name;
							}
							// No need to assign a new variable for the destructured variable if the variable isn't reserved.
							// Examples:
							// `({@foo}) ->`  should compile to `({foo}) { this.foo = foo}`
							// `foo = 1; ({@foo}) ->` should compile to `foo = 1; ({foo:foo1}) { this.foo = foo1 }`
							if (node.this && key.value === newNode.value) {
								return new Value(newNode);
							} else {
								return new Assign(new Value(key), newNode, 'object');
							}
						} else {
							return newNode;
						}
					};
					return this.replaceInContext(isNode, replacement);
				}

			};

			Param.prototype.children = ['name', 'value'];

			return Param;

		}).call(this);

		//### Splat

		// A splat, either as a parameter to a function, an argument to a call,
		// or as part of a destructuring assignment.
		exports.Splat = Splat = (function() {
			class Splat extends Base {
				constructor(name) {
					super();
					this.name = name.compile ? name : new Literal(name);
				}

				shouldCache() {
					return false;
				}

				isAssignable() {
					if (this.name instanceof Obj || this.name instanceof Parens) {
						return false;
					}
					return this.name.isAssignable() && (!this.name.isAtomic || this.name.isAtomic());
				}

				assigns(name) {
					return this.name.assigns(name);
				}

				compileNode(o) {
					return [this.makeCode('...'), ...this.name.compileToFragments(o, LEVEL_OP)];
				}

				unwrap() {
					return this.name;
				}

			};

			Splat.prototype.children = ['name'];

			return Splat;

		}).call(this);

		//### Expansion

		// Used to skip values inside an array destructuring (pattern matching) or
		// parameter list.
		exports.Expansion = Expansion = (function() {
			class Expansion extends Base {
				compileNode(o) {
					return this.error('Expansion must be used inside a destructuring assignment or parameter list');
				}

				asReference(o) {
					return this;
				}

				eachName(iterator) {}

			};

			Expansion.prototype.shouldCache = NO;

			return Expansion;

		}).call(this);

		//### Elision

		// Array elision element (for example, [,a, , , b, , c, ,]).
		exports.Elision = Elision = (function() {
			class Elision extends Base {
				compileToFragments(o, level) {
					var fragment;
					fragment = super.compileToFragments(o, level);
					fragment.isElision = true;
					return fragment;
				}

				compileNode(o) {
					return [this.makeCode(', ')];
				}

				asReference(o) {
					return this;
				}

				eachName(iterator) {}

			};

			Elision.prototype.isAssignable = YES;

			Elision.prototype.shouldCache = NO;

			return Elision;

		}).call(this);

		//### While

		// A while loop, the only sort of low-level loop exposed by CoffeeScript. From
		// it, all other loops can be manufactured. Useful in cases where you need more
		// flexibility or more speed than a comprehension can provide.
		exports.While = While = (function() {
			class While extends Base {
				constructor(condition, options) {
					super();
					this.condition = (options != null ? options.invert : void 0) ? condition.invert() : condition;
					this.guard = options != null ? options.guard : void 0;
				}

				makeReturn(res) {
					if (res) {
						return super.makeReturn(res);
					} else {
						this.returns = !this.jumps();
						return this;
					}
				}

				addBody(body1) {
					this.body = body1;
					return this;
				}

				jumps() {
					var expressions, j, jumpNode, len1, node;
					({expressions} = this.body);
					if (!expressions.length) {
						return false;
					}
					for (j = 0, len1 = expressions.length; j < len1; j++) {
						node = expressions[j];
						if (jumpNode = node.jumps({
							loop: true
						})) {
							return jumpNode;
						}
					}
					return false;
				}

				// The main difference from a JavaScript *while* is that the CoffeeScript
				// *while* can be used as a part of a larger expression -- while loops may
				// return an array containing the computed result of each iteration.
				compileNode(o) {
					var answer, body, rvar, set;
					o.indent += TAB;
					set = '';
					({body} = this);
					if (body.isEmpty()) {
						body = this.makeCode('');
					} else {
						if (this.returns) {
							body.makeReturn(rvar = o.scope.freeVariable('results'));
							set = `${this.tab}${rvar} = [];\n`;
						}
						if (this.guard) {
							if (body.expressions.length > 1) {
								body.expressions.unshift(new If((new Parens(this.guard)).invert(), new StatementLiteral("continue")));
							} else {
								if (this.guard) {
									body = Block.wrap([new If(this.guard, body)]);
								}
							}
						}
						body = [].concat(this.makeCode("\n"), body.compileToFragments(o, LEVEL_TOP), this.makeCode(`\n${this.tab}`));
					}
					answer = [].concat(this.makeCode(set + this.tab + "while ("), this.condition.compileToFragments(o, LEVEL_PAREN), this.makeCode(") {"), body, this.makeCode("}"));
					if (this.returns) {
						answer.push(this.makeCode(`\n${this.tab}return ${rvar};`));
					}
					return answer;
				}

			};

			While.prototype.children = ['condition', 'guard', 'body'];

			While.prototype.isStatement = YES;

			return While;

		}).call(this);

		//### Op

		// Simple Arithmetic and logical operations. Performs some conversion from
		// CoffeeScript operations into their JavaScript equivalents.
		exports.Op = Op = (function() {
			var CONVERSIONS, INVERSIONS;

			class Op extends Base {
				constructor(op, first, second, flip) {
					var firstCall;
					super();
					if (op === 'in') {
						return new In(first, second);
					}
					if (op === 'do') {
						return Op.prototype.generateDo(first);
					}
					if (op === 'new') {
						if ((firstCall = first.unwrap()) instanceof Call && !firstCall.do && !firstCall.isNew) {
							return firstCall.newInstance();
						}
						if (first instanceof Code && first.bound || first.do) {
							first = new Parens(first);
						}
					}
					this.operator = CONVERSIONS[op] || op;
					this.first = first;
					this.second = second;
					this.flip = !!flip;
					return this;
				}

				isNumber() {
					var ref1;
					return this.isUnary() && ((ref1 = this.operator) === '+' || ref1 === '-') && this.first instanceof Value && this.first.isNumber();
				}

				isAwait() {
					return this.operator === 'await';
				}

				isYield() {
					var ref1;
					return (ref1 = this.operator) === 'yield' || ref1 === 'yield*';
				}

				isUnary() {
					return !this.second;
				}

				shouldCache() {
					return !this.isNumber();
				}

				// Am I capable of
				// [Python-style comparison chaining](https://docs.python.org/3/reference/expressions.html#not-in)?
				isChainable() {
					var ref1;
					return (ref1 = this.operator) === '<' || ref1 === '>' || ref1 === '>=' || ref1 === '<=' || ref1 === '===' || ref1 === '!==';
				}

				invert() {
					var allInvertable, curr, fst, op, ref1;
					if (this.isChainable() && this.first.isChainable()) {
						allInvertable = true;
						curr = this;
						while (curr && curr.operator) {
							allInvertable && (allInvertable = curr.operator in INVERSIONS);
							curr = curr.first;
						}
						if (!allInvertable) {
							return new Parens(this).invert();
						}
						curr = this;
						while (curr && curr.operator) {
							curr.invert = !curr.invert;
							curr.operator = INVERSIONS[curr.operator];
							curr = curr.first;
						}
						return this;
					} else if (op = INVERSIONS[this.operator]) {
						this.operator = op;
						if (this.first.unwrap() instanceof Op) {
							this.first.invert();
						}
						return this;
					} else if (this.second) {
						return new Parens(this).invert();
					} else if (this.operator === '!' && (fst = this.first.unwrap()) instanceof Op && ((ref1 = fst.operator) === '!' || ref1 === 'in' || ref1 === 'instanceof')) {
						return fst;
					} else {
						return new Op('!', this);
					}
				}

				unfoldSoak(o) {
					var ref1;
					return ((ref1 = this.operator) === '++' || ref1 === '--' || ref1 === 'delete') && unfoldSoak(o, this, 'first');
				}

				generateDo(exp) {
					var call, func, j, len1, param, passedParams, ref, ref1;
					passedParams = [];
					func = exp instanceof Assign && (ref = exp.value.unwrap()) instanceof Code ? ref : exp;
					ref1 = func.params || [];
					for (j = 0, len1 = ref1.length; j < len1; j++) {
						param = ref1[j];
						if (param.value) {
							passedParams.push(param.value);
							delete param.value;
						} else {
							passedParams.push(param);
						}
					}
					call = new Call(exp, passedParams);
					call.do = true;
					return call;
				}

				compileNode(o) {
					var answer, isChain, lhs, message, ref1, rhs;
					isChain = this.isChainable() && this.first.isChainable();
					if (!isChain) {
						// In chains, there's no need to wrap bare obj literals in parens,
						// as the chained expression is wrapped.
						this.first.front = this.front;
					}
					if (this.operator === 'delete' && o.scope.check(this.first.unwrapAll().value)) {
						this.error('delete operand may not be argument or var');
					}
					if ((ref1 = this.operator) === '--' || ref1 === '++') {
						message = isUnassignable(this.first.unwrapAll().value);
						if (message) {
							this.first.error(message);
						}
					}
					if (this.isYield() || this.isAwait()) {
						return this.compileContinuation(o);
					}
					if (this.isUnary()) {
						return this.compileUnary(o);
					}
					if (isChain) {
						return this.compileChain(o);
					}
					switch (this.operator) {
						case '?':
							return this.compileExistence(o, this.second.isDefaultValue);
						case '//':
							return this.compileFloorDivision(o);
						case '%%':
							return this.compileModulo(o);
						default:
							lhs = this.first.compileToFragments(o, LEVEL_OP);
							rhs = this.second.compileToFragments(o, LEVEL_OP);
							answer = [].concat(lhs, this.makeCode(` ${this.operator} `), rhs);
							if (o.level <= LEVEL_OP) {
								return answer;
							} else {
								return this.wrapInParentheses(answer);
							}
					}
				}

				// Mimic Python's chained comparisons when multiple comparison operators are
				// used sequentially. For example:

				//     bin/coffee -e 'console.log 50 < 65 > 10'
				//     true
				compileChain(o) {
					var fragments, fst, shared;
					[this.first.second, shared] = this.first.second.cache(o);
					fst = this.first.compileToFragments(o, LEVEL_OP);
					fragments = fst.concat(this.makeCode(` ${(this.invert ? '&&' : '||')} `), shared.compileToFragments(o), this.makeCode(` ${this.operator} `), this.second.compileToFragments(o, LEVEL_OP));
					return this.wrapInParentheses(fragments);
				}

				// Keep reference to the left expression, unless this an existential assignment
				compileExistence(o, checkOnlyUndefined) {
					var fst, ref;
					if (this.first.shouldCache()) {
						ref = new IdentifierLiteral(o.scope.freeVariable('ref'));
						fst = new Parens(new Assign(ref, this.first));
					} else {
						fst = this.first;
						ref = fst;
					}
					return new If(new Existence(fst, checkOnlyUndefined), ref, {
						type: 'if'
					}).addElse(this.second).compileToFragments(o);
				}

				// Compile a unary **Op**.
				compileUnary(o) {
					var op, parts, plusMinus;
					parts = [];
					op = this.operator;
					parts.push([this.makeCode(op)]);
					if (op === '!' && this.first instanceof Existence) {
						this.first.negated = !this.first.negated;
						return this.first.compileToFragments(o);
					}
					if (o.level >= LEVEL_ACCESS) {
						return (new Parens(this)).compileToFragments(o);
					}
					plusMinus = op === '+' || op === '-';
					if ((op === 'new' || op === 'typeof' || op === 'delete') || plusMinus && this.first instanceof Op && this.first.operator === op) {
						parts.push([this.makeCode(' ')]);
					}
					if ((plusMinus && this.first instanceof Op) || (op === 'new' && this.first.isStatement(o))) {
						this.first = new Parens(this.first);
					}
					parts.push(this.first.compileToFragments(o, LEVEL_OP));
					if (this.flip) {
						parts.reverse();
					}
					return this.joinFragmentArrays(parts, '');
				}

				compileContinuation(o) {
					var op, parts, ref1, ref2;
					parts = [];
					op = this.operator;
					if (o.scope.parent == null) {
						this.error(`${this.operator} can only occur inside functions`);
					}
					if (((ref1 = o.scope.method) != null ? ref1.bound : void 0) && o.scope.method.isGenerator) {
						this.error('yield cannot occur inside bound (fat arrow) functions');
					}
					if (indexOf.call(Object.keys(this.first), 'expression') >= 0 && !(this.first instanceof Throw)) {
						if (this.first.expression != null) {
							parts.push(this.first.expression.compileToFragments(o, LEVEL_OP));
						}
					} else {
						if (o.level >= LEVEL_PAREN) {
							parts.push([this.makeCode("(")]);
						}
						parts.push([this.makeCode(op)]);
						if (((ref2 = this.first.base) != null ? ref2.value : void 0) !== '') {
							parts.push([this.makeCode(" ")]);
						}
						parts.push(this.first.compileToFragments(o, LEVEL_OP));
						if (o.level >= LEVEL_PAREN) {
							parts.push([this.makeCode(")")]);
						}
					}
					return this.joinFragmentArrays(parts, '');
				}

				compileFloorDivision(o) {
					var div, floor, second;
					floor = new Value(new IdentifierLiteral('Math'), [new Access(new PropertyName('floor'))]);
					second = this.second.shouldCache() ? new Parens(this.second) : this.second;
					div = new Op('/', this.first, second);
					return new Call(floor, [div]).compileToFragments(o);
				}

				compileModulo(o) {
					var mod;
					mod = new Value(new Literal(utility('modulo', o)));
					return new Call(mod, [this.first, this.second]).compileToFragments(o);
				}

				toString(idt) {
					return super.toString(idt, this.constructor.name + ' ' + this.operator);
				}

			};

			// The map of conversions from CoffeeScript to JavaScript symbols.
			CONVERSIONS = {
				'==': '===',
				'!=': '!==',
				'of': 'in',
				'yieldfrom': 'yield*'
			};

			// The map of invertible operators.
			INVERSIONS = {
				'!==': '===',
				'===': '!=='
			};

			Op.prototype.children = ['first', 'second'];

			return Op;

		}).call(this);

		//### In
		exports.In = In = (function() {
			class In extends Base {
				constructor(object, array) {
					super();
					this.object = object;
					this.array = array;
				}

				compileNode(o) {
					var hasSplat, j, len1, obj, ref1;
					if (this.array instanceof Value && this.array.isArray() && this.array.base.objects.length) {
						ref1 = this.array.base.objects;
						for (j = 0, len1 = ref1.length; j < len1; j++) {
							obj = ref1[j];
							if (!(obj instanceof Splat)) {
								continue;
							}
							hasSplat = true;
							break;
						}
						if (!hasSplat) {
							// `compileOrTest` only if we have an array literal with no splats
							return this.compileOrTest(o);
						}
					}
					return this.compileLoopTest(o);
				}

				compileOrTest(o) {
					var cmp, cnj, i, item, j, len1, ref, ref1, sub, tests;
					[sub, ref] = this.object.cache(o, LEVEL_OP);
					[cmp, cnj] = this.negated ? [' !== ', ' && '] : [' === ', ' || '];
					tests = [];
					ref1 = this.array.base.objects;
					for (i = j = 0, len1 = ref1.length; j < len1; i = ++j) {
						item = ref1[i];
						if (i) {
							tests.push(this.makeCode(cnj));
						}
						tests = tests.concat((i ? ref : sub), this.makeCode(cmp), item.compileToFragments(o, LEVEL_ACCESS));
					}
					if (o.level < LEVEL_OP) {
						return tests;
					} else {
						return this.wrapInParentheses(tests);
					}
				}

				compileLoopTest(o) {
					var fragments, ref, sub;
					[sub, ref] = this.object.cache(o, LEVEL_LIST);
					fragments = [].concat(this.makeCode(utility('indexOf', o) + ".call("), this.array.compileToFragments(o, LEVEL_LIST), this.makeCode(", "), ref, this.makeCode(") " + (this.negated ? '< 0' : '>= 0')));
					if (fragmentsToText(sub) === fragmentsToText(ref)) {
						return fragments;
					}
					fragments = sub.concat(this.makeCode(', '), fragments);
					if (o.level < LEVEL_LIST) {
						return fragments;
					} else {
						return this.wrapInParentheses(fragments);
					}
				}

				toString(idt) {
					return super.toString(idt, this.constructor.name + (this.negated ? '!' : ''));
				}

			};

			In.prototype.children = ['object', 'array'];

			In.prototype.invert = NEGATE;

			return In;

		}).call(this);

		//### Try

		// A classic *try/catch/finally* block.
		exports.Try = Try = (function() {
			class Try extends Base {
				constructor(attempt, errorVariable, recovery, ensure) {
					super();
					this.attempt = attempt;
					this.errorVariable = errorVariable;
					this.recovery = recovery;
					this.ensure = ensure;
				}

				jumps(o) {
					var ref1;
					return this.attempt.jumps(o) || ((ref1 = this.recovery) != null ? ref1.jumps(o) : void 0);
				}

				makeReturn(res) {
					if (this.attempt) {
						this.attempt = this.attempt.makeReturn(res);
					}
					if (this.recovery) {
						this.recovery = this.recovery.makeReturn(res);
					}
					return this;
				}

				// Compilation is more or less as you would expect -- the *finally* clause
				// is optional, the *catch* is not.
				compileNode(o) {
					var catchPart, ensurePart, generatedErrorVariableName, message, placeholder, tryPart;
					o.indent += TAB;
					tryPart = this.attempt.compileToFragments(o, LEVEL_TOP);
					catchPart = this.recovery ? (generatedErrorVariableName = o.scope.freeVariable('error', {
						reserve: false
					}), placeholder = new IdentifierLiteral(generatedErrorVariableName), this.errorVariable ? (message = isUnassignable(this.errorVariable.unwrapAll().value), message ? this.errorVariable.error(message) : void 0, this.recovery.unshift(new Assign(this.errorVariable, placeholder))) : void 0, [].concat(this.makeCode(" catch ("), placeholder.compileToFragments(o), this.makeCode(") {\n"), this.recovery.compileToFragments(o, LEVEL_TOP), this.makeCode(`\n${this.tab}}`))) : !(this.ensure || this.recovery) ? (generatedErrorVariableName = o.scope.freeVariable('error', {
						reserve: false
					}), [this.makeCode(` catch (${generatedErrorVariableName}) {}`)]) : [];
					ensurePart = this.ensure ? [].concat(this.makeCode(" finally {\n"), this.ensure.compileToFragments(o, LEVEL_TOP), this.makeCode(`\n${this.tab}}`)) : [];
					return [].concat(this.makeCode(`${this.tab}try {\n`), tryPart, this.makeCode(`\n${this.tab}}`), catchPart, ensurePart);
				}

			};

			Try.prototype.children = ['attempt', 'recovery', 'ensure'];

			Try.prototype.isStatement = YES;

			return Try;

		}).call(this);

		//### Throw

		// Simple node to throw an exception.
		exports.Throw = Throw = (function() {
			class Throw extends Base {
				constructor(expression1) {
					super();
					this.expression = expression1;
				}

				compileNode(o) {
					var fragments;
					fragments = this.expression.compileToFragments(o, LEVEL_LIST);
					unshiftAfterComments(fragments, this.makeCode('throw '));
					fragments.unshift(this.makeCode(this.tab));
					fragments.push(this.makeCode(';'));
					return fragments;
				}

			};

			Throw.prototype.children = ['expression'];

			Throw.prototype.isStatement = YES;

			Throw.prototype.jumps = NO;

			// A **Throw** is already a return, of sorts...
			Throw.prototype.makeReturn = THIS;

			return Throw;

		}).call(this);

		//### Existence

		// Checks a variable for existence -- not `null` and not `undefined`. This is
		// similar to `.nil?` in Ruby, and avoids having to consult a JavaScript truth
		// table. Optionally only check if a variable is not `undefined`.
		exports.Existence = Existence = (function() {
			class Existence extends Base {
				constructor(expression1, onlyNotUndefined = false) {
					var salvagedComments;
					super();
					this.expression = expression1;
					this.comparisonTarget = onlyNotUndefined ? 'undefined' : 'null';
					salvagedComments = [];
					this.expression.traverseChildren(true, function(child) {
						var comment, j, len1, ref1;
						if (child.comments) {
							ref1 = child.comments;
							for (j = 0, len1 = ref1.length; j < len1; j++) {
								comment = ref1[j];
								if (indexOf.call(salvagedComments, comment) < 0) {
									salvagedComments.push(comment);
								}
							}
							return delete child.comments;
						}
					});
					attachCommentsToNode(salvagedComments, this);
					moveComments(this.expression, this);
				}

				compileNode(o) {
					var cmp, cnj, code;
					this.expression.front = this.front;
					code = this.expression.compile(o, LEVEL_OP);
					if (this.expression.unwrap() instanceof IdentifierLiteral && !o.scope.check(code)) {
						[cmp, cnj] = this.negated ? ['===', '||'] : ['!==', '&&'];
						code = `typeof ${code} ${cmp} "undefined"` + (this.comparisonTarget !== 'undefined' ? ` ${cnj} ${code} ${cmp} ${this.comparisonTarget}` : '');
					} else {
						// We explicity want to use loose equality (`==`) when comparing against `null`,
						// so that an existence check roughly corresponds to a check for truthiness.
						// Do *not* change this to `===` for `null`, as this will break mountains of
						// existing code. When comparing only against `undefined`, however, we want to
						// use `===` because this use case is for parity with ES2015+ default values,
						// which only get assigned when the variable is `undefined` (but not `null`).
						cmp = this.comparisonTarget === 'null' ? this.negated ? '==' : '!=' : this.negated ? '===' : '!=='; // `undefined`
						code = `${code} ${cmp} ${this.comparisonTarget}`;
					}
					return [this.makeCode(o.level <= LEVEL_COND ? code : `(${code})`)];
				}

			};

			Existence.prototype.children = ['expression'];

			Existence.prototype.invert = NEGATE;

			return Existence;

		}).call(this);

		//### Parens

		// An extra set of parentheses, specified explicitly in the source. At one time
		// we tried to clean up the results by detecting and removing redundant
		// parentheses, but no longer -- you can put in as many as you please.

		// Parentheses are a good way to force any statement to become an expression.
		exports.Parens = Parens = (function() {
			class Parens extends Base {
				constructor(body1) {
					super();
					this.body = body1;
				}

				unwrap() {
					return this.body;
				}

				shouldCache() {
					return this.body.shouldCache();
				}

				compileNode(o) {
					var bare, expr, fragments, ref1, shouldWrapComment;
					expr = this.body.unwrap();
					// If these parentheses are wrapping an `IdentifierLiteral` followed by a
					// block comment, output the parentheses (or put another way, don’t optimize
					// away these redundant parentheses). This is because Flow requires
					// parentheses in certain circumstances to distinguish identifiers followed
					// by comment-based type annotations from JavaScript labels.
					shouldWrapComment = (ref1 = expr.comments) != null ? ref1.some(function(comment) {
						return comment.here && !comment.unshift && !comment.newLine;
					}) : void 0;
					if (expr instanceof Value && expr.isAtomic() && !this.csxAttribute && !shouldWrapComment) {
						expr.front = this.front;
						return expr.compileToFragments(o);
					}
					fragments = expr.compileToFragments(o, LEVEL_PAREN);
					bare = o.level < LEVEL_OP && !shouldWrapComment && (expr instanceof Op || expr.unwrap() instanceof Call || (expr instanceof For && expr.returns)) && (o.level < LEVEL_COND || fragments.length <= 3);
					if (this.csxAttribute) {
						return this.wrapInBraces(fragments);
					}
					if (bare) {
						return fragments;
					} else {
						return this.wrapInParentheses(fragments);
					}
				}

			};

			Parens.prototype.children = ['body'];

			return Parens;

		}).call(this);

		//### StringWithInterpolations
		exports.StringWithInterpolations = StringWithInterpolations = (function() {
			class StringWithInterpolations extends Base {
				constructor(body1) {
					super();
					this.body = body1;
				}

				// `unwrap` returns `this` to stop ancestor nodes reaching in to grab @body,
				// and using @body.compileNode. `StringWithInterpolations.compileNode` is
				// _the_ custom logic to output interpolated strings as code.
				unwrap() {
					return this;
				}

				shouldCache() {
					return this.body.shouldCache();
				}

				compileNode(o) {
					var code, element, elements, expr, fragments, j, len1, salvagedComments, wrapped;
					if (this.csxAttribute) {
						wrapped = new Parens(new StringWithInterpolations(this.body));
						wrapped.csxAttribute = true;
						return wrapped.compileNode(o);
					}
					// Assumes that `expr` is `Value` » `StringLiteral` or `Op`
					expr = this.body.unwrap();
					elements = [];
					salvagedComments = [];
					expr.traverseChildren(false, function(node) {
						var comment, j, k, len1, len2, ref1;
						if (node instanceof StringLiteral) {
							if (node.comments) {
								salvagedComments.push(...node.comments);
								delete node.comments;
							}
							elements.push(node);
							return true;
						} else if (node instanceof Parens) {
							if (salvagedComments.length !== 0) {
								for (j = 0, len1 = salvagedComments.length; j < len1; j++) {
									comment = salvagedComments[j];
									comment.unshift = true;
									comment.newLine = true;
								}
								attachCommentsToNode(salvagedComments, node);
							}
							elements.push(node);
							return false;
						} else if (node.comments) {
							// This node is getting discarded, but salvage its comments.
							if (elements.length !== 0 && !(elements[elements.length - 1] instanceof StringLiteral)) {
								ref1 = node.comments;
								for (k = 0, len2 = ref1.length; k < len2; k++) {
									comment = ref1[k];
									comment.unshift = false;
									comment.newLine = true;
								}
								attachCommentsToNode(node.comments, elements[elements.length - 1]);
							} else {
								salvagedComments.push(...node.comments);
							}
							delete node.comments;
						}
						return true;
					});
					fragments = [];
					if (!this.csx) {
						fragments.push(this.makeCode('`'));
					}
					for (j = 0, len1 = elements.length; j < len1; j++) {
						element = elements[j];
						if (element instanceof StringLiteral) {
							element.value = element.unquote(true, this.csx);
							if (!this.csx) {
								// Backticks and `${` inside template literals must be escaped.
								element.value = element.value.replace(/(\\*)(`|\$\{)/g, function(match, backslashes, toBeEscaped) {
									if (backslashes.length % 2 === 0) {
										return `${backslashes}\\${toBeEscaped}`;
									} else {
										return match;
									}
								});
							}
							fragments.push(...element.compileToFragments(o));
						} else {
							if (!this.csx) {
								fragments.push(this.makeCode('$'));
							}
							code = element.compileToFragments(o, LEVEL_PAREN);
							if (!this.isNestedTag(element) || code.some(function(fragment) {
								return fragment.comments != null;
							})) {
								code = this.wrapInBraces(code);
								// Flag the `{` and `}` fragments as having been generated by this
								// `StringWithInterpolations` node, so that `compileComments` knows
								// to treat them as bounds. Don’t trust `fragment.type`, which can
								// report minified variable names when this compiler is minified.
								code[0].isStringWithInterpolations = true;
								code[code.length - 1].isStringWithInterpolations = true;
							}
							fragments.push(...code);
						}
					}
					if (!this.csx) {
						fragments.push(this.makeCode('`'));
					}
					return fragments;
				}

				isNestedTag(element) {
					var call, exprs, ref1;
					exprs = (ref1 = element.body) != null ? ref1.expressions : void 0;
					call = exprs != null ? exprs[0].unwrap() : void 0;
					return this.csx && exprs && exprs.length === 1 && call instanceof Call && call.csx;
				}

			};

			StringWithInterpolations.prototype.children = ['body'];

			return StringWithInterpolations;

		}).call(this);

		//### For

		// CoffeeScript's replacement for the *for* loop is our array and object
		// comprehensions, that compile into *for* loops here. They also act as an
		// expression, able to return the result of each filtered iteration.

		// Unlike Python array comprehensions, they can be multi-line, and you can pass
		// the current index of the loop as a second parameter. Unlike Ruby blocks,
		// you can map and filter in a single pass.
		exports.For = For = (function() {
			class For extends While {
				constructor(body, source) {
					super();
					this.addBody(body);
					this.addSource(source);
				}

				isAwait() {
					var ref1;
					return (ref1 = this.await) != null ? ref1 : false;
				}

				addBody(body) {
					this.body = Block.wrap([body]);
					return this;
				}

				addSource(source) {
					var attr, attribs, attribute, j, k, len1, len2, ref1, ref2, ref3, ref4;
					({source: this.source = false} = source);
					attribs = ["name", "index", "guard", "step", "own", "ownTag", "await", "awaitTag", "object", "from"];
					for (j = 0, len1 = attribs.length; j < len1; j++) {
						attr = attribs[j];
						this[attr] = (ref1 = source[attr]) != null ? ref1 : this[attr];
					}
					if (!this.source) {
						return this;
					}
					if (this.from && this.index) {
						this.index.error('cannot use index with for-from');
					}
					if (this.own && !this.object) {
						this.ownTag.error(`cannot use own with for-${(this.from ? 'from' : 'in')}`);
					}
					if (this.object) {
						[this.name, this.index] = [this.index, this.name];
					}
					if (((ref2 = this.index) != null ? typeof ref2.isArray === "function" ? ref2.isArray() : void 0 : void 0) || ((ref3 = this.index) != null ? typeof ref3.isObject === "function" ? ref3.isObject() : void 0 : void 0)) {
						this.index.error('index cannot be a pattern matching expression');
					}
					if (this.await && !this.from) {
						this.awaitTag.error('await must be used with for-from');
					}
					this.range = this.source instanceof Value && this.source.base instanceof Range && !this.source.properties.length && !this.from;
					this.pattern = this.name instanceof Value;
					if (this.range && this.index) {
						this.index.error('indexes do not apply to range loops');
					}
					if (this.range && this.pattern) {
						this.name.error('cannot pattern match over range loops');
					}
					this.returns = false;
					ref4 = ['source', 'guard', 'step', 'name', 'index'];
					// Move up any comments in the “`for` line”, i.e. the line of code with `for`,
					// from any child nodes of that line up to the `for` node itself so that these
					// comments get output, and get output above the `for` loop.
					for (k = 0, len2 = ref4.length; k < len2; k++) {
						attribute = ref4[k];
						if (!this[attribute]) {
							continue;
						}
						this[attribute].traverseChildren(true, (node) => {
							var comment, l, len3, ref5;
							if (node.comments) {
								ref5 = node.comments;
								for (l = 0, len3 = ref5.length; l < len3; l++) {
									comment = ref5[l];
									// These comments are buried pretty deeply, so if they happen to be
									// trailing comments the line they trail will be unrecognizable when
									// we’re done compiling this `for` loop; so just shift them up to
									// output above the `for` line.
									comment.newLine = comment.unshift = true;
								}
								return moveComments(node, this[attribute]);
							}
						});
						moveComments(this[attribute], this);
					}
					return this;
				}

				// Welcome to the hairiest method in all of CoffeeScript. Handles the inner
				// loop, filtering, stepping, and result saving for array, object, and range
				// comprehensions. Some of the generated code can be shared in common, and
				// some cannot.
				compileNode(o) {
					var body, bodyFragments, compare, compareDown, declare, declareDown, defPart, down, forClose, forCode, forPartFragments, fragments, guardPart, idt1, increment, index, ivar, kvar, kvarAssign, last, lvar, name, namePart, ref, ref1, resultPart, returnResult, rvar, scope, source, step, stepNum, stepVar, svar, varPart;
					body = Block.wrap([this.body]);
					ref1 = body.expressions, [last] = slice1.call(ref1, -1);
					if ((last != null ? last.jumps() : void 0) instanceof Return) {
						this.returns = false;
					}
					source = this.range ? this.source.base : this.source;
					scope = o.scope;
					if (!this.pattern) {
						name = this.name && (this.name.compile(o, LEVEL_LIST));
					}
					index = this.index && (this.index.compile(o, LEVEL_LIST));
					if (name && !this.pattern) {
						scope.find(name);
					}
					if (index && !(this.index instanceof Value)) {
						scope.find(index);
					}
					if (this.returns) {
						rvar = scope.freeVariable('results');
					}
					if (this.from) {
						if (this.pattern) {
							ivar = scope.freeVariable('x', {
								single: true
							});
						}
					} else {
						ivar = (this.object && index) || scope.freeVariable('i', {
							single: true
						});
					}
					kvar = ((this.range || this.from) && name) || index || ivar;
					kvarAssign = kvar !== ivar ? `${kvar} = ` : "";
					if (this.step && !this.range) {
						[step, stepVar] = this.cacheToCodeFragments(this.step.cache(o, LEVEL_LIST, shouldCacheOrIsAssignable));
						if (this.step.isNumber()) {
							stepNum = Number(stepVar);
						}
					}
					if (this.pattern) {
						name = ivar;
					}
					varPart = '';
					guardPart = '';
					defPart = '';
					idt1 = this.tab + TAB;
					if (this.range) {
						forPartFragments = source.compileToFragments(merge(o, {
							index: ivar,
							name,
							step: this.step,
							shouldCache: shouldCacheOrIsAssignable
						}));
					} else {
						svar = this.source.compile(o, LEVEL_LIST);
						if ((name || this.own) && !(this.source.unwrap() instanceof IdentifierLiteral)) {
							defPart += `${this.tab}${(ref = scope.freeVariable('ref'))} = ${svar};\n`;
							svar = ref;
						}
						if (name && !this.pattern && !this.from) {
							namePart = `${name} = ${svar}[${kvar}]`;
						}
						if (!this.object && !this.from) {
							if (step !== stepVar) {
								defPart += `${this.tab}${step};\n`;
							}
							down = stepNum < 0;
							if (!(this.step && (stepNum != null) && down)) {
								lvar = scope.freeVariable('len');
							}
							declare = `${kvarAssign}${ivar} = 0, ${lvar} = ${svar}.length`;
							declareDown = `${kvarAssign}${ivar} = ${svar}.length - 1`;
							compare = `${ivar} < ${lvar}`;
							compareDown = `${ivar} >= 0`;
							if (this.step) {
								if (stepNum != null) {
									if (down) {
										compare = compareDown;
										declare = declareDown;
									}
								} else {
									compare = `${stepVar} > 0 ? ${compare} : ${compareDown}`;
									declare = `(${stepVar} > 0 ? (${declare}) : ${declareDown})`;
								}
								increment = `${ivar} += ${stepVar}`;
							} else {
								increment = `${(kvar !== ivar ? `++${ivar}` : `${ivar}++`)}`;
							}
							forPartFragments = [this.makeCode(`${declare}; ${compare}; ${kvarAssign}${increment}`)];
						}
					}
					if (this.returns) {
						resultPart = `${this.tab}${rvar} = [];\n`;
						returnResult = `\n${this.tab}return ${rvar};`;
						body.makeReturn(rvar);
					}
					if (this.guard) {
						if (body.expressions.length > 1) {
							body.expressions.unshift(new If((new Parens(this.guard)).invert(), new StatementLiteral("continue")));
						} else {
							if (this.guard) {
								body = Block.wrap([new If(this.guard, body)]);
							}
						}
					}
					if (this.pattern) {
						body.expressions.unshift(new Assign(this.name, this.from ? new IdentifierLiteral(kvar) : new Literal(`${svar}[${kvar}]`)));
					}
					if (namePart) {
						varPart = `\n${idt1}${namePart};`;
					}
					if (this.object) {
						forPartFragments = [this.makeCode(`${kvar} in ${svar}`)];
						if (this.own) {
							guardPart = `\n${idt1}if (!${utility('hasProp', o)}.call(${svar}, ${kvar})) continue;`;
						}
					} else if (this.from) {
						if (this.await) {
							forPartFragments = new Op('await', new Parens(new Literal(`${kvar} of ${svar}`)));
							forPartFragments = forPartFragments.compileToFragments(o, LEVEL_TOP);
						} else {
							forPartFragments = [this.makeCode(`${kvar} of ${svar}`)];
						}
					}
					bodyFragments = body.compileToFragments(merge(o, {
						indent: idt1
					}), LEVEL_TOP);
					if (bodyFragments && bodyFragments.length > 0) {
						bodyFragments = [].concat(this.makeCode('\n'), bodyFragments, this.makeCode('\n'));
					}
					fragments = [this.makeCode(defPart)];
					if (resultPart) {
						fragments.push(this.makeCode(resultPart));
					}
					forCode = this.await ? 'for ' : 'for (';
					forClose = this.await ? '' : ')';
					fragments = fragments.concat(this.makeCode(this.tab), this.makeCode(forCode), forPartFragments, this.makeCode(`${forClose} {${guardPart}${varPart}`), bodyFragments, this.makeCode(this.tab), this.makeCode('}'));
					if (returnResult) {
						fragments.push(this.makeCode(returnResult));
					}
					return fragments;
				}

			};

			For.prototype.children = ['body', 'source', 'guard', 'step'];

			return For;

		}).call(this);

		//### Switch

		// A JavaScript *switch* statement. Converts into a returnable expression on-demand.
		exports.Switch = Switch = (function() {
			class Switch extends Base {
				constructor(subject, cases, otherwise) {
					super();
					this.subject = subject;
					this.cases = cases;
					this.otherwise = otherwise;
				}

				jumps(o = {
						block: true
					}) {
					var block, conds, j, jumpNode, len1, ref1, ref2;
					ref1 = this.cases;
					for (j = 0, len1 = ref1.length; j < len1; j++) {
						[conds, block] = ref1[j];
						if (jumpNode = block.jumps(o)) {
							return jumpNode;
						}
					}
					return (ref2 = this.otherwise) != null ? ref2.jumps(o) : void 0;
				}

				makeReturn(res) {
					var j, len1, pair, ref1, ref2;
					ref1 = this.cases;
					for (j = 0, len1 = ref1.length; j < len1; j++) {
						pair = ref1[j];
						pair[1].makeReturn(res);
					}
					if (res) {
						this.otherwise || (this.otherwise = new Block([new Literal('void 0')]));
					}
					if ((ref2 = this.otherwise) != null) {
						ref2.makeReturn(res);
					}
					return this;
				}

				compileNode(o) {
					var block, body, cond, conditions, expr, fragments, i, idt1, idt2, j, k, len1, len2, ref1, ref2;
					idt1 = o.indent + TAB;
					idt2 = o.indent = idt1 + TAB;
					fragments = [].concat(this.makeCode(this.tab + "switch ("), (this.subject ? this.subject.compileToFragments(o, LEVEL_PAREN) : this.makeCode("false")), this.makeCode(") {\n"));
					ref1 = this.cases;
					for (i = j = 0, len1 = ref1.length; j < len1; i = ++j) {
						[conditions, block] = ref1[i];
						ref2 = flatten([conditions]);
						for (k = 0, len2 = ref2.length; k < len2; k++) {
							cond = ref2[k];
							if (!this.subject) {
								cond = cond.invert();
							}
							fragments = fragments.concat(this.makeCode(idt1 + "case "), cond.compileToFragments(o, LEVEL_PAREN), this.makeCode(":\n"));
						}
						if ((body = block.compileToFragments(o, LEVEL_TOP)).length > 0) {
							fragments = fragments.concat(body, this.makeCode('\n'));
						}
						if (i === this.cases.length - 1 && !this.otherwise) {
							break;
						}
						expr = this.lastNode(block.expressions);
						if (expr instanceof Return || expr instanceof Throw || (expr instanceof Literal && expr.jumps() && expr.value !== 'debugger')) {
							continue;
						}
						fragments.push(cond.makeCode(idt2 + 'break;\n'));
					}
					if (this.otherwise && this.otherwise.expressions.length) {
						fragments.push(this.makeCode(idt1 + "default:\n"), ...(this.otherwise.compileToFragments(o, LEVEL_TOP)), this.makeCode("\n"));
					}
					fragments.push(this.makeCode(this.tab + '}'));
					return fragments;
				}

			};

			Switch.prototype.children = ['subject', 'cases', 'otherwise'];

			Switch.prototype.isStatement = YES;

			return Switch;

		}).call(this);

		//### If

		// *If/else* statements. Acts as an expression by pushing down requested returns
		// to the last line of each clause.

		// Single-expression **Ifs** are compiled into conditional operators if possible,
		// because ternaries are already proper expressions, and don’t need conversion.
		exports.If = If = (function() {
			class If extends Base {
				constructor(condition, body1, options = {}) {
					super();
					this.body = body1;
					this.condition = options.type === 'unless' ? condition.invert() : condition;
					this.elseBody = null;
					this.isChain = false;
					({soak: this.soak} = options);
					if (this.condition.comments) {
						moveComments(this.condition, this);
					}
				}

				bodyNode() {
					var ref1;
					return (ref1 = this.body) != null ? ref1.unwrap() : void 0;
				}

				elseBodyNode() {
					var ref1;
					return (ref1 = this.elseBody) != null ? ref1.unwrap() : void 0;
				}

				// Rewrite a chain of **Ifs** to add a default case as the final *else*.
				addElse(elseBody) {
					if (this.isChain) {
						this.elseBodyNode().addElse(elseBody);
					} else {
						this.isChain = elseBody instanceof If;
						this.elseBody = this.ensureBlock(elseBody);
						this.elseBody.updateLocationDataIfMissing(elseBody.locationData);
					}
					return this;
				}

				// The **If** only compiles into a statement if either of its bodies needs
				// to be a statement. Otherwise a conditional operator is safe.
				isStatement(o) {
					var ref1;
					return (o != null ? o.level : void 0) === LEVEL_TOP || this.bodyNode().isStatement(o) || ((ref1 = this.elseBodyNode()) != null ? ref1.isStatement(o) : void 0);
				}

				jumps(o) {
					var ref1;
					return this.body.jumps(o) || ((ref1 = this.elseBody) != null ? ref1.jumps(o) : void 0);
				}

				compileNode(o) {
					if (this.isStatement(o)) {
						return this.compileStatement(o);
					} else {
						return this.compileExpression(o);
					}
				}

				makeReturn(res) {
					if (res) {
						this.elseBody || (this.elseBody = new Block([new Literal('void 0')]));
					}
					this.body && (this.body = new Block([this.body.makeReturn(res)]));
					this.elseBody && (this.elseBody = new Block([this.elseBody.makeReturn(res)]));
					return this;
				}

				ensureBlock(node) {
					if (node instanceof Block) {
						return node;
					} else {
						return new Block([node]);
					}
				}

				// Compile the `If` as a regular *if-else* statement. Flattened chains
				// force inner *else* bodies into statement form.
				compileStatement(o) {
					var answer, body, child, cond, exeq, ifPart, indent;
					child = del(o, 'chainChild');
					exeq = del(o, 'isExistentialEquals');
					if (exeq) {
						return new If(this.condition.invert(), this.elseBodyNode(), {
							type: 'if'
						}).compileToFragments(o);
					}
					indent = o.indent + TAB;
					cond = this.condition.compileToFragments(o, LEVEL_PAREN);
					body = this.ensureBlock(this.body).compileToFragments(merge(o, {indent}));
					ifPart = [].concat(this.makeCode("if ("), cond, this.makeCode(") {\n"), body, this.makeCode(`\n${this.tab}}`));
					if (!child) {
						ifPart.unshift(this.makeCode(this.tab));
					}
					if (!this.elseBody) {
						return ifPart;
					}
					answer = ifPart.concat(this.makeCode(' else '));
					if (this.isChain) {
						o.chainChild = true;
						answer = answer.concat(this.elseBody.unwrap().compileToFragments(o, LEVEL_TOP));
					} else {
						answer = answer.concat(this.makeCode("{\n"), this.elseBody.compileToFragments(merge(o, {indent}), LEVEL_TOP), this.makeCode(`\n${this.tab}}`));
					}
					return answer;
				}

				// Compile the `If` as a conditional operator.
				compileExpression(o) {
					var alt, body, cond, fragments;
					cond = this.condition.compileToFragments(o, LEVEL_COND);
					body = this.bodyNode().compileToFragments(o, LEVEL_LIST);
					alt = this.elseBodyNode() ? this.elseBodyNode().compileToFragments(o, LEVEL_LIST) : [this.makeCode('void 0')];
					fragments = cond.concat(this.makeCode(" ? "), body, this.makeCode(" : "), alt);
					if (o.level >= LEVEL_COND) {
						return this.wrapInParentheses(fragments);
					} else {
						return fragments;
					}
				}

				unfoldSoak() {
					return this.soak && this;
				}

			};

			If.prototype.children = ['condition', 'body', 'elseBody'];

			return If;

		}).call(this);

		// Constants
		// ---------
		UTILITIES = {
			modulo: function() {
				return 'function(a, b) { return (+a % (b = +b) + b) % b; }';
			},
			boundMethodCheck: function() {
				return "function(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new Error('Bound instance method accessed before binding'); } }";
			},
			// Shortcuts to speed up the lookup time for native functions.
			hasProp: function() {
				return '{}.hasOwnProperty';
			},
			indexOf: function() {
				return '[].indexOf';
			},
			slice: function() {
				return '[].slice';
			},
			splice: function() {
				return '[].splice';
			}
		};

		// Levels indicate a node's position in the AST. Useful for knowing if
		// parens are necessary or superfluous.
		LEVEL_TOP = 1; // ...;

		LEVEL_PAREN = 2; // (...)

		LEVEL_LIST = 3; // [...]

		LEVEL_COND = 4; // ... ? x : y

		LEVEL_OP = 5; // !...

		LEVEL_ACCESS = 6; // ...[0]

		
		// Tabs are two spaces for pretty printing.
		TAB = '  ';

		SIMPLENUM = /^[+-]?\d+$/;

		// Helper Functions
		// ----------------

		// Helper for ensuring that utility functions are assigned at the top level.
		utility = function(name, o) {
			var ref, root;
			({root} = o.scope);
			if (name in root.utilities) {
				return root.utilities[name];
			} else {
				ref = root.freeVariable(name);
				root.assign(ref, UTILITIES[name](o));
				return root.utilities[name] = ref;
			}
		};

		multident = function(code, tab, includingFirstLine = true) {
			var endsWithNewLine;
			endsWithNewLine = code[code.length - 1] === '\n';
			code = (includingFirstLine ? tab : '') + code.replace(/\n/g, `$&${tab}`);
			code = code.replace(/\s+$/, '');
			if (endsWithNewLine) {
				code = code + '\n';
			}
			return code;
		};

		// Wherever in CoffeeScript 1 we might’ve inserted a `makeCode "#{@tab}"` to
		// indent a line of code, now we must account for the possibility of comments
		// preceding that line of code. If there are such comments, indent each line of
		// such comments, and _then_ indent the first following line of code.
		indentInitial = function(fragments, node) {
			var fragment, fragmentIndex, j, len1;
			for (fragmentIndex = j = 0, len1 = fragments.length; j < len1; fragmentIndex = ++j) {
				fragment = fragments[fragmentIndex];
				if (fragment.isHereComment) {
					fragment.code = multident(fragment.code, node.tab);
				} else {
					fragments.splice(fragmentIndex, 0, node.makeCode(`${node.tab}`));
					break;
				}
			}
			return fragments;
		};

		hasLineComments = function(node) {
			var comment, j, len1, ref1;
			if (!node.comments) {
				return false;
			}
			ref1 = node.comments;
			for (j = 0, len1 = ref1.length; j < len1; j++) {
				comment = ref1[j];
				if (comment.here === false) {
					return true;
				}
			}
			return false;
		};

		// Move the `comments` property from one object to another, deleting it from
		// the first object.
		moveComments = function(from, to) {
			if (!(from != null ? from.comments : void 0)) {
				return;
			}
			attachCommentsToNode(from.comments, to);
			return delete from.comments;
		};

		// Sometimes when compiling a node, we want to insert a fragment at the start
		// of an array of fragments; but if the start has one or more comment fragments,
		// we want to insert this fragment after those but before any non-comments.
		unshiftAfterComments = function(fragments, fragmentToInsert) {
			var fragment, fragmentIndex, inserted, j, len1;
			inserted = false;
			for (fragmentIndex = j = 0, len1 = fragments.length; j < len1; fragmentIndex = ++j) {
				fragment = fragments[fragmentIndex];
				if (!(!fragment.isComment)) {
					continue;
				}
				fragments.splice(fragmentIndex, 0, fragmentToInsert);
				inserted = true;
				break;
			}
			if (!inserted) {
				fragments.push(fragmentToInsert);
			}
			return fragments;
		};

		isLiteralArguments = function(node) {
			return node instanceof IdentifierLiteral && node.value === 'arguments';
		};

		isLiteralThis = function(node) {
			return node instanceof ThisLiteral || (node instanceof Code && node.bound);
		};

		shouldCacheOrIsAssignable = function(node) {
			return node.shouldCache() || (typeof node.isAssignable === "function" ? node.isAssignable() : void 0);
		};

		// Unfold a node's child if soak, then tuck the node under created `If`
		unfoldSoak = function(o, parent, name) {
			var ifn;
			if (!(ifn = parent[name].unfoldSoak(o))) {
				return;
			}
			parent[name] = ifn.body;
			ifn.body = new Value(parent);
			return ifn;
		};

		return exports;
	};
	//#endregion

	//#region URL: /coffeescript
	modules['/coffeescript'] = function () {
		var exports = {};
		// CoffeeScript can be used both on the server, as a command-line compiler based
		// on Node.js/V8, or to run CoffeeScript directly in the browser. This module
		// contains the main entry functions for tokenizing, parsing, and compiling
		// source CoffeeScript into JavaScript.
		var FILE_EXTENSIONS, Lexer, SourceMap, base64encode, checkShebangLine, compile, formatSourcePosition, getSourceMap, helpers, lexer, packageJson, parser, sourceMaps, sources, withPrettyErrors,
			indexOf = [].indexOf;

		({Lexer} = require('/lexer'));

		({parser} = require('/parser'));

		helpers = require('/helpers');

		/*BT-
		SourceMap = require('/sourcemap');

		// Require `package.json`, which is two levels above this file, as this file is
		// evaluated from `lib/coffeescript`.
		packageJson = require('../../package.json');
		*/

		// The current CoffeeScript version number.
		exports.VERSION = /*BT- packageJson.version*/'2.3.1';

		/*BT-
		exports.FILE_EXTENSIONS = FILE_EXTENSIONS = ['.coffee', '.litcoffee', '.coffee.md'];
		*/

		// Expose helpers for testing.
		exports.helpers = helpers;

		/*BT-
		// Function that allows for btoa in both nodejs and the browser.
		base64encode = function(src) {
			switch (false) {
				case typeof Buffer !== 'function':
					return Buffer.from(src).toString('base64');
				case typeof btoa !== 'function':
					// The contents of a `<script>` block are encoded via UTF-16, so if any extended
					// characters are used in the block, btoa will fail as it maxes out at UTF-8.
					// See https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding#The_Unicode_Problem
					// for the gory details, and for the solution implemented here.
					return btoa(encodeURIComponent(src).replace(/%([0-9A-F]{2})/g, function(match, p1) {
						return String.fromCharCode('0x' + p1);
					}));
				default:
					throw new Error('Unable to base64 encode inline sourcemap.');
			}
		};
		*/

		// Function wrapper to add source file information to SyntaxErrors thrown by the
		// lexer/parser/compiler.
		withPrettyErrors = function(fn) {
			return function(code, options = {}) {
				var err;
				try {
					return fn.call(this, code, options);
				} catch (error) {
					err = error;
					if (typeof code !== 'string') { // Support `CoffeeScript.nodes(tokens)`.
						throw err;
					}
					throw helpers.updateSyntaxError(err, code, options.filename);
				}
			};
		};

		/*BT-
		// For each compiled file, save its source in memory in case we need to
		// recompile it later. We might need to recompile if the first compilation
		// didn’t create a source map (faster) but something went wrong and we need
		// a stack trace. Assuming that most of the time, code isn’t throwing
		// exceptions, it’s probably more efficient to compile twice only when we
		// need a stack trace, rather than always generating a source map even when
		// it’s not likely to be used. Save in form of `filename`: [`(source)`]
		sources = {};

		// Also save source maps if generated, in form of `(source)`: [`(source map)`].
		sourceMaps = {};
		*/

		// Compile CoffeeScript code to JavaScript, using the Coffee/Jison compiler.

		// If `options.sourceMap` is specified, then `options.filename` must also be
		// specified. All options that can be passed to `SourceMap#generate` may also
		// be passed here.

		// This returns a javascript string, unless `options.sourceMap` is passed,
		// in which case this returns a `{js, v3SourceMap, sourceMap}`
		// object, where sourceMap is a sourcemap.coffee#SourceMap object, handy for
		// doing programmatic lookups.
		exports.compile = compile = withPrettyErrors(function(code, options = {}) {
			var currentColumn, currentLine, encoded, filename, fragment, fragments, generateSourceMap, header, i, j, js, len, len1, map, newLines, ref, ref1, sourceMapDataURI, sourceURL, token, tokens, transpiler, transpilerOptions, transpilerOutput, v3SourceMap;
			// Clone `options`, to avoid mutating the `options` object passed in.
			options = Object.assign({}, options);
			/*BT-
			// Always generate a source map if no filename is passed in, since without a
			// a filename we have no way to retrieve this source later in the event that
			// we need to recompile it to get a source map for `prepareStackTrace`.
			generateSourceMap = options.sourceMap || options.inlineMap || (options.filename == null);
			filename = options.filename || '<anonymous>';
			checkShebangLine(filename, code);
			if (sources[filename] == null) {
				sources[filename] = [];
			}
			sources[filename].push(code);
			if (generateSourceMap) {
				map = new SourceMap;
			}
			*/
			tokens = lexer.tokenize(code, options);
			// Pass a list of referenced variables, so that generated variables won’t get
			// the same name.
			options.referencedVars = (function() {
				var i, len, results;
				results = [];
				for (i = 0, len = tokens.length; i < len; i++) {
					token = tokens[i];
					if (token[0] === 'IDENTIFIER') {
						results.push(token[1]);
					}
				}
				return results;
			})();
			// Check for import or export; if found, force bare mode.
			if (!((options.bare != null) && options.bare === true)) {
				for (i = 0, len = tokens.length; i < len; i++) {
					token = tokens[i];
					if ((ref = token[0]) === 'IMPORT' || ref === 'EXPORT') {
						options.bare = true;
						break;
					}
				}
			}
			fragments = parser.parse(tokens).compileToFragments(options);
			currentLine = 0;
			/*BT-
			if (options.header) {
				currentLine += 1;
			}
			if (options.shiftLine) {
				currentLine += 1;
			}
			*/
			currentColumn = 0;
			js = "";
			for (j = 0, len1 = fragments.length; j < len1; j++) {
				fragment = fragments[j];
				/*BT-
				// Update the sourcemap with data from each fragment.
				if (generateSourceMap) {
					// Do not include empty, whitespace, or semicolon-only fragments.
					if (fragment.locationData && !/^[;\s]*$/.test(fragment.code)) {
						map.add([fragment.locationData.first_line, fragment.locationData.first_column], [currentLine, currentColumn], {
							noReplace: true
						});
					}
					newLines = helpers.count(fragment.code, "\n");
					currentLine += newLines;
					if (newLines) {
						currentColumn = fragment.code.length - (fragment.code.lastIndexOf("\n") + 1);
					} else {
						currentColumn += fragment.code.length;
					}
				}
				*/
				// Copy the code from each fragment into the final JavaScript.
				js += fragment.code;
			}
			/*BT-
			if (options.header) {
				header = `Generated by CoffeeScript ${this.VERSION}`;
				js = `// ${header}\n${js}`;
			}
			if (generateSourceMap) {
				v3SourceMap = map.generate(options, code);
				if (sourceMaps[filename] == null) {
					sourceMaps[filename] = [];
				}
				sourceMaps[filename].push(map);
			}
			if (options.transpile) {
				if (typeof options.transpile !== 'object') {
					// This only happens if run via the Node API and `transpile` is set to
					// something other than an object.
					throw new Error('The transpile option must be given an object with options to pass to Babel');
				}
				// Get the reference to Babel that we have been passed if this compiler
				// is run via the CLI or Node API.
				transpiler = options.transpile.transpile;
				delete options.transpile.transpile;
				transpilerOptions = Object.assign({}, options.transpile);
				// See https://github.com/babel/babel/issues/827#issuecomment-77573107:
				// Babel can take a v3 source map object as input in `inputSourceMap`
				// and it will return an *updated* v3 source map object in its output.
				if (v3SourceMap && (transpilerOptions.inputSourceMap == null)) {
					transpilerOptions.inputSourceMap = v3SourceMap;
				}
				transpilerOutput = transpiler(js, transpilerOptions);
				js = transpilerOutput.code;
				if (v3SourceMap && transpilerOutput.map) {
					v3SourceMap = transpilerOutput.map;
				}
			}
			if (options.inlineMap) {
				encoded = base64encode(JSON.stringify(v3SourceMap));
				sourceMapDataURI = `//# sourceMappingURL=data:application/json;base64,${encoded}`;
				sourceURL = `//# sourceURL=${(ref1 = options.filename) != null ? ref1 : 'coffeescript'}`;
				js = `${js}\n${sourceMapDataURI}\n${sourceURL}`;
			}
			if (options.sourceMap) {
				return {
					js,
					sourceMap: map,
					v3SourceMap: JSON.stringify(v3SourceMap, null, 2)
				};
			} else {
			*/
				return js;
			/*BT-
			}
			*/
		});

		/*BT-
		// Tokenize a string of CoffeeScript code, and return the array of tokens.
		exports.tokens = withPrettyErrors(function(code, options) {
			return lexer.tokenize(code, options);
		});

		// Parse a string of CoffeeScript code or an array of lexed tokens, and
		// return the AST. You can then compile it by calling `.compile()` on the root,
		// or traverse it by using `.traverseChildren()` with a callback.
		exports.nodes = withPrettyErrors(function(source, options) {
			if (typeof source === 'string') {
				return parser.parse(lexer.tokenize(source, options));
			} else {
				return parser.parse(source);
			}
		});

		// This file used to export these methods; leave stubs that throw warnings
		// instead. These methods have been moved into `index.coffee` to provide
		// separate entrypoints for Node and non-Node environments, so that static
		// analysis tools don’t choke on Node packages when compiling for a non-Node
		// environment.
		exports.run = exports.eval = exports.register = function() {
			throw new Error('require index.coffee, not this file');
		};
		*/

		// Instantiate a Lexer for our use here.
		lexer = new Lexer;

		// The real Lexer produces a generic stream of tokens. This object provides a
		// thin wrapper around it, compatible with the Jison API. We can then pass it
		// directly as a “Jison lexer.”
		parser.lexer = {
			lex: function() {
				var tag, token;
				token = parser.tokens[this.pos++];
				if (token) {
					[tag, this.yytext, this.yylloc] = token;
					parser.errorToken = token.origin || token;
					this.yylineno = this.yylloc.first_line;
				} else {
					tag = '';
				}
				return tag;
			},
			setInput: function(tokens) {
				parser.tokens = tokens;
				return this.pos = 0;
			},
			upcomingInput: function() {
				return '';
			}
		};

		// Make all the AST nodes visible to the parser.
		parser.yy = require('/nodes');

		// Override Jison's default error handling function.
		parser.yy.parseError = function(message, {token}) {
			var errorLoc, errorTag, errorText, errorToken, tokens;
			// Disregard Jison's message, it contains redundant line number information.
			// Disregard the token, we take its value directly from the lexer in case
			// the error is caused by a generated token which might refer to its origin.
			({errorToken, tokens} = parser);
			[errorTag, errorText, errorLoc] = errorToken;
			errorText = (function() {
				switch (false) {
					case errorToken !== tokens[tokens.length - 1]:
						return 'end of input';
					case errorTag !== 'INDENT' && errorTag !== 'OUTDENT':
						return 'indentation';
					case errorTag !== 'IDENTIFIER' && errorTag !== 'NUMBER' && errorTag !== 'INFINITY' && errorTag !== 'STRING' && errorTag !== 'STRING_START' && errorTag !== 'REGEX' && errorTag !== 'REGEX_START':
						return errorTag.replace(/_START$/, '').toLowerCase();
					default:
						return helpers.nameWhitespaceCharacter(errorText);
				}
			})();
			// The second argument has a `loc` property, which should have the location
			// data for this token. Unfortunately, Jison seems to send an outdated `loc`
			// (from the previous token), so we take the location information directly
			// from the lexer.
			return helpers.throwSyntaxError(`unexpected ${errorText}`, errorLoc);
		};

		/*BT-
		// Based on http://v8.googlecode.com/svn/branches/bleeding_edge/src/messages.js
		// Modified to handle sourceMap
		formatSourcePosition = function(frame, getSourceMapping) {
			var as, column, fileLocation, filename, functionName, isConstructor, isMethodCall, line, methodName, source, tp, typeName;
			filename = void 0;
			fileLocation = '';
			if (frame.isNative()) {
				fileLocation = "native";
			} else {
				if (frame.isEval()) {
					filename = frame.getScriptNameOrSourceURL();
					if (!filename) {
						fileLocation = `${frame.getEvalOrigin()}, `;
					}
				} else {
					filename = frame.getFileName();
				}
				filename || (filename = "<anonymous>");
				line = frame.getLineNumber();
				column = frame.getColumnNumber();
				// Check for a sourceMap position
				source = getSourceMapping(filename, line, column);
				fileLocation = source ? `${filename}:${source[0]}:${source[1]}` : `${filename}:${line}:${column}`;
			}
			functionName = frame.getFunctionName();
			isConstructor = frame.isConstructor();
			isMethodCall = !(frame.isToplevel() || isConstructor);
			if (isMethodCall) {
				methodName = frame.getMethodName();
				typeName = frame.getTypeName();
				if (functionName) {
					tp = as = '';
					if (typeName && functionName.indexOf(typeName)) {
						tp = `${typeName}.`;
					}
					if (methodName && functionName.indexOf(`.${methodName}`) !== functionName.length - methodName.length - 1) {
						as = ` [as ${methodName}]`;
					}
					return `${tp}${functionName}${as} (${fileLocation})`;
				} else {
					return `${typeName}.${methodName || '<anonymous>'} (${fileLocation})`;
				}
			} else if (isConstructor) {
				return `new ${functionName || '<anonymous>'} (${fileLocation})`;
			} else if (functionName) {
				return `${functionName} (${fileLocation})`;
			} else {
				return fileLocation;
			}
		};

		getSourceMap = function(filename, line, column) {
			var answer, i, map, ref, ref1, sourceLocation;
			if (!(filename === '<anonymous>' || (ref = filename.slice(filename.lastIndexOf('.')), indexOf.call(FILE_EXTENSIONS, ref) >= 0))) {
				// Skip files that we didn’t compile, like Node system files that appear in
				// the stack trace, as they never have source maps.
				return null;
			}
			if (filename !== '<anonymous>' && (sourceMaps[filename] != null)) {
				return sourceMaps[filename][sourceMaps[filename].length - 1];
			// CoffeeScript compiled in a browser or via `CoffeeScript.compile` or `.run`
			// may get compiled with `options.filename` that’s missing, which becomes
			// `<anonymous>`; but the runtime might request the stack trace with the
			// filename of the script file. See if we have a source map cached under
			// `<anonymous>` that matches the error.
			} else if (sourceMaps['<anonymous>'] != null) {
				ref1 = sourceMaps['<anonymous>'];
				// Work backwards from the most recent anonymous source maps, until we find
				// one that works. This isn’t foolproof; there is a chance that multiple
				// source maps will have line/column pairs that match. But we have no other
				// way to match them. `frame.getFunction().toString()` doesn’t always work,
				// and it’s not foolproof either.
				for (i = ref1.length - 1; i >= 0; i += -1) {
					map = ref1[i];
					sourceLocation = map.sourceLocation([line - 1, column - 1]);
					if (((sourceLocation != null ? sourceLocation[0] : void 0) != null) && (sourceLocation[1] != null)) {
						return map;
					}
				}
			}
			// If all else fails, recompile this source to get a source map. We need the
			// previous section (for `<anonymous>`) despite this option, because after it
			// gets compiled we will still need to look it up from
			// `sourceMaps['<anonymous>']` in order to find and return it. That’s why we
			// start searching from the end in the previous block, because most of the
			// time the source map we want is the last one.
			if (sources[filename] != null) {
				answer = compile(sources[filename][sources[filename].length - 1], {
					filename: filename,
					sourceMap: true,
					literate: helpers.isLiterate(filename)
				});
				return answer.sourceMap;
			} else {
				return null;
			}
		};

		// Based on [michaelficarra/CoffeeScriptRedux](http://goo.gl/ZTx1p)
		// NodeJS / V8 have no support for transforming positions in stack traces using
		// sourceMap, so we must monkey-patch Error to display CoffeeScript source
		// positions.
		Error.prepareStackTrace = function(err, stack) {
			var frame, frames, getSourceMapping;
			getSourceMapping = function(filename, line, column) {
				var answer, sourceMap;
				sourceMap = getSourceMap(filename, line, column);
				if (sourceMap != null) {
					answer = sourceMap.sourceLocation([line - 1, column - 1]);
				}
				if (answer != null) {
					return [answer[0] + 1, answer[1] + 1];
				} else {
					return null;
				}
			};
			frames = (function() {
				var i, len, results;
				results = [];
				for (i = 0, len = stack.length; i < len; i++) {
					frame = stack[i];
					if (frame.getFunction() === exports.run) {
						break;
					}
					results.push(`    at ${formatSourcePosition(frame, getSourceMapping)}`);
				}
				return results;
			})();
			return `${err.toString()}\n${frames.join('\n')}\n`;
		};

		checkShebangLine = function(file, input) {
			var args, firstLine, ref, rest;
			firstLine = input.split(/$/m)[0];
			rest = firstLine != null ? firstLine.match(/^#!\s*([^\s]+\s*)(.*)/) : void 0;
			args = rest != null ? (ref = rest[2]) != null ? ref.split(/\s/).filter(function(s) {
				return s !== '';
			}) : void 0 : void 0;
			if ((args != null ? args.length : void 0) > 1) {
				console.error('The script to be run begins with a shebang line with more than one\nargument. This script will fail on platforms such as Linux which only\nallow a single argument.');
				console.error(`The shebang line was: '${firstLine}' in file '${file}'`);
				return console.error(`The arguments were: ${JSON.stringify(args)}`);
			}
		};
		*/

		return exports;
	};
	//#endregion

	return require('/coffeescript');
 })();