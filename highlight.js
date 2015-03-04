(function() {

  var STYLE = {// CSS classes
    keyword:  'keyword',
    type:     'type',
    built_in: 'built-in',
    nominal:  'nominal',
    string:   'string',
    comment:  'comment',  // single line
    comments: 'comments', // block
    character:'char',
    hex_value:'hex',
    numeric:  'value',
    macro:    'macro',
    symbol:   'symbol',
    constant: 'constant'
  };

  var LANG = {
    'Scala': { // incomplete
        regex: {
          type:      /\b[$_]*[A-Z][$\w]*\b/g,
          keyword:  'yield lazy override with false true sealed abstract private null if for while throw finally protected extends import final return else break new catch super class case package default try this match continue throws implicitly implicit _[\\d]+',
          literal:  { r: /\b'[a-zA-Z_$][\w$]*(?!['$\w])\b/g, css: STYLE.symbol }, // symbol literal
          type_ctor: /\b(?:(object|trait|class)\s+([$\w]+)([^=\n({]*)(\([^)]*\))|(object|trait|class|type)\s+([$\w]+)|()([\w$]+)(?=\s*:)|()([$\w]+)(?=\s*<-))/g,
          ref_ctor:  /\b(?:(val|var|def)\s+([$\w]+)([^=(]*)(\([^)]*\))|(val|var|def)\s+([$\w]+))/g,
          //ref_ctor:  /\b(?:(val|var|def)\s+([$\w]+)[^=()]*(\([^)]*\))|(val|var|def)\s+([$\w]+)(?=[^()]*=)|(val|var)\s+([$\w]+)|()([$\w]+)(?=\s+<-))/g,
        },
        paramlist_regex: ''
    },
    'JavaScript': { // incomplete
        regex: {
          type:      'Object Function Boolean Error EvalError InternalError RangeError ReferenceError StopIteration SyntaxError TypeError URIError Number Math Date String RegExp Array Float32Array Float64Array Int16Array Int32Array Int8Array Uint16Array Uint32Array Uint8Array Uint8ClampedArray ArrayBuffer DataView JSON Intl',
          keyword:   'new in if for while finally yield do return void else break catch instanceof with throw case default try this switch continue typeof delete let yield const class',
          built_in:  'eval isFinite isNaN parseFloat parseInt decodeURI decodeURIComponent encodeURI encodeURIComponent escape unescape arguments require',
          ref_ctor:  /\b(?:(var|let)\s+([$\w]+)|(function\*?)\b\s*([$\w]*)\s*(\([^)]*\))|()([\w$]+)(?=:))/g
        },
        paramlist_regex: /([$\w]+)([^,]*,?\W*)/g,
    },
    'Java': { // untested
        regex: {
          type:      'int float char boolean void long short double String null',
          keyword:   'false synchronized abstract private static if const for true while strictfp finally protected import native final enum else break transient catch instanceof byte super volatile case assert short package default public try this switch continue throws protected public private new return throw throws',
          type_ctor: /(?:\b(interface|class|extends|implements)\s+([$\w]+)|(\s+)([$\w]+)(?=\s+=\s+))/g
        },
        paramlist_regex: ''
    },
    'C++': { // untested
      regex: {
        type_ctor: '',
        type:      'char bool short int long float double unsigned clock_t size_t va_list __int32 __int64',
        keyword:   'break case catch class const const_cast continue default delete do dynamic_cast else enum explicit extern if for friend goto inline mutable namespace new operator private public protected register reinterpret_cast return sizeof static static_cast struct switch template this throw true false try typedef typeid typename union using virtual void volatile while',
      },
      paramlist_regex: ''
    }
  };
  LANG['Cpp'] = LANG['C'] = LANG['C++'];

  var COMMON = [
    {r: /\/\*[\s\S]*?\*\//gm,   css: STYLE.comments,  p:0 },
    {r: /\/\/.*$/gm,            css: STYLE.comment,   p:0 },
    {r: /^ *#.*/gm,             css: STYLE.macro,     p:0 },
    {r: /"[^"]*"/g,             css: STYLE.string,    p:0 },
    {r: /'[^']*'/g,             css: STYLE.character, p:0 },
    {r: /0[xX][\da-fA-F]+/g,    css: STYLE.hex_value, p:0 },
    {r: /\b\d*\.?\d+[eE]?\d*/g, css: STYLE.numeric,   p:0 },
    {r: /[{}]/g,                css: '',              p:0 }
  ];

  var cache = {};

  var create_link = (function() {
    function lighten(name, on) {
      var elems = document.querySelectorAll('.' + name);
      for(var i=0; i<elems.length; i++) {
        elems[i].style.fontWeight = on ? 'bolder' : '';
        elems[i].style.backgroundColor = on ? 'yellow' : '';
      }
    }
    return function(name) {
      return {
        onmouseover:  function(e) { lighten(name, true)  },
        onmouseleave: function(e) { lighten(name, false) }
      }
    }
  })();

 var create_syntax = (function() {
    function regexp(pattern) {
      if(!pattern || typeof pattern != 'string') return pattern;
      return new RegExp('\\b(?:' + pattern.replace(/ /g, '|') + ')\\b', 'g');
    }
    function create_nominal(nominals) {
      if(nominals[0]) {
        var scope = scopes.current();
        var name = 'r' + scope.id + '-' + nominals[0];
        var attr = create_link(name);
        //attr.className = cache.syntax.type_ctor.css + ' ' + name;
        attr.className = STYLE.type + ' ' + name;
        attr.name      = name;
        colorize(nominals[0], undefined, attr);
        scopes.add_nominal(nominals[0]);
      }
      for(var i=1; i<nominals.length; i++) {
        if(!nominals[i]) continue;
        if(nominals[i][0]!='(' || nominals[i][nominals[i].length-1]!=')') {
          colorize(nominals[i]);
          continue;
        }
        var paramlist = nominals[i].slice(1, -1);
        colorize('(');
        scopes.create(true);
        if(paramlist) { // is nonempty
          var paramlist_rule = cache.paramlist_regex;
          if(!paramlist_rule)
            parse(paramlist);
          else {
            var rr, r = new RegExp(paramlist_rule);
            while ((rr = r.exec(paramlist)) !== null) {
              create_nominal([rr[1]]);
              //colorize(rr[2]);
              parse(rr[2]);
            }
          }
        }
        colorize(')');
      }
      return true;
    }
    return function(lang) {
      var syntax = LANG[lang].regex;
      if(syntax.keyword)   syntax.keyword   = { r: regexp(syntax.keyword),  css: STYLE.keyword,  p: 0 };
      if(syntax.type)      syntax.type      = { r: regexp(syntax.type),     css: STYLE.type,     p: 1 };
      if(syntax.built_in)  syntax.built_in  = { r: regexp(syntax.built_in), css: STYLE.built_in, p: 0 };
      if(syntax.type_ctor) syntax.type_ctor = { r: syntax.type_ctor,        css: STYLE.type,     p: 3, update: create_nominal };
      if(syntax.ref_ctor)  syntax.ref_ctor  = { r: syntax.ref_ctor,         css: STYLE.nominal,  p: 3, update: create_nominal };
      return syntax;
    }
  })();

  var scopes = (function() {
    var _stack = [];
    var _lang;
    function gen_id() { return Math.random().toString().substr(2,4) }
    return {
      id:      gen_id(),
      reset:   function(lang) { _lang = lang; _stack = []; this.create(); return this },
      destroy: function() { _stack.pop(); this.update_nominals(); if(!this.current()){debugger} },
      current: function() { return _stack[_stack.length-1] },
      create:  function(is_half_opened) {
        var scope = this.current();
        if(scope && scope.is_half_opened)
          scope.is_half_opened = false;
        else
          _stack.push({ id: this.id + '-' + gen_id(), open:is_half_opened, nominals:{}, nominal_regex:'' });
      },
      lookup:  function(name) {
        for(var i=_stack.length-1; i>=0; i--)
          if(_stack[i].nominals[name]) return _stack[i];
      },
      add_nominal: function(name) {
        var scope = this.current();
        if(scope.nominals[name]) return;
        scope.nominal_regex = !scope.nominal_regex ? name : (scope.nominal_regex + '|' + name);
        scope.nominals[name] = true;
        this.update_nominals();
      },
      update_nominals: function() {
        var regexes = '';
        for(var i=0; i<_stack.length; i++)
          if(_stack[i].nominal_regex)
            regexes += '|' + _stack[i].nominal_regex;
        if(!regexes.length) return;
        var r = new RegExp('\\b(?:' + regexes.slice(1) + ')\\b', 'g');
        r.index     = LANG.nominal.r.index;
        r.lastIndex = LANG.nominal.r.lastIndex;
        LANG.nominal.r = r;
      },
      state: function() { return _stack }
    };
  })();

  function colorize(str, css, attr) {
    if(!str) return;
    //var lines = escape(str).split('\n');
    var lines = str.split('\n');
    for(var i = 0; i < lines.length; i++) {
      if(!cache.line) {
        var li = document.createElement('LI');
        var line = document.createElement('SPAN');
        line.className = 'code';
        li.appendChild(line);
        cache.line = line;
      }
      if(lines[i] != '') {
        if(!css && !attr)
          cache.line.appendChild(document.createTextNode(lines[i].replace(/ /g,'\u00a0')));
        else {
          var span = document.createElement('SPAN');
          span.className = css;
          span.textContent = lines[i];
          if(attr) {
            if(attr.name) {
              var anchor = document.createElement('A');
              anchor.name = attr.name;
              anchor.style.cursor = 'default';
              anchor.style.textDecoration = 'none';
              anchor.appendChild(span);
              span = anchor;
            }
            for(var a in attr) span[a] = attr[a];
          }
          cache.line.appendChild(span);
        }
      }
      if(i+1 < lines.length) {
        // FF need insert '&nbsp;' to make empty <li> displayed
        if(cache.line.innerHTML == '') cache.line.innerHTML = '&nbsp;';
        cache.codeArea.appendChild(cache.line.parentNode);
        cache.line = null;
      }
    } // end of for
  }

  function parse(text) {
    var last_index = 0, attr;
    var lexers = cache.lexers;
    var matchs = lexers.map(function(){ return 0 });
    var states = lexers.map(function(lexer){ return lexer.r.lastIndex });
    var tokens = [];

    while(true) {
      var ii  = -1;
      var pos = text.length;
      for(var i = 0; i < lexers.length; i++) {
        if(matchs[i] == null) continue;
        if(!lexers[i].r) continue;
        if(!matchs[i] || matchs[i].index < last_index) {
          lexers[i].r.lastIndex = last_index;
          matchs[i] = lexers[i].r.exec(text);
          if(matchs[i] == null) continue;
          tokens[i] = [undefined, matchs[i][0]];
          if(matchs[i].length>=2) {
            for(var j=1, k=0; j<matchs[i].length; j++) {
              while(matchs[i][j]===undefined && ++j<matchs[i].length);
              tokens[i][k++] = matchs[i][j];
            }
          }
        }
        if(matchs[i].index<pos || (matchs[i].index==pos && lexers[ii].p<lexers[i].p)) {
          pos = matchs[i].index;
          ii = i;
        }
      }// end of for

      if(ii == -1) { colorize(text.slice(last_index)); break; } // no highlight needed anymore

      colorize(text.slice(last_index, pos));  // generate plaintext for text[last_index...pos-1]

      if(tokens[ii][0]) {
        colorize(tokens[ii][0] + ' ', STYLE.keyword);
      }else {
        if(tokens[ii][1] == '{') {
          scopes.create();
        }else if(tokens[ii][1] == '}') {
          scopes.destroy();
          matchs[matchs.length-1] = 0;  // reset searched test for nominal rule
        }
      }
      if(lexers[ii].update) {
        if(lexers[ii].update(tokens[ii].slice(1)))
          matchs[matchs.length-1] = 0;  // reset searched test for nominal rule
      }else
        colorize(tokens[ii][1], lexers[ii].css);

      if(last_index == lexers[ii].r.lastIndex) { alert('[Error] Infinite parsing loop in highlight.js'); break }
      last_index = lexers[ii].r.lastIndex;
      attr = undefined;
    }// end of while
    states.forEach(function(s,i){ lexers[i].r.lastIndex = s });
  }

  function create_highlighted_code(element, attr, options) {
    options = options || {};
    //cache = cache || {};
    for(var a in attr) cache[a] = attr[a];
    LANG.nominal.r = '';
    cache.codeArea    = options['lineno'] ? document.createElement('OL') : document.createElement('UL');
    scopes.reset();
    //var text = element.textContent
               //.replace(/&lt;/g,   '<')
               //.replace(/&gt;/g,   '>')
               //.replace(/&quot;/g, '"')
               //.replace(/&nbsp;/g, ' ')
               //.replace(/&amp;/g,  '&');
               //console.log(text);
    parse(element.textContent);

    var div = document.createElement('DIV');
    div.className = 'sh';
    while (div.firstChild) {
      div.removeChild(div.firstChild);
    }
    if(cache.line && cache.line.innerHTML)
      cache.codeArea.appendChild(cache.line.parentNode);
    div.appendChild(cache.codeArea);
    element.parentNode.replaceChild(div, element);
  }

  LANG.nominal = {
    css:    STYLE.nominal,
    update: function(nominals) {
      var scope = scopes.lookup(nominals[0]);
      //if(!scope) return create_nominal(nominals);
      if(!scope) { colorize(nominals[0]); return false }
      var name = 'r' + scope.id + '-' + nominals[0];
      attr = create_link(name);
      attr.className = LANG.nominal.css + ' ' + name,
      attr.onclick   = function(e) {
        location.href = '#' + name;
        var node = document.querySelector('[name=' + name + ']').parentNode.parentNode;
        node.style.transition = '';
        node.style.backgroundColor = '#FF0';
        setTimeout(function() { 
          node.style.transition = 'background .5s ease-in-out';
          node.style.backgroundColor = '';
        }, 10);
      };
      colorize(nominals[0], undefined, attr);
      return false;
    },
    p: 2
  };

  for(var lang in LANG) {
    LANG[lang].syntax = create_syntax(lang);
    LANG[lang].lexers = (function(SYNTAX) {
      var ret = [];
      for(var rule in COMMON) ret.push(COMMON[rule]);
      for(var rule in SYNTAX) ret.push(SYNTAX[rule]);
      ret[-1] = { p: -1 }; // just a hack
      ret.push(LANG.nominal);
      return ret;
    })(LANG[lang].syntax);

    var snippets = document.getElementsByClassName(lang);

    while(snippets.length) {
      var code = snippets[0];
      var options  = {lineno: 1||code.attributes['lineno'] };
      create_highlighted_code(code, LANG[lang], options);
    }
  }
})();
