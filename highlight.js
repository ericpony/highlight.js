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
      ref_ctor:  /\b(val|var|def)\s+([$\w]+)/g,
      nominal:   '', // a workaround to prevent nominals from being preempted by type rule. Elaboration needed.
      type:      /\b[$_]*[A-Z][$\w]*\b/g,
      keyword:  'type yield lazy override with false true sealed abstract private null if for while throw finally protected extends import final return else break new catch super class case package default try this match continue throws implicitly implicit _[\\d]+',
      literal:  { r: /\b'[a-zA-Z_$][\w$]*(?!['$\w])\b/g, css: STYLE.symbol } // symbol literal
    },
    'JavaScript': { // incomplete
      //type_ctor: /\b(function\*?(?=\s+[A-Z])|new)\s+([$\w]+)/g,
      ref_ctor:  /\b(?:(var|let)\s+([$\w]+)|(function\*?)\b\s*([$\w]*)\s*\(([^)]*)\))/g,//|(function\*?)\s*\(([^)]*)\))/g,
      type:      'Object Function Boolean Error EvalError InternalError RangeError ReferenceError StopIteration SyntaxError TypeError URIError Number Math Date String RegExp Array Float32Array Float64Array Int16Array Int32Array Int8Array Uint16Array Uint32Array Uint8Array Uint8ClampedArray ArrayBuffer DataView JSON Intl',
      keyword:   'in if for while finally yield do return void else break catch instanceof with throw case default try this switch continue typeof delete let yield const class',
      built_in:  'eval isFinite isNaN parseFloat parseInt decodeURI decodeURIComponent encodeURI encodeURIComponent escape unescape arguments require'
    },
    'Java': { // incomplete
      type_ctor: 'interface class extends implements',
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
    {r: /\/\/.*$/gm,          css: STYLE.comment },
    {r: /^ *#.*/gm,           css: STYLE.macro },
    {r: /"[^"]*"/g, css: STYLE.string },
    {r: /'[^']*'/g, css: STYLE.character },
    {r: /[a-zA-Z_]+\d+/g,     css: '' }, // prevent the parser from breaking e.g., a1 to a and 1
    {r: /0[xX][\da-fA-F]+/g,  css: STYLE.hex_value },
    {r: /\d*\.?\d+[eE]?\d*/g, css: STYLE.numeric }
  ];

  function change_style(classname, highlighted) {
    var stylename = 'text-decoration', value = highlighted ?  'underline' : '';
    var elems = document.querySelectorAll('.' + classname);
    for(var i=0; i<elems.length; i++) elems[i].style[stylename] = value;
  }

  function createSyntaxRegex(lang, update_ref)
  {
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
    syntax.processed = true;
    syntax.keyword   = syntax.keyword ?   { r: regexp(syntax.keyword), css: STYLE.keyword } : {};
    syntax.type      = syntax.type ?      { r: regexp(syntax.type),    css: STYLE.type } : {};
    syntax.built_in  = syntax.built_in ?  { r: regexp(syntax.built_in),css: STYLE.built_in } : {};
    syntax.type_ctor = syntax.type_ctor ? { r: syntax.type_ctor, update: update_ref } : {};
    syntax.ref_ctor  = syntax.ref_ctor ?  { r: syntax.ref_ctor,  update: update_ref } : {};
    syntax.nominal   = { r: '', css: STYLE.nominal };
    return syntax;
  }

  var cache = {};

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

  function createHighlightedCode(lang, element, options)
  {
    function unescape(text) {
      return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&nbsp;/g, ' ');
    }
    function escape(text) {
      return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/ /g, '&nbsp;');
    }
    function tab2spaces(text) {
      var spaces = '    ';
      var stext = '';
      var lines = unescape(text).replace(/\n$/g, '').split('\n');
      for(var i = 0; i < lines.length; i++) {
        for(var p = 0; (p = lines[i].indexOf('\t')) != -1;)
          lines[i] = lines[i].replace(/\t/, spaces.slice(0, 4-p%4));
        stext += lines[i] + '\n';
      }
      return stext;
    }
    function update(t,p,i) {
      if(t) {
//        var group_name = cache.id + '-' + t;
        var group_name = t;
        var attr = {
          onmouseover:  function(e) { change_style(group_name, true) },
          onmouseleave: function(e) { change_style(group_name, false) },
        };
        attr.className = STYLE.type + ' ' + group_name;
        attr.name      = group_name;        
        colorize(t, undefined, attr);
        if(!nominals[t]) {
          nominal_regex = !nominal_regex ? ('\\b'+t+'\\b') : (nominal_regex+'|\\b'+t+'\\b');
          var syntax  = LANG[lang]; 
          var r       = new RegExp(nominal_regex, 'g');
          r.index     = syntax.nominal.r.index;
          r.lastIndex = syntax.nominal.r.lastIndex;
          syntax.nominal.r = r;
          cache.m[i] = 0; // reset the last position of searched text for nominal rule
          nominals[t] = true;
        }
      }
      if(p!==undefined) { 
        colorize('(');
        if(p) {
          var rr, r = new RegExp(/([$\w]+)([^,]*,?)/g);
          while ((rr = r.exec(p)) !== null) {
            update(rr[1], undefined, i);
            colorize(rr[2]);
          }
        }
        colorize(')');
      }
    }

    options = options || {};
    cache.id = Math.random().toString().substr(2,5);
    var nominals = {}, nominal_regex = '';
    var text = tab2spaces(element.innerHTML);
    var last_index = 0, nominal_index, attr;
    var token1, token2, token3;
    var regexps = (function (SYNTAX) {
      var ret = [];
      for(var rule in COMMON) ret.push(COMMON[rule]);
      for(var rule in SYNTAX) SYNTAX[rule] && ret.push(SYNTAX[rule]) && rule=='nominal' && (nominal_index=ret.length-1);
      cache.m = ret.map(function(){ return 0 });
      return ret;
    })(createSyntaxRegex(lang, update));

    cache.codeArea = options['lineno'] ? document.createElement('OL') : document.createElement('UL');

    while(1) {
      var ii = -1;
      var p0 = p = text.length;
      for(var i = 0; i < regexps.length; i++) {
        var m = cache.m;
        if(m[i] == null) continue;
        if(!regexps[i].r) continue;
        if(m[i] == 0 || m[i].index < last_index) {
          regexps[i].r.lastIndex = last_index;
          m[i] = regexps[i].r.exec(text);
        }
        if(m[i] == null) continue;
        var t1 = undefined, t2 = m[i][0], t3 = undefined, pp = m[i].index;
        if(m[i].length>=2) {
          //pp += m[i][1].length;
          var j = 1; // Ugly but fast. Refactor needed.
          while(m[i][j]===undefined && ++j<m[i].length); t1 = m[i][j++];
          while(m[i][j]===undefined && ++j<m[i].length); t2 = m[i][j++];
          while(m[i][j]===undefined && ++j<m[i].length); t3 = m[i][j++];
        }
        if(m[i].index < p) { p = m[i].index; ii = i; token1 = t1; token2 = t2; token3 = t3; }
      }

      if(ii == -1){ colorize(text.slice(last_index)); break;} // no highlight needed anymore

      colorize(text.slice(last_index, p));  // plain text in text[last_index...p]
      if(token1) {
        colorize(token1 + ' ', STYLE.keyword);
        if(regexps[ii].update) 
          regexps[ii].update(token2, token3, nominal_index);
        else
          colorize(token2, regexps[ii].css);
      }else {
        if(regexps[ii].css == STYLE.nominal) { // experimental
          attr = (function(name, css) {
            return {
              className: css + ' ' + name,
              onmouseover:  function(e) { change_style(name, true) },
              onmouseleave: function(e) { change_style(name, false) },
              onclick: function(e) { location.href = '#' + name }
            };
          })(token2, regexps[ii].css);
        }
        colorize(token2, regexps[ii].css, attr);
      }
      if(last_index == regexps[ii].r.lastIndex) { alert('[Error] Infinite parsing loop in highlight.js'); break }
      last_index = regexps[ii].r.lastIndex;
      attr = undefined;
    }// end of while

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
