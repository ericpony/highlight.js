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
        syntax: {
          type:      /\b[$_]*[A-Z][$\w]*\b/g,
          keyword:  'yield lazy override with false true sealed abstract private null if for while throw finally protected extends import final return else break new catch super class case package default try this match continue throws implicitly implicit _[\\d]+',
          literal:  { r: /\b'[a-zA-Z_$][\w$]*(?!['$\w])\b/g, css: STYLE.symbol }, // symbol literal
          type_ctor: /\b(?:(object|trait|class)\s+([$\w]+)([^=\n({]*)(\([^)]*\))|(object|trait|class|type)\s+([$\w]+)|()([\w$]+)(?=\s*:)|()([$\w]+)(?=\s*<-))/g,
          ref_ctor:  /\b(?:(val|var|def)\s+([$\w]+)([^=(]*)(\([^)]*\))|(val|var|def)\s+([$\w]+))/g,
          //ref_ctor:  /\b(?:(val|var|def)\s+([$\w]+)[^=()]*(\([^)]*\))|(val|var|def)\s+([$\w]+)(?=[^()]*=)|(val|var)\s+([$\w]+)|()([$\w]+)(?=\s+<-))/g,
        },
        param_list_rule: ''
    },
    'JavaScript': { // incomplete
        syntax: {
          type:      'Object Function Boolean Error EvalError InternalError RangeError ReferenceError StopIteration SyntaxError TypeError URIError Number Math Date String RegExp Array Float32Array Float64Array Int16Array Int32Array Int8Array Uint16Array Uint32Array Uint8Array Uint8ClampedArray ArrayBuffer DataView JSON Intl',
          keyword:   'in if for while finally yield do return void else break catch instanceof with throw case default try this switch continue typeof delete let yield const class',
          built_in:  'eval isFinite isNaN parseFloat parseInt decodeURI decodeURIComponent encodeURI encodeURIComponent escape unescape arguments require',
          type_ctor: /\b(new)\s+([$\w]+)/g,
          ref_ctor:  /\b(?:(var|let)\s+([$\w]+)|(function\*?)\b\s*([$\w]*)\s*(\([^)]*\))|()([\w$]+)(?=:))/g
        },
        param_list_rule: /([$\w]+)([^,]*,?\W*)/g,
    },
    'Java': { // untested
        syntax: {
          type:      'int float char boolean void long short double String null',
          keyword:   'false synchronized abstract private static if const for true while strictfp finally protected import native final enum else break transient catch instanceof byte super volatile case assert short package default public try this switch continue throws protected public private new return throw throws',
          type_ctor: /(?:\b(interface|class|extends|implements)\s+([$\w]+)|(\s+)([$\w]+)(?=\s+=\s+))/g
        },
        param_list_rule: ''
    },
    'C++': { // untested
      syntax: {
        type_ctor: '',
        type:      'char bool short int long float double unsigned clock_t size_t va_list __int32 __int64',
        keyword:   'break case catch class const const_cast continue default delete do dynamic_cast else enum explicit extern if for friend goto inline mutable namespace new operator private public protected register reinterpret_cast return sizeof static static_cast struct switch template this throw true false try typedef typeid typename union using virtual void volatile while',
      },
      param_list_rule: ''
    }
  };
  LANG['Cpp'] = LANG['C'] = LANG['C++'];

  var COMMON = [
    {r: /\/\*[\s\S]*?\*\//gm, css: STYLE.comments },
    {r: /\/\/.*$/gm,            css: STYLE.comment },
    {r: /^ *#.*/gm,             css: STYLE.macro },
    {r: /"[^"]*"/g,             css: STYLE.string },
    {r: /'[^']*'/g,             css: STYLE.character },
    {r: /0[xX][\da-fA-F]+/g,    css: STYLE.hex_value },
    {r: /\b\d*\.?\d+[eE]?\d*/g, css: STYLE.numeric },
    {r: /[{}]/g,                css: '' }
  ];

  function change_style(classname, highlighted) {
    var elems = document.querySelectorAll('.' + classname);
    for(var i=0; i<elems.length; i++) {
      elems[i].style.fontWeight = highlighted ? 'bolder' : '';
      elems[i].style.backgroundColor = highlighted ? 'yellow' : '';
    }
  }

  var cache;

  function colorize(str, css, attr)
  {
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
          span.innerText = lines[i];
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
    }
  }

  function createSyntaxRules(lang) {
    var syntax = LANG[lang].syntax;
    if(!syntax) return null;
    if(syntax.processed) return syntax;
    function regex(str) {
      if(!str) return '';
      return '\\b(?:' + str.replace(/ /g, '|') + ')\\b';
    }
    function regexp(pattern) {
      if(typeof pattern != 'string') return pattern;
      return new RegExp(regex(pattern), 'g');
    }
    function create_nominal(nominals) {
      if(nominals[0]) {
        var scope = cache.scopes.current();
        var name = 'r' + scope.id + '-' + nominals[0];
        var attr = {
          onmouseover:  function(e) { change_style(name, true) },
          onmouseleave: function(e) { change_style(name, false) },
        };
        attr.className = LANG[lang].syntax.type_ctor.css + ' ' + name;
        attr.name      = name;
        colorize(nominals[0], undefined, attr);
        cache.scopes.add_nominal(nominals[0]);
      }
      for(var i=1; i<nominals.length; i++) {
        if(!nominals[i]) continue;
        if(nominals[i][0]!='(' || nominals[i][nominals[i].length-1]!=')') {
          colorize(nominals[i]);
          continue;
        }
        var param_list = nominals[i].slice(1, -1);
        colorize('(');
        cache.scopes.create(true);
        if(param_list) { // is nonempty
          var param_rule = LANG[lang].param_list_rule;
          if(!param_rule) 
            parse(param_list);
          else {
            var rr, r = new RegExp(param_rule);
            while ((rr = r.exec(param_list)) !== null) {
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
    syntax.processed = true;
    syntax.keyword   = syntax.keyword   ? { r: regexp(syntax.keyword),  css: STYLE.keyword,  p:0 } : {};
    syntax.type      = syntax.type      ? { r: regexp(syntax.type),     css: STYLE.type,     p:1 } : {};
    syntax.built_in  = syntax.built_in  ? { r: regexp(syntax.built_in), css: STYLE.built_in, p:0 } : {};
    syntax.type_ctor = syntax.type_ctor ? { r: syntax.type_ctor,        css: STYLE.type,     p:3, update: create_nominal } : {};
    syntax.ref_ctor  = syntax.ref_ctor  ? { r: syntax.ref_ctor,         css: STYLE.nominal,  p:3, update: create_nominal } : {};
    return syntax;
  }
  var scopes = (function(){
    var _stack = [];
    var _lang;
    function gen_id() { return Math.random().toString().substr(2,4) }
    return {
      id:      gen_id(),
      init:    function(lang) { _lang = lang; _stack = []; this.create(); return this },
      destroy: function() { _stack.pop(); this.update_regex(); if(!this.current()){debugger} },
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
        scope.nominal_regex = !scope.nominal_regex ? ('\\b' + name + '\\b') : (scope.nominal_regex + '|\\b' + name + '\\b');
        scope.nominals[name] = true;
        this.update_regex();
      },
      update_regex: function() {
        var syntax  = LANG[lang].syntax;
        var regexes = [];
        for(var i=0; i<_stack.length; i++)
          if(_stack[i].nominal_regex)
            regexes.push(_stack[i].nominal_regex);
        if(!regexes.length) return;
        var r = new RegExp(regexes.join('|'), 'g');
        r.index     = cache.nominal.r.index;
        r.lastIndex = cache.nominal.r.lastIndex;
        cache.nominal.r = r;
      },
      state: function() { return _stack }
    };
  })();
  function parse(text) {
    var last_index = 0, attr;
    var lexers = (function (SYNTAX) {
      var ret = [];
      for(var rule in COMMON) ret.push(COMMON[rule]);
      for(var rule in SYNTAX) ret.push(SYNTAX[rule]);
//      for(var rule in SYNTAX) SYNTAX[rule] && ret.push({r:SYNTAX[rule].r,css:SYNTAX[rule].css,update:SYNTAX[rule].update});
//      for(var rule in SYNTAX) SYNTAX[rule] && ret.push(SYNTAX[rule]);
      for(var i=0; i<ret.length; i++) {
        var rule = ret[i];
        if(!rule.r) continue;
        ret[i] = {
          r:      rule.r ? new RegExp(rule.r) : '',
          p:      rule.p || 0,
          css:    rule.css,
          update: rule.update
        };
      }
      ret.push(cache.nominal);
      return ret;
    })(cache.syntax);
    var pos = lexers.map(function(){ return 0 });
    var tokens = [];
    //var nominal_last_index = cache.nominal.r.lastIndex;
    lexers[-1] = { p:-1 }; // hack

    while(true) {
      var ii = -1;
      var p0 = p = text.length;
      for(var i = 0; i < lexers.length; i++) {
        if(pos[i] == null) continue;
        if(!lexers[i].r) continue;
        if(!pos[i] || pos[i].index < last_index) {
          lexers[i].r.lastIndex = last_index;
          pos[i] = lexers[i].r.exec(text);
          if(pos[i] == null) continue;
          tokens[i] = [undefined, pos[i][0]];
          if(pos[i].length>=2) {
            for(var j=1, k=0; j<pos[i].length; j++) {
              while(pos[i][j]===undefined && ++j<pos[i].length);
              tokens[i][k++] = pos[i][j];
            }
          }
        }
        if(pos[i].index<p || (pos[i].index==p && lexers[ii].p<lexers[i].p)) { p = pos[i].index; ii = i; }
      }

      if(ii == -1) { colorize(text.slice(last_index)); break; } // no highlight needed anymore

      colorize(text.slice(last_index, p));  // generate plaintext for text[last_index...p-1]
      if(tokens[ii][0]) {
        colorize(tokens[ii][0] + ' ', STYLE.keyword);
      }else {
        if(tokens[ii][1] == '{') {
          cache.scopes.create();
        }else if(tokens[ii][1] == '}') {
          cache.scopes.destroy();
          pos[pos.length-1] = 0;  // reset the last position of searched text for nominal rule
        }
      }
      if(lexers[ii].update) {
        if(lexers[ii].update(tokens[ii].slice(1)))
          pos[pos.length-1] = 0;  // reset the last position of searched text for nominal rule
      }else
        colorize(tokens[ii][1], lexers[ii].css);

      if(last_index == lexers[ii].r.lastIndex) { alert('[Error] Infinite parsing loop in highlight.js'); break }
      last_index = lexers[ii].r.lastIndex;
      attr = undefined;
    }// end of while
    //cache.nominal.r.lastIndex = nominal_last_index;
  }

  function createHighlightedCode(lang, element, options)
  {
    function create_ref(nominals) {
      var scope = cache.scopes.lookup(nominals[0]);
      //if(!scope) return create_nominal(nominals);
      if(!scope) { colorize(nominals[0]); return false }
      var name = 'r' + scope.id + '-' + nominals[0];
      attr = {
        className:    LANG[lang].syntax.ref_ctor.css + ' ' + name,
        onclick:      function(e) { location.href = '#' + name },
        onmouseover:  function(e) { change_style(name, true) },
        onmouseleave: function(e) { change_style(name, false) },
      };
      colorize(nominals[0], undefined, attr);
      return false;
    }
    options = options || {};
    //cache = cache || {};
    cache = {};
    cache.scopes = scopes.init();
    cache.syntax = createSyntaxRules(lang);
    cache.nominal   = { r:'', css:STYLE.nominal, p:2, update:create_ref };
    cache.codeArea = options['lineno'] ? document.createElement('OL') : document.createElement('UL');
    //var text = element.innerText
               //.replace(/&lt;/g,   '<')
               //.replace(/&gt;/g,   '>')
               //.replace(/&quot;/g, '"')
               //.replace(/&nbsp;/g, ' ')
               //.replace(/&amp;/g,  '&');
               //console.log(text);
    parse(element.innerText);

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

  for(var lang in LANG) {
    var snippets = document.getElementsByClassName(lang);
    while(snippets.length) {
      var code = snippets[0];
      var options  = {lineno: 1||code.attributes['lineno'] };
      createHighlightedCode(lang, code, options);
    }
  }
})();
