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
      type_ctor: /\b(type|object|trait|class)\s+([$\w]+)/g,
      ref_ctor:  /\b(?:(val|var|def)\s+([$\w]+)[^=(]*\(([^)]*)\)|(val|var|def)\s+([$\w]+)|()([$\w]+)(?=\s+<-))/g,
      //nominal:   '', // a workaround to prevent nominals from being preempted by type rule. Elaboration needed.
      type:      /\b[$_]*[A-Z][$\w]*\b/g,
      keyword:  'type yield lazy override with false true sealed abstract private null if for while throw finally protected extends import final return else break new catch super class case package default try this match continue throws implicitly implicit _[\\d]+',
      literal:  { r: /\b'[a-zA-Z_$][\w$]*(?!['$\w])\b/g, css: STYLE.symbol } // symbol literal
    },
    'JavaScript': { // incomplete
      //type_ctor: /\b(function\*?(?=\s+[A-Z])|new)\s+([$\w]+)/g,
      ref_ctor:  /\b(?:(var|let)\s+([$\w]+)|(function\*?)\b\s*([$\w]*)\s*\(([^)]*)\)|()([\w$]+)(?=:))/g,//|(function\*?)\s*\(([^)]*)\))/g,
      type:      'Object Function Boolean Error EvalError InternalError RangeError ReferenceError StopIteration SyntaxError TypeError URIError Number Math Date String RegExp Array Float32Array Float64Array Int16Array Int32Array Int8Array Uint16Array Uint32Array Uint8Array Uint8ClampedArray ArrayBuffer DataView JSON Intl',
      keyword:   'in if for while finally yield do return void else break catch instanceof with throw case default try this switch continue typeof delete let yield const class',
      built_in:  'eval isFinite isNaN parseFloat parseInt decodeURI decodeURIComponent encodeURI encodeURIComponent escape unescape arguments require'
    },
    'Java': { // incomplete
      type_ctor: /(?:\b(interface|class|extends|implements)\s+([$\w]+)|(\s+)([$\w]+)(?=\s+=\s+))/g,
      type:      'int float char boolean void long short double String null',
      keyword:   'false synchronized abstract private static if const for true while strictfp finally protected import native final enum else break transient catch instanceof byte super volatile case assert short package default public try this switch continue throws protected public private new return throw throws',
    },
    'C++': { // incomplete
      type_ctor: '',
      type:      'char bool short int long float double unsigned clock_t size_t va_list __int32 __int64',
      keyword:   'break case catch class const const_cast continue default delete do dynamic_cast else enum explicit extern if for friend goto inline mutable namespace new operator private public protected register reinterpret_cast return sizeof static static_cast struct switch template this throw true false try typedef typeid typename union using virtual void volatile while',
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
          span.innerHTML = lines[i];
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
    var syntax = LANG[lang];
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
    function create_nominal(nominal, parameters, index) {
      if(nominal) {
        var scope = cache.scopes.current();
        var name = 'r' + scope.id + '-' + nominal;
        var attr = {
          onmouseover:  function(e) { change_style(name, true) },
          onmouseleave: function(e) { change_style(name, false) },
        };
        attr.className = STYLE.type + ' ' + name;
        attr.name      = name;
        colorize(nominal, undefined, attr);
        cache.scopes.add_nominal(nominal);
      }
      if(parameters !== undefined) { // output '()' when parameters is ''
        colorize('(');
        cache.scopes.create();
        if(parameters) {
          var rr, r = new RegExp(/([$\w]+)([^,]*,?\W*)/g);
          var names = [];
          while ((rr = r.exec(parameters)) !== null) {
            create_nominal(rr[1], undefined, index);
            names.push(rr[1]);
            colorize(rr[2]);
          }
        }
        colorize(')');
      }
      return true;
    }
    function create_ref(nominal, parameters, index) {
      var scope = cache.scopes.lookup(nominal);
      if(!scope) return create_nominal(nominal, parameters, index);
      var name = 'r' + scope.id + '-' + nominal;
      attr = {
        className:    STYLE.nominal + ' ' + name,
        onclick:      function(e) { location.href = '#' + name },
        onmouseover:  function(e) { change_style(name, true) },
        onmouseleave: function(e) { change_style(name, false) },
      };
      colorize(nominal, undefined, attr);
      return false;
    }
    syntax.processed = true;
    syntax.keyword   = syntax.keyword   ? { r: regexp(syntax.keyword),  css: STYLE.keyword     } : {};
    syntax.type      = syntax.type      ? { r: regexp(syntax.type),     css: STYLE.type        } : {};
    syntax.built_in  = syntax.built_in  ? { r: regexp(syntax.built_in), css: STYLE.built_in    } : {};
    syntax.type_ctor = syntax.type_ctor ? { r: syntax.type_ctor,        update: create_nominal } : {};
    syntax.ref_ctor  = syntax.ref_ctor  ? { r: syntax.ref_ctor,         update: create_nominal } : {};
    syntax.nominal   = { r: '', css: STYLE.nominal, update: create_ref };
    return syntax;
  }
  var scopes = (function(){
    var _stack = [];
    var _lang;
    function gen_id() { return Math.random().toString().substr(2,4) }
    return {
      id:      gen_id(),
      init:    function(lang) { _lang = lang; _stack = []; this.create(); return this },
      destroy: function() { _stack.pop(); this.update_regex(); },
      current: function() { return _stack[_stack.length-1] },
      create:  function(is_block) { 
        if(is_block && !this.current().is_block)
          this.current().is_block = true;
        else
          _stack.push({ id: this.id + '-' + gen_id(), is_block: !_stack.length, nominals:{}, nominal_regex:'' }); 
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
        var syntax  = LANG[lang];
        var regexes = [];
        for(var i=0; i<_stack.length; i++) 
          if(_stack[i].nominal_regex)
            regexes.push(_stack[i].nominal_regex);
        if(!regexes.length) return;
        var r = new RegExp(regexes.join('|'), 'g');
        r.index     = syntax.nominal.r.index;
        r.lastIndex = syntax.nominal.r.lastIndex;
        syntax.nominal.r = r;
      }
    };
  })();
  function parse(text) {
    var last_index = 0, attr;
    var token1, token2, token3;
    var lexers = cache.regexps[0];
    var nominal_index = cache.regexps[1];
    var pos = lexers.map(function(){ return 0 });
    text = text
    while(true) {
      var ii = -1;
      var p0 = p = text.length;
      for(var i = 0; i < lexers.length; i++) {
        if(pos[i] == null) continue;
        if(!lexers[i].r) continue;
        if(pos[i] == 0 || pos[i].index < last_index) {
          lexers[i].r.lastIndex = last_index;
          pos[i] = lexers[i].r.exec(text);
        }
        if(pos[i] == null) continue;
        var t1 = undefined, t2 = pos[i][0], t3 = undefined, pp = pos[i].index;
        if(pos[i].length>=2) {
          //pp += pos[i][1].length;
          var j = 1; // Ugly but fast. Refactor needed.
          while(pos[i][j]===undefined && ++j<pos[i].length); t1 = pos[i][j++];
          while(pos[i][j]===undefined && ++j<pos[i].length); t2 = pos[i][j++];
          while(pos[i][j]===undefined && ++j<pos[i].length); t3 = pos[i][j++];
        }
        if(pos[i].index < p) { p = pos[i].index; ii = i; token1 = t1; token2 = t2; token3 = t3; }
      }

      if(ii == -1){ colorize(text.slice(last_index)); break;} // no highlight needed anymore

      colorize(text.slice(last_index, p));  // plain text in text[last_index...p]
      if(token1) {
        colorize(token1 + ' ', STYLE.keyword);
      }else {
        if(token2 == '{') {
          cache.scopes.create(true);
        }else if(token2 == '}') 
          cache.scopes.destroy(); 
      }
      if(lexers[ii].update) {
        if(lexers[ii].update(token2, token3))
          pos[nominal_index] = 0;  // reset the last position of searched text for nominal rule
      }else
        colorize(token2, lexers[ii].css);

      if(last_index == lexers[ii].r.lastIndex) { alert('[Error] Infinite parsing loop in highlight.js'); break }
      last_index = lexers[ii].r.lastIndex;
      attr = undefined;
    }// end of while
  }

  function createHighlightedCode(lang, element, options)
  {
    options = options || {};
    cache = {};
    cache.scopes = scopes.init();
    cache.regexps = (function (SYNTAX) {
      var ret = [], nominal_index;
      for(var rule in COMMON) ret.push(COMMON[rule]);
      for(var rule in SYNTAX) SYNTAX[rule] && ret.push(SYNTAX[rule]) && rule=='nominal' && (nominal_index=ret.length-1);
      return [ret, nominal_index];
    })(createSyntaxRules(lang));

    cache.codeArea = options['lineno'] ? document.createElement('OL') : document.createElement('UL');
    var text = element.innerHTML
               .replace(/&lt;/g,   '<')
               .replace(/&gt;/g,   '>')
               //.replace(/&quot;/g, '"')
               //.replace(/&nbsp;/g, ' ')
               .replace(/&amp;/g,  '&');
    parse(text);

    var div = document.createElement('DIV');
    div.className = 'sh';
    while (div.firstChild) {
      div.removeChild(div.firstChild);
    }
    div.appendChild(cache.codeArea);
    element.parentNode.replaceChild(div, element);

  }// end of function parse

  for(var lang in LANG) {
    var snippets = document.getElementsByClassName(lang);
    while(snippets.length) {
      var code = snippets[0];
      var options  = {lineno: 1||code.attributes['lineno'] };
      createHighlightedCode(lang, code, options);
    }
  }
})();
