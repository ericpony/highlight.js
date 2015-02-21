(function() {

  var STYLE = {// CSS classes
    keyword:  'keyword', 
    type:     'type',
    built_in: 'built-in',
    nominal:  'built-in',
    string:   'string',
    comment:  'comment',  // single line
    comments: 'comments', // block
    character:'char',
    hex_value:'hex',      
    numeric:  'value',
    macro:    'macro',
    symbol:   'symbol'
  };

  var LANG = {
    'Scala': { // incomplete
      type_ctor: 'type object trait class',
      ref_ctor:  'def var val',
      nominal:   '',
      type:      /\b[$_]*[A-Z][_$A-Z0-9]*[\w$]*\b/g,
      keyword:  'type yield lazy override with false true sealed abstract private null if for while throw finally protected extends import final return else break new catch super class case package default try this match continue throws implicitly implicit _[\\d]+',
      literal:  { r: /\b'[a-zA-Z_$][\w$]*(?!['$\w])\b/g, css: STYLE.symbol } // support symbol literal
    },
    'JavaScript': { // incomplete
      type_ctor: 'new',
      ref_ctot:  'function var let',
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
    {r: /"([^"\\\n]|\\.)*"/g, css: STYLE.string },
    {r: /'([^'\\\n]|\\.)*'/g, css: STYLE.character },
    {r: /[a-zA-Z_]+\d+/g,     css: '' }, // prevent the parser from breaking e.g., a1 to a and 1
    {r: /0[xX][\da-fA-F]+/g,  css: STYLE.hex_value },
    {r: /\d*\.?\d+[eE]?\d*/g, css: STYLE.numeric }
  ];

  function change_style(classname, highlighted) { 
    var stylename = 'text-decoration', value = highlighted ?  'underline' : '';
    var elems = document.querySelectorAll('.' + classname);
    for(var i=0; i<elems.length; i++) elems[i].style[stylename] = value;
  }

  function createSyntaxRegex(lang)
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
    syntax.keyword  = syntax.keyword ?  { r: regexp(syntax.keyword), css: STYLE.keyword } : {};
    syntax.type     = syntax.type ?     { r: regexp(syntax.type),    css: STYLE.type } : {};
    syntax.built_in = syntax.built_in ? { r: regexp(syntax.built_in),css: STYLE.built_in } : {};
    if(syntax.others) {
      for(var i=0; i<syntax.others.length; i++)
        syntax[syntax.others[i][0]] = { r: syntax.others[i][1], css: syntax.others[i][2] };
      delete syntax.others;
    }
    var nominals = {}, nominal_regex = '';
    syntax.nominal = { r:'', css: STYLE.built_in };
    syntax.type_ctor  = syntax.type_ctor ? {
        r:      new RegExp('(' + regex(syntax.type_ctor) + ') +([^\\n (<\[]+)', 'g'), 
        css:    STYLE.nominal, 
        update: function(t, i) { 
//                  var group_name = cache.id + '-' + t;
                  var group_name = t;
                  var ret = {
                    name: group_name,
                    className: STYLE.nominal + ' ' + group_name,
                    onmouseover:  function(e) { change_style(group_name, true) },
                    onmouseleave: function(e) { change_style(group_name, false) }
                  };
                  if(nominals[t]) return ret;
                  nominals[t] = true;
                  nominal_regex = !nominal_regex ? ('\\b'+t+'\\b') : (nominal_regex+'|\\b'+t+'\\b');
                  var r = new RegExp(nominal_regex, 'g');
                  if(syntax.nominal) {
                    r.index = syntax.nominal.r.index;
                    r.lastIndex = syntax.nominal.r.lastIndex;
                  }
                  syntax.nominal.r = r;
                  cache.m[i] = 0; // reset the last pos of searched text for nominal
                  return ret;
                }
    } : {};
    return syntax;
  }

  var cache = {};

  function colorize(str, css, handlers)
  {
    if(str == null || str.length == 0) return;

    //var lines = escape(str).split('\n');
    var lines = str.split('\n');
    for(var i = 0; i < lines.length; i++)
    {
      if(!cache.line)
      {
        var li = document.createElement('LI');
        var line = document.createElement('SPAN');
        line.className = 'code';
        li.appendChild(line);      
        cache.line = line;
      }

      if(lines[i] != '')
      {
        if(css!=null)
        {
          var span = document.createElement('SPAN');
          span.className = css;
          span.innerHTML = lines[i];
          if(handlers) { 
            if(handlers.name) {
              var anchor = document.createElement('A');
              anchor.name = handlers.name;
              anchor.appendChild(span);
              span = anchor;
            }
            for(var h in handlers) span[h] = handlers[h];
          }
          cache.line.appendChild(span);
        }else{
          cache.line.appendChild(document.createTextNode(lines[i].replace(/ /g,'\u00a0')));
        }
      }

      if(i + 1 < lines.length)
      {
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
      for(var i = 0; i < lines.length; i++)
      {
        for(var p = 0; (p = lines[i].indexOf('\t')) != -1;)
          lines[i] = lines[i].replace(/\t/, spaces.slice(0, 4-p%4));
        stext += lines[i] + '\n';
      }
      return stext;
    }
    options = options || {};
    cache.id = Math.random().toString().substr(2,5); 
    var text = tab2spaces(element.innerHTML);
    var q = 0, b, h;
    var token1, token2 = '';
    var regexps = (function (SYNTAX){
      var ret = [];
      for(var rule in COMMON) ret.push(COMMON[rule]);
      for(var rule in SYNTAX) SYNTAX[rule] && ret.push(SYNTAX[rule]) && rule=='nominal' && (b=ret.length-1);
      cache.m = ret.map(function(){ return 0 });
      return ret;
    })(createSyntaxRegex(lang));

    cache.codeArea = options['lineno'] ? document.createElement('OL') : document.createElement('UL');
      
    while(1)
    {
      var ii = -1;
      var p0 = p = text.length;
      for(var i = 0; i < regexps.length; i++)
      {
        var m = cache.m;
        if(m[i] == null) continue;
        if(!regexps[i].r) continue;
        if(m[i] == 0 || m[i].index < q)
        {
          regexps[i].r.lastIndex = q;
          m[i] = regexps[i].r.exec(text);
        }
        if(m[i] == null) continue;
        var t1 = '', t2 = m[i][0], pp = m[i].index;
        if(m[i].length>2 && m[i][1])
        {
          pp += m[i][1].length + 1;
          t1 = m[i][1];
          t2 = m[i][2];
        }
        if(m[i].index < p) { p = m[i].index; ii = i; token1 = t1; token2 = t2; }
      }

      if(ii == -1){ colorize(text.slice(q), null); break;} // no highlight needed anymore

      colorize(text.slice(q, p), null);  // plain text in text[q...p]
      if(token1)
      {
        colorize(token1 + ' ', STYLE.keyword);
        if(regexps[ii].update) h = regexps[ii].update(token2, b);
      }else {
        if(regexps[ii].css == STYLE.built_in) { // experimental
          var group_name = token2;
          h = (function(name, css) { return { 
              className: css + ' ' + name,
              onmouseover:  function(e) { change_style(name, true) },
              onmouseleave: function(e) { change_style(name, false) },
              onclick: function(e) { location.replace('#' + name) }
            };
          })(token2, regexps[ii].css);
        }
      }
      colorize(token2, regexps[ii].css, h);
      if(q == regexps[ii].r.lastIndex) { alert('[Error] Infinite parsing loop in highlight.js'); break }
      q = regexps[ii].r.lastIndex;
      h = undefined;
    }// end of while

    var div = document.createElement('DIV');
    div.className = 'sh';
    while (div.firstChild)
    {
      div.removeChild(div.firstChild);
    }
    div.appendChild(cache.codeArea);
    element.parentNode.replaceChild(div, element);

  }// end of function parse

  for(var lang in LANG)
  {
    var snippets = document.getElementsByClassName(lang);
    while(snippets.length) {
      var code = snippets[0];
      var options  = {lineno: 1||code.attributes['lineno'] };
      createHighlightedCode(lang, code, options);
    }
  }
})();
